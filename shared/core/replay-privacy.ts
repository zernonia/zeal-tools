/**
 * What session replay may see.
 *
 * The Zeal Promise is that tool inputs never reach our servers, and a replay
 * is a copy of the page sent to PostHog — so a recording must be of the
 * page's shape and the visitor's clicks, never of what they put into a tool.
 * Everything inside a tool's frame is therefore treated as input: its text is
 * masked, its pictures are blocked, and its attributes are masked, because
 * filenames turn up in `alt` and `aria-label` as readily as in text.
 *
 * The page around the tool (headings, explanations, FAQ, navigation) is the
 * same for everyone and stays legible, which is what makes a replay useful.
 */

/**
 * Everything private: a tool's frame, plus anything a tool renders outside it
 * — a dialog teleported to <body> carries `data-replay-mask`.
 */
export const PRIVATE_SELECTOR = '.tool-frame, [data-replay-mask]'

/** Text inside these is replaced with asterisks. */
export const MASK_TEXT_SELECTOR = PRIVATE_SELECTOR

/**
 * These are not recorded at all, only their size. SVG is on the list because
 * a QR code is one, and a WiFi QR code carries the network password;
 * iframes because the EXIF viewer's map is centred on where a photo was taken.
 */
export const BLOCK_SELECTOR = PRIVATE_SELECTOR.split(', ')
  .flatMap(scope => ['img', 'canvas', 'svg', 'video', 'audio', 'iframe', 'picture'].map(tag => `${scope} ${tag}`))
  .join(', ')

/**
 * Attributes that only describe how something looks or behaves, never what a
 * visitor typed. Kept so a masked tool still renders recognisably in replay.
 */
const PRESENTATIONAL = new Set([
  'class',
  'style',
  'id',
  'role',
  'type',
  'tabindex',
  'disabled',
  'hidden',
  'dir',
])

function isPresentational(name: string): boolean {
  if (PRESENTATIONAL.has(name))
    return true
  // `data-state`, `data-slot`, `data-orientation` … are reka's UI state.
  // `aria-*` is not: `aria-label` routinely carries a filename.
  return name.startsWith('data-') && !name.startsWith('data-value')
}

/**
 * Mask one attribute, for rrweb's `maskAttributeFn`. Outside a private scope, or for
 * a purely presentational attribute, the value is kept as it is.
 */
export function maskAttribute(name: string, value: string, isPrivate: boolean): string {
  if (!isPrivate || !value || isPresentational(name.toLowerCase()))
    return value
  return '*'.repeat(Math.min(value.length, 16))
}
