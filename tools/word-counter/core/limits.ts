import { graphemeLength, graphemes } from './stats'

/**
 * Character limits as the platforms that enforce them actually count.
 *
 * "Characters" means something different to each of them, which is why one
 * number cannot answer all three questions: SMS counts 7-bit units or UTF-16
 * units depending on what is in the message, X weights characters by script,
 * and a search engine truncates by pixel width and is approximated here by
 * characters.
 */

/**
 * GSM 03.38 basic character set: one 7-bit unit each. The escape at 0x1B is
 * left out because it is not a character a message can contain.
 */
const GSM_BASIC = new Set(
  '@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !"#¤%&\'()*+,-./0123456789:;<=>?'
  + '¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà',
)

/** The extension table: reachable only through the escape, so two units each. */
const GSM_EXTENSION = new Set('\f^{}\\[~]|€')

export type SmsEncoding = 'GSM-7' | 'UCS-2'

export interface SmsInfo {
  encoding: SmsEncoding
  /** Units used: 7-bit septets for GSM-7, UTF-16 code units for UCS-2. */
  units: number
  segments: number
  /** Capacity of each segment at this length: 160/70 alone, 153/67 when split. */
  perSegment: number
  /** Units left before another segment is needed. */
  remaining: number
  /** The distinct characters that forced UCS-2, in the order they appear. */
  nonGsm: string[]
}

export function isGsm7(text: string): boolean {
  for (const char of text) {
    if (!GSM_BASIC.has(char) && !GSM_EXTENSION.has(char))
      return false
  }
  return true
}

/**
 * Pack sized characters into segments of `capacity` units without splitting
 * one across a boundary — an escape pair or a surrogate pair cannot be cut in
 * half, so a segment can end a unit short.
 */
function pack(sizes: readonly number[], capacity: number): { segments: number, lastUsed: number } {
  let segments = 1
  let used = 0
  for (const size of sizes) {
    if (used + size > capacity) {
      segments++
      used = 0
    }
    used += size
  }
  return { segments, lastUsed: used }
}

/**
 * How a text goes out as SMS. One character outside GSM-7 — an emoji, a curly
 * apostrophe, a Polish ł — switches the whole message to UCS-2 and cuts a
 * segment from 160 to 70.
 *
 * Multipart messages lose room to the header that stitches them together
 * (6 bytes), which is why the per-segment capacity drops to 153 and 67.
 */
export function smsInfo(text: string): SmsInfo {
  const nonGsm: string[] = []
  const seen = new Set<string>()
  for (const char of text) {
    if (!GSM_BASIC.has(char) && !GSM_EXTENSION.has(char) && !seen.has(char)) {
      seen.add(char)
      nonGsm.push(char)
    }
  }

  const encoding: SmsEncoding = nonGsm.length ? 'UCS-2' : 'GSM-7'
  const sizes = Array.from(text, char => encoding === 'GSM-7'
    ? (GSM_EXTENSION.has(char) ? 2 : 1)
    : char.length)
  const units = sizes.reduce((sum, size) => sum + size, 0)

  const [single, multi] = encoding === 'GSM-7' ? [160, 153] : [70, 67]
  if (units === 0)
    return { encoding, units: 0, segments: 0, perSegment: single, remaining: single, nonGsm }
  if (units <= single)
    return { encoding, units, segments: 1, perSegment: single, remaining: single - units, nonGsm }

  const { segments, lastUsed } = pack(sizes, multi)
  return { encoding, units, segments, perSegment: multi, remaining: multi - lastUsed, nonGsm }
}

/** Code-point ranges X counts as one; everything else counts as two. */
const X_LIGHT_RANGES: readonly [number, number][] = [
  [0x0000, 0x10FF],
  [0x2000, 0x200D],
  [0x2010, 0x201F],
  [0x2032, 0x2037],
]
const X_URL_LENGTH = 23
const URL_PATTERN = /\bhttps?:\/\/\S+|\bwww\.\S+/giu
// Emoji by default (👍), emoji by request (❤ + VS16), flags and keycaps.
const EMOJI_PATTERN = /[\p{Emoji_Presentation}\uFE0F\u20E3]/u

/**
 * Length as X's composer counts it (twitter-text v3): Latin, Greek, Cyrillic
 * and most punctuation weigh 1; CJK and most other scripts weigh 2; an emoji
 * weighs 2 however many code points it is built from; and a link weighs 23
 * whatever its length, because X wraps it in t.co.
 *
 * Links are recognised when they start with http(s):// or www. — X also
 * links bare domains such as example.com, which this does not detect.
 */
export function xLength(text: string): number {
  const normalised = text.normalize('NFC')
  let total = 0
  const rest = normalised.replace(URL_PATTERN, () => {
    total += X_URL_LENGTH
    return ''
  })
  for (const grapheme of graphemes(rest)) {
    if (EMOJI_PATTERN.test(grapheme)) {
      total += 2
      continue
    }
    for (const char of grapheme) {
      const code = char.codePointAt(0)!
      total += X_LIGHT_RANGES.some(([lo, hi]) => code >= lo && code <= hi) ? 1 : 2
    }
  }
  return total
}

export interface Limit {
  id: 'x' | 'meta-description' | 'title'
  label: string
  used: number
  max: number
  /** Whether going over truncates (soft) or is refused outright (hard). */
  kind: 'hard' | 'soft'
  note: string
}

export function limits(text: string): Limit[] {
  const characters = graphemeLength(text)
  return [
    {
      id: 'x',
      label: 'X post',
      used: xLength(text),
      max: 280,
      kind: 'hard',
      note: 'Weighted as X counts it: emoji and CJK characters count double, every link counts 23.',
    },
    {
      id: 'meta-description',
      label: 'Meta description',
      used: characters,
      max: 155,
      kind: 'soft',
      note: 'Google cuts snippets by pixel width, roughly 155 characters on desktop. Beyond it, the end is replaced by an ellipsis.',
    },
    {
      id: 'title',
      label: 'Page title',
      used: characters,
      max: 60,
      kind: 'soft',
      note: 'Search results show about 60 characters of a title before truncating it.',
    },
  ]
}
