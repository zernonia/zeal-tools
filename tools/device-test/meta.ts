import type { ToolMeta } from '../../shared/registry/types'

const meta: ToolMeta = {
  slug: 'device-test',
  name: 'Device Test',
  tagline: 'Test a keyboard, microphone, webcam or screen in the browser — nothing is recorded or uploaded.',
  description:
    'Four hardware checks in one place: a keyboard tester that shows every key, rollover and chatter; a mic '
    + 'test with a live level meter and a local recording; a webcam test that reports the real resolution and '
    + 'frame rate; and a full-screen dead pixel test. Everything runs on your own device. Free, no sign-up.',
  category: 'Utilities',
  keywords: [
    'keyboard tester',
    'key tester',
    'mic test',
    'microphone test',
    'webcam test',
    'camera test',
    'dead pixel test',
    'stuck pixel test',
    'n-key rollover test',
    'keyboard ghosting test',
    'key chatter test',
  ],
  addedAt: '2026-11-20',
  // Every check is of the visitor's own hardware, live in their browser: a
  // keyboard, a microphone, a camera, a screen. A headless caller has none of
  // them, so there is nothing to send and nothing meaningful to return.
  api: false,
  mcp: false,
  variants: ['keyboard', 'microphone', 'webcam', 'dead-pixel'],
  shareCopy:
    'Free keyboard, mic, webcam and dead pixel tests that run in your browser — nothing is recorded or '
    + 'uploaded. No sign-up, no app, open source.',
  icon: '🧪',
}

export default meta
