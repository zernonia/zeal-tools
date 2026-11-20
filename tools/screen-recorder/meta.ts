import type { ToolMeta } from '../../shared/registry/types'

const meta: ToolMeta = {
  slug: 'screen-recorder',
  name: 'Screen Recorder',
  tagline: 'Record your screen, a window or a tab — with audio — and save it without uploading anything.',
  description:
    'A free online screen recorder that captures your whole screen, one window or a single browser tab, '
    + 'with tab or system audio where the browser allows it and an optional microphone voice-over. The '
    + 'video is recorded on your own device and saved straight to it as MP4 or WebM: nothing is uploaded, '
    + 'there is no watermark, no time limit and no sign-up.',
  category: 'Utilities',
  keywords: [
    'screen recorder',
    'online screen recorder',
    'record screen',
    'screen recorder with audio',
    'record tab with audio',
    'free screen recorder no watermark',
    'screen capture video',
    'record screen and microphone',
  ],
  addedAt: '2026-11-20',
  // Recording needs a person at a screen choosing what to share in the
  // browser's own picker. There is nothing a headless caller could send and
  // nothing it could capture, so an endpoint would only be a dead URL.
  api: false,
  mcp: false,
  shareCopy:
    'Free online screen recorder — screen, window or tab, with audio. Recorded on your device and never '
    + 'uploaded. No watermark, no sign-up, open source.',
  icon: '🎥',
}

export default meta
