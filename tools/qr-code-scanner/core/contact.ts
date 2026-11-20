import { all, first, readFields, splitUnescaped } from './fields'

/**
 * Contacts come in two shapes: MECARD (`MECARD:N:Doe,Jane;TEL:…;;`), the
 * compact format from Japanese phones, and a full vCard
 * (`BEGIN:VCARD…END:VCARD`). Both are read into the same small record — the
 * fields a person actually saves — and both can be downloaded as a .vcf so
 * the phone's own address book does the saving.
 */

export interface Contact {
  name: string
  organisation: string
  title: string
  phones: string[]
  emails: string[]
  urls: string[]
  address: string
  note: string
}

const EMPTY: Contact = { name: '', organisation: '', title: '', phones: [], emails: [], urls: [], address: '', note: '' }

function hasAnything(c: Contact): boolean {
  return !!(c.name || c.organisation || c.phones.length || c.emails.length || c.urls.length || c.address)
}

export function parseMecard(raw: string): Contact | null {
  const text = raw.trim()
  if (!/^MECARD:/i.test(text))
    return null
  const fields = readFields(text.slice(7))
  // N is "Last,First" in MECARD.
  const [last = '', given = ''] = first(fields, 'N').split(',').map(s => s.trim())
  const contact: Contact = {
    ...EMPTY,
    name: [given, last].filter(Boolean).join(' '),
    organisation: first(fields, 'ORG').trim(),
    title: first(fields, 'TITLE').trim(),
    phones: all(fields, 'TEL'),
    emails: all(fields, 'EMAIL'),
    urls: all(fields, 'URL'),
    address: first(fields, 'ADR').trim(),
    note: first(fields, 'NOTE').trim(),
  }
  return hasAnything(contact) ? contact : null
}

/** Undo RFC 5545/6350 line folding: a line break followed by a space or tab continues the line. */
export function unfold(text: string): string[] {
  return text.replace(/\r\n?/g, '\n').replace(/\n[ \t]/g, '').split('\n')
}

/** vCard and iCalendar text escapes: `\n`, `\,`, `\;`, `\\`. */
export function unescapeText(value: string): string {
  return value.replace(/\\([n,;\\])/gi, (_, ch: string) => (ch === 'n' || ch === 'N' ? '\n' : ch))
}

export interface Property { name: string, params: string, value: string }

/** `item1.TEL;TYPE=CELL:+44 20…` → { name: 'TEL', params: 'TYPE=CELL', value: '+44 20…' }. */
export function readProperties(text: string): Property[] {
  const props: Property[] = []
  for (const line of unfold(text)) {
    const colon = line.indexOf(':')
    if (colon <= 0)
      continue
    const head = line.slice(0, colon)
    const semi = head.indexOf(';')
    const name = (semi === -1 ? head : head.slice(0, semi)).replace(/^[\w-]+\./, '').toUpperCase()
    props.push({ name, params: semi === -1 ? '' : head.slice(semi + 1), value: line.slice(colon + 1) })
  }
  return props
}

export function parseVcard(raw: string): Contact | null {
  const text = raw.trim()
  if (!/^BEGIN:VCARD/i.test(text))
    return null
  const props = readProperties(text)
  const get = (name: string) => props.find(p => p.name === name)?.value ?? ''
  const many = (name: string) => props.filter(p => p.name === name).map(p => unescapeText(p.value).trim()).filter(Boolean)

  let name = unescapeText(get('FN')).trim()
  if (!name) {
    const [family = '', given = '', additional = '', prefix = '', suffix = ''] = splitUnescaped(get('N'), ';').map(s => unescapeText(s).trim())
    name = [prefix, given, additional, family, suffix].filter(Boolean).join(' ')
  }
  const address = splitUnescaped(get('ADR'), ';').map(s => unescapeText(s).trim()).filter(Boolean).join(', ')
  const organisation = splitUnescaped(get('ORG'), ';').map(s => unescapeText(s).trim()).filter(Boolean).join(', ')

  const contact: Contact = {
    name,
    organisation,
    title: unescapeText(get('TITLE')).trim(),
    phones: many('TEL').map(t => t.replace(/^tel:/i, '')),
    emails: many('EMAIL').map(e => e.replace(/^mailto:/i, '')),
    urls: many('URL'),
    address,
    note: unescapeText(get('NOTE')).trim(),
  }
  return hasAnything(contact) ? contact : null
}

function escapeText(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/([,;])/g, '\\$1')
}

/**
 * A vCard 3.0 for the address book. For a code that already held a vCard the
 * original text is passed through (with CRLF line endings, as the spec asks),
 * so nothing the parser does not know about — a birthday, a photo — is lost;
 * a MECARD is rewritten as one.
 */
export function toVcard(contact: Contact, original?: string): string {
  if (original && /^BEGIN:VCARD/i.test(original.trim()))
    return `${original.trim().replace(/\r\n?|\n/g, '\r\n')}\r\n`

  const parts = contact.name.trim().split(/\s+/)
  const family = parts.length > 1 ? parts.at(-1)! : ''
  const given = parts.length > 1 ? parts.slice(0, -1).join(' ') : (parts[0] ?? '')
  const lines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `N:${escapeText(family)};${escapeText(given)};;;`,
    `FN:${escapeText(contact.name || contact.organisation || 'Contact')}`,
  ]
  if (contact.organisation)
    lines.push(`ORG:${escapeText(contact.organisation)}`)
  if (contact.title)
    lines.push(`TITLE:${escapeText(contact.title)}`)
  for (const tel of contact.phones)
    lines.push(`TEL:${escapeText(tel)}`)
  for (const email of contact.emails)
    lines.push(`EMAIL:${escapeText(email)}`)
  for (const url of contact.urls)
    lines.push(`URL:${escapeText(url)}`)
  if (contact.address)
    lines.push(`ADR:;;${escapeText(contact.address)};;;;`)
  if (contact.note)
    lines.push(`NOTE:${escapeText(contact.note)}`)
  lines.push('END:VCARD')
  return `${lines.join('\r\n')}\r\n`
}
