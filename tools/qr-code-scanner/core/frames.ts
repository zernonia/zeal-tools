/**
 * The arithmetic around decoding: how big to draw a frame, how to shrink a
 * large photo without losing the code in it, and when a code seen again is
 * the same scan rather than a new one.
 */

export interface Size { width: number, height: number }

/** Scale to fit inside `max` on the long edge. Never enlarges. */
export function fitWithin(width: number, height: number, max: number): Size {
  const long = Math.max(width, height)
  if (long <= max || long === 0)
    return { width: Math.max(1, Math.round(width)), height: Math.max(1, Math.round(height)) }
  const scale = max / long
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) }
}

/**
 * The intermediate sizes for shrinking an image to `target`, halving each time.
 *
 * One big jump with drawImage samples roughly one source pixel in every few
 * and drops the rest, which turns the fine modules of a small code in a large
 * photo into noise. Halving lets each pass average the pixels it discards —
 * the same reason the image compressor does it. The last entry is the target.
 */
export function halvingSteps(width: number, height: number, target: Size): Size[] {
  const steps: Size[] = []
  let w = width
  let h = height
  while (w / 2 > target.width && h / 2 > target.height) {
    w = Math.round(w / 2)
    h = Math.round(h / 2)
    steps.push({ width: w, height: h })
  }
  steps.push(target)
  return steps
}

/**
 * Long-edge sizes to try on an uploaded image, largest first.
 *
 * A screenshot of a code fills the frame and decodes at any size; a photo of
 * a poster has the code in one corner and needs the detail. Large first, then
 * smaller: shrinking also smooths sensor noise and JPEG blocking, which is
 * sometimes what lets a marginal code through.
 */
export function scanSizes(width: number, height: number): number[] {
  const long = Math.max(width, height)
  const sizes = [Math.min(long, 2048), 1024, 640].filter(size => size <= long)
  return [...new Set(sizes.length ? sizes : [long])]
}

/** Live frames are drawn at this long edge for the fallback decoder: plenty for a code held in front of a camera. */
export const LIVE_FRAME_EDGE = 720

/** Decode at most this often from the camera, ≈ 8–10 a second. */
export const LIVE_INTERVAL_MS = 110

/**
 * Is this the code we just read? A camera sees the same code thirty times a
 * second; without this, one scan would fill the history and fire thirty
 * analytics events. A different code, or the same one after a pause, counts.
 */
export function isRepeat(last: { raw: string, at: number } | null, raw: string, now: number, windowMs = 4000): boolean {
  return !!last && last.raw === raw && now - last.at < windowMs
}

/** A safe download name from a contact or event title: `Jane Doe` → `jane-doe.vcf`. */
export function fileName(title: string, extension: string, fallback: string): string {
  const slug = title
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/, '')
  return `${slug || fallback}.${extension}`
}
