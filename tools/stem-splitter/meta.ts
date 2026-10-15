import type { ToolMeta } from '../../shared/registry/types'

const meta: ToolMeta = {
  slug: 'stem-splitter',
  name: 'Stem Splitter',
  tagline: 'Split your audio into separate stems.',
  description:
    'Split any song into vocals, drums, bass and everything else, entirely inside your browser — the audio is never '
    + 'uploaded, because the separation model runs on your own machine. Mute, solo and remix the stems, then download '
    + 'them as WAV. No sign-up, no watermark, no per-track credits.',
  category: 'Music',
  keywords: [
    'stem splitter',
    'stem separation',
    'split song into stems',
    'vocal remover',
    'remove vocals from song',
    'karaoke maker',
    'acapella extractor',
    'isolate vocals',
    'drum remover',
    'bass isolator',
    'demucs online',
    'music source separation',
  ],
  addedAt: '2026-10-15',
  // The model runs in the visitor's browser, which is the whole privacy
  // argument for this tool. A server route would mean uploading every song to
  // us and running a 120 MB model inside a Worker — the same call the
  // background remover made.
  api: false,
  mcp: false,
  variants: ['vocal-remover'],
  shareCopy:
    'Free stem splitter that never uploads your song — vocals, drums, bass and the rest, separated in your own browser. '
    + 'No sign-up, no watermark, open source.',
  icon: '🎚️',
}

export default meta
