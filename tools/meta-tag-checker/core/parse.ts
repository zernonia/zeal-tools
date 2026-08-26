/**
 * A `<head>` reader.
 *
 * Hand-written rather than a regex sweep, and that is not fussiness. Twice now
 * this repo has shipped a pattern with a lazy prefix beside a greedy run and
 * had to replace it after a linter found the super-linear backtracking — the
 * invoice numbering and the name picker's weights. HTML is a far worse case
 * than either: attributes come in any order, values may be single-quoted,
 * double-quoted or bare, tags may be uppercase, `</head>` can appear inside a
 * script string, and the document may be truncated mid-tag. A scanner that
 * walks the string once handles all of that in one pass and cannot backtrack,
 * because it never looks backwards.
 *
 * It is not a compliant HTML parser and does not try to be. It reads the head
 * of a document well enough to report on it.
 */

export interface Tag {
  name: string
  attrs: Record<string, string>
}

const isSpace = (c: string) => c === ' ' || c === '\t' || c === '\n' || c === '\r' || c === '\f'

/** Raw-text elements: their content is not markup and must be skipped whole. */
const RAW = new Set(['script', 'style', 'textarea', 'title'])

/**
 * Walk the document, yielding every open tag until `</head>`.
 *
 * Stopping at `</head>` matters for more than speed: a body can contain
 * `<meta>` in stray markup, and reporting on that would describe a page the
 * crawler does not see.
 */
export function scanHead(html: string): { tags: Tag[], title: string | null } {
  const tags: Tag[] = []
  let title: string | null = null
  let i = 0
  const n = html.length

  while (i < n) {
    const lt = html.indexOf('<', i)
    if (lt < 0)
      break
    i = lt + 1

    // Comments and doctype-ish declarations carry nothing we want.
    if (html.startsWith('!--', i)) {
      const end = html.indexOf('-->', i + 3)
      i = end < 0 ? n : end + 3
      continue
    }
    if (html[i] === '!' || html[i] === '?') {
      const end = html.indexOf('>', i)
      i = end < 0 ? n : end + 1
      continue
    }

    const closing = html[i] === '/'
    if (closing)
      i++

    const start = i
    while (i < n && !isSpace(html[i]!) && html[i] !== '>' && html[i] !== '/')
      i++
    const name = html.slice(start, i).toLowerCase()
    if (!name)
      continue

    if (closing) {
      const end = html.indexOf('>', i)
      i = end < 0 ? n : end + 1
      if (name === 'head' || name === 'body')
        break
      continue
    }

    const { attrs, next } = readAttrs(html, i)
    i = next
    tags.push({ name, attrs })

    if (RAW.has(name)) {
      const close = `</${name}`
      const end = indexOfInsensitive(html, close, i)
      const text = html.slice(i, end < 0 ? n : end)
      if (name === 'title' && title === null)
        title = decodeEntities(text).trim()
      // `script` is skipped wholesale, which is what stops a `</head>` inside
      // a JavaScript string from ending the scan early.
      if (end < 0) {
        i = n
      }
      else {
        const gt = html.indexOf('>', end)
        i = gt < 0 ? n : gt + 1
      }
      if (name === 'script' || name === 'style')
        tags[tags.length - 1]!.attrs.__text = text
    }

    // A `<body>` open tag means the head is over, however malformed it was.
    if (name === 'body')
      break
  }

  return { tags, title }
}

function indexOfInsensitive(haystack: string, needle: string, from: number): number {
  const lower = haystack.toLowerCase()
  return lower.indexOf(needle.toLowerCase(), from)
}

function readAttrs(html: string, from: number): { attrs: Record<string, string>, next: number } {
  const attrs: Record<string, string> = {}
  let i = from
  const n = html.length

  while (i < n) {
    while (i < n && isSpace(html[i]!))
      i++
    if (i >= n)
      break
    if (html[i] === '>')
      return { attrs, next: i + 1 }
    if (html[i] === '/' && html[i + 1] === '>')
      return { attrs, next: i + 2 }

    const nameStart = i
    while (i < n && !isSpace(html[i]!) && html[i] !== '=' && html[i] !== '>')
      i++
    const key = html.slice(nameStart, i).toLowerCase()
    if (!key) {
      i++
      continue
    }

    while (i < n && isSpace(html[i]!))
      i++
    if (html[i] !== '=') {
      // A bare attribute, e.g. `<script defer>`.
      attrs[key] = ''
      continue
    }
    i++
    while (i < n && isSpace(html[i]!))
      i++

    const quote = html[i]
    let value: string
    if (quote === '"' || quote === '\'') {
      i++
      const end = html.indexOf(quote, i)
      value = html.slice(i, end < 0 ? n : end)
      i = end < 0 ? n : end + 1
    }
    else {
      const start = i
      while (i < n && !isSpace(html[i]!) && html[i] !== '>')
        i++
      value = html.slice(start, i)
    }
    attrs[key] = decodeEntities(value)
  }

  return { attrs, next: i }
}

const NAMED: Record<string, string> = {
  'amp': '&',
  'lt': '<',
  'gt': '>',
  'quot': '"',
  'apos': '\'',
  'nbsp': ' ',
  '#39': '\'',
}

/**
 * Enough entity decoding to report a title honestly.
 *
 * A page whose title is `Tips &amp; Tricks` is 12 characters long to a
 * crawler, not 16, and a length warning computed on the raw markup would be
 * wrong exactly where the tool is supposed to be useful.
 */
export function decodeEntities(text: string): string {
  if (!text.includes('&'))
    return text
  let out = ''
  let i = 0
  while (i < text.length) {
    const amp = text.indexOf('&', i)
    if (amp < 0) {
      out += text.slice(i)
      break
    }
    out += text.slice(i, amp)
    const semi = text.indexOf(';', amp)
    // A stray ampersand is far more common in the wild than a broken entity,
    // so anything unterminated within a short window is left as written.
    if (semi < 0 || semi - amp > 10) {
      out += '&'
      i = amp + 1
      continue
    }
    const body = text.slice(amp + 1, semi)
    const named = NAMED[body.toLowerCase()]
    if (named !== undefined) {
      out += named
    }
    else if (body[0] === '#') {
      const code = body[1] === 'x' || body[1] === 'X'
        ? Number.parseInt(body.slice(2), 16)
        : Number.parseInt(body.slice(1), 10)
      out += Number.isFinite(code) && code > 0 && code <= 0x10FFFF ? String.fromCodePoint(code) : `&${body};`
    }
    else {
      out += `&${body};`
    }
    i = semi + 1
  }
  return out
}
