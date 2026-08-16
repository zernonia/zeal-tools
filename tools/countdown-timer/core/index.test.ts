import { describe, expect, it } from 'vitest'
import { presetById, readCountdown, resolveTarget } from './index'

describe('resolveTarget', () => {
  it('resolves a preset to its next occurrence', () => {
    const target = resolveTarget({ presetId: 'christmas' }, new Date(2026, 0, 5))!
    expect(target.getFullYear()).toBe(2026)
    expect(target.getMonth()).toBe(11)
  })

  it('rolls a passed preset into next year', () => {
    const target = resolveTarget({ presetId: 'christmas' }, new Date(2026, 11, 26))!
    expect(target.getFullYear()).toBe(2027)
  })

  it('computes Easter, which moves every year', () => {
    const a = resolveTarget({ presetId: 'easter' }, new Date(2027, 0, 1))!
    expect(a.getMonth()).toBe(2)
    expect(a.getDate()).toBe(28)
  })

  it('accepts an explicit date', () => {
    const target = resolveTarget({ isoDate: '2030-06-01T09:30:00Z' }, new Date())!
    expect(target.toISOString()).toBe('2030-06-01T09:30:00.000Z')
  })

  it('prefers the preset when both are given', () => {
    const target = resolveTarget({ presetId: 'new-year', isoDate: '2040-01-01' }, new Date(2026, 5, 1))!
    expect(target.getFullYear()).toBe(2027)
  })

  it('is null when nothing resolves', () => {
    expect(resolveTarget({}, new Date())).toBeNull()
    expect(resolveTarget({ isoDate: 'not a date' }, new Date())).toBeNull()
    expect(resolveTarget({ presetId: 'nope' }, new Date())).toBeNull()
  })
})

describe('readCountdown', () => {
  const now = new Date('2026-01-01T00:00:00Z')

  it('breaks the gap into parts', () => {
    const reading = readCountdown(new Date('2026-01-03T04:05:06Z'), now)
    expect(reading).toMatchObject({ past: false, days: 2, hours: 4, minutes: 5, seconds: 6 })
  })

  it('picks the largest meaningful unit', () => {
    expect(readCountdown(new Date('2026-01-05T00:00:00Z'), now).headline).toBe('days')
    expect(readCountdown(new Date('2026-01-01T05:00:00Z'), now).headline).toBe('hours')
    expect(readCountdown(new Date('2026-01-01T00:05:00Z'), now).headline).toBe('minutes')
    expect(readCountdown(new Date('2026-01-01T00:00:30Z'), now).headline).toBe('seconds')
  })

  it('flags targets that have passed', () => {
    expect(readCountdown(new Date('2025-12-31T00:00:00Z'), now).past).toBe(true)
  })
})

describe('presetById', () => {
  it('finds known presets and rejects unknown ones', () => {
    expect(presetById('easter')?.label).toBe('Easter Sunday')
    expect(presetById('nope')).toBeNull()
  })
})
