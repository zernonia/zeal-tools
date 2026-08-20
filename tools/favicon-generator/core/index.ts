/**
 * Favicon generator — the pure part.
 *
 * The resizing is done by a canvas in the browser; what lives here is the
 * packaging. An ICO file is a tiny container format, a web manifest is JSON,
 * and the markup is a fixed set of tags — all three are easy to get slightly
 * wrong in ways that only show up in one browser, and all three are testable
 * without a DOM.
 */

/** What actually gets used, and by whom. */
export interface IconSpec {
  size: number
  file: string
  purpose: string
}

/**
 * The sizes worth shipping.
 *
 * Deliberately short. A favicon generator that emits thirty files for every
 * Windows tile and iOS device that ever existed is mostly producing bytes
 * nobody requests: modern browsers take the ICO or the 32px PNG, iOS takes the
 * 180px apple-touch-icon, and Android's installer reads 192 and 512 from the
 * manifest.
 */
export const ICON_SIZES: IconSpec[] = [
  { size: 16, file: 'favicon-16x16.png', purpose: 'Browser tabs' },
  { size: 32, file: 'favicon-32x32.png', purpose: 'Browser tabs, bookmarks' },
  { size: 48, file: 'favicon-48x48.png', purpose: 'Windows taskbar' },
  { size: 180, file: 'apple-touch-icon.png', purpose: 'iOS home screen' },
  { size: 192, file: 'icon-192.png', purpose: 'Android home screen' },
  { size: 512, file: 'icon-512.png', purpose: 'Install prompts and splash screens' },
]

/** The sizes packed inside favicon.ico itself. */
export const ICO_SIZES = [16, 32, 48]

export interface IcoImage {
  size: number
  png: Uint8Array
}

/**
 * Build a favicon.ico from PNGs.
 *
 * PNG-compressed entries rather than raw bitmaps: every browser still in use
 * reads them, and a 48×48 BMP with its own colour table and upside-down rows
 * is a great deal of format to own for no benefit.
 *
 * A size of 256 or above is written as 0, which is how the format says "256";
 * the field is a single byte and has no other way to express it.
 */
export function buildIco(images: IcoImage[]): Uint8Array {
  if (images.length === 0)
    throw new Error('An icon needs at least one image')

  const HEADER = 6
  const ENTRY = 16
  const offsetStart = HEADER + images.length * ENTRY
  const total = offsetStart + images.reduce((n, i) => n + i.png.length, 0)

  const out = new Uint8Array(total)
  const view = new DataView(out.buffer)

  view.setUint16(0, 0, true) // reserved
  view.setUint16(2, 1, true) // 1 = icon
  view.setUint16(4, images.length, true)

  let offset = offsetStart
  images.forEach((image, i) => {
    const at = HEADER + i * ENTRY
    const dimension = image.size >= 256 ? 0 : image.size
    out[at] = dimension
    out[at + 1] = dimension
    out[at + 2] = 0 // palette colours
    out[at + 3] = 0 // reserved
    view.setUint16(at + 4, 1, true) // colour planes
    view.setUint16(at + 6, 32, true) // bits per pixel
    view.setUint32(at + 8, image.png.length, true)
    view.setUint32(at + 12, offset, true)
    out.set(image.png, offset)
    offset += image.png.length
  })

  return out
}

export interface ManifestOptions {
  name: string
  shortName?: string
  themeColor?: string
  backgroundColor?: string
}

/** A web app manifest with the two icons Android's install prompt looks for. */
export function manifestJson(options: ManifestOptions): string {
  const name = options.name.trim() || 'My site'
  return `${JSON.stringify({
    name,
    short_name: (options.shortName?.trim() || name).slice(0, 12),
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    theme_color: options.themeColor || '#ffffff',
    background_color: options.backgroundColor || '#ffffff',
    display: 'standalone',
  }, null, 2)}\n`
}

/**
 * The markup to paste into <head>.
 *
 * `favicon.ico` at the site root is listed last and still matters: browsers
 * request it whether or not it is declared, so leaving it out means a 404 on
 * every first visit rather than no request at all.
 */
export function htmlSnippet(): string {
  return [
    '<link rel="icon" href="/favicon.ico" sizes="any">',
    '<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">',
    '<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">',
    '<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">',
    '<link rel="manifest" href="/site.webmanifest">',
  ].join('\n')
}
