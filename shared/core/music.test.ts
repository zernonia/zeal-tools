import { describe, expect, it } from 'vitest'
import {
  accidentalForKey,
  noteFrequency,
  noteToPitchClass,
  padVoicing,
  pitchClassToNote,
  semitonesBetween,
  transposeNote,
} from './music'

describe('noteToPitchClass', () => {
  it('maps the naturals', () => {
    expect(['C', 'D', 'E', 'F', 'G', 'A', 'B'].map(noteToPitchClass)).toEqual([0, 2, 4, 5, 7, 9, 11])
  })

  it('handles sharps, flats and unicode accidentals', () => {
    expect(noteToPitchClass('C#')).toBe(1)
    expect(noteToPitchClass('Db')).toBe(1)
    expect(noteToPitchClass('C♯')).toBe(1)
    expect(noteToPitchClass('D♭')).toBe(1)
  })

  it('wraps around the octave boundary in both directions', () => {
    expect(noteToPitchClass('B#')).toBe(0)
    expect(noteToPitchClass('Cb')).toBe(11)
    expect(noteToPitchClass('Fbb')).toBe(3)
  })

  it('is case insensitive on the letter and tolerates whitespace', () => {
    expect(noteToPitchClass(' g# ')).toBe(8)
  })

  it('rejects things that are not notes', () => {
    for (const bad of ['H', '', 'C#b#x', 'Amaj7', '7'])
      expect(noteToPitchClass(bad)).toBeNull()
  })
})

describe('spelling', () => {
  it('prefers flats for flat keys and sharps elsewhere', () => {
    expect(accidentalForKey('Eb')).toBe('flat')
    expect(accidentalForKey('F')).toBe('flat')
    expect(accidentalForKey('D')).toBe('sharp')
    expect(accidentalForKey('A')).toBe('sharp')
  })

  it('spells the same pitch class either way', () => {
    expect(pitchClassToNote(1, 'sharp')).toBe('C#')
    expect(pitchClassToNote(1, 'flat')).toBe('Db')
  })
})

describe('transposeNote', () => {
  it('moves up and down by semitones', () => {
    expect(transposeNote('C', 2)).toBe('D')
    expect(transposeNote('C', -1, 'flat')).toBe('B')
    expect(transposeNote('G', 5)).toBe('C')
  })

  it('respects the requested spelling', () => {
    expect(transposeNote('A', 1, 'sharp')).toBe('A#')
    expect(transposeNote('A', 1, 'flat')).toBe('Bb')
  })
})

describe('semitonesBetween', () => {
  it('always returns an upward distance 0-11', () => {
    expect(semitonesBetween('C', 'D')).toBe(2)
    expect(semitonesBetween('D', 'C')).toBe(10)
    expect(semitonesBetween('G', 'G')).toBe(0)
  })

  it('treats enharmonics as the same key', () => {
    expect(semitonesBetween('C#', 'Db')).toBe(0)
  })
})

describe('noteFrequency', () => {
  it('anchors on A4 = 440', () => {
    expect(noteFrequency(9, 4)).toBeCloseTo(440, 6)
  })

  it('doubles every octave', () => {
    expect(noteFrequency(0, 5) / noteFrequency(0, 4)).toBeCloseTo(2, 10)
  })

  it('puts middle C where it belongs', () => {
    expect(noteFrequency(0, 4)).toBeCloseTo(261.6256, 3)
  })
})

describe('padVoicing', () => {
  it('returns six ascending frequencies', () => {
    const voices = padVoicing('C')
    expect(voices).toHaveLength(6)
    expect([...voices].sort((a, b) => a - b)).toEqual(voices)
  })

  it('contains a major third for major and a minor third for minor', () => {
    const major = padVoicing('C', true)
    const minor = padVoicing('C', false)
    // the third sits at index 4 of the voicing
    expect(major[4] / noteFrequency(0, 4)).toBeCloseTo(2 ** (4 / 12), 6)
    expect(minor[4] / noteFrequency(0, 4)).toBeCloseTo(2 ** (3 / 12), 6)
  })

  it('is empty for a key it cannot parse', () => {
    expect(padVoicing('H')).toEqual([])
  })
})
