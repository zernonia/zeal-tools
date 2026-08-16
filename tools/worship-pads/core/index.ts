import { CIRCLE_OF_FIFTHS, padVoicing } from '../../../shared/core/music'

/**
 * Worship pads — the pure part. Turns a key into the frequencies a pad should
 * sustain and the keyboard shortcut that selects it. Web Audio lives in the
 * app layer; this file stays isomorphic and testable.
 */

export interface PadKey {
  /** Key name as written on the button, e.g. `Bb`. */
  key: string
  /** Single character that selects this pad. */
  shortcut: string
  /** Frequencies, low to high, for the sustained voicing. */
  voicing: number[]
  /** Degrees clockwise from the top, for laying the keys out on the circle. */
  angle: number
}

/** Shortcuts run 1-9 then 0, a, b — twelve keys, all reachable one-handed. */
const SHORTCUTS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', 'a', 'b'] as const

/**
 * Keys in circle-of-fifths order, so neighbouring buttons are neighbouring
 * keys — a step left or right is the smallest harmonic move available.
 */
export function padKeys(major = true): PadKey[] {
  return CIRCLE_OF_FIFTHS.map((key, index) => ({
    key,
    shortcut: SHORTCUTS[index],
    voicing: padVoicing(key, major),
    angle: index * (360 / CIRCLE_OF_FIFTHS.length),
  }))
}

export function padForShortcut(shortcut: string, major = true): PadKey | null {
  const index = SHORTCUTS.indexOf(shortcut.toLowerCase() as typeof SHORTCUTS[number])
  if (index === -1)
    return null
  return padKeys(major)[index] ?? null
}

/**
 * Crossfade length in seconds. Pads exist to hide the seam between songs, so
 * the default is deliberately long — short fades sound like a mistake.
 */
export const FADE_SECONDS = { min: 0.5, max: 12, default: 4 } as const

export function clampFade(seconds: number): number {
  if (!Number.isFinite(seconds))
    return FADE_SECONDS.default
  return Math.min(FADE_SECONDS.max, Math.max(FADE_SECONDS.min, seconds))
}
