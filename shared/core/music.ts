/**
 * Music theory primitives shared by the chord transposer and worship pads.
 *
 * Pure and isomorphic: pitch classes in, note names or frequencies out. No
 * Web Audio, no DOM — the browser layer turns these numbers into sound.
 */

export type Accidental = 'sharp' | 'flat'

const SHARP_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const
const FLAT_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'] as const

/** Semitones above C for each natural note. */
const NATURALS: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }

/**
 * Keys whose signature is written with flats. Transposing into one of these
 * should spell Bb rather than A#, which is the difference between a chart a
 * musician reads fluently and one they have to decode.
 */
const FLAT_KEYS = new Set(['F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Cb', 'Dm', 'Gm', 'Cm', 'Fm', 'Bbm', 'Ebm'])

/** Every key a user can pick from, in circle-of-fifths-friendly order. */
export const KEYS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'] as const

export function isFlatKey(key: string): boolean {
  return FLAT_KEYS.has(key.trim())
}

/** Preferred spelling for a target key — flat keys get flats, everything else sharps. */
export function accidentalForKey(key: string): Accidental {
  return isFlatKey(key) ? 'flat' : 'sharp'
}

/**
 * Parse a note name into a pitch class (0–11). Accepts any number of sharps
 * and flats, so `Fbb` and `G##` both resolve. Returns null for non-notes.
 */
export function noteToPitchClass(note: string): number | null {
  const match = /^([A-G])([#b♯♭]*)$/i.exec(note.trim())
  if (!match)
    return null

  let value = NATURALS[match[1].toUpperCase()]
  for (const char of match[2]) {
    if (char === '#' || char === '♯')
      value += 1
    else
      value -= 1
  }
  return ((value % 12) + 12) % 12
}

export function pitchClassToNote(pitchClass: number, accidental: Accidental = 'sharp'): string {
  const index = ((pitchClass % 12) + 12) % 12
  return accidental === 'flat' ? FLAT_NAMES[index] : SHARP_NAMES[index]
}

/** Semitone distance from one key to another, always 0–11 going upward. */
export function semitonesBetween(from: string, to: string): number | null {
  const a = noteToPitchClass(from)
  const b = noteToPitchClass(to)
  if (a === null || b === null)
    return null
  return ((b - a) % 12 + 12) % 12
}

export function transposeNote(note: string, semitones: number, accidental: Accidental = 'sharp'): string | null {
  const pitchClass = noteToPitchClass(note)
  if (pitchClass === null)
    return null
  return pitchClassToNote(pitchClass + semitones, accidental)
}

/**
 * Equal-tempered frequency for a pitch class in a given octave, A4 = 440 Hz.
 * Octave numbering is scientific pitch notation, so C4 is middle C.
 */
export function noteFrequency(pitchClass: number, octave: number): number {
  const midi = (octave + 1) * 12 + (((pitchClass % 12) + 12) % 12)
  return 440 * 2 ** ((midi - 69) / 12)
}

/**
 * Frequencies for a sustained ambient pad in a key: root, fifth and octave
 * across two registers, plus the third an octave up. Deliberately omits the
 * seventh — pads sit under whatever the band is playing, so the more notes
 * the pad asserts, the more often it fights the chord.
 */
export function padVoicing(key: string, major = true): number[] {
  const root = noteToPitchClass(key)
  if (root === null)
    return []

  const third = root + (major ? 4 : 3)
  const fifth = root + 7

  return [
    noteFrequency(root, 2),
    noteFrequency(root, 3),
    noteFrequency(fifth, 3),
    noteFrequency(root, 4),
    noteFrequency(third, 4),
    noteFrequency(fifth, 4),
  ]
}
