import { first, readFields } from './fields'

/**
 * The small schemes: email, phone, text message and map location.
 *
 * Each is rebuilt into a clean link from its parsed parts rather than handed
 * on as scanned, so the button the visitor presses does exactly what the card
 * above it says — and nothing smuggled into the rest of the string comes
 * along.
 */

/** Decode a mailto address part, which must not turn `+` into a space. */
function decodeAddress(value: string): string {
  try {
    return decodeURIComponent(value)
  }
  catch {
    return value
  }
}

// Labels exclude the dot, so the pattern cannot backtrack over where one ends.
const EMAIL = /^[^\s@<>(),;:"]+@(?:[^\s@<>(),;:".]+\.)+[^\s@<>(),;:".]+$/

export interface EmailInfo {
  to: string[]
  cc: string[]
  bcc: string[]
  subject: string
  body: string
  href: string
}

function list(value: string): string[] {
  return value.split(',').map(s => decodeAddress(s).trim()).filter(s => EMAIL.test(s))
}

function mailtoHref(info: Omit<EmailInfo, 'href'>): string {
  const params: string[] = []
  if (info.cc.length)
    params.push(`cc=${encodeURIComponent(info.cc.join(','))}`)
  if (info.bcc.length)
    params.push(`bcc=${encodeURIComponent(info.bcc.join(','))}`)
  if (info.subject)
    params.push(`subject=${encodeURIComponent(info.subject)}`)
  if (info.body)
    params.push(`body=${encodeURIComponent(info.body)}`)
  const to = info.to.map(a => encodeURIComponent(a).replace(/%40/g, '@')).join(',')
  return `mailto:${to}${params.length ? `?${params.join('&')}` : ''}`
}

/** `mailto:…`, `MATMSG:TO:…;SUB:…;BODY:…;;`, or a bare address. */
export function parseEmail(raw: string): EmailInfo | null {
  const text = raw.trim()
  let info: Omit<EmailInfo, 'href'> | null = null

  if (/^mailto:/i.test(text)) {
    const rest = text.slice(7)
    const q = rest.indexOf('?')
    const to = list(q === -1 ? rest : rest.slice(0, q))
    const params = new URLSearchParams(q === -1 ? '' : rest.slice(q + 1))
    const cc = list(params.get('cc') ?? '')
    const bcc = list(params.get('bcc') ?? '')
    to.push(...list(params.get('to') ?? ''))
    info = { to, cc, bcc, subject: params.get('subject') ?? '', body: params.get('body') ?? '' }
    if (!to.length && !cc.length && !bcc.length)
      return null
  }
  else if (/^MATMSG:/i.test(text)) {
    const fields = readFields(text.slice(7))
    const to = list(first(fields, 'TO'))
    if (!to.length)
      return null
    info = { to, cc: [], bcc: [], subject: first(fields, 'SUB'), body: first(fields, 'BODY') }
  }
  else if (EMAIL.test(text)) {
    info = { to: [text], cc: [], bcc: [], subject: '', body: '' }
  }

  return info ? { ...info, href: mailtoHref(info) } : null
}

/** Digits, a leading +, and the punctuation people write numbers with. Pauses (p, w) and extensions (;ext=) allowed. */
const PHONE = /^\+?[\d\s().\-]{3,32}(?:[pw,;][\d#*=a-z,;]*)?$/i

function cleanNumber(value: string): string {
  return decodeAddress(value).trim()
}

export interface PhoneInfo { number: string, href: string }

export function parsePhone(raw: string): PhoneInfo | null {
  const text = raw.trim()
  if (!/^tel:/i.test(text))
    return null
  const number = cleanNumber(text.slice(4))
  if (!PHONE.test(number) || !/\d/.test(number))
    return null
  return { number, href: `tel:${number.replace(/[\s().\-]/g, '')}` }
}

export interface SmsInfo { number: string, body: string, href: string }

/** `sms:+44…?body=Hi`, iOS's `sms:+44…;?&body=`, and the older `SMSTO:+44…:Hi`. */
export function parseSms(raw: string): SmsInfo | null {
  const text = raw.trim()
  let number = ''
  let body = ''
  const smsto = /^(?:SMSTO|MMSTO):([^:]*)(?::([\s\S]*))?$/i.exec(text)
  if (smsto) {
    number = smsto[1]!.trim()
    body = smsto[2] ?? ''
  }
  else if (/^sms:/i.test(text)) {
    const rest = text.slice(4)
    const q = rest.indexOf('?')
    number = cleanNumber((q === -1 ? rest : rest.slice(0, q)).replace(/;$/, ''))
    if (q !== -1)
      body = new URLSearchParams(rest.slice(q + 1).replace(/^&/, '')).get('body') ?? ''
  }
  else {
    return null
  }
  if (!number || !PHONE.test(number) || !/\d/.test(number))
    return null
  const compact = number.replace(/[\s().\-]/g, '')
  return { number, body, href: `sms:${compact}${body ? `?body=${encodeURIComponent(body)}` : ''}` }
}

export interface GeoInfo {
  latitude: number
  longitude: number
  /** A place name, when the code carries `?q=`. */
  query: string
  mapUrl: string
}

/** `geo:51.5007,-0.1246`, with optional altitude, `;u=` uncertainty and `?q=` label (RFC 5870). */
export function parseGeo(raw: string): GeoInfo | null {
  const text = raw.trim()
  if (!/^geo:/i.test(text))
    return null
  const q = text.indexOf('?')
  const head = q === -1 ? text.slice(4) : text.slice(4, q)
  // Coordinates come before any `;u=` or `;crs=` parameters.
  const coords = head.split(';')[0]!.split(',')
  if (coords.length < 2 || coords.length > 3 || !coords.every(c => /^-?\d+(?:\.\d+)?$/.test(c.trim())))
    return null
  const latitude = Number(coords[0])
  const longitude = Number(coords[1])
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180)
    return null
  const query = q === -1 ? '' : new URLSearchParams(text.slice(q + 1)).get('q') ?? ''
  return {
    latitude,
    longitude,
    query,
    mapUrl: `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=16/${latitude}/${longitude}`,
  }
}
