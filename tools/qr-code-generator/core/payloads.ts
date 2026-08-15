/**
 * QR payload builders — one tiny, spec-per-format function each.
 * Pure string assembly; validation stays gentle (never block a download).
 */

export interface WifiInput {
  ssid: string
  password?: string
  security?: 'WPA' | 'WEP' | 'nopass'
  hidden?: boolean
}

export interface VCardInput {
  firstName?: string
  lastName?: string
  organization?: string
  title?: string
  phone?: string
  email?: string
  url?: string
  address?: string
  note?: string
}

export interface EmailInput { to: string, subject?: string, body?: string }
export interface SmsInput { phone: string, message?: string }

/** Escape per the WIFI:/MECARD family syntax — backslash specials. */
function escapeWifi(value: string): string {
  return value.replace(/([\\;,:"])/g, '\\$1')
}

export function wifiPayload(input: WifiInput): string {
  const security = input.security ?? (input.password ? 'WPA' : 'nopass')
  let out = `WIFI:T:${security};S:${escapeWifi(input.ssid)};`
  if (security !== 'nopass' && input.password)
    out += `P:${escapeWifi(input.password)};`
  if (input.hidden)
    out += 'H:true;'
  return `${out};`
}

function escapeVCard(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/([,;])/g, '\\$1')
}

export function vcardPayload(input: VCardInput): string {
  const lines = ['BEGIN:VCARD', 'VERSION:3.0']
  const last = input.lastName ?? ''
  const first = input.firstName ?? ''
  lines.push(`N:${escapeVCard(last)};${escapeVCard(first)};;;`)
  lines.push(`FN:${escapeVCard([first, last].filter(Boolean).join(' '))}`)
  if (input.organization)
    lines.push(`ORG:${escapeVCard(input.organization)}`)
  if (input.title)
    lines.push(`TITLE:${escapeVCard(input.title)}`)
  if (input.phone)
    lines.push(`TEL;TYPE=CELL:${escapeVCard(input.phone)}`)
  if (input.email)
    lines.push(`EMAIL:${escapeVCard(input.email)}`)
  if (input.url)
    lines.push(`URL:${escapeVCard(input.url)}`)
  if (input.address)
    lines.push(`ADR;TYPE=WORK:;;${escapeVCard(input.address)};;;;`)
  if (input.note)
    lines.push(`NOTE:${escapeVCard(input.note)}`)
  lines.push('END:VCARD')
  return lines.join('\n')
}

export function emailPayload(input: EmailInput): string {
  const params = new URLSearchParams()
  if (input.subject)
    params.set('subject', input.subject)
  if (input.body)
    params.set('body', input.body)
  const query = params.toString().replace(/\+/g, '%20')
  return `mailto:${input.to}${query ? `?${query}` : ''}`
}

export function telPayload(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, '')}`
}

export function smsPayload(input: SmsInput): string {
  const phone = input.phone.replace(/[^\d+]/g, '')
  return `SMSTO:${phone}:${input.message ?? ''}`
}

export function urlPayload(url: string): string {
  if (!/^[a-z][a-z0-9+.-]*:/i.test(url))
    return `https://${url}`
  return url
}
