/**
 * Metronome arithmetic: when each click falls and what kind of click it is.
 *
 * Nothing here knows about Web Audio. The scheduler is a pure function from
 * "where the clock is" to "the clicks due before the horizon", so its timing
 * can be checked to the microsecond in a unit test instead of by ear.
 */

export const MIN_BPM = 20
export const MAX_BPM = 300
export const MAX_BEATS = 12

/** Clicks per beat: quarters, eighths, triplets, sixteenths. */
export type Subdivision = 1 | 2 | 3 | 4

export const SUBDIVISIONS: readonly { value: Subdivision, label: string }[] = [
  { value: 1, label: 'Beats' },
  { value: 2, label: 'Eighths' },
  { value: 3, label: 'Triplets' },
  { value: 4, label: 'Sixteenths' },
]

/** What a beat does: stand out, click, or stay silent. */
export type BeatLevel = 'accent' | 'normal' | 'mute'

/** What actually sounds on one tick — subdivisions get their own, quieter click. */
export type ClickKind = BeatLevel | 'sub'

export function clampBpm(bpm: number): number {
  if (!Number.isFinite(bpm))
    return 120
  return Math.min(MAX_BPM, Math.max(MIN_BPM, Math.round(bpm)))
}

export function clampBeats(beats: number): number {
  if (!Number.isFinite(beats))
    return 4
  return Math.min(MAX_BEATS, Math.max(1, Math.round(beats)))
}

export function asSubdivision(value: number): Subdivision {
  return value === 2 || value === 3 || value === 4 ? value : 1
}

export function secondsPerTick(bpm: number, subdivision: Subdivision): number {
  return 60 / clampBpm(bpm) / subdivision
}

/**
 * The beat pattern, in the URL as one letter per beat: `a`ccent, `n`ormal,
 * `m`ute. An empty or short pattern falls back to the usual default — beat
 * one accented, the rest normal — so `?beats=7` alone means something.
 */
export function parsePattern(pattern: string, beats: number): BeatLevel[] {
  const out: BeatLevel[] = []
  for (let i = 0; i < clampBeats(beats); i++) {
    const letter = pattern[i]
    out.push(letter === 'a' ? 'accent' : letter === 'm' ? 'mute' : letter === 'n' ? 'normal' : i === 0 ? 'accent' : 'normal')
  }
  return out
}

export function formatPattern(levels: readonly BeatLevel[]): string {
  return levels.map(level => level[0]).join('')
}

/** Clicking a beat cycles it: accent → normal → mute → accent. */
export function nextLevel(level: BeatLevel): BeatLevel {
  return level === 'accent' ? 'normal' : level === 'normal' ? 'mute' : 'accent'
}

/**
 * What sounds on tick `tick` (counted from the start, across bars).
 *
 * Off-beat subdivisions take the `sub` click, except under a muted beat,
 * where they are silent too — muting beat 3 should silence beat 3, not leave
 * its eighth-note tail ticking on its own.
 */
export function clickFor(tick: number, levels: readonly BeatLevel[], subdivision: Subdivision): { beat: number, kind: ClickKind } {
  const perBar = levels.length * subdivision
  const inBar = ((tick % perBar) + perBar) % perBar
  const beat = Math.floor(inBar / subdivision)
  const level = levels[beat] ?? 'normal'
  if (inBar % subdivision === 0 || level === 'mute')
    return { beat, kind: level }
  return { beat, kind: 'sub' }
}

export interface ScheduledClick {
  tick: number
  /** Audio-clock time, in seconds. */
  time: number
  beat: number
  kind: ClickKind
}

/** A tick pinned to an audio-clock time; every later click is measured from it. */
export interface Anchor { tick: number, time: number }

/**
 * Every click from `fromTick` that is due before `horizon`.
 *
 * This is the lookahead half of the standard Web Audio scheduling pattern: a
 * coarse timer wakes every ~25 ms and asks for everything due in the next
 * ~100 ms, and each click is then started *on the audio clock* at its exact
 * time. The timer can be late by tens of milliseconds without the beat moving
 * at all — which is the difference between this and a `setInterval` click,
 * whose jitter you can hear.
 *
 * Times are `anchor + ticks × interval`, never a running sum, so no
 * floating-point error accumulates over an hour of practice.
 */
export function scheduleClicks(
  anchor: Anchor,
  fromTick: number,
  horizon: number,
  bpm: number,
  levels: readonly BeatLevel[],
  subdivision: Subdivision,
): ScheduledClick[] {
  const interval = secondsPerTick(bpm, subdivision)
  const out: ScheduledClick[] = []
  for (let tick = fromTick; ; tick++) {
    const time = anchor.time + (tick - anchor.tick) * interval
    if (time >= horizon)
      break
    out.push({ tick, time, ...clickFor(tick, levels, subdivision) })
  }
  return out
}

/**
 * Re-pin the clock when tempo or subdivision changes mid-play.
 *
 * The change lands on the next beat, computed under the old settings, so the
 * beat you are on finishes at the speed it started and the count is not
 * lost: beat five stays beat five at the new tempo. Off-beat ticks of the
 * old subdivision between now and that beat are skipped rather than squeezed
 * in at the new spacing.
 */
export function reanchor(
  anchor: Anchor,
  nextTick: number,
  old: { bpm: number, subdivision: Subdivision },
  subdivision: Subdivision,
): Anchor {
  const beatTick = Math.ceil(nextTick / old.subdivision) * old.subdivision
  const time = anchor.time + (beatTick - anchor.tick) * secondsPerTick(old.bpm, old.subdivision)
  return { tick: (beatTick / old.subdivision) * subdivision, time }
}

/** Gap after which tapping starts over rather than averaging in a pause. */
export const TAP_RESET_MS = 2000

/**
 * Tempo from tap times in milliseconds, or null until there are two taps.
 *
 * Uses the median gap rather than the mean, so one fumbled tap does not drag
 * the result; only the last eight taps count, so the reading follows you if
 * you speed up. Taps after a long pause start a fresh measurement.
 */
export function tapTempo(taps: readonly number[]): number | null {
  let from = 0
  for (let i = 1; i < taps.length; i++) {
    if (taps[i]! - taps[i - 1]! > TAP_RESET_MS)
      from = i
  }
  const recent = taps.slice(Math.max(from, taps.length - 8))
  if (recent.length < 2)
    return null
  const gaps = recent.slice(1).map((t, i) => t - recent[i]!).sort((a, b) => a - b)
  const mid = gaps.length / 2
  const median = gaps.length % 2 ? gaps[Math.floor(mid)]! : (gaps[mid - 1]! + gaps[mid]!) / 2
  if (median <= 0)
    return null
  return clampBpm(60_000 / median)
}

/**
 * The conventional Italian marking for a tempo.
 *
 * Ranges differ between sources by a few BPM; these follow the common modern
 * metronome-face values, and are a guide, not a rule.
 */
const MARKINGS: readonly [number, string][] = [
  [40, 'Grave'],
  [60, 'Largo'],
  [66, 'Larghetto'],
  [76, 'Adagio'],
  [108, 'Andante'],
  [120, 'Moderato'],
  [156, 'Allegro'],
  [176, 'Vivace'],
  [200, 'Presto'],
]

export function tempoMarking(bpm: number): string {
  const value = clampBpm(bpm)
  for (const [below, name] of MARKINGS) {
    if (value < below)
      return name
  }
  return 'Prestissimo'
}

/** Pitch and level for each click — distinct enough to tell apart without looking. */
export const CLICK_SOUND: Record<Exclude<ClickKind, 'mute'>, { frequency: number, gain: number }> = {
  accent: { frequency: 1760, gain: 1 },
  normal: { frequency: 1320, gain: 0.6 },
  sub: { frequency: 880, gain: 0.3 },
}
