/**
 * Image redaction: a painted mask decides *where*, an effect decides *what*.
 *
 * The two are kept apart on purpose. Strokes only ever write the mask, and
 * the effect is computed once for the whole picture, so changing pixelate to
 * blur — or turning the strength up — re-renders every region already
 * painted instead of applying only to the next stroke. The output is then a
 * per-pixel choice between the original and the effect.
 *
 * Strokes are held as data and the mask is derived from them by replay, so
 * undo is exact: drop the last stroke, rebuild, and the state is precisely
 * what it was before it, with no snapshot buffers to keep.
 */

export interface Rgba {
  data: Uint8ClampedArray
  width: number
  height: number
}

/** 1 where the effect shows, 0 where the original does. */
export type Mask = Uint8Array

export type RedactMode = 'pixelate' | 'blur' | 'solid'

export const REDACT_MODES: readonly { value: RedactMode, label: string }[] = [
  { value: 'pixelate', label: 'Pixelate' },
  { value: 'blur', label: 'Blur' },
  { value: 'solid', label: 'Black out' },
]

export interface Point { x: number, y: number }

export interface Stroke {
  /** Erasing brings the original back. */
  erase: boolean
  /** In image pixels, not screen pixels. */
  radius: number
  points: Point[]
}

/** Inclusive-exclusive pixel rectangle touched by an operation. */
export interface Rect { x: number, y: number, width: number, height: number }

export function createMask(width: number, height: number): Mask {
  return new Uint8Array(width * height)
}

export function isMaskEmpty(mask: Mask): boolean {
  for (let i = 0; i < mask.length; i++) {
    if (mask[i] !== 0)
      return false
  }
  return true
}

function union(a: Rect | null, b: Rect | null): Rect | null {
  if (!a)
    return b
  if (!b)
    return a
  const x = Math.min(a.x, b.x)
  const y = Math.min(a.y, b.y)
  return {
    x,
    y,
    width: Math.max(a.x + a.width, b.x + b.width) - x,
    height: Math.max(a.y + a.height, b.y + b.height) - y,
  }
}

/**
 * Stamp one hard-edged disc.
 *
 * Hard rather than feathered, unlike the background remover's brush: a soft
 * shoulder would blend the original back in at the rim of every stroke, and
 * on text that is exactly where a letter's edge would show through.
 *
 * Returns the touched rectangle so the caller repaints only that, which is
 * what keeps drawing on a 12-megapixel photo smooth. Mutates `mask`.
 */
export function stampDisc(
  mask: Mask,
  width: number,
  height: number,
  x: number,
  y: number,
  radius: number,
  erase: boolean,
): Rect | null {
  const r = Math.max(0.5, radius)
  const minX = Math.max(0, Math.floor(x - r))
  const maxX = Math.min(width - 1, Math.ceil(x + r))
  const minY = Math.max(0, Math.floor(y - r))
  const maxY = Math.min(height - 1, Math.ceil(y + r))
  if (minX > maxX || minY > maxY)
    return null

  const value = erase ? 0 : 1
  const r2 = r * r
  for (let py = minY; py <= maxY; py++) {
    // Sample at the pixel centre, so a disc is symmetric about its centre.
    const dy = py + 0.5 - y
    for (let px = minX; px <= maxX; px++) {
      const dx = px + 0.5 - x
      if (dx * dx + dy * dy <= r2)
        mask[py * width + px] = value
    }
  }
  return { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 }
}

/**
 * Stamp along a segment.
 *
 * Pointer events arrive far apart during a fast drag; without interpolation a
 * quick stroke lands as a row of disconnected dots, and the gaps between them
 * would leave slivers of the original showing.
 */
export function strokeSegment(
  mask: Mask,
  width: number,
  height: number,
  from: Point,
  to: Point,
  radius: number,
  erase: boolean,
): Rect | null {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const distance = Math.sqrt(dx * dx + dy * dy)
  const spacing = Math.max(0.5, radius * 0.25)
  const steps = Math.max(1, Math.ceil(distance / spacing))
  let dirty: Rect | null = null
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    dirty = union(dirty, stampDisc(mask, width, height, from.x + dx * t, from.y + dy * t, radius, erase))
  }
  return dirty
}

/** Rebuild the mask from scratch by replaying strokes — this is undo. */
export function rasterizeStrokes(strokes: readonly Stroke[], width: number, height: number): Mask {
  const mask = createMask(width, height)
  for (const stroke of strokes) {
    const [first] = stroke.points
    if (!first)
      continue
    if (stroke.points.length === 1) {
      stampDisc(mask, width, height, first.x, first.y, stroke.radius, stroke.erase)
      continue
    }
    for (let i = 1; i < stroke.points.length; i++)
      strokeSegment(mask, width, height, stroke.points[i - 1]!, stroke.points[i]!, stroke.radius, stroke.erase)
  }
  return mask
}

/**
 * A single stroke that covers the whole picture.
 *
 * A disc from the centre whose radius reaches the corners — one ordinary
 * stroke, so it undoes like any other and later strokes can erase holes in it.
 */
export function wholeImageStroke(width: number, height: number): Stroke {
  return {
    erase: false,
    radius: Math.hypot(width, height) / 2 + 1,
    points: [{ x: width / 2, y: height / 2 }],
  }
}

/**
 * Effect size in pixels for a 1–10 strength setting.
 *
 * Proportional to the picture's longer edge, so "strength 6" hides about the
 * same amount of a phone photo as of a small screenshot. A fixed pixel size
 * would be invisible on one and obliterate the other. The floor keeps the
 * weakest setting on a tiny image from being a no-op.
 */
export function effectSize(width: number, height: number, strength: number): number {
  const s = Math.min(10, Math.max(1, strength))
  return Math.max(4, Math.round(Math.max(width, height) * s / 400))
}

/**
 * Replace every block with its average colour.
 *
 * The grid is anchored to the image origin rather than to the stroke, so
 * neighbouring strokes share block boundaries and repainting an area cannot
 * shift the grid under it. Edge blocks are averaged over the pixels they
 * actually contain.
 */
export function pixelate(src: Rgba, block: number): Rgba {
  const { width, height } = src
  const size = Math.max(1, Math.round(block))
  const out = new Uint8ClampedArray(src.data.length)

  for (let by = 0; by < height; by += size) {
    const yEnd = Math.min(height, by + size)
    for (let bx = 0; bx < width; bx += size) {
      const xEnd = Math.min(width, bx + size)
      let r = 0
      let g = 0
      let b = 0
      let a = 0
      for (let y = by; y < yEnd; y++) {
        for (let x = bx; x < xEnd; x++) {
          const i = (y * width + x) * 4
          r += src.data[i]!
          g += src.data[i + 1]!
          b += src.data[i + 2]!
          a += src.data[i + 3]!
        }
      }
      const n = (yEnd - by) * (xEnd - bx)
      r /= n
      g /= n
      b /= n
      a /= n
      for (let y = by; y < yEnd; y++) {
        for (let x = bx; x < xEnd; x++) {
          const i = (y * width + x) * 4
          out[i] = r
          out[i + 1] = g
          out[i + 2] = b
          out[i + 3] = a
        }
      }
    }
  }
  return { data: out, width, height }
}

/** One horizontal-then-vertical box pass, clamping at the edges. */
function boxPass(src: Uint8ClampedArray, width: number, height: number, radius: number): Uint8ClampedArray {
  const tmp = new Uint8ClampedArray(src.length)
  const out = new Uint8ClampedArray(src.length)
  const span = radius * 2 + 1

  // Sliding window sum: O(pixels) whatever the radius, which is the only
  // reason a large blur on a large photo finishes in well under a second.
  for (let y = 0; y < height; y++) {
    const row = y * width
    for (let c = 0; c < 4; c++) {
      let sum = 0
      for (let k = -radius; k <= radius; k++)
        sum += src[(row + Math.min(width - 1, Math.max(0, k))) * 4 + c]!
      for (let x = 0; x < width; x++) {
        tmp[(row + x) * 4 + c] = sum / span
        const add = Math.min(width - 1, x + radius + 1)
        const drop = Math.max(0, x - radius)
        sum += src[(row + add) * 4 + c]! - src[(row + drop) * 4 + c]!
      }
    }
  }

  for (let x = 0; x < width; x++) {
    for (let c = 0; c < 4; c++) {
      let sum = 0
      for (let k = -radius; k <= radius; k++)
        sum += tmp[(Math.min(height - 1, Math.max(0, k)) * width + x) * 4 + c]!
      for (let y = 0; y < height; y++) {
        out[(y * width + x) * 4 + c] = sum / span
        const add = Math.min(height - 1, y + radius + 1)
        const drop = Math.max(0, y - radius)
        sum += tmp[(add * width + x) * 4 + c]! - tmp[(drop * width + x) * 4 + c]!
      }
    }
  }
  return out
}

/**
 * Approximate Gaussian blur: three box passes.
 *
 * Three is the classic count — by the central limit theorem the repeated box
 * converges on a bell curve, and one pass alone leaves visible square
 * artefacts. Each pass uses a third of the radius so the total spread is
 * roughly `radius`.
 */
export function boxBlur(src: Rgba, radius: number): Rgba {
  const r = Math.max(0, Math.round(radius / 3))
  if (r === 0)
    return { data: src.data.slice(), width: src.width, height: src.height }
  let data = src.data
  for (let pass = 0; pass < 3; pass++)
    data = boxPass(data, src.width, src.height, r)
  return { data, width: src.width, height: src.height }
}

/**
 * Opaque black.
 *
 * The only one of the three that removes information rather than scrambling
 * it — see the page copy on why pixelated text can sometimes be read back.
 */
export function blackOut(src: Rgba): Rgba {
  const data = new Uint8ClampedArray(src.data.length)
  for (let i = 3; i < data.length; i += 4)
    data[i] = 255
  return { data, width: src.width, height: src.height }
}

export function applyEffect(src: Rgba, mode: RedactMode, size: number): Rgba {
  if (mode === 'pixelate')
    return pixelate(src, size)
  if (mode === 'blur')
    return boxBlur(src, size)
  return blackOut(src)
}

/**
 * Write original-or-effect into `out` for every pixel in `rect`.
 *
 * Takes a rectangle so a stroke repaints only what it touched; omit it to
 * render everything. `out` may be the same buffer every time.
 */
export function composite(original: Rgba, effect: Rgba, mask: Mask, out: Uint8ClampedArray, rect?: Rect): void {
  const { width, height } = original
  const x0 = Math.max(0, rect?.x ?? 0)
  const y0 = Math.max(0, rect?.y ?? 0)
  const x1 = Math.min(width, rect ? rect.x + rect.width : width)
  const y1 = Math.min(height, rect ? rect.y + rect.height : height)
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const p = y * width + x
      const source = mask[p] ? effect.data : original.data
      const i = p * 4
      out[i] = source[i]!
      out[i + 1] = source[i + 1]!
      out[i + 2] = source[i + 2]!
      out[i + 3] = source[i + 3]!
    }
  }
}

export type OutputType = 'image/png' | 'image/jpeg' | 'image/webp'

/**
 * Keep the format someone brought, where a canvas can write it.
 *
 * A photo stays a JPEG so the file does not balloon to a 20 MB PNG; a
 * screenshot stays a lossless PNG so text that was not redacted stays crisp.
 * Anything else (GIF, BMP, AVIF) becomes PNG — AVIF because a canvas cannot
 * encode it.
 */
export function outputType(inputType: string): OutputType {
  if (inputType === 'image/jpeg' || inputType === 'image/webp')
    return inputType
  return 'image/png'
}

const EXTENSIONS: Record<OutputType, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
}

export function outputFilename(name: string, type: OutputType): string {
  const base = name.replace(/\.[^.]*$/, '') || 'image'
  return `${base}-redacted.${EXTENSIONS[type]}`
}
