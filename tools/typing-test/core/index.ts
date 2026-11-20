import type { TestConfig, TestMode } from './engine'
import type { TestResult } from './score'
import { generateWords, wordsForDuration } from './generate'

export * from './engine'
export * from './generate'
export * from './score'
export * from './view'
export { WORDS } from './words'

export const DURATIONS = [15, 30, 60, 120] as const
export const WORD_COUNTS = [25, 50, 100] as const

export const DEFAULT_DURATION = 30
export const DEFAULT_WORD_COUNT = 50

export interface TestSettings {
  mode: TestMode
  duration: number
  words: number
  punctuation: boolean
  numbers: boolean
}

export const DEFAULT_SETTINGS: TestSettings = {
  mode: 'time',
  duration: DEFAULT_DURATION,
  words: DEFAULT_WORD_COUNT,
  punctuation: false,
  numbers: false,
}

/**
 * Settings arrive from the address bar, so anything outside the offered
 * choices falls back to the default rather than producing a 7-second test
 * that no personal best can be compared with.
 */
export function normaliseSettings(raw: Partial<Record<keyof TestSettings, unknown>>): TestSettings {
  const mode: TestMode = raw.mode === 'words' ? 'words' : 'time'
  const duration = (DURATIONS as readonly number[]).includes(raw.duration as number) ? raw.duration as number : DEFAULT_DURATION
  const words = (WORD_COUNTS as readonly number[]).includes(raw.words as number) ? raw.words as number : DEFAULT_WORD_COUNT
  return {
    mode,
    duration,
    words,
    punctuation: raw.punctuation === true,
    numbers: raw.numbers === true,
  }
}

/** A fresh test for these settings; the same seed always gives the same words. */
export function buildConfig(settings: TestSettings, seed: number): TestConfig {
  const count = settings.mode === 'time' ? wordsForDuration(settings.duration) : settings.words
  return {
    mode: settings.mode,
    duration: settings.duration,
    words: generateWords({ seed, count, punctuation: settings.punctuation, numbers: settings.numbers }),
  }
}

/**
 * The key a personal best is filed under.
 *
 * Every setting that changes the difficulty is part of it: a 15-second sprint
 * and a two-minute test are not the same event, and neither is a test with
 * punctuation. Comparing across them would only produce flattering records.
 */
export function modeKey(settings: TestSettings): string {
  const base = settings.mode === 'time' ? `time-${settings.duration}` : `words-${settings.words}`
  return base + (settings.punctuation ? '-punctuation' : '') + (settings.numbers ? '-numbers' : '')
}

/** A short human label for a mode: "30 seconds · punctuation". */
export function modeLabel(settings: TestSettings): string {
  const base = settings.mode === 'time' ? `${settings.duration} seconds` : `${settings.words} words`
  const extras = [settings.punctuation && 'punctuation', settings.numbers && 'numbers'].filter(Boolean)
  return [base, ...extras].join(' · ')
}

export interface PersonalBest {
  wpm: number
  accuracy: number
  raw: number
  /** ISO date the record was set. */
  date: string
}

const KEY_PATTERN = /^(?:time-(?:15|30|60|120)|words-(?:25|50|100))(?:-punctuation)?(?:-numbers)?$/

/** Revive stored records: unknown keys and malformed entries are dropped. */
export function reviveBests(raw: unknown): Record<string, PersonalBest> {
  const out: Record<string, PersonalBest> = {}
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return out
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!KEY_PATTERN.test(key) || !value || typeof value !== 'object')
      continue
    const entry = value as Record<string, unknown>
    const wpm = entry.wpm
    const accuracy = entry.accuracy
    const rawWpm = entry.raw
    const date = entry.date
    if (typeof wpm !== 'number' || !Number.isFinite(wpm) || wpm < 0 || wpm > 400)
      continue
    if (typeof accuracy !== 'number' || !Number.isFinite(accuracy) || accuracy < 0 || accuracy > 100)
      continue
    if (typeof rawWpm !== 'number' || !Number.isFinite(rawWpm) || rawWpm < 0 || rawWpm > 400)
      continue
    if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date))
      continue
    out[key] = { wpm, accuracy, raw: rawWpm, date }
  }
  return out
}

/**
 * Whether a result is worth recording at all.
 *
 * A test abandoned halfway is not a result, and neither is one typed with
 * no correct words. Below 75% accuracy the speed says more about mashing the
 * keyboard than about typing, so it is shown but not kept as a record.
 */
export const MIN_ACCURACY_FOR_BEST = 75

export function qualifiesForBest(result: TestResult): boolean {
  return result.wpm > 0 && result.accuracy >= MIN_ACCURACY_FOR_BEST
}

/** True when `result` beats the stored best (or there is none yet). */
export function isNewBest(result: TestResult, best: PersonalBest | undefined): boolean {
  if (!qualifiesForBest(result))
    return false
  return !best || result.wpm > best.wpm
}

/** Speed rounded for display: whole words per minute, as every test shows it. */
export function displayWpm(wpm: number): number {
  return Math.round(wpm)
}
