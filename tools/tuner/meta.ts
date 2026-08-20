import type { ToolMeta } from '../../shared/registry/types'

const meta: ToolMeta = {
  slug: 'tuner',
  name: 'Tuner',
  tagline: 'Tune a guitar, bass or ukulele by ear or by microphone, in the browser.',
  description:
    'A chromatic instrument tuner that listens through your microphone and tells you the note, how many '
    + 'cents you are out, and which string you are aiming at. The audio is analysed on your own device and '
    + 'never recorded or sent anywhere. Free, no sign-up, no app.',
  category: 'Music',
  keywords: [
    'online tuner',
    'guitar tuner',
    'bass tuner',
    'ukulele tuner',
    'chromatic tuner',
    'tune guitar with microphone',
    'drop d tuner',
    'violin tuner online',
  ],
  addedAt: '2026-08-20',
  // Pitch detection needs a live microphone. There is nothing for a headless
  // caller to send and nothing meaningful to return.
  api: false,
  mcp: false,
  variants: ['guitar', 'bass', 'ukulele'],
  shareCopy:
    'Free online tuner for guitar, bass and ukulele — listens through your mic, and the audio never leaves '
    + 'your device. No sign-up, no app, open source.',
  icon: '🎸',
}

export default meta
