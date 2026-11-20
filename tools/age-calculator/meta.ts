import type { ToolMeta } from '../../shared/registry/types'

const meta: ToolMeta = {
  slug: 'age-calculator',
  name: 'Age Calculator',
  tagline: 'Your exact age in years, months and days — and how long until your next birthday.',
  description:
    'Work out an exact age in years, months and days from a date of birth, on today or any other date. '
    + 'See it in total months, weeks, days and hours, the day of the week you were born, and the date and '
    + 'weekday of your next birthday. Calendar arithmetic, so time zones and clock changes never move a day.',
  category: 'Utilities',
  keywords: [
    'age calculator',
    'how old am i',
    'calculate age from date of birth',
    'exact age calculator',
    'birthday calculator',
    'date calculator',
    'days between dates',
    'business days calculator',
    'add days to date',
    'chronological age calculator',
  ],
  addedAt: '2026-11-20',
  api: true,
  apiPath: 'age',
  mcp: true,
  variants: ['date-calculator'],
  shareCopy:
    'Free age calculator — your exact age in years, months and days, and the countdown to your next birthday. '
    + 'No sign-up, open source.',
  icon: '🎂',
}

export default meta
