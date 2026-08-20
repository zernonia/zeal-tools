import { pitchClassToNote } from '../../../shared/core/music'

/**
 * Tuner — the pure part.
 *
 * The microphone is the browser's business; everything that decides what note
 * you are playing lives here, takes a buffer of samples and returns numbers.
 * That is what makes it testable: a sine wave at a known frequency is a
 * complete test case, and an instrument's actual timbre — a fundamental buried
 * under louder harmonics — can be synthesised and checked the same way.
 */

/** Concert pitch. Adjustable because not every ensemble tunes to 440. */
export const DEFAULT_A4 = 440

/** The lowest note a tuner here needs to hear: a 5-string bass low B is 30.9 Hz. */
const MIN_FREQUENCY = 28
/** Comfortably above a violin's top E (659 Hz) and its first harmonic. */
const MAX_FREQUENCY = 1400

export interface PitchOptions {
  minFrequency?: number
  maxFrequency?: number
  /**
   * How clear a periodic peak has to be, 0–1. Below about 0.8 the detector
   * starts reporting a pitch for room noise.
   */
  clarity?: number
  /** Silence gate, as RMS amplitude. */
  minRms?: number
}

export interface PitchResult {
  frequency: number
  /** 0–1: how strongly periodic the signal was. Useful for a confidence UI. */
  clarity: number
}

export function rms(samples: Float32Array): number {
  let sum = 0
  for (let i = 0; i < samples.length; i++)
    sum += samples[i]! * samples[i]!
  return Math.sqrt(sum / Math.max(1, samples.length))
}

/**
 * Find the fundamental, by the McLeod pitch method.
 *
 * A plain autocorrelation is the obvious approach and octave-errors badly on
 * plucked strings, where the second harmonic is frequently louder than the
 * fundamental — it happily reports a low E as the E an octave up. The
 * normalised square difference used here divides out the signal's own energy
 * at each lag, which keeps the peak at the true period, and picking the FIRST
 * peak that clears a threshold rather than the tallest is what stops a strong
 * harmonic winning.
 *
 * Returns null for silence or for a signal with no clear period, which is the
 * honest answer while someone is still reaching for the string.
 *
 * The frequency window bounds the SEARCH, not the input. A periodic signal
 * peaks at every multiple of its period, so a note above `maxFrequency` comes
 * back as a subharmonic inside the window rather than as nothing — which is
 * why the shipped range spans every instrument instead of narrowing per
 * instrument, and why the string being aimed at is chosen afterwards.
 */
export function detectPitch(
  samples: Float32Array,
  sampleRate: number,
  options: PitchOptions = {},
): PitchResult | null {
  const minFrequency = options.minFrequency ?? MIN_FREQUENCY
  const maxFrequency = options.maxFrequency ?? MAX_FREQUENCY
  const clarityFloor = options.clarity ?? 0.9
  const minRms = options.minRms ?? 0.01

  if (rms(samples) < minRms)
    return null

  const minLag = Math.max(2, Math.floor(sampleRate / maxFrequency))
  const maxLag = Math.min(Math.floor(samples.length / 2), Math.ceil(sampleRate / minFrequency))
  if (maxLag <= minLag)
    return null

  // NSDF: 2·Σ x[i]·x[i+τ] divided by Σ (x[i]² + x[i+τ]²) over the same window.
  const nsdf = new Float32Array(maxLag + 1)
  for (let lag = minLag; lag <= maxLag; lag++) {
    let correlation = 0
    let energy = 0
    const span = samples.length - lag
    for (let i = 0; i < span; i++) {
      const a = samples[i]!
      const b = samples[i + lag]!
      correlation += a * b
      energy += a * a + b * b
    }
    nsdf[lag] = energy > 0 ? (2 * correlation) / energy : 0
  }

  // The tallest peak sets the bar; the first peak to clear it is the period.
  // Taking the tallest outright is what produces octave errors.
  let best = 0
  for (let lag = minLag; lag <= maxLag; lag++) {
    if (nsdf[lag]! > best)
      best = nsdf[lag]!
  }
  if (best < clarityFloor)
    return null

  const cutoff = best * 0.93
  let chosen = -1
  for (let lag = minLag + 1; lag < maxLag; lag++) {
    const value = nsdf[lag]!
    if (value > cutoff && value >= nsdf[lag - 1]! && value >= nsdf[lag + 1]!) {
      chosen = lag
      break
    }
  }
  if (chosen < 0)
    return null

  // Parabolic interpolation: without it the reading quantises to whole
  // samples, which at 82 Hz is a step of nearly a fifth of a semitone.
  const y0 = nsdf[chosen - 1]!
  const y1 = nsdf[chosen]!
  const y2 = nsdf[chosen + 1]!
  const denominator = 2 * (2 * y1 - y0 - y2)
  const shift = denominator === 0 ? 0 : (y2 - y0) / denominator
  const period = chosen + shift

  const frequency = sampleRate / period
  if (!Number.isFinite(frequency) || frequency < minFrequency || frequency > maxFrequency)
    return null

  return { frequency, clarity: y1 }
}

// ------------------------------------------------------------------ note maths

export interface NoteReading {
  /** Scientific pitch notation name, e.g. "E". */
  note: string
  /** Scientific pitch octave, so middle C is C4. */
  octave: number
  /** How far from that note, in cents. Negative is flat. */
  cents: number
  /** The frequency that note should be at, given the reference. */
  target: number
  /** MIDI note number, rounded. */
  midi: number
}

/** Equal-tempered frequency for a MIDI note against a chosen reference. */
export function midiToFrequency(midi: number, a4 = DEFAULT_A4): number {
  return a4 * 2 ** ((midi - 69) / 12)
}

export function frequencyToMidi(frequency: number, a4 = DEFAULT_A4): number {
  return 69 + 12 * Math.log2(frequency / a4)
}

/** What note a frequency is, and by how much it misses. */
export function readNote(frequency: number, a4 = DEFAULT_A4): NoteReading {
  const exact = frequencyToMidi(frequency, a4)
  const midi = Math.round(exact)
  return {
    note: pitchClassToNote(((midi % 12) + 12) % 12),
    // MIDI 12 is C0, so the octave is one less than the naive division.
    octave: Math.floor(midi / 12) - 1,
    cents: Math.round((exact - midi) * 100),
    target: midiToFrequency(midi, a4),
    midi,
  }
}

/** Within this many cents counts as in tune — the tolerance a tuner shows green. */
export const IN_TUNE_CENTS = 5

export function isInTune(cents: number, tolerance = IN_TUNE_CENTS): boolean {
  return Math.abs(cents) <= tolerance
}

// -------------------------------------------------------------------- tunings

export interface TuningString {
  /** What is printed on the peg, e.g. "6" or "G". */
  label: string
  midi: number
  note: string
  octave: number
}

export interface Tuning {
  id: string
  name: string
  instrument: string
  /** Low string first, as they sit on the instrument. */
  strings: TuningString[]
}

/** Build strings from scientific pitch names, e.g. `['E2', 'A2']`. */
function strings(names: string[], labels?: string[]): TuningString[] {
  const CHROMATIC: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }
  return names.map((name, i) => {
    const match = /^([A-G])([#b]?)(-?\d+)$/.exec(name)
    if (!match)
      throw new Error(`Unreadable note: ${name}`)
    const [, letter, accidental, octaveText] = match
    const octave = Number(octaveText)
    const pitchClass = CHROMATIC[letter!]! + (accidental === '#' ? 1 : accidental === 'b' ? -1 : 0)
    const midi = (octave + 1) * 12 + pitchClass
    return {
      label: labels?.[i] ?? String(names.length - i),
      midi,
      note: pitchClassToNote(((pitchClass % 12) + 12) % 12),
      octave,
    }
  })
}

/**
 * The tunings worth shipping.
 *
 * Deliberately short: a tuner offering forty exotic tunings buries the six
 * people actually use. Anything not here still tunes fine in chromatic mode,
 * which is the default for exactly that reason.
 */
export const TUNINGS: Tuning[] = [
  { id: 'guitar-standard', name: 'Standard', instrument: 'Guitar', strings: strings(['E2', 'A2', 'D3', 'G3', 'B3', 'E4']) },
  { id: 'guitar-drop-d', name: 'Drop D', instrument: 'Guitar', strings: strings(['D2', 'A2', 'D3', 'G3', 'B3', 'E4']) },
  { id: 'guitar-half-step', name: 'Half step down', instrument: 'Guitar', strings: strings(['Eb2', 'Ab2', 'Db3', 'Gb3', 'Bb3', 'Eb4']) },
  { id: 'guitar-open-g', name: 'Open G', instrument: 'Guitar', strings: strings(['D2', 'G2', 'D3', 'G3', 'B3', 'D4']) },
  { id: 'bass-standard', name: 'Standard', instrument: 'Bass', strings: strings(['E1', 'A1', 'D2', 'G2']) },
  { id: 'bass-5', name: '5-string', instrument: 'Bass', strings: strings(['B0', 'E1', 'A1', 'D2', 'G2']) },
  { id: 'ukulele', name: 'Standard (re-entrant)', instrument: 'Ukulele', strings: strings(['G4', 'C4', 'E4', 'A4'], ['G', 'C', 'E', 'A']) },
  { id: 'violin', name: 'Standard', instrument: 'Violin', strings: strings(['G3', 'D4', 'A4', 'E5'], ['G', 'D', 'A', 'E']) },
]

export function tuningById(id: string): Tuning | undefined {
  return TUNINGS.find(t => t.id === id)
}

/**
 * Which string someone is aiming at.
 *
 * By distance in semitones rather than in hertz: hertz distance would always
 * favour the low strings, where the same musical interval spans far fewer of
 * them. Returns null when the note is more than three semitones from anything
 * in the tuning, because at that point guessing a string is worse than saying
 * nothing.
 */
export function nearestString(frequency: number, tuning: Tuning, a4 = DEFAULT_A4): TuningString | null {
  const midi = frequencyToMidi(frequency, a4)
  let best: TuningString | null = null
  let bestDistance = Infinity
  for (const string of tuning.strings) {
    const distance = Math.abs(midi - string.midi)
    if (distance < bestDistance) {
      bestDistance = distance
      best = string
    }
  }
  return bestDistance <= 3 ? best : null
}
