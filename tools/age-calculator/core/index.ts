/**
 * Age and date arithmetic. Pure and isomorphic: the page, the REST route and
 * the MCP tool all call these functions with ISO date strings and get the
 * same plain objects back.
 */
import type { CivilDate, Weekday } from './calendar'
import {
  addDays,
  addMonths,
  addWeekdays,
  addYears,
  countWeekdays,
  DateError,
  diffYmd,
  formatIsoDate,
  isValidDate,
  MAX_YEAR,
  MIN_YEAR,
  parseIsoDate,
  toDayNumber,
  weekdayName,
} from './calendar'

export * from './calendar'

/** Parse an ISO date or throw a message fit to show the person who typed it. */
export function requireDate(text: unknown, label: string): CivilDate {
  if (typeof text !== 'string' || !text.trim())
    throw new DateError(`${label} is missing — use the form YYYY-MM-DD.`)
  const date = parseIsoDate(text)
  if (!date)
    throw new DateError(`${label} "${text}" is not a real date in the form YYYY-MM-DD.`)
  return date
}

export interface DayInfo {
  date: string
  weekday: Weekday
  daysUntil: number
}

export interface AgeResult {
  birth: string
  on: string
  years: number
  months: number
  days: number
  totalMonths: number
  totalWeeks: number
  /** Days left over after `totalWeeks`. */
  remainderDays: number
  totalDays: number
  /** Whole calendar days × 24 — time of birth and clock changes are not known. */
  totalHours: number
  bornOn: Weekday
  /** `on` is a birthday (and not the day of birth itself). */
  isBirthday: boolean
  /** Born on 29 February: birthdays fall on 28 February in common years. */
  leapDayBirthday: boolean
  nextBirthday: DayInfo & { turning: number }
  nextHalfBirthday: DayInfo
}

function dayInfo(date: CivilDate, from: CivilDate): DayInfo {
  return { date: formatIsoDate(date), weekday: weekdayName(date), daysUntil: toDayNumber(date) - toDayNumber(from) }
}

/**
 * Exact age on a given day. Birthdays — and half-birthdays — follow the same
 * month-clamping rule as `addMonths`, so someone born on 29 February turns a
 * year older on 28 February in a common year, and someone born on 31 August
 * has a half-birthday on the last day of February.
 */
export function calculateAge(birth: CivilDate, on: CivilDate): AgeResult {
  if (!isValidDate(birth) || !isValidDate(on))
    throw new DateError('Both dates must be real calendar dates.')
  if (toDayNumber(birth) > toDayNumber(on))
    throw new DateError(`The date of birth is after ${formatIsoDate(on)} — nobody is a negative age. Check the year.`)

  const span = diffYmd(birth, on)
  const totalMonths = span.years * 12 + span.months
  const totalDays = toDayNumber(on) - toDayNumber(birth)

  // diffYmd guarantees addYears(birth, years) <= on, so the next one is
  // strictly after it.
  const next = addYears(birth, span.years + 1)
  let half = addMonths(birth, span.years * 12 + 6)
  if (toDayNumber(half) <= toDayNumber(on))
    half = addMonths(birth, (span.years + 1) * 12 + 6)

  return {
    birth: formatIsoDate(birth),
    on: formatIsoDate(on),
    ...span,
    totalMonths,
    totalWeeks: Math.floor(totalDays / 7),
    remainderDays: totalDays % 7,
    totalDays,
    totalHours: totalDays * 24,
    bornOn: weekdayName(birth),
    isBirthday: span.years > 0 && span.months === 0 && span.days === 0,
    leapDayBirthday: birth.month === 2 && birth.day === 29,
    nextBirthday: { ...dayInfo(next, on), turning: span.years + 1 },
    nextHalfBirthday: dayInfo(half, on),
  }
}

export interface DifferenceOptions {
  /** Count the end date as a day too, as you would for "1 to 5 March is five days". */
  includeEnd?: boolean
}

export interface DifferenceResult {
  from: string
  to: string
  fromWeekday: Weekday
  toWeekday: Weekday
  /** The dates were given latest first; the figures are for the span between them either way. */
  reversed: boolean
  includeEnd: boolean
  years: number
  months: number
  days: number
  totalDays: number
  weeks: number
  remainderDays: number
  /** Monday to Friday only. No public holidays are known or subtracted. */
  businessDays: number
}

export function dateDifference(a: CivilDate, b: CivilDate, options: DifferenceOptions = {}): DifferenceResult {
  if (!isValidDate(a) || !isValidDate(b))
    throw new DateError('Both dates must be real calendar dates.')
  const reversed = toDayNumber(a) > toDayNumber(b)
  const from = reversed ? b : a
  const to = reversed ? a : b
  const includeEnd = options.includeEnd === true
  // Including the end date is the same as counting up to the day after it.
  const end = includeEnd ? addDays(to, 1) : to

  const span = diffYmd(from, end)
  const totalDays = toDayNumber(end) - toDayNumber(from)
  return {
    from: formatIsoDate(from),
    to: formatIsoDate(to),
    fromWeekday: weekdayName(from),
    toWeekday: weekdayName(to),
    reversed,
    includeEnd,
    ...span,
    totalDays,
    weeks: Math.floor(totalDays / 7),
    remainderDays: totalDays % 7,
    businessDays: countWeekdays(toDayNumber(from), toDayNumber(end)),
  }
}

export interface DateOffset {
  years?: number
  months?: number
  weeks?: number
  days?: number
}

export interface AddOptions {
  /** Subtract instead of add. */
  subtract?: boolean
  /** Count `days` as working days (Monday to Friday) rather than calendar days. */
  businessDays?: boolean
}

export interface AddResult {
  start: string
  date: string
  weekday: Weekday
  /** Calendar days between the start and the result (negative when earlier). */
  dayDelta: number
}

/** The largest offset that is accepted for any one unit. */
export const MAX_OFFSET = 100000

/**
 * Add (or subtract) an offset. Years and months go first, together and from
 * the original date, with the end-of-month clamp; then weeks and days. The
 * order matters: in 2023, 30 January plus a month is 28 February, and a day
 * more is 1 March — days first would give 31 January, then 28 February. Largest
 * unit first is what people mean by "a month and a day from now".
 */
export function addToDate(start: CivilDate, offset: DateOffset, options: AddOptions = {}): AddResult {
  if (!isValidDate(start))
    throw new DateError('The start date must be a real calendar date.')
  const parts = { years: 0, months: 0, weeks: 0, days: 0, ...offset }
  for (const [unit, value] of Object.entries(parts)) {
    if (!Number.isInteger(value) || Math.abs(value) > MAX_OFFSET)
      throw new DateError(`${unit} must be a whole number no bigger than ${MAX_OFFSET.toLocaleString('en-GB')}.`)
  }
  const sign = options.subtract ? -1 : 1

  let date = addMonths(start, sign * (parts.years * 12 + parts.months))
  date = addDays(date, sign * parts.weeks * 7)
  date = options.businessDays ? addWeekdays(date, sign * parts.days) : addDays(date, sign * parts.days)

  if (date.year < MIN_YEAR || date.year > MAX_YEAR)
    throw new DateError(`That lands outside the years ${MIN_YEAR}–${MAX_YEAR}.`)

  return {
    start: formatIsoDate(start),
    date: formatIsoDate(date),
    weekday: weekdayName(date),
    dayDelta: toDayNumber(date) - toDayNumber(start),
  }
}

/** Today's calendar date in the device's own time zone. Takes the clock as an argument so it stays testable. */
export function localToday(now: Date): CivilDate {
  return { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() }
}

/** Today's date in UTC — what the server means by "today", since it cannot know the caller's zone. */
export function utcToday(now: Date): CivilDate {
  return { year: now.getUTCFullYear(), month: now.getUTCMonth() + 1, day: now.getUTCDate() }
}
