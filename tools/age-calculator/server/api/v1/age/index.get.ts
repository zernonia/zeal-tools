import { calculateAge, dateDifference, DateError, formatIsoDate, requireDate, utcToday } from '../../../../core'

/**
 * GET /api/v1/age?birth=1990-06-15[&on=2026-11-20]
 * GET /api/v1/age?from=2026-11-16&to=2026-12-25[&includeEnd=true]
 *
 * The first form is an age; the second is the difference between two dates,
 * with business days. Calendar arithmetic only — no time of day, so no time
 * zone can shift a result. Without `on`, "today" means today in UTC, because
 * the server cannot know where the caller is; pass `on` to be exact.
 */
export default defineEventHandler((event) => {
  enforceRateLimit(event)
  const query = getQuery(event)
  const text = (key: string) => (typeof query[key] === 'string' ? query[key] as string : undefined)

  try {
    if (text('to') !== undefined || text('from') !== undefined) {
      const includeEnd = text('includeEnd') === 'true' || text('includeEnd') === '1'
      return dateDifference(requireDate(text('from'), 'from'), requireDate(text('to'), 'to'), { includeEnd })
    }
    const onText = text('on')
    const on = onText ? requireDate(onText, 'on') : utcToday(new Date())
    return {
      ...calculateAge(requireDate(text('birth'), 'birth'), on),
      ...(onText ? {} : { note: `No "on" date was given, so this is the age on ${formatIsoDate(on)}, today in UTC.` }),
    }
  }
  catch (error) {
    badRequest(error instanceof DateError ? error.message : 'Could not calculate that date.')
  }
})
