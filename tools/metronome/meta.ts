import type { ToolMeta } from '../../shared/registry/types'

const meta: ToolMeta = {
  slug: 'metronome',
  name: 'Metronome',
  tagline: 'A sample-accurate metronome with tap tempo, accents and subdivisions.',
  description:
    'An online metronome from 20 to 300 BPM in any time signature, with accented, normal or muted beats, '
    + 'eighth-note, triplet and sixteenth subdivisions, and tap tempo. Clicks are scheduled on the audio '
    + 'clock, so the timing holds steady even when the page is busy or in the background.',
  category: 'Music',
  keywords: [
    'online metronome',
    'metronome',
    'bpm metronome',
    'tap tempo',
    'click track',
    'drum metronome',
    'metronome 6/8',
    'practice tempo',
  ],
  addedAt: '2026-10-25',
  // A click track is sound in real time; there is nothing for a headless
  // caller to receive.
  api: false,
  mcp: false,
  shareCopy:
    'Free online metronome with tap tempo, accents and subdivisions — timed on the audio clock, '
    + 'no app, no sign-up, open source.',
  icon: '🥁',
}

export default meta
