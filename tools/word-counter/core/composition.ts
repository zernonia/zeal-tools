/**
 * What a text is made of, by character class — the bar under the counts.
 *
 * Counted in graphemes, like every other "character" figure on the page, so
 * the parts add up to the character count exactly. Each grapheme is classed
 * by its first code point: é (e + accent) is a letter, 👍🏽 is "other", and a
 * keycap emoji like 3️⃣ is "other" too, though it starts with a digit.
 */

const GRAPHEME_SEGMENTER = new Intl.Segmenter(undefined, { granularity: 'grapheme' })

export interface Composition {
  letters: number
  digits: number
  /** Spaces, tabs and line breaks. */
  spaces: number
  punctuation: number
  /** Symbols, emoji and anything else. */
  other: number
}

export function composition(text: string): Composition {
  const out: Composition = { letters: 0, digits: 0, spaces: 0, punctuation: 0, other: 0 }
  for (const { segment } of GRAPHEME_SEGMENTER.segment(text)) {
    if (/^\p{L}/u.test(segment))
      out.letters++
    else if (/^\p{Nd}/u.test(segment) && segment.length === 1)
      out.digits++
    else if (/^\s/u.test(segment))
      out.spaces++
    else if (/^\p{P}/u.test(segment))
      out.punctuation++
    else
      out.other++
  }
  return out
}
