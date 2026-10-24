import type { ToolMeta } from '../../shared/registry/types'

const meta: ToolMeta = {
  slug: 'image-redactor',
  name: 'Image Redactor',
  tagline: 'Brush over faces, plates and private text to blur or pixelate them — nothing uploaded.',
  description:
    'Paint over the parts of a picture nobody else should see — a face, a number plate, an address, '
    + 'a name in a screenshot — and they are blurred, pixelated or blacked out as you draw. Undo any '
    + 'stroke, change the effect afterwards, and save the result. Runs entirely in your browser.',
  category: 'Images',
  keywords: [
    'blur image',
    'pixelate image',
    'blur face in photo',
    'censor image',
    'redact screenshot',
    'blur part of image',
    'hide license plate',
    'black out text in image',
  ],
  addedAt: '2026-10-24',
  // Redacting means handing us the unredacted picture first — the one thing
  // a person reaching for this tool is trying not to do.
  api: false,
  mcp: false,
  shareCopy:
    'Free image redactor: brush over faces, plates or text to blur, pixelate or black them out. '
    + 'Runs in your browser, nothing uploaded, no sign-up.',
  icon: '🙈',
}

export default meta
