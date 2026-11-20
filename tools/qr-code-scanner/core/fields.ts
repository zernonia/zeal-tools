/**
 * The `KEY:value;KEY:value;;` shape shared by WIFI:, MECARD: and MATMSG:.
 *
 * All three escape their delimiters with a backslash — `\;`, `\:`, `\,`,
 * `\"` and `\\` — so a password containing a semicolon is written `pa\;ss`.
 * Splitting on `;` with a regex gets that wrong, so the body is walked once,
 * character by character, and an escape always means "take the next
 * character literally".
 */

/** Split on `separator` wherever it is not escaped. Escapes are kept, for a later unescape. */
export function splitUnescaped(input: string, separator: string): string[] {
  const parts: string[] = []
  let current = ''
  for (let i = 0; i < input.length; i++) {
    const ch = input[i]!
    if (ch === '\\' && i + 1 < input.length) {
      current += ch + input[i + 1]
      i++
      continue
    }
    if (ch === separator) {
      parts.push(current)
      current = ''
      continue
    }
    current += ch
  }
  parts.push(current)
  return parts
}

/** Drop the backslash from every escape: `pa\;ss` → `pa;ss`, `a\\b` → `a\b`. */
export function unescapeValue(value: string): string {
  let out = ''
  for (let i = 0; i < value.length; i++) {
    const ch = value[i]!
    if (ch === '\\' && i + 1 < value.length) {
      out += value[i + 1]
      i++
      continue
    }
    out += ch
  }
  return out
}

export interface Field { key: string, value: string }

/**
 * Read `KEY:value;KEY:value;;` (after the scheme prefix has been removed) into
 * fields, keys upper-cased. A field with no unescaped colon is skipped rather
 * than guessed at; repeated keys are all kept, since a MECARD may carry
 * several TEL entries.
 */
export function readFields(body: string): Field[] {
  const fields: Field[] = []
  for (const part of splitUnescaped(body, ';')) {
    if (!part)
      continue
    const colon = indexOfUnescaped(part, ':')
    if (colon <= 0)
      continue
    fields.push({
      key: part.slice(0, colon).trim().toUpperCase(),
      value: unescapeValue(part.slice(colon + 1)),
    })
  }
  return fields
}

function indexOfUnescaped(input: string, ch: string): number {
  for (let i = 0; i < input.length; i++) {
    if (input[i] === '\\') {
      i++
      continue
    }
    if (input[i] === ch)
      return i
  }
  return -1
}

/** The first value for a key, or ''. */
export function first(fields: Field[], key: string): string {
  return fields.find(f => f.key === key)?.value ?? ''
}

/** Every non-empty value for a key, in order. */
export function all(fields: Field[], key: string): string[] {
  return fields.filter(f => f.key === key && f.value.trim()).map(f => f.value.trim())
}
