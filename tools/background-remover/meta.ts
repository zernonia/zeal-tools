import type { ToolMeta } from '../../shared/registry/types'

const meta: ToolMeta = {
  slug: 'background-remover',
  name: 'Background Remover',
  tagline: 'Cut the background out of any photo, without uploading it anywhere.',
  description:
    'Remove the background from a photo entirely inside your browser — the image is never uploaded, because the '
    + 'segmentation model runs on your own machine. Download a transparent PNG, or drop the cutout straight onto a '
    + 'solid colour. No sign-up, no watermark, no per-image credits.',
  category: 'Images',
  keywords: [
    'background remover',
    'remove background from image',
    'transparent png maker',
    'cut out image background',
    'free background eraser',
    'remove bg',
    'product photo cutout',
    'headshot background remover',
    'offline background remover',
    'no upload background remover',
  ],
  addedAt: '2026-08-16',
  // The model runs in the visitor's browser, which is the whole privacy
  // argument for this tool. A server route would mean shipping every image to
  // us and running a 4 MiB model inside a Worker — so there is no honest
  // headless surface here, the same call the worship pads and timers made.
  api: false,
  mcp: false,
  shareCopy:
    'Free background remover that never uploads your photo — the AI model runs in your own browser. '
    + 'No sign-up, no watermark, open source.',
  icon: '🪄',
}

export default meta
