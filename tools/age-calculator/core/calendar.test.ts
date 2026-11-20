import { describe, expect, it } from 'vitest'
import {
  addDays,
  addMonths,
  addWeekdays,
  addYears,
  countWeekdays,
  daysInMonth,
  diffYmd,
  formatIsoDate,
  formatLongDate,
  fromDayNumber,
  isLeapYear,
  parseIsoDate,
  toDayNumber,
  weekdayIndex,
  weekdayName,
} from './calendar'

function d(iso: string) {
  const date = parseIsoDate(iso)
  if (!date)
    throw new Error(`bad fixture ${iso}`)
  return date
}

/** Independent reference: JavaScript's own UTC date maths. Only used in tests. */
const utcDays = (iso: string) => Date.UTC(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10))) / 86400000

describe('leap years and month lengths', () => {
  it('follows the Gregorian century rule', () => {
    expect(isLeapYear(2024)).toBe(true)
    expect(isLeapYear(2023)).toBe(false)
    expect(isLeapYear(1900)).toBe(false)
    expect(isLeapYear(2000)).toBe(true)
    expect(isLeapYear(2100)).toBe(false)
  })

  it('knows every month', () => {
    expect([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => daysInMonth(2023, m)))
      .toEqual([31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31])
    expect(daysInMonth(2024, 2)).toBe(29)
  })
})

describe('parseIsoDate', () => {
  it('reads strict YYYY-MM-DD', () => {
    expect(parseIsoDate('1990-06-15')).toEqual({ year: 1990, month: 6, day: 15 })
    expect(parseIsoDate(' 2024-02-29 ')).toEqual({ year: 2024, month: 2, day: 29 })
  })

  it('refuses dates that do not exist rather than rolling them over', () => {
    expect(parseIsoDate('2023-02-29')).toBeNull()
    expect(parseIsoDate('2023-04-31')).toBeNull()
    expect(parseIsoDate('2023-13-01')).toBeNull()
    expect(parseIsoDate('2023-00-10')).toBeNull()
    expect(parseIsoDate('0000-01-01')).toBeNull()
  })

  it('refuses other shapes', () => {
    for (const text of ['', '1990-6-15', '15/06/1990', '1990-06-15T00:00', '19900615', 'yesterday'])
      expect(parseIsoDate(text)).toBeNull()
  })

  it('round-trips through formatIsoDate with padding', () => {
    expect(formatIsoDate({ year: 7, month: 3, day: 9 })).toBe('0007-03-09')
    expect(formatIsoDate(d('2026-11-20'))).toBe('2026-11-20')
  })
})

describe('day numbers', () => {
  it('matches golden values', () => {
    expect(toDayNumber(d('1970-01-01'))).toBe(0)
    expect(toDayNumber(d('2000-03-01'))).toBe(11017)
    expect(toDayNumber(d('1969-12-31'))).toBe(-1)
    expect(toDayNumber(d('0001-01-01'))).toBe(-719162)
  })

  it('agrees with Date.UTC across leap and century boundaries', () => {
    for (const iso of ['1600-02-29', '1700-03-01', '1899-12-31', '1900-02-28', '1900-03-01', '2000-02-29', '2024-12-31', '2100-03-01', '9999-12-31'])
      expect(toDayNumber(d(iso))).toBe(utcDays(iso))
  })

  it('round-trips every day across four centuries', () => {
    const start = toDayNumber(d('1800-01-01'))
    const end = toDayNumber(d('2200-01-01'))
    const mismatches: number[] = []
    for (let n = start; n < end; n += 1) {
      if (toDayNumber(fromDayNumber(n)) !== n)
        mismatches.push(n)
    }
    expect(mismatches).toEqual([])
    expect(fromDayNumber(end)).toEqual({ year: 2200, month: 1, day: 1 })
  })
})

describe('weekdays', () => {
  it('matches known dates', () => {
    expect(weekdayName(d('1970-01-01'))).toBe('Thursday')
    expect(weekdayName(d('2000-01-01'))).toBe('Saturday')
    expect(weekdayName(d('2024-02-29'))).toBe('Thursday')
    expect(weekdayName(d('1969-07-20'))).toBe('Sunday')
    expect(weekdayName(d('2026-11-20'))).toBe('Friday')
  })

  it('agrees with Date.getUTCDay before and after the epoch', () => {
    for (const iso of ['1066-10-14', '1815-06-18', '1969-12-31', '2038-01-19']) {
      const [y, m, day] = iso.split('-').map(Number)
      expect(weekdayIndex(d(iso))).toBe(new Date(Date.UTC(y!, m! - 1, day!)).getUTCDay())
    }
  })
})

describe('addMonths and addYears', () => {
  it('clamps to the end of a shorter month', () => {
    expect(formatIsoDate(addMonths(d('2023-01-31'), 1))).toBe('2023-02-28')
    expect(formatIsoDate(addMonths(d('2024-01-31'), 1))).toBe('2024-02-29')
    expect(formatIsoDate(addMonths(d('2023-03-31'), 1))).toBe('2023-04-30')
    expect(formatIsoDate(addMonths(d('2023-03-31'), -1))).toBe('2023-02-28')
  })

  it('counts from the original date, so the 31st is not lost', () => {
    expect(formatIsoDate(addMonths(d('2023-01-31'), 2))).toBe('2023-03-31')
    expect(formatIsoDate(addMonths(d('2023-01-31'), 12))).toBe('2024-01-31')
  })

  it('crosses year boundaries both ways', () => {
    expect(formatIsoDate(addMonths(d('2023-11-15'), 3))).toBe('2024-02-15')
    expect(formatIsoDate(addMonths(d('2023-02-15'), -3))).toBe('2022-11-15')
    expect(formatIsoDate(addMonths(d('2023-01-15'), -13))).toBe('2021-12-15')
  })

  it('puts a 29 February anniversary on 28 February in common years', () => {
    expect(formatIsoDate(addYears(d('2000-02-29'), 1))).toBe('2001-02-28')
    expect(formatIsoDate(addYears(d('2000-02-29'), 4))).toBe('2004-02-29')
    expect(formatIsoDate(addYears(d('2000-02-29'), 100))).toBe('2100-02-28')
  })
})

describe('diffYmd', () => {
  const ymd = (a: string, b: string) => diffYmd(d(a), d(b))

  it('matches hand-worked spans', () => {
    expect(ymd('1990-06-15', '2026-11-20')).toEqual({ years: 36, months: 5, days: 5 })
    expect(ymd('2026-11-20', '2026-11-20')).toEqual({ years: 0, months: 0, days: 0 })
    expect(ymd('2020-12-25', '2021-01-01')).toEqual({ years: 0, months: 0, days: 7 })
    expect(ymd('2000-01-15', '2000-03-14')).toEqual({ years: 0, months: 1, days: 28 })
  })

  it('treats a clamped month end as a whole month', () => {
    expect(ymd('2023-01-31', '2023-02-28')).toEqual({ years: 0, months: 1, days: 0 })
    expect(ymd('2023-01-31', '2023-03-01')).toEqual({ years: 0, months: 1, days: 1 })
    expect(ymd('2023-01-31', '2023-03-31')).toEqual({ years: 0, months: 2, days: 0 })
  })

  it('handles leap-day starts', () => {
    expect(ymd('2000-02-29', '2001-02-27')).toEqual({ years: 0, months: 11, days: 29 })
    expect(ymd('2000-02-29', '2001-02-28')).toEqual({ years: 1, months: 0, days: 0 })
    expect(ymd('2000-02-29', '2004-02-29')).toEqual({ years: 4, months: 0, days: 0 })
  })

  it('always adds back up to the end date', () => {
    let seed = 7
    const rand = (n: number) => {
      seed = (seed * 1103515245 + 12345) % 2147483648
      return seed % n
    }
    for (let i = 0; i < 3000; i++) {
      const a = toDayNumber(d('1900-01-01')) + rand(80000)
      const b = a + rand(30000)
      const from = fromDayNumber(a)
      const span = diffYmd(from, fromDayNumber(b))
      expect(span.months).toBeLessThan(12)
      expect(span.days).toBeLessThan(31)
      expect(toDayNumber(addDays(addMonths(from, span.years * 12 + span.months), span.days))).toBe(b)
    }
  })

  it('rejects a reversed range', () => {
    expect(() => ymd('2024-01-02', '2024-01-01')).toThrow(RangeError)
  })
})

describe('countWeekdays', () => {
  const span = (a: string, b: string) => countWeekdays(toDayNumber(d(a)), toDayNumber(d(b)))

  it('counts Monday to Friday in a half-open range', () => {
    // 2026-11-16 is a Monday.
    expect(span('2026-11-16', '2026-11-20')).toBe(4)
    expect(span('2026-11-16', '2026-11-21')).toBe(5)
    expect(span('2026-11-16', '2026-11-23')).toBe(5)
    expect(span('2026-11-21', '2026-11-23')).toBe(0)
    expect(span('2026-11-20', '2026-11-20')).toBe(0)
  })

  it('matches a day-by-day count', () => {
    const start = toDayNumber(d('2024-01-01'))
    for (let length = 0; length < 60; length++) {
      for (let offset = 0; offset < 7; offset++) {
        let expected = 0
        for (let n = start + offset; n < start + offset + length; n++) {
          if (weekdayIndex(n) % 6 !== 0)
            expected++
        }
        expect(countWeekdays(start + offset, start + offset + length)).toBe(expected)
      }
    }
  })

  it('knows a whole year', () => {
    expect(span('2026-01-01', '2027-01-01')).toBe(261)
  })
})

describe('addWeekdays', () => {
  const add = (iso: string, n: number) => formatIsoDate(addWeekdays(d(iso), n))

  it('skips weekends and never counts the start', () => {
    expect(add('2026-11-20', 1)).toBe('2026-11-23') // Fri → Mon
    expect(add('2026-11-20', 2)).toBe('2026-11-24')
    expect(add('2026-11-21', 1)).toBe('2026-11-23') // Sat → Mon
    expect(add('2026-11-21', 5)).toBe('2026-11-27') // Sat → Fri
    expect(add('2026-11-16', 5)).toBe('2026-11-23') // Mon → next Mon
    expect(add('2026-11-16', 10)).toBe('2026-11-30')
  })

  it('goes backwards', () => {
    expect(add('2026-11-23', -1)).toBe('2026-11-20') // Mon → Fri
    expect(add('2026-11-22', -1)).toBe('2026-11-20') // Sun → Fri
    expect(add('2026-11-23', -5)).toBe('2026-11-16')
  })

  it('is a no-op for zero', () => {
    expect(add('2026-11-21', 0)).toBe('2026-11-21')
  })

  it('agrees with stepping one day at a time', () => {
    const start = toDayNumber(d('2025-06-01'))
    for (let offset = 0; offset < 7; offset++) {
      for (const n of [1, 3, 4, 5, 6, 9, 10, 11, 23, 250, -1, -5, -6, -17]) {
        let cursor = start + offset
        let left = Math.abs(n)
        while (left > 0) {
          cursor += Math.sign(n)
          if (weekdayIndex(cursor) % 6 !== 0)
            left--
        }
        expect(toDayNumber(addWeekdays(fromDayNumber(start + offset), n))).toBe(cursor)
      }
    }
  })
})

describe('formatLongDate', () => {
  it('spells the date out', () => {
    expect(formatLongDate(d('2027-06-15'))).toBe('Tuesday 15 June 2027')
    expect(formatLongDate(d('2000-02-29'), false)).toBe('29 February 2000')
  })
})
