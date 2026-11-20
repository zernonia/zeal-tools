import type { McpTool } from '../../shared/registry/mcp-types'
import { calculateAge, dateDifference, DateError, formatIsoDate, requireDate, utcToday } from './core'
import meta from './meta'

const plural = (n: number, unit: string) => `${n.toLocaleString('en-GB')} ${unit}${n === 1 ? '' : 's'}`

const tool: McpTool = {
  name: 'calculate_age',
  title: meta.name,
  description:
    'Exact age, or the span between two dates, by calendar arithmetic (dates only, no times or time zones). '
    + 'Age mode: pass `birth` and optionally `on` (defaults to today in UTC) — returns years/months/days, '
    + 'totals in months, weeks, days and hours, the weekday of birth, and the next birthday and half-birthday. '
    + 'A 29 February birthday falls on 28 February in common years. '
    + 'Difference mode: pass `from` and `to` (either order) and optionally `includeEnd` — returns years/months/days, '
    + 'total days, weeks and days, and business days (Monday to Friday; public holidays are not known). '
    + 'All dates are YYYY-MM-DD.',
  inputSchema: {
    type: 'object',
    properties: {
      birth: { type: 'string', description: 'Age mode: date of birth, YYYY-MM-DD' },
      on: { type: 'string', description: 'Age mode: the date to measure the age on, YYYY-MM-DD (default: today in UTC)' },
      from: { type: 'string', description: 'Difference mode: first date, YYYY-MM-DD' },
      to: { type: 'string', description: 'Difference mode: second date, YYYY-MM-DD' },
      includeEnd: { type: 'boolean', description: 'Difference mode: count the end date as a day too (default false)' },
    },
  },
  run(args) {
    try {
      if (args.to !== undefined || args.from !== undefined) {
        const diff = dateDifference(requireDate(args.from, 'from'), requireDate(args.to, 'to'), { includeEnd: args.includeEnd === true })
        const text = `${diff.from} to ${diff.to}: ${plural(diff.years, 'year')}, ${plural(diff.months, 'month')}, ${plural(diff.days, 'day')} `
          + `(${plural(diff.totalDays, 'day')} in total, ${plural(diff.businessDays, 'business day')}).`
        return { content: [{ type: 'text', text }], structuredContent: { ...diff } }
      }

      const on = typeof args.on === 'string' && args.on ? requireDate(args.on, 'on') : utcToday(new Date())
      const age = calculateAge(requireDate(args.birth, 'birth'), on)
      const text = `On ${formatIsoDate(on)}: ${plural(age.years, 'year')}, ${plural(age.months, 'month')}, ${plural(age.days, 'day')} old `
        + `(${plural(age.totalDays, 'day')}). Born on a ${age.bornOn}. Next birthday ${age.nextBirthday.date} (${age.nextBirthday.weekday}), `
        + `in ${plural(age.nextBirthday.daysUntil, 'day')}, turning ${age.nextBirthday.turning}.`
      return { content: [{ type: 'text', text }], structuredContent: { ...age } }
    }
    catch (error) {
      return { isError: true, content: [{ type: 'text', text: error instanceof DateError ? error.message : 'Could not calculate that date.' }] }
    }
  },
}

export default tool
