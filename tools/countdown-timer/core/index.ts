import type { DurationParts, EventPreset } from '../../../shared/core/duration'
import { EVENT_PRESETS, nextOccurrence, splitDuration } from '../../../shared/core/duration'

/**
 * Countdown timer — the pure part. Resolves a target (either a fixed date or a
 * recurring milestone) and reports the gap to it. `now` is always passed in,
 * never read, so every case is testable.
 */

export { EVENT_PRESETS }

export interface CountdownReading extends DurationParts {
  target: Date
  /** Label for the units that matter at this distance. */
  headline: 'days' | 'hours' | 'minutes' | 'seconds'
}

export function presetById(id: string): EventPreset | null {
  return EVENT_PRESETS.find(preset => preset.id === id) ?? null
}

/**
 * Resolve what we are counting to. A preset always resolves to its *next*
 * occurrence so a Christmas countdown keeps working in January.
 */
export function resolveTarget(options: { presetId?: string, isoDate?: string }, now: Date): Date | null {
  if (options.presetId) {
    const preset = presetById(options.presetId)
    if (preset)
      return nextOccurrence(preset, now)
  }
  if (options.isoDate) {
    const parsed = new Date(options.isoDate)
    if (!Number.isNaN(parsed.getTime()))
      return parsed
  }
  return null
}

/** Largest unit still worth showing, so a display can emphasise it. */
function headlineFor(parts: DurationParts): CountdownReading['headline'] {
  if (parts.days > 0)
    return 'days'
  if (parts.hours > 0)
    return 'hours'
  if (parts.minutes > 0)
    return 'minutes'
  return 'seconds'
}

export function readCountdown(target: Date, now: Date): CountdownReading {
  const parts = splitDuration(target.getTime() - now.getTime())
  return { ...parts, target, headline: headlineFor(parts) }
}
