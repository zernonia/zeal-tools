import { WORDS } from './words'

/**
 * A seeded generator, so a test can be reproduced exactly.
 *
 * mulberry32: one 32-bit state word, a handful of multiplies, and a period
 * of 2^32 — far more than any test needs. This is not for anything secret;
 * it picks practice words, and the point is that the same seed gives the same
 * words on every machine, which is what lets the tests pin golden output.
 */
export function mulberry32(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6D2B79F5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export interface GenerateOptions {
  seed: number
  count: number
  punctuation?: boolean
  numbers?: boolean
}

/** Longest text the generator will produce, whatever it is asked for. */
export const MAX_GENERATED = 1000

function pick<T>(items: readonly T[], random: () => number): T {
  return items[Math.floor(random() * items.length)]!
}

function capitalise(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1)
}

/** A number of one to four digits, never with a leading zero unless it is 0. */
function randomNumber(random: () => number): string {
  const digits = 1 + Math.floor(random() * 4)
  const min = digits === 1 ? 0 : 10 ** (digits - 1)
  const max = 10 ** digits
  return String(min + Math.floor(random() * (max - min)))
}

/**
 * Words for a test, as an array — one entry per space-separated word.
 *
 * The same word never appears twice in a row: "the the" is a trap nobody
 * meets in real text, and it reads as a bug. With punctuation on, the text
 * is shaped into sentences: a capital to open each one, a full stop (now and
 * then a question or exclamation mark) every four to eleven words, commas
 * inside, and the occasional quotation, bracket, colon or semicolon. Numbers,
 * when on, replace about one word in ten.
 */
export function generateWords(options: GenerateOptions): string[] {
  const count = Math.max(1, Math.min(MAX_GENERATED, Math.floor(options.count)))
  const random = mulberry32(options.seed)
  const out: string[] = []

  let previous = ''
  let sentenceLeft = 4 + Math.floor(random() * 8)
  let startOfSentence = true

  for (let i = 0; i < count; i++) {
    let word: string
    do word = pick(WORDS, random)
    while (word === previous)
    previous = word

    if (options.numbers && random() < 0.1)
      word = randomNumber(random)

    if (options.punctuation) {
      if (startOfSentence)
        word = capitalise(word)
      startOfSentence = false
      sentenceLeft--

      const isLast = i === count - 1
      if (sentenceLeft <= 0 || isLast) {
        const roll = random()
        word += roll < 0.8 ? '.' : roll < 0.9 ? '?' : '!'
        sentenceLeft = 4 + Math.floor(random() * 8)
        startOfSentence = true
      }
      else {
        const roll = random()
        if (roll < 0.12)
          word += ','
        else if (roll < 0.15)
          word = `"${word}"`
        else if (roll < 0.17)
          word = `(${word})`
        else if (roll < 0.19)
          word += ';'
        else if (roll < 0.2)
          word += ':'
      }
    }

    out.push(word)
  }

  return out
}

/**
 * How many words a timed test needs so that nobody runs out.
 *
 * 250 words a minute is beyond all but a handful of competitive typists; the
 * extra twenty is headroom for short words. A two-minute test gets 520.
 */
export function wordsForDuration(seconds: number): number {
  return Math.min(MAX_GENERATED, Math.ceil((seconds / 60) * 250) + 20)
}
