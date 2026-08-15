import { describe, expect, it } from 'vitest'
import {
  easterSunday,
  EVENT_PRESETS,
  formatClock,
  nextOccurrence,
  splitDuration,
  timerPhase,
} from './duration'

describe('splitDuration', () => {
  it('breaks a duration into parts', () => {
    const parts = splitDuration(((2 * 24 + 3) * 60 + 4) * 60_000 + 5_000)
    expect(parts).toMatchObject({ past: false, days: 2, hours: 3, minutes: 4, seconds: 5 })
  })

  it('flags negatives as past but reports magnitudes', () => {
    expect(splitDuration(-65_000)).toMatchObject({ past: true, minutes: 1, seconds: 5 })
  })
})

describe('formatClock', () => {
  it('omits hours until there are some', () => {
    expect(formatClock(299_000)).toBe('4:59')
    expect(formatClock(3_723_000)).toBe('1:02:03')
  })

  it('counts minutes past sixty when there is no hour field', () => {
    expect(formatClock(90 * 60_000)).toBe('1:30:00')
  })

  it('marks overrun with a leading minus', () => {
    expect(formatClock(-12_000)).toBe('-0:12')
  })

  it('reads zero cleanly', () => {
    expect(formatClock(0)).toBe('0:00')
  })
})

describe('timerPhase', () => {
  it('warns inside the threshold and goes over at zero', () => {
    expect(timerPhase(120_000, 60)).toBe('normal')
    expect(timerPhase(45_000, 60)).toBe('warn')
    expect(timerPhase(0, 60)).toBe('over')
    expect(timerPhase(-5_000, 60)).toBe('over')
  })

  it('never warns when the threshold is off', () => {
    expect(timerPhase(1_000, 0)).toBe('normal')
  })
})

describe('easterSunday', () => {
  // Published dates — the point of the Computus is that these must be exact.
  it.each([
    [2024, '2024-03-31'],
    [2025, '2025-04-20'],
    [2026, '2026-04-05'],
    [2027, '2027-03-28'],
    [2030, '2030-04-21'],
    [2038, '2038-04-25'],
  ])('is correct for %i', (year, expected) => {
    expect(easterSunday(year).toISOString().slice(0, 10)).toBe(expected)
  })

  it('always lands on a Sunday', () => {
    for (let year = 2024; year < 2075; year++)
      expect(easterSunday(year).getUTCDay()).toBe(0)
  })
})

describe('nextOccurrence', () => {
  const christmas = EVENT_PRESETS.find(p => p.id === 'christmas')!

  it('uses this year when the date is still ahead', () => {
    expect(nextOccurrence(christmas, new Date(2026, 5, 1)).getFullYear()).toBe(2026)
  })

  it('rolls into next year once it has passed', () => {
    expect(nextOccurrence(christmas, new Date(2026, 11, 26)).getFullYear()).toBe(2027)
  })

  it('treats the day itself as still upcoming', () => {
    expect(nextOccurrence(christmas, new Date(2026, 11, 25)).getFullYear()).toBe(2026)
  })
})
