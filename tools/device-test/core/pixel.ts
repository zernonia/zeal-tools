/**
 * Dead pixel test: the screens to show and how to step between them.
 *
 * Each solid colour isolates one failure. A dead pixel (no power reaching it)
 * is black on every screen and easiest to see on white; a stuck sub-pixel is
 * lit all the time and shows as a red, green or blue dot on black; a pixel
 * stuck *off* in one channel shows as a dark dot on that channel's screen.
 */

export interface TestScreen {
  id: string
  name: string
  /** A CSS background value. Explicit colours, not theme tokens: this is a measurement. */
  background: string
  /** What to look for on this screen. */
  hint: string
}

export const SCREENS: readonly TestScreen[] = [
  { id: 'black', name: 'Black', background: '#000000', hint: 'Look for lit dots — a stuck pixel glows red, green, blue or white.' },
  { id: 'white', name: 'White', background: '#ffffff', hint: 'Look for black dots — a dead pixel shows here most clearly.' },
  { id: 'red', name: 'Red', background: '#ff0000', hint: 'Look for dark or off-colour dots — a red sub-pixel that is stuck off.' },
  { id: 'green', name: 'Green', background: '#00ff00', hint: 'Look for dark or off-colour dots — a green sub-pixel that is stuck off.' },
  { id: 'blue', name: 'Blue', background: '#0000ff', hint: 'Look for dark or off-colour dots — a blue sub-pixel that is stuck off.' },
  { id: 'grey', name: 'Grey', background: '#808080', hint: 'Mid-grey shows both bright and dark faults, and uneven backlight as blotches.' },
  { id: 'gradient', name: 'Gradient', background: 'linear-gradient(to right, #000000, #ffffff)', hint: 'Look for banding or steps — a smooth ramp should have no visible stripes.' },
]

/** The next screen, wrapping round. */
export function nextScreen(index: number, count = SCREENS.length): number {
  return count ? (((index + 1) % count) + count) % count : 0
}

/** The previous screen, wrapping round. */
export function previousScreen(index: number, count = SCREENS.length): number {
  return count ? (((index - 1) % count) + count) % count : 0
}

/**
 * Slowest-to-fastest auto-advance choices, in milliseconds.
 *
 * Nothing faster than one change a second is ever offered. Full-screen
 * alternation between saturated colours is the textbook trigger for
 * photosensitive seizures, and WCAG puts the danger threshold at three
 * flashes a second; these stay well under it.
 */
export const AUTO_INTERVALS = [10_000, 5_000, 2_000] as const

/** The fastest auto-advance allowed, whatever is asked for. */
export const MIN_AUTO_INTERVAL_MS = 1000

export function clampInterval(ms: number): number {
  if (!Number.isFinite(ms))
    return AUTO_INTERVALS[0]
  return Math.max(MIN_AUTO_INTERVAL_MS, Math.round(ms))
}

export type PixelAction = 'next' | 'previous' | 'exit' | 'toggle-hint' | null

/** Which keys do what inside the full-screen test. */
export function actionForKey(code: string): PixelAction {
  switch (code) {
    case 'ArrowRight':
    case 'ArrowDown':
    case 'Space':
    case 'Enter':
    case 'PageDown':
      return 'next'
    case 'ArrowLeft':
    case 'ArrowUp':
    case 'Backspace':
    case 'PageUp':
      return 'previous'
    case 'Escape':
      return 'exit'
    case 'KeyH':
      return 'toggle-hint'
    default:
      return null
  }
}
