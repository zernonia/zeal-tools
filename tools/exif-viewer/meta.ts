import type { ToolMeta } from '../../shared/registry/types'

const meta: ToolMeta = {
  slug: 'exif-viewer',
  name: 'EXIF Viewer',
  tagline: 'See what your photos reveal — then remove it without touching a pixel.',
  description:
    'Read the hidden metadata in a photo: the camera, the lens, the exact time, and often the precise '
    + 'location it was taken. Then download a copy with all of it removed — losslessly, so the image data '
    + 'is copied across byte for byte and nothing is re-encoded. Nothing is uploaded.',
  category: 'Images',
  keywords: [
    'exif viewer',
    'remove exif data',
    'check photo metadata',
    'strip gps from photo',
    'photo location data',
    'exif remover online',
    'view image metadata',
    'remove metadata from jpeg',
  ],
  addedAt: '2026-08-20',
  // Reading metadata means sending us the photo, which is the one thing this
  // tool exists to help people avoid doing.
  api: false,
  mcp: false,
  shareCopy:
    'Free EXIF viewer that shows what your photos reveal — camera, time, GPS — and strips it losslessly. '
    + 'Nothing uploaded, no sign-up, open source.',
  icon: '🔍',
}

export default meta
