import type { ToolMeta } from '../../shared/registry/types'

const meta: ToolMeta = {
  slug: 'word-counter',
  name: 'Word Counter',
  tagline: 'Words, characters and reading time as you type — plus a case converter.',
  description:
    'Count words, characters (with and without spaces), sentences, paragraphs and bytes as you type, with reading '
    + 'and speaking time, keyword density and SMS, X and meta description limits. Convert text to Title Case, '
    + 'Sentence case, UPPER, lower, camelCase, snake_case and more. Your text never leaves your browser.',
  category: 'Utilities',
  keywords: [
    'word counter',
    'character counter',
    'case converter',
    'letter counter',
    'count words',
    'word count',
    'character count',
    'reading time calculator',
    'sms character counter',
    'title case converter',
    'uppercase to lowercase',
    'keyword density',
  ],
  addedAt: '2026-11-20',
  api: true,
  apiPath: 'text-stats',
  // POST only: the text belongs in a body, not in a URL that lands in logs.
  apiMethods: ['POST'],
  mcp: true,
  variants: ['character-counter', 'case-converter'],
  shareCopy: 'Free word counter and case converter — words, characters, reading time and SMS segments as you type. Nothing uploaded, no sign-up.',
  icon: '🔤',
}

export default meta
