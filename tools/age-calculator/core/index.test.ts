import { describe, expect, it } from 'vitest'
import { addToDate, calculateAge, dateDifference, DateError, localToday, parseIsoDate, requireDate, utcToday } from './index'

const d = (iso: string) => requireDate(iso, 'fixture')

describe('requireDate', () => {
  it('names the field in its error', () => {
    expect(() => requireDate('', 'Date of birth')).toThrow(/Date of birth is missing/)
    expect(() => requireDate('2023-02-29', 'Date of birth')).toThrow(/not a real date/)
    expect(() => requireDate(undefined, 'on')).toThrow(DateError)
  })
})

describe('calculateAge', () => {
  it('gives the full breakdown for a typical birthday', () => {
    const age = calculateAge(d('1990-06-15'), d('2026-11-20'))
    expect(age).toMatchObject({
      birth: '1990-06-15',
      on: '2026-11-20',
      years: 36,
      months: 5,
      days: 5,
      totalMonths: 437,
      totalDays: 13307,
      totalWeeks: 1901,
      remainderDays: 0,
      totalHours: 13307 * 24,
      bornOn: 'Friday',
      isBirthday: false,
      leapDayBirthday: false,
    })
    expect(age.nextBirthday).toEqual({ date: '2027-06-15', weekday: 'Tuesday', daysUntil: 207, turning: 37 })
    expect(age.nextHalfBirthday).toEqual({ date: '2026-12-15', weekday: 'Tuesday', daysUntil: 25 })
  })

  it('total days agree with Date.UTC', () => {
    const age = calculateAge(d('1990-06-15'), d('2026-11-20'))
    expect(age.totalDays).toBe((Date.UTC(2026, 10, 20) - Date.UTC(1990, 5, 15)) / 86400000)
  })

  it('recognises a birthday and points at the following one', () => {
    const age = calculateAge(d('1990-06-15'), d('2026-06-15'))
    expect(age).toMatchObject({ years: 36, months: 0, days: 0, isBirthday: true })
    expect(age.nextBirthday).toMatchObject({ date: '2027-06-15', daysUntil: 365, turning: 37 })
  })

  it('the day before a birthday is one day short', () => {
    const age = calculateAge(d('1990-06-15'), d('2026-06-14'))
    expect(age).toMatchObject({ years: 35, months: 11, days: 30, isBirthday: false })
    expect(age.nextBirthday).toMatchObject({ date: '2026-06-15', daysUntil: 1, turning: 36 })
  })

  it('is zero on the day of birth, which is not a birthday', () => {
    const age = calculateAge(d('2026-11-20'), d('2026-11-20'))
    expect(age).toMatchObject({ years: 0, months: 0, days: 0, totalDays: 0, isBirthday: false })
    expect(age.nextBirthday).toMatchObject({ date: '2027-11-20', turning: 1 })
    expect(age.nextHalfBirthday.date).toBe('2027-05-20')
  })

  it('puts a leap-day birthday on 28 February in common years', () => {
    const before = calculateAge(d('2000-02-29'), d('2001-02-27'))
    expect(before.years).toBe(0)
    expect(before.nextBirthday).toMatchObject({ date: '2001-02-28', daysUntil: 1, turning: 1 })

    const on = calculateAge(d('2000-02-29'), d('2001-02-28'))
    expect(on).toMatchObject({ years: 1, months: 0, days: 0, isBirthday: true, leapDayBirthday: true })

    const leap = calculateAge(d('2000-02-29'), d('2024-02-29'))
    expect(leap).toMatchObject({ years: 24, isBirthday: true })

    const commonYear = calculateAge(d('2000-02-29'), d('2026-03-01'))
    expect(commonYear).toMatchObject({ years: 26, months: 0, days: 1 })
    expect(commonYear.nextBirthday.date).toBe('2027-02-28')
    expect(calculateAge(d('2000-02-29'), d('2027-03-01')).nextBirthday.date).toBe('2028-02-29')
  })

  it('clamps half-birthdays at the end of a month', () => {
    expect(calculateAge(d('1999-08-31'), d('2026-01-10')).nextHalfBirthday.date).toBe('2026-02-28')
    expect(calculateAge(d('1999-08-31'), d('2028-01-10')).nextHalfBirthday.date).toBe('2028-02-29')
  })

  it('moves the half-birthday on once it has passed', () => {
    const age = calculateAge(d('1990-06-15'), d('2026-12-15'))
    expect(age.nextHalfBirthday.date).toBe('2027-12-15')
  })

  it('refuses a birth date after the "age on" date', () => {
    expect(() => calculateAge(d('2030-01-01'), d('2026-11-20'))).toThrow(DateError)
    expect(() => calculateAge(d('2030-01-01'), d('2026-11-20'))).toThrow(/Check the year/)
  })

  it('handles very old dates', () => {
    const age = calculateAge(d('0001-01-01'), d('2001-01-01'))
    expect(age.years).toBe(2000)
    expect(age.totalDays).toBe(730485)
  })
})

describe('dateDifference', () => {
  it('measures a span with business days', () => {
    // Monday 16 to Friday 27 November 2026.
    const diff = dateDifference(d('2026-11-16'), d('2026-11-27'))
    expect(diff).toMatchObject({
      years: 0,
      months: 0,
      days: 11,
      totalDays: 11,
      weeks: 1,
      remainderDays: 4,
      businessDays: 9,
      fromWeekday: 'Monday',
      toWeekday: 'Friday',
      reversed: false,
      includeEnd: false,
    })
  })

  it('adds a day, and that day\'s working day, when the end date is included', () => {
    const diff = dateDifference(d('2026-11-16'), d('2026-11-27'), { includeEnd: true })
    expect(diff).toMatchObject({ totalDays: 12, businessDays: 10, weeks: 1, remainderDays: 5, days: 12 })
  })

  it('makes 1 to 31 March a whole month only when the end is included', () => {
    expect(dateDifference(d('2026-03-01'), d('2026-03-31'))).toMatchObject({ months: 0, days: 30 })
    expect(dateDifference(d('2026-03-01'), d('2026-03-31'), { includeEnd: true })).toMatchObject({ months: 1, days: 0, totalDays: 31 })
  })

  it('accepts dates in either order and says so', () => {
    const diff = dateDifference(d('2026-12-25'), d('2026-11-20'))
    expect(diff).toMatchObject({ reversed: true, from: '2026-11-20', to: '2026-12-25', totalDays: 35, months: 1, days: 5 })
  })

  it('is zero for the same date, one when it is included', () => {
    expect(dateDifference(d('2026-11-21'), d('2026-11-21'))).toMatchObject({ totalDays: 0, businessDays: 0 })
    expect(dateDifference(d('2026-11-21'), d('2026-11-21'), { includeEnd: true })).toMatchObject({ totalDays: 1, businessDays: 0 })
    expect(dateDifference(d('2026-11-20'), d('2026-11-20'), { includeEnd: true })).toMatchObject({ totalDays: 1, businessDays: 1 })
  })

  it('spans leap years', () => {
    const diff = dateDifference(d('2000-01-01'), d('2026-01-01'))
    expect(diff).toMatchObject({ years: 26, months: 0, days: 0, totalDays: 9497 })
  })
})

describe('addToDate', () => {
  const add = (iso: string, offset: Parameters<typeof addToDate>[1], options?: Parameters<typeof addToDate>[2]) => addToDate(d(iso), offset, options).date

  it('adds days, weeks, months and years', () => {
    expect(add('2026-11-20', { days: 30 })).toBe('2026-12-20')
    expect(add('2026-11-20', { weeks: 6 })).toBe('2027-01-01')
    expect(add('2026-11-20', { months: 3 })).toBe('2027-02-20')
    expect(add('2026-11-20', { years: 1, months: 2, weeks: 1, days: 1 })).toBe('2028-01-28')
  })

  it('clamps at month ends, then adds days', () => {
    expect(add('2023-01-31', { months: 1 })).toBe('2023-02-28')
    expect(add('2023-01-30', { months: 1, days: 1 })).toBe('2023-03-01')
    expect(add('2024-02-29', { years: 1 })).toBe('2025-02-28')
  })

  it('subtracts', () => {
    expect(add('2026-11-20', { days: 90 }, { subtract: true })).toBe('2026-08-22')
    expect(add('2026-03-31', { months: 1 }, { subtract: true })).toBe('2026-02-28')
  })

  it('counts working days when asked', () => {
    const result = addToDate(d('2026-11-20'), { days: 10 }, { businessDays: true })
    expect(result).toEqual({ start: '2026-11-20', date: '2026-12-04', weekday: 'Friday', dayDelta: 14 })
    expect(add('2026-11-23', { days: 1 }, { businessDays: true, subtract: true })).toBe('2026-11-20')
  })

  it('reports a negative delta when going back', () => {
    expect(addToDate(d('2026-11-20'), { weeks: 2 }, { subtract: true }).dayDelta).toBe(-14)
  })

  it('refuses fractions, huge offsets and results outside the calendar', () => {
    expect(() => add('2026-11-20', { days: 1.5 })).toThrow(DateError)
    expect(() => add('2026-11-20', { days: 100001 })).toThrow(/whole number/)
    expect(() => add('9999-12-01', { months: 1 })).toThrow(/outside the years/)
    expect(() => add('0001-01-05', { weeks: 1 }, { subtract: true })).toThrow(/outside the years/)
  })
})

describe('today helpers', () => {
  it('reads local and UTC dates from a clock', () => {
    const now = new Date(Date.UTC(2026, 10, 20, 12))
    expect(utcToday(now)).toEqual({ year: 2026, month: 11, day: 20 })
    expect(parseIsoDate('2026-11-20')).toEqual(utcToday(now))
    const local = localToday(now)
    expect(local.year).toBe(now.getFullYear())
    expect(local.month).toBe(now.getMonth() + 1)
  })
})

/** Every worked example quoted in the page copy, so the pages cannot drift from the maths. */
describe('examples quoted on the pages', () => {
  it('16 November to 25 December is 1 month and 9 days', () => {
    expect(dateDifference(d('2026-11-16'), d('2026-12-25'))).toMatchObject({ years: 0, months: 1, days: 9 })
  })

  it('monday to Friday is four days, five with the end included', () => {
    expect(dateDifference(d('2026-11-16'), d('2026-11-20')).totalDays).toBe(4)
    expect(dateDifference(d('2026-11-16'), d('2026-11-20'), { includeEnd: true }).totalDays).toBe(5)
  })

  it('ten working days from a Friday is the Friday a fortnight later', () => {
    expect(addToDate(d('2026-11-20'), { days: 10 }, { businessDays: true })).toMatchObject({ date: '2026-12-04', weekday: 'Friday' })
  })

  it('twelve months from the 31st is the 31st again', () => {
    expect(addToDate(d('2026-01-31'), { months: 12 }).date).toBe('2027-01-31')
    expect(addToDate(d('2026-03-31'), { months: 1 }).date).toBe('2026-04-30')
  })

  it('10,000 days old is about 27 years and 4 months', () => {
    const on = addToDate(d('1990-06-15'), { days: 10000 }).date
    expect(calculateAge(d('1990-06-15'), d(on))).toMatchObject({ years: 27, months: 4, totalDays: 10000 })
  })

  it('a 31st birthday has month-birthdays on 30 April and 28 February', () => {
    expect(addToDate(d('2025-03-31'), { months: 1 }).date).toBe('2025-04-30')
    expect(addToDate(d('2025-01-31'), { months: 1 }).date).toBe('2025-02-28')
  })
})
