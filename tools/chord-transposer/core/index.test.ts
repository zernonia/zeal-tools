import { describe, expect, it } from 'vitest'
import { capoShapeKey, detectKey, isChordLine, parseChord, transposeChart, transposeChord } from './index'

describe('parseChord', () => {
  it('parses roots, qualities and slash basses', () => {
    expect(parseChord('C')).toMatchObject({ root: 'C', quality: '' })
    expect(parseChord('Am7')).toMatchObject({ root: 'A', quality: 'm7' })
    expect(parseChord('Bbmaj7')).toMatchObject({ root: 'Bb', quality: 'maj7' })
    expect(parseChord('D/F#')).toMatchObject({ root: 'D', quality: '', bass: 'F#' })
    expect(parseChord('Csus4')).toMatchObject({ root: 'C', quality: 'sus4' })
  })

  it('rejects lyrics that merely start with a note letter', () => {
    // This is the failure mode of every naive transposer.
    for (const word of ['Amazing', 'Great', 'Grace', 'Be', 'Father', 'And', 'Ends'])
      expect(parseChord(word)).toBeNull()
  })

  it('rejects malformed chords', () => {
    for (const bad of ['H', 'C/', '', 'Hm7'])
      expect(parseChord(bad)).toBeNull()
  })
})

describe('transposeChord', () => {
  it('moves the root and keeps the quality', () => {
    expect(transposeChord('Am7', 2, 'sharp')).toBe('Bm7')
    expect(transposeChord('Cmaj7', 7, 'sharp')).toBe('Gmaj7')
  })

  it('moves the slash bass too', () => {
    expect(transposeChord('D/F#', 2, 'sharp')).toBe('E/G#')
  })

  it('respects the requested spelling', () => {
    expect(transposeChord('A', 1, 'flat')).toBe('Bb')
    expect(transposeChord('A', 1, 'sharp')).toBe('A#')
  })

  it('wraps past the octave', () => {
    expect(transposeChord('B', 1, 'sharp')).toBe('C')
  })
})

describe('isChordLine', () => {
  it('recognises a chord line', () => {
    expect(isChordLine('C       G       Am      F')).toBe(true)
    expect(isChordLine('D/F# Bm7 Asus4')).toBe(true)
  })

  it('rejects lyrics and blank lines', () => {
    expect(isChordLine('Amazing grace how sweet the sound')).toBe(false)
    expect(isChordLine('')).toBe(false)
    expect(isChordLine('   ')).toBe(false)
  })
})

describe('transposeChart', () => {
  const chart = [
    'C           G',
    'Amazing grace how sweet',
    'Am          F',
    'that saved a wretch like me',
  ].join('\n')

  it('rewrites chord lines and leaves lyrics alone', () => {
    const result = transposeChart(chart, { fromKey: 'C', toKey: 'D' })
    const lines = result.text.split('\n')
    expect(lines[0]).toContain('D')
    expect(lines[0]).toContain('A')
    expect(lines[1]).toBe('Amazing grace how sweet')
    expect(lines[3]).toBe('that saved a wretch like me')
    expect(result.chordLines).toBe(2)
  })

  it('keeps chords roughly above the same column', () => {
    const result = transposeChart('C           G', { fromKey: 'C', toKey: 'D' })
    // second chord should still start near column 12, not collapse to a single space
    expect(result.text.indexOf('A')).toBeGreaterThan(8)
  })

  it('derives semitones from the key pair', () => {
    expect(transposeChart('C', { fromKey: 'C', toKey: 'G' }).semitones).toBe(7)
    expect(transposeChart('C', { fromKey: 'G', toKey: 'C' }).semitones).toBe(5)
  })

  it('spells flat destination keys with flats', () => {
    const result = transposeChart('A', { fromKey: 'A', toKey: 'Bb' })
    expect(result.text.trim()).toBe('Bb')
    expect(result.accidental).toBe('flat')
  })

  it('round-trips back to the original key', () => {
    const up = transposeChart(chart, { fromKey: 'C', toKey: 'F' })
    const back = transposeChart(up.text, { fromKey: 'F', toKey: 'C' })
    expect(back.text.split('\n').map(l => l.trimEnd()))
      .toEqual(chart.split('\n').map(l => l.trimEnd()))
  })

  it('reports zero chord lines when nothing is recognised', () => {
    expect(transposeChart('just some prose here', { semitones: 2 }).chordLines).toBe(0)
  })
})

describe('detectKey', () => {
  it('uses the resolving chord', () => {
    expect(detectKey('C G Am F\nlyrics here\nF G C')).toBe('C')
  })

  it('spots a minor resolution', () => {
    expect(detectKey('Am F C G\nAm')).toBe('Am')
  })

  it('is null when there are no chords', () => {
    expect(detectKey('no chords in this text at all')).toBeNull()
  })
})

describe('capoShapeKey', () => {
  it('subtracts the capo fret from the sounding key', () => {
    expect(capoShapeKey('D', 2)).toBe('C')
    expect(capoShapeKey('E', 4)).toBe('C')
    expect(capoShapeKey('G', 0)).toBe('G')
  })

  it('wraps below C', () => {
    expect(capoShapeKey('C', 1)).toBe('B')
  })

  it('rejects impossible frets', () => {
    expect(capoShapeKey('C', -1)).toBeNull()
    expect(capoShapeKey('C', 12)).toBeNull()
  })
})
