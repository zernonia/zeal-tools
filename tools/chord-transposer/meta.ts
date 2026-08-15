import type { ToolMeta } from '../../shared/registry/types'

const meta: ToolMeta = {
  slug: 'chord-transposer',
  name: 'Chord Transposer',
  tagline: 'Change the key of any chord chart — lyrics untouched.',
  description:
    'Transpose chord charts to any key, or work out capo positions. Paste a chart, pick the new key, '
    + 'and the chords move while the lyrics and layout stay exactly as they were. Runs entirely in your browser.',
  category: 'Music',
  keywords: ['chord transposer', 'transpose chords', 'change key', 'chord chart', 'capo calculator', 'capo chart', 'key change', 'song key', 'guitar chords', 'worship chords'],
  addedAt: '2026-08-15',
  api: true,
  apiPath: 'chords',
  mcp: true,
  variants: ['capo'],
  shareCopy: 'Free chord transposer — change the key of any chart, lyrics untouched. No sign-up, works offline, open source.',
  icon: '♫',
}

export default meta
