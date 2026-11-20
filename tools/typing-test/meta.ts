import type { ToolMeta } from '../../shared/registry/types'

const meta: ToolMeta = {
  slug: 'typing-test',
  name: 'Typing Test',
  tagline: 'Measure your typing speed in WPM, with accuracy that counts the mistakes you fixed.',
  description:
    'A free typing speed test with 15, 30, 60 and 120 second runs or 25, 50 and 100 word tests, '
    + 'optional punctuation and numbers, and results scored the standard way: five characters to a word. '
    + 'Shows WPM, raw speed, accuracy, consistency and a speed chart, and keeps personal bests on your device.',
  category: 'Utilities',
  keywords: [
    'typing test',
    'typing speed test',
    'wpm test',
    'words per minute',
    'typing speed',
    'keyboard test',
    'typing practice',
    '1 minute typing test',
  ],
  addedAt: '2026-11-20',
  // The test is the keystrokes themselves, timed as they are typed; a
  // headless caller has nothing to send and nothing to receive.
  api: false,
  mcp: false,
  shareCopy:
    'Free typing speed test — WPM, accuracy and consistency, scored the standard way. '
    + 'No sign-up, nothing you type leaves the browser.',
  icon: '⌨️',
}

export default meta
