/**
 * Calendar-date primitives on the proleptic Gregorian calendar.
 *
 * Everything here works on plain year–month–day triples and whole day
 * numbers, never on `Date` or timestamps. A timestamp carries a time of day
 * and a time zone, and either can quietly move a date by one — midnight in
 * one zone is the previous evening in another, and a day with a clock change
 * is 23 or 25 hours long. A day number cannot be shifted by either.
 */

export interface CivilDate {
  year: number
  /** 1–12. */
  month: number
  /** 1–31. */
  day: number
}

/** The years this tool accepts. Four-digit years keep ISO strings unambiguous. */
export const MIN_YEAR = 1
export const MAX_YEAR = 9999

export const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const
export type Weekday = typeof WEEKDAYS[number]

export const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const

/** A date the user can fix — shown as-is, so it is written to be read. */
export class DateError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'DateError'
  }
}

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
}

export function daysInMonth(year: number, month: number): number {
  if (month === 2)
    return isLeapYear(year) ? 29 : 28
  return [4, 6, 9, 11].includes(month) ? 30 : 31
}

export function isValidDate(date: CivilDate): boolean {
  const { year, month, day } = date
  return Number.isInteger(year) && Number.isInteger(month) && Number.isInteger(day)
    && year >= MIN_YEAR && year <= MAX_YEAR
    && month >= 1 && month <= 12
    && day >= 1 && day <= daysInMonth(year, month)
}

/**
 * Strict `YYYY-MM-DD`. Returns null for anything else, including dates that
 * do not exist (`2023-02-29`) — `new Date` would roll those into March.
 */
export function parseIsoDate(text: string): CivilDate | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text.trim())
  if (!match)
    return null
  const date = { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) }
  return isValidDate(date) ? date : null
}

export function formatIsoDate(date: CivilDate): string {
  const pad = (n: number, width: number) => String(n).padStart(width, '0')
  return `${pad(date.year, 4)}-${pad(date.month, 2)}-${pad(date.day, 2)}`
}

/**
 * Days since 1970-01-01 (which is day 0). Howard Hinnant's `days_from_civil`:
 * exact for every Gregorian date, no tables and no floating point.
 */
export function toDayNumber(date: CivilDate): number {
  const y = date.month <= 2 ? date.year - 1 : date.year
  const era = Math.floor(y / 400)
  const yoe = y - era * 400
  const mp = date.month > 2 ? date.month - 3 : date.month + 9
  const doy = Math.floor((153 * mp + 2) / 5) + date.day - 1
  const doe = yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy
  return era * 146097 + doe - 719468
}

/** The inverse of `toDayNumber` (Hinnant's `civil_from_days`). */
export function fromDayNumber(dayNumber: number): CivilDate {
  const z = dayNumber + 719468
  const era = Math.floor(z / 146097)
  const doe = z - era * 146097
  const yoe = Math.floor((doe - Math.floor(doe / 1460) + Math.floor(doe / 36524) - Math.floor(doe / 146096)) / 365)
  const doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100))
  const mp = Math.floor((5 * doy + 2) / 153)
  const day = doy - Math.floor((153 * mp + 2) / 5) + 1
  const month = mp < 10 ? mp + 3 : mp - 9
  return { year: yoe + era * 400 + (month <= 2 ? 1 : 0), month, day }
}

/** 0 = Sunday … 6 = Saturday. 1970-01-01 was a Thursday. */
export function weekdayIndex(date: CivilDate | number): number {
  const n = typeof date === 'number' ? date : toDayNumber(date)
  return (((n + 4) % 7) + 7) % 7
}

export function weekdayName(date: CivilDate | number): Weekday {
  return WEEKDAYS[weekdayIndex(date)]!
}

export function compareDates(a: CivilDate, b: CivilDate): number {
  return toDayNumber(a) - toDayNumber(b)
}

export function addDays(date: CivilDate, days: number): CivilDate {
  return fromDayNumber(toDayNumber(date) + days)
}

/**
 * Move by whole calendar months, keeping the day of the month where it
 * exists and clamping to the last day where it does not: 31 January plus one
 * month is 28 February (29th in a leap year), never 3 March. Always counted
 * from the original date, so twelve one-month steps from the 31st do not
 * drift down to the 28th.
 */
export function addMonths(date: CivilDate, months: number): CivilDate {
  const index = date.year * 12 + (date.month - 1) + months
  const year = Math.floor(index / 12)
  const month = index - year * 12 + 1
  return { year, month, day: Math.min(date.day, daysInMonth(year, month)) }
}

/**
 * Whole years, by the same clamping rule — so a 29 February birthday falls on
 * 28 February in a common year.
 */
export function addYears(date: CivilDate, years: number): CivilDate {
  return addMonths(date, years * 12)
}

export interface YmdSpan {
  years: number
  months: number
  days: number
}

/**
 * The calendar difference from `from` to `to` (which must not be earlier):
 * the most whole months that fit, by `addMonths`, then the days left over.
 * Built on the same rule as adding, so `addDays(addMonths(from, 12y + m), d)`
 * always lands back on `to` exactly.
 */
export function diffYmd(from: CivilDate, to: CivilDate): YmdSpan {
  const end = toDayNumber(to)
  if (end < toDayNumber(from))
    throw new RangeError('diffYmd expects from <= to')
  let months = (to.year - from.year) * 12 + (to.month - from.month)
  if (toDayNumber(addMonths(from, months)) > end)
    months -= 1
  const days = end - toDayNumber(addMonths(from, months))
  return { years: Math.floor(months / 12), months: months % 12, days }
}

/**
 * Monday-to-Friday days in the half-open range [start, end) of day numbers.
 * Constant time: whole weeks contribute five each, and at most six leftover
 * days are walked.
 */
export function countWeekdays(start: number, end: number): number {
  if (end <= start)
    return 0
  const span = end - start
  const weeks = Math.floor(span / 7)
  let count = weeks * 5
  for (let n = start + weeks * 7; n < end; n++) {
    const w = weekdayIndex(n)
    if (w !== 0 && w !== 6)
      count++
  }
  return count
}

/**
 * Step `count` working days (Monday to Friday) forwards, or backwards when
 * negative. The start date itself is never counted, as in a spreadsheet's
 * WORKDAY: two working days after a Friday is the Tuesday, and one working
 * day after a Saturday is the Monday.
 */
export function addWeekdays(date: CivilDate, count: number): CivilDate {
  let n = toDayNumber(date)
  if (count === 0)
    return date
  const step = count > 0 ? 1 : -1
  let remaining = Math.abs(count)
  // Jump whole weeks, but always leave at least one step to walk, so a start
  // on a weekend still lands on a weekday.
  const weeks = Math.floor((remaining - 1) / 5)
  n += step * weeks * 7
  remaining -= weeks * 5
  while (remaining > 0) {
    n += step
    const w = weekdayIndex(n)
    if (w !== 0 && w !== 6)
      remaining--
  }
  return fromDayNumber(n)
}

/**
 * "Tuesday 15 June 2027". Spelled out by hand rather than through `Intl`, so
 * the prerendered page and the browser can never disagree about it, and the
 * month cannot be mistaken for the day in either order.
 */
export function formatLongDate(date: CivilDate, withWeekday = true): string {
  const body = `${date.day} ${MONTHS[date.month - 1]} ${date.year}`
  return withWeekday ? `${weekdayName(date)} ${body}` : body
}
