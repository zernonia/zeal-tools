import { describe, expect, it } from 'vitest'
import { HOT_DB, levelVerdict, meterTicks, meterZone, OVER_DB, pushLevel, VERDICT_SHORT, VERDICT_TEXT, VERDICT_TONE } from './audio'
import { fpsVerdict, qualityGrade } from './video'

describe('qualityGrade', () => {
  it('grades by the shorter side', () => {
    expect(qualityGrade(1280, 720)).toBe('HD')
    expect(qualityGrade(720, 1280)).toBe('HD')
    expect(qualityGrade(1920, 1080)).toBe('Full HD')
    expect(qualityGrade(3840, 2160)).toBe('4K')
    expect(qualityGrade(2560, 1440)).toBe('QHD')
    expect(qualityGrade(640, 480)).toBe('SD')
    expect(qualityGrade(0, 0)).toBe('')
  })
})

describe('fpsVerdict', () => {
  it('reads a frame rate the way a call will look', () => {
    expect(fpsVerdict(0)).toBeNull()
    expect(fpsVerdict(30)).toBe('smooth')
    expect(fpsVerdict(24)).toBe('smooth')
    expect(fpsVerdict(20)).toBe('fine')
    expect(fpsVerdict(10)).toBe('choppy')
  })
})

describe('meterZone', () => {
  it('colours the meter in three bands', () => {
    expect(meterZone(-40)).toBe('safe')
    expect(meterZone(HOT_DB - 0.1)).toBe('safe')
    expect(meterZone(HOT_DB)).toBe('hot')
    expect(meterZone(-6)).toBe('hot')
    expect(meterZone(OVER_DB)).toBe('over')
    expect(meterZone(0)).toBe('over')
  })

  it('agrees with the verdict about where clipping starts', () => {
    // The verdict says "clipping" from −0.5 dBFS; the meter is red well before.
    expect(levelVerdict(-10, -0.5)).toBe('clipping')
    expect(meterZone(-0.5)).toBe('over')
  })
})

describe('meterTicks', () => {
  it('places each mark on the meter', () => {
    const ticks = meterTicks()
    expect(ticks[0]).toEqual({ db: -60, at: 0 })
    expect(ticks.at(-1)).toEqual({ db: 0, at: 1 })
    expect(ticks.find(t => t.db === -12)!.at).toBeCloseTo(0.8)
  })

  it('drops marks below a higher floor', () => {
    expect(meterTicks(-40).map(t => t.db)).toEqual([-36, -24, -12, -6, 0])
  })
})

describe('verdict wording', () => {
  it('has a tone, a short word and a sentence for every reading', () => {
    for (const key of Object.keys(VERDICT_TEXT)) {
      expect(VERDICT_TONE).toHaveProperty(key)
      expect(VERDICT_SHORT).toHaveProperty(key)
    }
    expect(VERDICT_TONE.clipping).toBe('danger')
    expect(VERDICT_TONE.good).toBe('clear')
  })
})

describe('pushLevel', () => {
  it('keeps the newest values up to the limit', () => {
    const history: number[] = []
    for (let i = 0; i < 10; i++)
      pushLevel(history, i, 4)
    expect(history).toEqual([6, 7, 8, 9])
  })

  it('returns the same array', () => {
    const history = [1]
    expect(pushLevel(history, 2, 3)).toBe(history)
  })
})
