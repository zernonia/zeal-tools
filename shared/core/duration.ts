/**
 * Duration formatting and countdown arithmetic, shared by the stage timer and
 * the countdown timer. Pure: milliseconds in, numbers and strings out.
 */

export interface DurationParts {
  /** True when the target has already passed. */
  past: boolean
  days: number
  hours: number
  minutes: number
  seconds: number
  totalSeconds: number
}

export function splitDuration(ms: number): DurationParts {
  const past = ms < 0
  const totalSeconds = Math.floor(Math.abs(ms) / 1000)
  return {
    past,
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor(totalSeconds / 3600) % 24,
    minutes: Math.floor(totalSeconds / 60) % 60,
    seconds: totalSeconds % 60,
    totalSeconds,
  }
}

/**
 * Clock-style duration: `4:59`, `1:02:03`, or `-0:12` once it runs past zero.
 * Hours only appear when there are any, so a five-minute countdown does not
 * read `0:04:59` across a room.
 */
export function formatClock(ms: number): string {
  const { past, hours, minutes, seconds, totalSeconds } = splitDuration(ms)
  const pad = (n: number) => String(n).padStart(2, '0')
  const body = hours > 0
    ? `${hours}:${pad(minutes)}:${pad(seconds)}`
    : `${Math.floor(totalSeconds / 60)}:${pad(seconds)}`
  return past ? `-${body}` : body
}

export type TimerPhase = 'normal' | 'warn' | 'over'

/**
 * Which visual state a running timer is in. Thresholds are in seconds
 * remaining; `over` wins as soon as the clock passes zero regardless of them.
 */
export function timerPhase(remainingMs: number, warnSeconds: number): TimerPhase {
  if (remainingMs <= 0)
    return 'over'
  if (warnSeconds > 0 && remainingMs <= warnSeconds * 1000)
    return 'warn'
  return 'normal'
}

/**
 * Anonymous Gregorian Computus. Returns the date of Easter Sunday (UTC) for a
 * year — the anchor every moveable feast hangs off, and the only genuinely
 * interesting date arithmetic in the countdown presets.
 */
export function easterSunday(year: number): Date {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31)
  const day = ((h + l - 7 * m + 114) % 31) + 1
  return new Date(Date.UTC(year, month - 1, day))
}

export interface EventPreset {
  id: string
  label: string
  /** Date of this event in a given year, at local midnight. */
  dateFor: (year: number) => Date
}

/** Common milestones people count down to, so the tool works without a date picker. */
export const EVENT_PRESETS: EventPreset[] = [
  { id: 'new-year', label: 'New Year', dateFor: year => new Date(year, 0, 1) },
  { id: 'easter', label: 'Easter Sunday', dateFor: (year) => {
    const utc = easterSunday(year)
    return new Date(year, utc.getUTCMonth(), utc.getUTCDate())
  } },
  { id: 'halloween', label: 'Halloween', dateFor: year => new Date(year, 9, 31) },
  { id: 'christmas', label: 'Christmas Day', dateFor: year => new Date(year, 11, 25) },
]

/**
 * The next time this event occurs on or after `from`. Rolls into next year
 * once this year's date has passed, so a preset is never stale.
 */
export function nextOccurrence(preset: EventPreset, from: Date): Date {
  const thisYear = preset.dateFor(from.getFullYear())
  if (thisYear.getTime() >= from.getTime())
    return thisYear
  return preset.dateFor(from.getFullYear() + 1)
}
