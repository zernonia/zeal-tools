import type { ToolMeta } from '../../shared/registry/types'

const meta: ToolMeta = {
  slug: 'image-compressor',
  name: 'Image Compressor',
  tagline: 'Shrink and convert images in your browser — no upload, no watermark.',
  description:
    'Compress, convert and resize JPEG, PNG and WebP images without uploading them. Everything happens in '
    + 'your browser, so the photos never leave your device — drop in a batch, see exactly how much smaller '
    + 'each one got, and download them individually or as a zip.',
  category: 'Images',
  keywords: [
    'image compressor',
    'compress image online',
    'resize image',
    'png to jpg',
    'jpg to webp',
    'convert image to webp',
    'reduce image file size',
    'bulk image compressor',
    'image resizer',
    'jpg to png',
    'webp to png',
  ],
  addedAt: '2026-08-20',
  // Resize image, JPG to PNG and WebP to PNG pages.
  updatedAt: '2026-11-20',
  // The whole point is that the image stays on the device. A REST endpoint
  // would mean uploading exactly what this tool exists to avoid uploading.
  api: false,
  mcp: false,
  variants: ['png-to-jpg', 'jpg-to-webp', 'resize-image', 'jpg-to-png', 'webp-to-png'],
  shareCopy:
    'Free image compressor that never uploads your photos — it runs entirely in your browser. '
    + 'No sign-up, no watermark, open source.',
  icon: '🗜️',
}

export default meta
