/**
 * Image compressor — the pure part.
 *
 * The pixels are pushed around by the browser's own canvas, which is why there
 * is no dependency here and no upload anywhere. What lives in this file is the
 * arithmetic that decides what the output should be: the target size, the
 * format, the name, and what was actually saved. All of it is the kind of
 * thing that is easy to get subtly wrong and easy to test.
 */

/** What a canvas can actually produce. AVIF is not among them — measured. */
export type OutputFormat = 'image/jpeg' | 'image/png' | 'image/webp'

export interface FormatInfo {
  value: OutputFormat
  label: string
  extension: string
  /** Whether the quality setting means anything for this format. */
  lossy: boolean
}

export const OUTPUT_FORMATS: FormatInfo[] = [
  { value: 'image/webp', label: 'WebP', extension: 'webp', lossy: true },
  { value: 'image/jpeg', label: 'JPEG', extension: 'jpg', lossy: true },
  { value: 'image/png', label: 'PNG', extension: 'png', lossy: false },
]

/** What browsers reliably decode. HEIC is deliberately absent: only Safari can. */
export const INPUT_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/bmp',
  'image/avif',
]

export function isDecodable(type: string): boolean {
  return INPUT_TYPES.includes(type.toLowerCase())
}

export type ResizeMode = 'none' | 'longest' | 'width' | 'height' | 'percent'

export interface Resize {
  mode: ResizeMode
  value: number
}

/**
 * The size an image should come out at.
 *
 * Only ever shrinks. A compressor that enlarges on a careless setting turns a
 * 200 KB photo into a 4 MB one while claiming to have optimised it, and no
 * amount of interpolation invents detail that was not there.
 */
export function fitDimensions(
  width: number,
  height: number,
  resize: Resize,
): { width: number, height: number } {
  const w = Math.max(1, Math.round(width))
  const h = Math.max(1, Math.round(height))
  if (resize.mode === 'none' || !Number.isFinite(resize.value) || resize.value <= 0)
    return { width: w, height: h }

  const scale = (() => {
    switch (resize.mode) {
      case 'percent':
        return Math.min(1, resize.value / 100)
      case 'width':
        return Math.min(1, resize.value / w)
      case 'height':
        return Math.min(1, resize.value / h)
      case 'longest':
        return Math.min(1, resize.value / Math.max(w, h))
      default:
        return 1
    }
  })()

  return {
    width: Math.max(1, Math.round(w * scale)),
    height: Math.max(1, Math.round(h * scale)),
  }
}

/** How much smaller the result is, 0–1. Negative when the output grew. */
export function savingsFraction(before: number, after: number): number {
  if (!Number.isFinite(before) || before <= 0)
    return 0
  return (before - after) / before
}

export function extensionFor(format: OutputFormat): string {
  return OUTPUT_FORMATS.find(f => f.value === format)?.extension ?? 'bin'
}

export function isLossy(format: OutputFormat): boolean {
  return OUTPUT_FORMATS.find(f => f.value === format)?.lossy ?? false
}

/**
 * The name to save as: the original, with its extension replaced.
 *
 * Only a real trailing extension is replaced, so `holiday.2024.png` becomes
 * `holiday.2024.webp` rather than `holiday.webp`.
 */
export function outputFilename(original: string, format: OutputFormat): string {
  const extension = extensionFor(format)
  const trimmed = original.trim() || 'image'
  const dot = trimmed.lastIndexOf('.')
  const stem = dot > 0 && dot > trimmed.lastIndexOf('/') ? trimmed.slice(0, dot) : trimmed
  return `${stem}.${extension}`
}
