import type { TestState } from './engine'

/**
 * Scoring, by the conventions typing tests have long shared.
 *
 * A "word" is five characters, spaces included — the standard since typing
 * was tested on typewriters, so that a test of short words and a test of
 * long ones measure the same thing. Speed is then characters ÷ 5 ÷ minutes.
 *
 * - **WPM** counts only correct characters: each letter typed in the right
 *   place, plus the space after each word typed exactly right.
 * - **Raw** counts every character left on the page, right or wrong.
 * - **Accuracy** is correct keystrokes over all keystrokes, *including the
 *   ones later corrected*: a mistake you fixed was still a mistake.
 * - **Consistency** is how even the pace was, second by second.
 */

export interface CharCounts {
  /** Letters typed in the right place. */
  correct: number
  /** Letters typed in a position the word has, but wrong. */
  incorrect: number
  /** Letters typed past the end of a word. */
  extra: number
  /** Letters of a word that was moved on from without them. */
  missed: number
}

export interface SpeedPoint {
  /** End of the second, counted from the first keystroke. */
  second: number
  /** Net WPM so far, from the start of the test to this second. */
  wpm: number
  /** Raw speed within this second alone. */
  raw: number
}

export interface TestResult {
  wpm: number
  raw: number
  /** 0–100. */
  accuracy: number
  /** 0–100, or null when the test was too short to say. */
  consistency: number | null
  chars: CharCounts
  /** Spaces typed between words, kept separately from the letters. */
  spaces: { correct: number, total: number }
  keystrokes: { correct: number, total: number }
  /** Seconds the test lasted. */
  seconds: number
  series: SpeedPoint[]
}

/** Characters → words per minute, by the five-character convention. */
export function wpmFor(characters: number, seconds: number): number {
  if (seconds <= 0)
    return 0
  return (characters / 5) / (seconds / 60)
}

/** Letter-by-letter comparison of one typed word with its target. */
export function compareWord(typed: string, target: string, submitted: boolean): CharCounts {
  const counts: CharCounts = { correct: 0, incorrect: 0, extra: 0, missed: 0 }
  for (let i = 0; i < typed.length; i++) {
    if (i >= target.length)
      counts.extra++
    else if (typed[i] === target[i])
      counts.correct++
    else
      counts.incorrect++
  }
  // An unfinished word at the end of a timed test is not "missed" — the
  // clock stopped you, not a skip.
  if (submitted && typed.length < target.length)
    counts.missed += target.length - typed.length
  return counts
}

export function countChars(state: TestState): { chars: CharCounts, spaces: { correct: number, total: number } } {
  const chars: CharCounts = { correct: 0, incorrect: 0, extra: 0, missed: 0 }
  const spaces = { correct: 0, total: 0 }
  const { words } = state.config
  for (let i = 0; i <= state.index && i < state.typed.length; i++) {
    const typed = state.typed[i] ?? ''
    const target = words[i] ?? ''
    // Every word before the current one was submitted with a space. The
    // current one counts as submitted only if the test ended by finishing it.
    const submitted = i < state.index || (state.finishedAt !== null && state.config.mode === 'words')
    const counts = compareWord(typed, target, submitted)
    chars.correct += counts.correct
    chars.incorrect += counts.incorrect
    chars.extra += counts.extra
    chars.missed += counts.missed
    if (i < state.index) {
      spaces.total++
      if (typed === target)
        spaces.correct++
    }
  }
  return { chars, spaces }
}

function round(value: number, places = 2): number {
  const factor = 10 ** places
  return Math.round(value * factor) / factor
}

/**
 * Speed second by second, for the chart and for consistency.
 *
 * Read from the keystroke log, so it shows the pace as it was typed —
 * corrections and all. A final fraction of a second under half is dropped:
 * two keys in 0.1 s would chart as a burst of 240 WPM that never happened.
 */
export function speedSeries(state: TestState, seconds: number): SpeedPoint[] {
  const points: SpeedPoint[] = []
  const totalMs = seconds * 1000
  const buckets = Math.ceil(totalMs / 1000)
  let cumulativeCorrect = 0
  let cursor = 0
  const log = state.log
  for (let s = 1; s <= buckets; s++) {
    const end = Math.min(s * 1000, totalMs)
    const length = (end - (s - 1) * 1000) / 1000
    const isLast = s === buckets
    let inBucket = 0
    let correctInBucket = 0
    // Keystrokes are in time order; the first one lands at t = 0, and the
    // last bucket takes everything left, including a key at the very end.
    for (; cursor < log.length; cursor++) {
      const key = log[cursor]!
      if (!isLast && key.t >= end)
        break
      inBucket++
      if (key.correct)
        correctInBucket++
    }
    cumulativeCorrect += correctInBucket
    if (length < 0.5 && points.length > 0)
      continue
    points.push({
      second: round(end / 1000),
      wpm: round(wpmFor(cumulativeCorrect, end / 1000)),
      raw: round(wpmFor(inBucket, length)),
    })
  }
  return points
}

/**
 * 100 × (1 − coefficient of variation) of the per-second raw speed, floored
 * at zero. Typing at a perfectly even pace scores 100; a pace that swings by
 * as much as its own average scores 0. Two seconds are the least it can be
 * measured from.
 */
export function consistencyOf(series: readonly SpeedPoint[]): number | null {
  if (series.length < 2)
    return null
  const values = series.map(point => point.raw)
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length
  if (mean === 0)
    return 0
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length
  const cv = Math.sqrt(variance) / mean
  return round(Math.max(0, 100 * (1 - cv)))
}

/** Seconds the test lasted: the full duration if timed, else first key to last. */
export function elapsedSeconds(state: TestState, now?: number): number {
  if (state.startedAt === null)
    return 0
  const end = state.finishedAt ?? now ?? state.startedAt
  return Math.max(0, (end - state.startedAt) / 1000)
}

export function scoreTest(state: TestState, now?: number): TestResult {
  const seconds = elapsedSeconds(state, now)
  const { chars, spaces } = countChars(state)
  const keystrokes = {
    correct: state.log.filter(k => k.correct).length,
    total: state.log.length,
  }
  const correctChars = chars.correct + spaces.correct
  const allChars = chars.correct + chars.incorrect + chars.extra + spaces.total
  const series = speedSeries(state, seconds)
  return {
    wpm: round(wpmFor(correctChars, seconds)),
    raw: round(wpmFor(allChars, seconds)),
    accuracy: keystrokes.total === 0 ? 0 : round((keystrokes.correct / keystrokes.total) * 100),
    consistency: consistencyOf(series),
    chars,
    spaces,
    keystrokes,
    seconds: round(seconds),
    series,
  }
}
