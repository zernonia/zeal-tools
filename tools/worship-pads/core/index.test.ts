import { describe, expect, it } from 'vitest'
import { semitonesBetween } from '../../../shared/core/music'
import { clampFade, FADE_SECONDS, keyboardPosition, padForShortcut, padKeys } from './index'

describe('padKeys', () => {
  it('covers all twelve keys with unique shortcuts', () => {
    const keys = padKeys()
    expect(keys).toHaveLength(12)
    expect(new Set(keys.map(k => k.shortcut)).size).toBe(12)
    expect(new Set(keys.map(k => k.key)).size).toBe(12)
  })

  it('gives every key a playable voicing', () => {
    for (const { key, voicing } of padKeys()) {
      expect(voicing.length, key).toBe(6)
      for (const hz of voicing) {
        expect(hz).toBeGreaterThan(20)
        expect(hz).toBeLessThan(2000)
      }
    }
  })

  it('runs chromatically so the next shortcut is one semitone up', () => {
    const keys = padKeys()
    expect(keys.map(k => k.key).slice(0, 4)).toEqual(['C', 'Db', 'D', 'Eb'])
    expect(keys.map(k => k.angle)).toEqual([0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330])
  })

  it('steps one semitone per shortcut, all the way round', () => {
    const keys = padKeys()
    for (let i = 0; i < keys.length; i++) {
      const next = keys[(i + 1) % keys.length]
      expect(semitonesBetween(keys[i].key, next.key), `${keys[i].key} -> ${next.key}`).toBe(1)
    }
  })

  it('differs between major and minor', () => {
    expect(padKeys(true)[0].voicing).not.toEqual(padKeys(false)[0].voicing)
  })
})

describe('padForShortcut', () => {
  it('resolves shortcuts, case insensitively', () => {
    expect(padForShortcut('1')?.key).toBe('C')
    expect(padForShortcut('A')?.key).toBe(padForShortcut('a')?.key)
  })

  it('is null for anything unmapped', () => {
    expect(padForShortcut('z')).toBeNull()
    expect(padForShortcut('')).toBeNull()
  })
})

describe('clampFade', () => {
  it('keeps fades inside a musical range', () => {
    expect(clampFade(100)).toBe(FADE_SECONDS.max)
    expect(clampFade(0)).toBe(FADE_SECONDS.min)
    expect(clampFade(4)).toBe(4)
  })

  it('falls back to the default for nonsense', () => {
    expect(clampFade(Number.NaN)).toBe(FADE_SECONDS.default)
  })
})

describe('keyboardPosition', () => {
  it('marks the five sharps and flats as black keys', () => {
    expect(padKeys().filter(pad => pad.black).map(pad => pad.key)).toEqual(['Db', 'Eb', 'F#', 'Ab', 'Bb'])
  })

  it('centres the seven white keys in their sevenths, in order', () => {
    const whites = padKeys().filter(pad => !pad.black)
    expect(whites.map(pad => pad.key)).toEqual(['C', 'D', 'E', 'F', 'G', 'A', 'B'])
    whites.forEach((pad, slot) => expect(pad.center).toBeCloseTo((slot + 0.5) / 7))
  })

  it('puts each black key on the boundary between its neighbours', () => {
    // Db between C and D, F# between F and G — no black key between E and F.
    expect(keyboardPosition(1).center).toBeCloseTo(1 / 7)
    expect(keyboardPosition(3).center).toBeCloseTo(2 / 7)
    expect(keyboardPosition(6).center).toBeCloseTo(4 / 7)
    expect(keyboardPosition(10).center).toBeCloseTo(6 / 7)
  })
})
