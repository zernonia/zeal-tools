/**
 * Text statistics, built on `Intl.Segmenter`.
 *
 * Segmenter implements Unicode's own text-boundary rules (UAX #29) plus the
 * dictionaries ICU ships for languages that do not put spaces between words.
 * It exists in every runtime this core runs in — browsers, Node and Workers —
 * so the page, the REST route and MCP give the same answer for the same text.
 *
 * What counts as a WORD here, precisely:
 *
 * - A segment Unicode marks as word-like: it contains a letter or a digit.
 *   Punctuation, spaces, symbols and emoji on their own are not words.
 * - Apostrophes stay inside a word: `don't`, `it’s`, `rock’n’roll` are one each.
 * - Numbers with separators are one word: `3.14`, `1,000`.
 * - Hyphenated compounds are one word: `e-mail`, `co-op`, `mother-in-law`.
 *   Unicode itself splits on a hyphen, so the segments are rejoined when a
 *   hyphen sits directly between two words with no space either side. A dash
 *   (– or —) still separates, because it joins clauses, not words.
 * - Chinese, Japanese and Thai are split by dictionary into words, not counted
 *   per character and not counted as one giant word for lack of spaces.
 *   `日本語の文章です` is four words: 日本語 / の / 文章 / です.
 * - Hashtags and handles count the word part: `#launch` is one word.
 */

const WORD_SEGMENTER = new Intl.Segmenter(undefined, { granularity: 'word' })
const SENTENCE_SEGMENTER = new Intl.Segmenter(undefined, { granularity: 'sentence' })
const GRAPHEME_SEGMENTER = new Intl.Segmenter(undefined, { granularity: 'grapheme' })

/** Hyphen-minus, Unicode hyphen, non-breaking hyphen. Not en or em dashes. */
const HYPHENS = new Set(['-', '‐', '‑'])

/** Silent-reading speed for adult non-fiction (Brysbaert, 2019). */
export const READING_WPM = 238
/** A comfortable presentation pace; conversational speech runs faster. */
export const SPEAKING_WPM = 130

/**
 * Words so common they say nothing about what a text is about. Deliberately
 * short and English-only: a long list starts hiding words that matter.
 */
export const STOP_WORDS: ReadonlySet<string> = new Set(`
  a about after all also am an and any are as at be because been before being but by can could
  did do does doing down each even for from get got had has have having he her here hers him his
  how i if in into is it its it's i'm just me more most my no not now of off on once only or
  other our ours out over own same she should so some such than that that's the their theirs them
  then there these they this those through to too under until up us very was we were what when
  where which while who whom why will with would you your yours don't can't won't isn't aren't
  doesn't
`.trim().split(/\s+/))

/**
 * Abbreviations that end in a full stop without ending a sentence. Unicode's
 * sentence rules already handle `e.g.` and `3.5`; titles before a name are
 * what they get wrong — `Dr. Smith` would otherwise be two sentences.
 */
const NOT_SENTENCE_ENDS = new Set(['mr', 'mrs', 'ms', 'mx', 'dr', 'prof', 'sr', 'jr', 'st', 'vs', 'rev', 'gen', 'capt'])

/** Characters as a person sees them: 👍🏽 and é (e + accent) are one each. */
export function graphemes(text: string): string[] {
  return Array.from(GRAPHEME_SEGMENTER.segment(text), s => s.segment)
}

export function graphemeLength(text: string): number {
  let count = 0
  for (const _ of GRAPHEME_SEGMENTER.segment(text)) count++
  return count
}

/** UTF-8 bytes, without TextEncoder so the count is plain arithmetic. */
export function utf8Length(text: string): number {
  let bytes = 0
  for (const char of text) {
    const code = char.codePointAt(0)!
    // A lone surrogate is encoded as U+FFFD (3 bytes) by every UTF-8 encoder.
    if (code < 0x80)
      bytes += 1
    else if (code < 0x800)
      bytes += 2
    else if (code < 0x10000)
      bytes += 3
    else
      bytes += 4
  }
  return bytes
}

/** The words of a text, in order, by the rules at the top of this file. */
export function words(text: string): string[] {
  const out: string[] = []
  // Whether the previous segment was a word, and a lone hyphen after it.
  let joinable = false
  let pendingHyphen = ''
  for (const { segment, isWordLike } of WORD_SEGMENTER.segment(text)) {
    if (isWordLike) {
      if (pendingHyphen && out.length)
        out[out.length - 1] += pendingHyphen + segment
      else
        out.push(segment)
      joinable = true
      pendingHyphen = ''
    }
    else if (joinable && !pendingHyphen && HYPHENS.has(segment)) {
      pendingHyphen = segment
    }
    else {
      joinable = false
      pendingHyphen = ''
    }
  }
  return out
}

export function countWords(text: string): number {
  return words(text).length
}

/** Folded for comparison: case and apostrophe style do not make a new word. */
export function normaliseWord(word: string): string {
  return word.toLowerCase().replace(/[’ʼ]/g, '\'')
}

/**
 * Sentences that contain at least one word. A run of "!!!" or an emoji on its
 * own line is not a sentence.
 */
export function countSentences(text: string): number {
  let count = 0
  let carry = false
  for (const { segment } of SENTENCE_SEGMENTER.segment(text)) {
    const hasWord = words(segment).length > 0
    if (!hasWord)
      continue
    if (!carry)
      count++
    const last = /(\p{L}+)\.\s*$/u.exec(segment)
    carry = !!last && NOT_SENTENCE_ENDS.has(last[1]!.toLowerCase())
  }
  return count
}

/** Blocks of text separated by at least one blank line. */
export function countParagraphs(text: string): number {
  return text.split(/\r?\n\s*\n/).filter(block => block.trim() !== '').length
}

/** Every line, blank ones included; an empty text has none. */
export function countLines(text: string): number {
  if (text === '')
    return 0
  return text.split(/\r\n|\r|\n/).length
}

export interface Keyword {
  word: string
  count: number
  /** Share of all words, as a percentage to one decimal place. */
  density: number
}

/**
 * The most repeated words, leaving out stop words, numbers and anything one
 * character long. Ties keep the order the words first appeared in.
 */
export function topKeywords(list: readonly string[], limit = 10): Keyword[] {
  const counts = new Map<string, number>()
  for (const word of list) {
    const key = normaliseWord(word)
    if (STOP_WORDS.has(key) || graphemeLength(key) < 2 || /^[\p{N}.,]+$/u.test(key))
      continue
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  const total = list.length
  return [...counts.entries()]
    .map(([word, count], order) => ({ word, count, order }))
    .sort((a, b) => b.count - a.count || a.order - b.order)
    .slice(0, limit)
    .map(({ word, count }) => ({ word, count, density: total ? Math.round(count / total * 1000) / 10 : 0 }))
}

export interface TextStats {
  words: number
  /** Graphemes — what a person would call characters. */
  characters: number
  /** Graphemes that are not whitespace. */
  charactersNoSpaces: number
  /** UTF-16 code units: JavaScript's `.length`, and many database limits. */
  utf16Length: number
  /** UTF-8 bytes: what a file, a URL or a VARCHAR in MySQL actually stores. */
  utf8Bytes: number
  sentences: number
  paragraphs: number
  lines: number
  uniqueWords: number
  /** Mean characters per word, one decimal place. */
  averageWordLength: number
  readingSeconds: number
  speakingSeconds: number
  longestWord: string
  keywords: Keyword[]
}

export function textStats(text: string): TextStats {
  const list = words(text)
  let characters = 0
  let nonSpace = 0
  for (const { segment } of GRAPHEME_SEGMENTER.segment(text)) {
    characters++
    if (!/^\s+$/u.test(segment))
      nonSpace++
  }

  let longestWord = ''
  let longestLength = 0
  let letters = 0
  const unique = new Set<string>()
  for (const word of list) {
    const length = graphemeLength(word)
    letters += length
    if (length > longestLength) {
      longestWord = word
      longestLength = length
    }
    unique.add(normaliseWord(word))
  }

  return {
    words: list.length,
    characters,
    charactersNoSpaces: nonSpace,
    utf16Length: text.length,
    utf8Bytes: utf8Length(text),
    sentences: countSentences(text),
    paragraphs: countParagraphs(text),
    lines: countLines(text),
    uniqueWords: unique.size,
    averageWordLength: list.length ? Math.round(letters / list.length * 10) / 10 : 0,
    readingSeconds: Math.round(list.length / READING_WPM * 60),
    speakingSeconds: Math.round(list.length / SPEAKING_WPM * 60),
    longestWord,
    keywords: topKeywords(list),
  }
}

/** "under a minute", "4 min", "1 h 12 min". */
export function formatDuration(seconds: number): string {
  if (seconds === 0)
    return '0 sec'
  if (seconds < 60)
    return `${seconds} sec`
  const minutes = Math.round(seconds / 60)
  if (minutes < 60)
    return `${minutes} min`
  return `${Math.floor(minutes / 60)} h ${minutes % 60} min`
}
