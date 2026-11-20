import { readProperties, unescapeText, unfold } from './contact'

/**
 * A calendar event: an iCalendar `VEVENT`, on its own or inside a
 * `VCALENDAR`. Read for display, and re-wrapped as a complete .ics file so a
 * calendar app will accept it — a bare VEVENT is not a valid file, and the
 * spec requires UID and DTSTAMP, which codes routinely leave out.
 */

export interface IcsDate {
  /** `2026-11-20`, `2026-11-20T09:00:00` (floating or TZID) or `2026-11-20T09:00:00Z`. */
  iso: string
  allDay: boolean
  utc: boolean
  /** The TZID parameter, when the time is local to a named zone. */
  tzid: string
}

export interface CalendarEvent {
  summary: string
  start: IcsDate | null
  end: IcsDate | null
  location: string
  description: string
  url: string
}

/** `20261120`, `20261120T090000`, `20261120T090000Z`. Null for anything else. */
export function parseIcsDate(value: string, params = ''): IcsDate | null {
  const match = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/.exec(value.trim())
  if (!match)
    return null
  const [, y, mo, d, h, mi, s, z] = match
  const month = Number(mo)
  const day = Number(d)
  if (month < 1 || month > 12 || day < 1 || day > 31)
    return null
  const tzid = /(?:^|;)TZID=("?)([^;"]+)\1/i.exec(params)?.[2] ?? ''
  if (h === undefined)
    return { iso: `${y}-${mo}-${d}`, allDay: true, utc: false, tzid: '' }
  if (Number(h) > 23 || Number(mi) > 59 || Number(s ?? 0) > 60)
    return null
  return { iso: `${y}-${mo}-${d}T${h}:${mi}:${s ?? '00'}${z ? 'Z' : ''}`, allDay: false, utc: !!z, tzid }
}

function eventBlock(text: string): string | null {
  const match = /BEGIN:VEVENT[\s\S]*?END:VEVENT/i.exec(text)
  return match ? match[0] : null
}

export function parseEvent(raw: string): CalendarEvent | null {
  const text = raw.trim()
  if (!/^BEGIN:(?:VEVENT|VCALENDAR)/i.test(text))
    return null
  const block = eventBlock(text)
  if (!block)
    return null
  const props = readProperties(block)
  const prop = (name: string) => props.find(p => p.name === name)
  const field = (name: string) => unescapeText(prop(name)?.value ?? '').trim()
  const start = prop('DTSTART')
  const end = prop('DTEND')
  const event: CalendarEvent = {
    summary: field('SUMMARY'),
    start: start ? parseIcsDate(start.value, start.params) : null,
    end: end ? parseIcsDate(end.value, end.params) : null,
    location: field('LOCATION'),
    description: field('DESCRIPTION'),
    url: field('URL'),
  }
  return event.summary || event.start ? event : null
}

/** FNV-1a, for a stable UID derived from the event itself. */
function hash(text: string): string {
  let h = 0x811C9DC5
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0).toString(16).padStart(8, '0')
}

function stampOf(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

/**
 * A complete .ics file for the scanned event. The event's own lines are kept
 * as written; UID and DTSTAMP are added only when missing.
 */
export function toIcs(raw: string, now: Date = new Date()): string {
  const block = eventBlock(raw.trim())
  if (!block)
    return ''
  const lines = unfold(block).filter(line => line.trim())
  const has = (name: string) => lines.some(line => new RegExp(`^${name}[;:]`, 'i').test(line))
  const extra: string[] = []
  if (!has('UID'))
    extra.push(`UID:${hash(block)}@zeal.tools`)
  if (!has('DTSTAMP'))
    extra.push(`DTSTAMP:${stampOf(now)}`)
  const body = [lines[0]!, ...extra, ...lines.slice(1)]
  return `${[
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//zeal.tools//QR Code Scanner//EN',
    ...body,
    'END:VCALENDAR',
  ].join('\r\n')}\r\n`
}
