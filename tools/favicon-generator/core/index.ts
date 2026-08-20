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

// ---------------------------------------------------------------- app stores

export interface PlatformIcon {
  size: number
  /** Path inside the downloaded pack. */
  path: string
  purpose: string
  /** Apple rejects any alpha channel in an App Store icon (ITMS-90717). */
  opaque?: boolean
  /**
   * Adaptive and maskable icons are cropped to a circle, squircle or rounded
   * square by the launcher, so their content has to sit inside a safe zone.
   */
  safeZone?: boolean
}

/**
 * The iOS app icon set, as Xcode's asset catalog expects it.
 *
 * Every entry is opaque. iOS masks icons into its own rounded shape and does
 * not honour transparency, so a transparent source composites onto black on a
 * device — and the 1024 marketing icon is rejected outright if the PNG carries
 * an alpha channel at all.
 */
export const IOS_ICONS: PlatformIcon[] = [
  { size: 20, path: 'ios/AppIcon.appiconset/icon-20.png', purpose: 'iPad notifications', opaque: true },
  { size: 29, path: 'ios/AppIcon.appiconset/icon-29.png', purpose: 'iPad settings', opaque: true },
  { size: 40, path: 'ios/AppIcon.appiconset/icon-40.png', purpose: 'Notifications', opaque: true },
  { size: 58, path: 'ios/AppIcon.appiconset/icon-58.png', purpose: 'Settings', opaque: true },
  { size: 60, path: 'ios/AppIcon.appiconset/icon-60.png', purpose: 'Notifications @3x', opaque: true },
  { size: 76, path: 'ios/AppIcon.appiconset/icon-76.png', purpose: 'iPad home screen', opaque: true },
  { size: 80, path: 'ios/AppIcon.appiconset/icon-80.png', purpose: 'Spotlight', opaque: true },
  { size: 87, path: 'ios/AppIcon.appiconset/icon-87.png', purpose: 'Settings @3x', opaque: true },
  { size: 120, path: 'ios/AppIcon.appiconset/icon-120.png', purpose: 'iPhone home screen', opaque: true },
  { size: 152, path: 'ios/AppIcon.appiconset/icon-152.png', purpose: 'iPad home screen @2x', opaque: true },
  { size: 167, path: 'ios/AppIcon.appiconset/icon-167.png', purpose: 'iPad Pro home screen', opaque: true },
  { size: 180, path: 'ios/AppIcon.appiconset/icon-180.png', purpose: 'iPhone home screen @3x', opaque: true },
  { size: 1024, path: 'ios/AppIcon.appiconset/icon-1024.png', purpose: 'App Store', opaque: true },
]

/** Android launcher densities, the Play Store listing icon, and the adaptive layers. */
export const ANDROID_ICONS: PlatformIcon[] = [
  { size: 48, path: 'android/mipmap-mdpi/ic_launcher.png', purpose: 'Launcher, mdpi' },
  { size: 72, path: 'android/mipmap-hdpi/ic_launcher.png', purpose: 'Launcher, hdpi' },
  { size: 96, path: 'android/mipmap-xhdpi/ic_launcher.png', purpose: 'Launcher, xhdpi' },
  { size: 144, path: 'android/mipmap-xxhdpi/ic_launcher.png', purpose: 'Launcher, xxhdpi' },
  { size: 192, path: 'android/mipmap-xxxhdpi/ic_launcher.png', purpose: 'Launcher, xxxhdpi' },
  { size: 512, path: 'android/play-store-icon.png', purpose: 'Play Store listing' },
  { size: 432, path: 'android/mipmap-xxxhdpi/ic_launcher_foreground.png', purpose: 'Adaptive foreground', safeZone: true },
  { size: 432, path: 'android/mipmap-xxxhdpi/ic_launcher_background.png', purpose: 'Adaptive background' },
]

/** A maskable web icon, for installed PWAs whose launcher crops the corners. */
export const MASKABLE_ICON: PlatformIcon = {
  size: 512,
  path: 'web/icon-512-maskable.png',
  purpose: 'Installed PWA, any shape',
  safeZone: true,
}

/**
 * The share of an adaptive icon that is guaranteed to survive the mask.
 *
 * Android composes adaptive icons at 108dp and only promises the middle 72dp
 * will be visible; the rest is cropped by whatever shape the launcher uses and
 * consumed by parallax. Content drawn outside that band gets its edges eaten.
 */
export const SAFE_ZONE = 72 / 108

/** Xcode reads this to know which file fills which slot. */
export function appleContentsJson(): string {
  const images = [
    ['20x20', 'iphone', '2x', 40],
    ['20x20', 'iphone', '3x', 60],
    ['29x29', 'iphone', '2x', 58],
    ['29x29', 'iphone', '3x', 87],
    ['40x40', 'iphone', '2x', 80],
    ['40x40', 'iphone', '3x', 120],
    ['60x60', 'iphone', '2x', 120],
    ['60x60', 'iphone', '3x', 180],
    ['20x20', 'ipad', '1x', 20],
    ['20x20', 'ipad', '2x', 40],
    ['29x29', 'ipad', '1x', 29],
    ['29x29', 'ipad', '2x', 58],
    ['40x40', 'ipad', '1x', 40],
    ['40x40', 'ipad', '2x', 80],
    ['76x76', 'ipad', '1x', 76],
    ['76x76', 'ipad', '2x', 152],
    ['83.5x83.5', 'ipad', '2x', 167],
    ['1024x1024', 'ios-marketing', '1x', 1024],
  ] as const

  return `${JSON.stringify({
    images: images.map(([size, idiom, scale, px]) => ({
      size,
      idiom,
      scale,
      filename: `icon-${px}.png`,
    })),
    info: { version: 1, author: 'zeal.tools' },
  }, null, 2)}\n`
}

/** The XML Android Studio expects for an adaptive launcher icon. */
export function adaptiveIconXml(): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@mipmap/ic_launcher_background" />
    <foreground android:drawable="@mipmap/ic_launcher_foreground" />
</adaptive-icon>
`
}
