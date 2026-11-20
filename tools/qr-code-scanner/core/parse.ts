import type { CalendarEvent } from './calendar'
import type { Contact } from './contact'
import type { EmailInfo, GeoInfo, PhoneInfo, SmsInfo } from './messages'
import type { UrlInfo, Warning } from './url'
import type { WifiInfo } from './wifi'
import { parseEvent, toIcs } from './calendar'
import { parseMecard, parseVcard, toVcard } from './contact'
import { parseEmail, parseGeo, parsePhone, parseSms } from './messages'
import { analyseUrl } from './url'
import { parseWifi } from './wifi'

/**
 * One decoded code, read into something a person can act on.
 *
 * Every variant keeps `raw`, the exact text the code holds, because the
 * scanner always shows it: whatever the parser concluded, the visitor can
 * check the source for themselves.
 */
export type ScanResult
  = | { kind: 'url', raw: string, format: string, url: UrlInfo, warnings: Warning[] }
    | { kind: 'wifi', raw: string, format: string, wifi: WifiInfo, warnings: Warning[] }
    | { kind: 'contact', raw: string, format: string, contact: Contact, vcard: string, warnings: Warning[] }
    | { kind: 'email', raw: string, format: string, email: EmailInfo, warnings: Warning[] }
    | { kind: 'phone', raw: string, format: string, phone: PhoneInfo, warnings: Warning[] }
    | { kind: 'sms', raw: string, format: string, sms: SmsInfo, warnings: Warning[] }
    | { kind: 'geo', raw: string, format: string, geo: GeoInfo, warnings: Warning[] }
    | { kind: 'event', raw: string, format: string, event: CalendarEvent, ics: string, warnings: Warning[] }
    | { kind: 'product', raw: string, format: string, valid: boolean | null, warnings: Warning[] }
    | { kind: 'text', raw: string, format: string, warnings: Warning[] }

export type ScanKind = ScanResult['kind']

/** Barcode formats as BarcodeDetector names them, in words. */
export const FORMAT_LABELS: Record<string, string> = {
  qr_code: 'QR code',
  aztec: 'Aztec code',
  data_matrix: 'Data Matrix',
  pdf417: 'PDF417',
  ean_13: 'EAN-13',
  ean_8: 'EAN-8',
  upc_a: 'UPC-A',
  upc_e: 'UPC-E',
  code_128: 'Code 128',
  code_39: 'Code 39',
  code_93: 'Code 93',
  codabar: 'Codabar',
  itf: 'ITF',
}

export function formatLabel(format: string): string {
  return FORMAT_LABELS[format] ?? format
}

export const KIND_LABELS: Record<ScanKind, string> = {
  url: 'Link',
  wifi: 'WiFi network',
  contact: 'Contact',
  email: 'Email',
  phone: 'Phone number',
  sms: 'Text message',
  geo: 'Location',
  event: 'Calendar event',
  product: 'Product barcode',
  text: 'Text',
}

/** Retail barcodes, which hold a product number and nothing else. */
const RETAIL = new Set(['ean_13', 'ean_8', 'upc_a', 'itf'])

/**
 * The GS1 check digit: weights 3 and 1 alternating from the right, excluding
 * the check digit itself. Covers EAN-8, EAN-13, UPC-A and ITF-14.
 */
export function checkGtin(digits: string): boolean {
  if (!/^\d{8,14}$/.test(digits))
    return false
  const body = digits.slice(0, -1)
  let sum = 0
  for (let i = 0; i < body.length; i++) {
    const digit = Number(body[body.length - 1 - i])
    sum += i % 2 === 0 ? digit * 3 : digit
  }
  return (10 - (sum % 10)) % 10 === Number(digits.at(-1))
}

/** Schemes that run code or reach into the device rather than open a page. Never offered as a link. */
const HOSTILE_SCHEME = /^\s*(?:javascript|data|vbscript|file|blob|intent|about):/i

/**
 * Read a decoded payload. `format` is the barcode symbology it came from;
 * QR is assumed when the decoder does not say.
 *
 * Order matters only where formats overlap: a `WIFI:` string is never a URL,
 * and anything unrecognised — or recognised but malformed, like a WiFi code
 * with no network name — falls through to plain text with a note, rather
 * than being guessed into a shape it does not fit.
 */
export function parseScan(raw: string, format = 'qr_code'): ScanResult {
  const base = { raw, format }

  if (RETAIL.has(format) && /^\d+$/.test(raw.trim()))
    return { ...base, kind: 'product', valid: checkGtin(raw.trim()), warnings: [] }
  if (format === 'upc_e' && /^\d+$/.test(raw.trim()))
    return { ...base, kind: 'product', valid: null, warnings: [] }

  if (HOSTILE_SCHEME.test(raw)) {
    return {
      ...base,
      kind: 'text',
      warnings: [{
        code: 'script',
        severity: 'danger',
        message: 'This code holds a script or a device link, not a web address. It will not be opened from here.',
      }],
    }
  }

  const url = analyseUrl(raw)
  if (url)
    return { ...base, kind: 'url', url, warnings: url.warnings }

  if (/^WIFI:/i.test(raw.trim())) {
    const wifi = parseWifi(raw)
    if (wifi) {
      const warnings: Warning[] = wifi.security === 'WEP'
        ? [{ code: 'weak', severity: 'caution', message: 'This network uses WEP, which can be broken in minutes. Avoid sending anything private over it.' }]
        : []
      return { ...base, kind: 'wifi', wifi, warnings }
    }
    return malformed(raw, format, 'This looks like a WiFi code but has no network name, so it cannot be used.')
  }

  if (/^(?:MECARD:|BEGIN:VCARD)/i.test(raw.trim())) {
    const contact = parseMecard(raw) ?? parseVcard(raw)
    if (contact)
      return { ...base, kind: 'contact', contact, vcard: toVcard(contact, raw), warnings: [] }
    return malformed(raw, format, 'This looks like a contact card but has no name, number or address in it.')
  }

  if (/^BEGIN:(?:VEVENT|VCALENDAR)/i.test(raw.trim())) {
    const event = parseEvent(raw)
    if (event)
      return { ...base, kind: 'event', event, ics: toIcs(raw), warnings: [] }
    return malformed(raw, format, 'This looks like a calendar event but has no title or start time.')
  }

  const email = parseEmail(raw)
  if (email)
    return { ...base, kind: 'email', email, warnings: [] }

  const phone = parsePhone(raw)
  if (phone)
    return { ...base, kind: 'phone', phone, warnings: [] }

  const sms = parseSms(raw)
  if (sms)
    return { ...base, kind: 'sms', sms, warnings: [] }

  const geo = parseGeo(raw)
  if (geo)
    return { ...base, kind: 'geo', geo, warnings: [] }

  if (/^(?:mailto|tel|sms|smsto|geo):/i.test(raw.trim()))
    return malformed(raw, format, 'This code starts like a link to an app but the rest of it does not make sense, so it is shown as text.')

  return { ...base, kind: 'text', warnings: [] }
}

function malformed(raw: string, format: string, message: string): ScanResult {
  return { raw, format, kind: 'text', warnings: [{ code: 'malformed', severity: 'info', message }] }
}

/** Highest severity among the warnings, for colouring the card. */
export function worstSeverity(warnings: Warning[]): Warning['severity'] | null {
  if (warnings.some(w => w.severity === 'danger'))
    return 'danger'
  if (warnings.some(w => w.severity === 'caution'))
    return 'caution'
  return warnings.length ? 'info' : null
}

/** A one-line summary for the history list. */
export function summarise(result: ScanResult): string {
  switch (result.kind) {
    case 'url': return result.url.displayHost
    case 'wifi': return result.wifi.ssid
    case 'contact': return result.contact.name || result.contact.organisation || 'Contact'
    case 'email': return result.email.to[0] ?? 'Email'
    case 'phone': return result.phone.number
    case 'sms': return result.sms.number
    case 'geo': return result.geo.query || `${result.geo.latitude}, ${result.geo.longitude}`
    case 'event': return result.event.summary || 'Event'
    case 'product': return result.raw
    case 'text': {
      const line = result.raw.trim().split('\n')[0] ?? ''
      return line.length > 60 ? `${line.slice(0, 59)}…` : line || '(empty)'
    }
  }
}
