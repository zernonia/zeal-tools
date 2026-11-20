/**
 * Microphone test maths: levels in dBFS, peak hold, and the frequency bars.
 *
 * dBFS is decibels relative to full scale — 0 dBFS is the loudest sample the
 * format can hold, and everything real is negative. It is the only honest
 * unit for a browser meter: no page can know the microphone's sensitivity,
 * so a "dB SPL" reading would be invented.
 */

/** Below this the meter reads as silence; 16-bit audio bottoms out near −96. */
export const DB_FLOOR = -100

/** Root mean square of a block of samples in the range −1…1. */
export function rms(samples: ArrayLike<number>): number {
  if (!samples.length)
    return 0
  let sum = 0
  for (let i = 0; i < samples.length; i++) {
    const s = samples[i]!
    sum += s * s
  }
  return Math.sqrt(sum / samples.length)
}

/** Largest absolute sample — what decides whether the input clips. */
export function peak(samples: ArrayLike<number>): number {
  let max = 0
  for (let i = 0; i < samples.length; i++) {
    const s = Math.abs(samples[i]!)
    if (s > max)
      max = s
  }
  return max
}

/** A linear amplitude (1 = full scale) in dBFS, floored so silence is finite. */
export function toDbfs(amplitude: number): number {
  if (!(amplitude > 0))
    return DB_FLOOR
  return Math.max(DB_FLOOR, 20 * Math.log10(amplitude))
}

/** dBFS back to a linear amplitude. */
export function fromDbfs(db: number): number {
  return 10 ** (db / 20)
}

/**
 * Where a level sits on a meter that spans `floor`…0 dBFS, as 0…1.
 * Linear in decibels, which is how loudness is perceived.
 */
export function meterFraction(db: number, floor = -60): number {
  if (db <= floor)
    return 0
  if (db >= 0)
    return 1
  return (db - floor) / -floor
}

export type LevelVerdict = 'silent' | 'quiet' | 'good' | 'loud' | 'clipping'

/**
 * A plain-words reading of a level. The thresholds are for speech at a normal
 * distance: conversation into a laptop microphone typically peaks around −20
 * to −10 dBFS.
 */
export function levelVerdict(rmsDb: number, peakDb: number): LevelVerdict {
  if (peakDb >= -0.5)
    return 'clipping'
  if (rmsDb < -70)
    return 'silent'
  if (rmsDb < -45)
    return 'quiet'
  if (peakDb > -3)
    return 'loud'
  return 'good'
}

export const VERDICT_TEXT: Record<LevelVerdict, string> = {
  silent: 'No signal — nothing is reaching the browser',
  quiet: 'Very quiet — move closer or raise the input gain',
  good: 'Good level',
  loud: 'Loud — close to the top of the scale',
  clipping: 'Clipping — the input is overloading',
}

export interface PeakHold {
  db: number
  /** When the held value was set, in milliseconds. */
  at: number
}

/**
 * The marker that sits at the loudest recent level and then falls back.
 *
 * Holds for `holdMs`, then falls at `fallDbPerSecond`, but never below the
 * live level. A meter with no hold makes peaks invisible: they last a few
 * milliseconds and the eye never sees them.
 */
export function updatePeakHold(
  held: PeakHold,
  level: number,
  now: number,
  holdMs = 1500,
  fallDbPerSecond = 20,
): PeakHold {
  if (level >= held.db)
    return { db: level, at: now }
  const since = now - held.at
  if (since <= holdMs)
    return held
  const fallen = held.db - ((since - holdMs) / 1000) * fallDbPerSecond
  return fallen <= level ? { db: level, at: now } : { db: fallen, at: held.at }
}

/**
 * Collapse an analyser's byte spectrum (0…255 per bin) into `count` bars on a
 * logarithmic frequency axis, each 0…1.
 *
 * Linear bins put almost everything a voice does into the first few bars;
 * spacing them logarithmically gives each octave the same width, which is
 * how pitch is heard. The lowest bin (DC) is skipped.
 */
export function frequencyBars(bins: ArrayLike<number>, count: number): number[] {
  const n = bins.length
  const bars = Array.from<number>({ length: count }).fill(0)
  if (n < 2 || count < 1)
    return bars
  const lo = 1
  const ratio = n / lo
  for (let b = 0; b < count; b++) {
    const start = Math.floor(lo * ratio ** (b / count))
    const end = Math.max(start + 1, Math.floor(lo * ratio ** ((b + 1) / count)))
    let max = 0
    for (let i = start; i < Math.min(end, n); i++)
      max = Math.max(max, bins[i]!)
    bars[b] = max / 255
  }
  return bars
}

/**
 * The first recording format the browser can actually produce. Chrome and
 * Firefox record Opus in WebM or Ogg; Safari records AAC in MP4.
 */
export const RECORDING_TYPES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/mp4',
  'audio/ogg;codecs=opus',
] as const

export function pickMimeType(candidates: readonly string[], isSupported: (type: string) => boolean): string {
  return candidates.find(type => isSupported(type)) ?? ''
}

/** Recording length the UI offers, clamped so a stuck button cannot fill memory. */
export const MAX_RECORDING_SECONDS = 10

export function clampRecordingSeconds(seconds: number): number {
  if (!Number.isFinite(seconds))
    return 5
  return Math.min(MAX_RECORDING_SECONDS, Math.max(1, Math.round(seconds)))
}

export function formatDb(db: number): string {
  if (db <= DB_FLOOR)
    return '−∞ dBFS'
  // A real minus sign, which reads correctly to screen readers and lines up.
  return `${db < 0 ? '−' : ''}${Math.abs(db).toFixed(1)} dBFS`
}

export function formatSampleRate(rate: number | undefined): string {
  if (!rate)
    return 'Not reported'
  return `${(rate / 1000).toLocaleString('en-GB', { maximumFractionDigits: 1 })} kHz`
}

export function formatChannels(count: number | undefined): string {
  if (!count)
    return 'Not reported'
  if (count === 1)
    return 'Mono (1)'
  if (count === 2)
    return 'Stereo (2)'
  return `${count} channels`
}

/** Above this the meter turns amber: speech peaking here has little headroom left. */
export const HOT_DB = -12
/** Above this it turns red: one loud consonant from clipping. */
export const OVER_DB = -3

export type MeterZone = 'safe' | 'hot' | 'over'

/** Which coloured band of the meter a level falls in. */
export function meterZone(db: number): MeterZone {
  if (db >= OVER_DB)
    return 'over'
  return db >= HOT_DB ? 'hot' : 'safe'
}

/** The scale printed under the meter, each with its position on it (0…1). */
export function meterTicks(floor = -60): { db: number, at: number }[] {
  return [-60, -48, -36, -24, -12, -6, 0]
    .filter(db => db >= floor)
    .map(db => ({ db, at: meterFraction(db, floor) }))
}

export type VerdictTone = 'muted' | 'caution' | 'clear' | 'danger'

/** The colour each reading is shown in. */
export const VERDICT_TONE: Record<LevelVerdict, VerdictTone> = {
  silent: 'muted',
  quiet: 'caution',
  good: 'clear',
  loud: 'caution',
  clipping: 'danger',
}

/** The badge's word for each reading; VERDICT_TEXT says what to do about it. */
export const VERDICT_SHORT: Record<LevelVerdict, string> = {
  silent: 'No signal',
  quiet: 'Too quiet',
  good: 'Sounds good',
  loud: 'Loud',
  clipping: 'Clipping',
}

/**
 * Append a level to a fixed-length history, dropping the oldest. Mutates and
 * returns the array: it runs twenty times a second for as long as the test is
 * open, and a fresh array each time would be garbage for nothing.
 */
export function pushLevel(history: number[], db: number, max: number): number[] {
  history.push(db)
  if (history.length > max)
    history.splice(0, history.length - max)
  return history
}
