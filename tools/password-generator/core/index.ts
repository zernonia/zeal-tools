/**
 * Password generator — pure, isomorphic, zero-dependency.
 *
 * The security-critical parts live here rather than in the UI on purpose: an
 * unbiased integer draw and an unbiased shuffle are exactly the things that
 * look right and are quietly wrong, so they belong where they can be tested.
 * Randomness is injected, which is what makes that testable — the browser
 * passes `crypto.getRandomValues`, the server passes its own.
 */

export const CHARSETS = {
  lowercase: 'abcdefghijklmnopqrstuvwxyz',
  uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  digits: '0123456789',
  symbols: '!@#$%^&*()-_=+[]{};:,.?/',
} as const

export type CharsetName = keyof typeof CHARSETS

/**
 * Characters that are easy to misread when a password is copied off a screen
 * or read aloud down a phone line.
 */
export const AMBIGUOUS = 'Il1|O0oB8S5Z2'

export interface PasswordOptions {
  length: number
  lowercase: boolean
  uppercase: boolean
  digits: boolean
  symbols: boolean
  /** Drop characters that are easy to confuse with one another. */
  excludeAmbiguous: boolean
  /** Guarantee at least one character from every selected set. */
  requireEach: boolean
}

export const DEFAULT_OPTIONS: PasswordOptions = {
  length: 20,
  lowercase: true,
  uppercase: true,
  digits: true,
  symbols: true,
  excludeAmbiguous: false,
  requireEach: true,
}

/** Draws an integer in [0, max). */
export type RandomInt = (max: number) => number

/**
 * Unbiased integer draw over a byte source.
 *
 * Rejection sampling rather than `% max`: the modulo of a uniform 32-bit value
 * is *not* uniform unless max divides 2^32, which for an alphabet of 26 or 94
 * it does not. The bias is small but it is real, and it is free to avoid.
 */
export function createRandomInt(fill: (bytes: Uint8Array) => void): RandomInt {
  const bytes = new Uint8Array(4)
  return (max: number) => {
    if (max <= 0)
      throw new Error('max must be positive')
    // Largest multiple of `max` that fits in 2^32; anything above it is
    // rejected so every remaining value maps to exactly one outcome.
    const limit = Math.floor(0x100000000 / max) * max
    for (;;) {
      fill(bytes)
      const value = ((bytes[0]! << 24) >>> 0) + (bytes[1]! << 16) + (bytes[2]! << 8) + bytes[3]!
      if (value < limit)
        return value % max
    }
  }
}

/** The pool a given set of options draws from. */
export function buildAlphabet(options: PasswordOptions): string {
  const parts: string[] = []
  for (const name of ['lowercase', 'uppercase', 'digits', 'symbols'] as CharsetName[]) {
    if (options[name])
      parts.push(CHARSETS[name])
  }
  const pool = parts.join('')
  return options.excludeAmbiguous
    ? [...pool].filter(char => !AMBIGUOUS.includes(char)).join('')
    : pool
}

/** Fisher–Yates, drawing each swap from the injected source. */
export function shuffle<T>(items: T[], randomInt: RandomInt): T[] {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = randomInt(i + 1)
    ;[out[i], out[j]] = [out[j]!, out[i]!]
  }
  return out
}

export function generatePassword(options: PasswordOptions, randomInt: RandomInt): string {
  const alphabet = buildAlphabet(options)
  if (!alphabet)
    throw new Error('Select at least one character set.')
  if (options.length < 1)
    throw new Error('Length must be at least 1.')

  const pick = (pool: string) => pool[randomInt(pool.length)]!

  if (!options.requireEach)
    return Array.from({ length: options.length }, () => pick(alphabet)).join('')

  // One from each selected set, then fill and shuffle — rather than patching
  // characters in afterwards, which would make those positions predictable.
  const required: string[] = []
  for (const name of ['lowercase', 'uppercase', 'digits', 'symbols'] as CharsetName[]) {
    if (!options[name])
      continue
    const pool = options.excludeAmbiguous
      ? [...CHARSETS[name]].filter(char => !AMBIGUOUS.includes(char)).join('')
      : CHARSETS[name]
    if (pool)
      required.push(pick(pool))
  }

  if (required.length > options.length)
    throw new Error(`Length must be at least ${required.length} to include every selected set.`)

  const rest = Array.from({ length: options.length - required.length }, () => pick(alphabet))
  return shuffle([...required, ...rest], randomInt).join('')
}

/**
 * Shannon entropy of the generation process, in bits.
 *
 * This measures how hard the password is to guess given that an attacker knows
 * the settings used — which is the assumption to make. Requiring one character
 * from every set shrinks the space slightly, so the true figure is a shade
 * lower than this; the difference is under a bit at realistic lengths.
 */
export function entropyBits(options: PasswordOptions): number {
  const alphabet = buildAlphabet(options)
  if (!alphabet || options.length < 1)
    return 0
  return options.length * Math.log2(alphabet.length)
}

export type Strength = 'weak' | 'fair' | 'strong' | 'excellent'

export function strength(bits: number): Strength {
  if (bits < 50)
    return 'weak'
  if (bits < 70)
    return 'fair'
  if (bits < 100)
    return 'strong'
  return 'excellent'
}

/**
 * Rough time to exhaust the space at a given guess rate, as human text.
 *
 * The default rate assumes an offline attack against a fast hash on capable
 * hardware — the pessimistic case, which is the useful one to plan against.
 */
export function crackTime(bits: number, guessesPerSecond = 1e12): string {
  if (bits <= 0)
    return 'instantly'
  const seconds = 2 ** (bits - 1) / guessesPerSecond
  const units: [number, string][] = [
    [1, 'second'],
    [60, 'minute'],
    [3600, 'hour'],
    [86_400, 'day'],
    [31_557_600, 'year'],
    [31_557_600_000, 'thousand years'],
    [31_557_600_000_000, 'million years'],
    [31_557_600_000_000_000, 'billion years'],
  ]
  if (seconds < 1)
    return 'instantly'
  let chosen = units[0]!
  for (const unit of units) {
    if (seconds >= unit[0])
      chosen = unit
  }
  const value = seconds / chosen[0]
  if (value >= 1000 && chosen[1] === 'billion years')
    return 'longer than the universe has existed'
  const rounded = value >= 10 ? Math.round(value) : Math.round(value * 10) / 10
  return `${rounded.toLocaleString('en')} ${chosen[1]}${rounded === 1 || chosen[1].includes('years') ? '' : 's'}`
}
