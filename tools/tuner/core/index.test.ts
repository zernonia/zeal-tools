import { describe, expect, it } from 'vitest'
import {
  DEFAULT_A4,
  detectPitch,
  frequencyToMidi,
  isInTune,
  midiToFrequency,
  nearestString,
  readNote,
  rms,
  tuningById,
  TUNINGS,
} from './index'

const RATE = 44100
const N = 8192

/** A tone built from chosen harmonics, so timbre can be part of the test. */
function tone(frequency: number, harmonics: number[] = [1], length = N, rate = RATE): Float32Array {
  const out = new Float32Array(length)
  for (let i = 0; i < length; i++) {
    let value = 0
    harmonics.forEach((amplitude, index) => {
      value += amplitude * Math.sin((2 * Math.PI * frequency * (index + 1) * i) / rate)
    })
    out[i] = value / harmonics.reduce((a, b) => a + Math.abs(b), 0)
  }
  return out
}

function noise(length = N): Float32Array {
  const out = new Float32Array(length)
  // Deterministic, so a flaky run is a real failure rather than bad luck.
  let seed = 12345
  for (let i = 0; i < length; i++) {
    seed = (seed * 1103515245 + 12345) & 0x7FFFFFFF
    out[i] = (seed / 0x7FFFFFFF) * 2 - 1
  }
  return out
}

const cents = (found: number, expected: number) => 1200 * Math.log2(found / expected)

describe('detectPitch', () => {
  it('finds a pure tone across the range a tuner has to cover', () => {
    // Low B on a 5-string bass, up to a violin's top E.
    for (const hz of [30.87, 41.2, 82.41, 110, 196, 440, 659.26, 1046.5]) {
      const found = detectPitch(tone(hz), RATE)
      expect(found, `nothing found at ${hz} Hz`).not.toBeNull()
      expect(Math.abs(cents(found!.frequency, hz)), `${hz} Hz`).toBeLessThan(1)
    }
  })

  it('does not jump an octave when the second harmonic is louder', () => {
    // The failure that matters. A plucked low E often has a fundamental
    // quieter than its first harmonic, and a plain autocorrelation reports
    // the octave above — the classic wrong answer from a naive tuner.
    const plucked = tone(82.41, [0.3, 1, 0.6, 0.4])
    const found = detectPitch(plucked, RATE)
    expect(found).not.toBeNull()
    expect(Math.abs(cents(found!.frequency, 82.41))).toBeLessThan(5)
  })

  it('holds up on a sawtooth, which is every harmonic at once', () => {
    const saw = tone(146.83, [1, 1 / 2, 1 / 3, 1 / 4, 1 / 5, 1 / 6, 1 / 7, 1 / 8])
    const found = detectPitch(saw, RATE)
    expect(found).not.toBeNull()
    expect(Math.abs(cents(found!.frequency, 146.83))).toBeLessThan(5)
  })

  it('says nothing rather than guessing at silence', () => {
    expect(detectPitch(new Float32Array(N), RATE)).toBeNull()
  })

  it('says nothing for a signal too quiet to be a note', () => {
    const faint = tone(220)
    for (let i = 0; i < faint.length; i++) faint[i]! *= 0.001
    expect(detectPitch(faint, RATE)).toBeNull()
  })

  it('says nothing for noise', () => {
    // Room hum and handling should not light up a note.
    expect(detectPitch(noise(), RATE)).toBeNull()
  })

  it('reports how periodic the signal was', () => {
    const clean = detectPitch(tone(220), RATE)!
    expect(clean.clarity).toBeGreaterThan(0.95)
    expect(clean.clarity).toBeLessThanOrEqual(1.0001)
  })

  it('answers inside the window it was given', () => {
    // The window bounds the search, it does not filter the input: a periodic
    // signal peaks at every multiple of its period, so a 440 Hz tone searched
    // only below 200 Hz comes back as a subharmonic rather than as nothing.
    // Worth pinning, because it is the trap in narrowing the range per
    // instrument — which is why the shipped range covers every instrument.
    const found = detectPitch(tone(440), RATE, { maxFrequency: 200 })
    expect(found).not.toBeNull()
    expect(found!.frequency).toBeLessThanOrEqual(200)
  })

  it('survives a buffer too short to hold a period', () => {
    expect(() => detectPitch(tone(41.2, [1], 256), RATE)).not.toThrow()
  })

  it('is accurate enough to resolve a cent', () => {
    // A tuner that quantises to whole samples steps by ~19 cents at low E,
    // so the parabolic interpolation is load-bearing, not a nicety.
    const sharp = 82.41 * 2 ** (5 / 1200)
    const found = detectPitch(tone(sharp), RATE)!
    expect(readNote(found.frequency).cents).toBeGreaterThanOrEqual(4)
    expect(readNote(found.frequency).cents).toBeLessThanOrEqual(6)
  })
})

describe('rms', () => {
  it('is zero for silence and near 0.707 for a full-scale sine', () => {
    expect(rms(new Float32Array(64))).toBe(0)
    expect(rms(tone(440))).toBeCloseTo(0.707, 1)
  })

  it('does not divide by zero on an empty buffer', () => {
    expect(rms(new Float32Array(0))).toBe(0)
  })
})

describe('readNote', () => {
  it('names the reference pitch exactly', () => {
    const a = readNote(440)
    expect(a.note).toBe('A')
    expect(a.octave).toBe(4)
    expect(a.cents).toBe(0)
    expect(a.midi).toBe(69)
  })

  it('names notes across the octaves, in scientific pitch', () => {
    expect(readNote(82.41)).toMatchObject({ note: 'E', octave: 2 })
    expect(readNote(261.63)).toMatchObject({ note: 'C', octave: 4 })
    expect(readNote(30.87)).toMatchObject({ note: 'B', octave: 0 })
    expect(readNote(659.26)).toMatchObject({ note: 'E', octave: 5 })
  })

  it('signs cents so flat is negative', () => {
    expect(readNote(440 * 2 ** (-10 / 1200)).cents).toBe(-10)
    expect(readNote(440 * 2 ** (10 / 1200)).cents).toBe(10)
  })

  it('never reports more than half a semitone out', () => {
    // Past 50 cents it is the next note, and saying otherwise misleads.
    for (const hz of [100, 123.4, 200, 333, 512, 777])
      expect(Math.abs(readNote(hz).cents)).toBeLessThanOrEqual(50)
  })

  it('follows a different concert pitch', () => {
    // Baroque ensembles tune to 415, where that air is their A.
    expect(readNote(415, 415)).toMatchObject({ note: 'A', octave: 4, cents: 0 })
    // Against concert pitch the very same air is a different NOTE, not a
    // badly flat A — 415 Hz is within a cent of G#4.
    const atConcert = readNote(415, 440)
    expect(atConcert.note).toBe('G#')
    expect(atConcert.octave).toBe(4)
    expect(Math.abs(atConcert.cents)).toBeLessThanOrEqual(2)
  })

  it('round-trips through midi', () => {
    for (const midi of [28, 40, 60, 69, 76])
      expect(Math.round(frequencyToMidi(midiToFrequency(midi)))).toBe(midi)
  })
})

describe('isInTune', () => {
  it('allows a few cents either way', () => {
    expect(isInTune(0)).toBe(true)
    expect(isInTune(-5)).toBe(true)
    expect(isInTune(6)).toBe(false)
  })
})

describe('tunings', () => {
  it('puts standard guitar on the right notes', () => {
    const guitar = tuningById('guitar-standard')!
    expect(guitar.strings.map(s => `${s.note}${s.octave}`)).toEqual(['E2', 'A2', 'D3', 'G3', 'B3', 'E4'])
    expect(guitar.strings[0]!.midi).toBe(40)
    expect(midiToFrequency(guitar.strings[0]!.midi)).toBeCloseTo(82.41, 1)
  })

  it('drops only the sixth string for drop D', () => {
    const standard = tuningById('guitar-standard')!.strings.map(s => s.midi)
    const drop = tuningById('guitar-drop-d')!.strings.map(s => s.midi)
    expect(drop[0]).toBe(standard[0]! - 2)
    expect(drop.slice(1)).toEqual(standard.slice(1))
  })

  it('keeps the ukulele re-entrant, with its G above the C', () => {
    // The classic mistake is sorting the strings by pitch: on a ukulele the
    // fourth string is higher than the third.
    const uke = tuningById('ukulele')!
    expect(uke.strings.map(s => `${s.note}${s.octave}`)).toEqual(['G4', 'C4', 'E4', 'A4'])
    expect(uke.strings[0]!.midi).toBeGreaterThan(uke.strings[1]!.midi)
  })

  it('tunes a violin in fifths', () => {
    const midis = tuningById('violin')!.strings.map(s => s.midi)
    for (let i = 1; i < midis.length; i++)
      expect(midis[i]! - midis[i - 1]!).toBe(7)
  })

  it('labels guitar strings by number and ukulele by note', () => {
    expect(tuningById('guitar-standard')!.strings.map(s => s.label)).toEqual(['6', '5', '4', '3', '2', '1'])
    expect(tuningById('ukulele')!.strings.map(s => s.label)).toEqual(['G', 'C', 'E', 'A'])
  })

  it('gives every tuning a unique id', () => {
    expect(new Set(TUNINGS.map(t => t.id)).size).toBe(TUNINGS.length)
  })
})

describe('nearestString', () => {
  const guitar = tuningById('guitar-standard')!

  it('picks the string being aimed at', () => {
    expect(nearestString(82.41, guitar)!.label).toBe('6')
    expect(nearestString(329.63, guitar)!.label).toBe('1')
  })

  it('still picks it when the string is badly out', () => {
    // A whole tone flat is common on a fresh string and must still match.
    expect(nearestString(82.41 * 2 ** (-2 / 12), guitar)!.label).toBe('6')
  })

  it('measures in semitones, not hertz', () => {
    // In hertz the low strings are always nearer; a note between B3 and E4
    // must resolve musically, not arithmetically.
    const between = midiToFrequency(61) // C#4, closer to B3 in semitones
    expect(nearestString(between, guitar)!.label).toBe('2')
  })

  it('says nothing when the note is nowhere near the instrument', () => {
    expect(nearestString(1200, guitar)).toBeNull()
    expect(nearestString(35, guitar)).toBeNull()
  })

  it('uses the reference pitch it is given', () => {
    expect(nearestString(82.41 * (415 / 440), guitar, 415)!.label).toBe('6')
  })
})

describe('reference pitch', () => {
  it('defaults to concert A', () => {
    expect(DEFAULT_A4).toBe(440)
  })
})
