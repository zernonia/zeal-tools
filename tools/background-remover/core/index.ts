/**
 * Background remover — pure, isomorphic image maths.
 *
 * The segmentation model itself is the one part we cannot own (see the
 * allow-list in CONTRIBUTING.md), but everything around it is ours and lives
 * here: getting an image into the tensor layout U²-Net expects, turning its
 * output back into an alpha matte, and every edit applied to that matte.
 *
 * No DOM, no Vue, no npm — the composable hands these functions plain arrays.
 */
import type { ModelSpec } from './models'

export * from './models'
export * from './paint'
export * from './sam'

export interface Rgba {
  data: Uint8ClampedArray
  width: number
  height: number
}

export interface Matte {
  /** One byte of coverage per pixel: 0 background, 255 subject. */
  data: Uint8ClampedArray
  width: number
  height: number
}

export interface Rgb { r: number, g: number, b: number }

/**
 * Bilinear resample of an RGBA buffer.
 *
 * Written out rather than delegated to canvas `drawImage` so the same code
 * runs under Vitest in Node, where there is no canvas — and so resampling is
 * deterministic across browsers instead of following each engine's smoothing.
 */
export function resizeRgba(src: Rgba, width: number, height: number): Rgba {
  const out = new Uint8ClampedArray(width * height * 4)
  if (width === src.width && height === src.height) {
    out.set(src.data)
    return { data: out, width, height }
  }

  // Map destination centres onto source centres, so the sampled grid stays
  // aligned; the naive `x * sw / dw` biases everything half a pixel.
  const xRatio = src.width / width
  const yRatio = src.height / height

  for (let y = 0; y < height; y++) {
    const sy = Math.min(src.height - 1, Math.max(0, (y + 0.5) * yRatio - 0.5))
    const y0 = Math.floor(sy)
    const y1 = Math.min(y0 + 1, src.height - 1)
    const wy = sy - y0

    for (let x = 0; x < width; x++) {
      const sx = Math.min(src.width - 1, Math.max(0, (x + 0.5) * xRatio - 0.5))
      const x0 = Math.floor(sx)
      const x1 = Math.min(x0 + 1, src.width - 1)
      const wx = sx - x0

      const i00 = (y0 * src.width + x0) * 4
      const i01 = (y0 * src.width + x1) * 4
      const i10 = (y1 * src.width + x0) * 4
      const i11 = (y1 * src.width + x1) * 4
      const o = (y * width + x) * 4

      for (let c = 0; c < 4; c++) {
        const top = src.data[i00 + c]! * (1 - wx) + src.data[i01 + c]! * wx
        const bottom = src.data[i10 + c]! * (1 - wx) + src.data[i11 + c]! * wx
        out[o + c] = top * (1 - wy) + bottom * wy
      }
    }
  }

  return { data: out, width, height }
}

/** Bilinear resample of a single-channel matte. */
export function resizeMatte(src: Matte, width: number, height: number): Matte {
  const out = new Uint8ClampedArray(width * height)
  if (width === src.width && height === src.height) {
    out.set(src.data)
    return { data: out, width, height }
  }

  const xRatio = src.width / width
  const yRatio = src.height / height

  for (let y = 0; y < height; y++) {
    const sy = Math.min(src.height - 1, Math.max(0, (y + 0.5) * yRatio - 0.5))
    const y0 = Math.floor(sy)
    const y1 = Math.min(y0 + 1, src.height - 1)
    const wy = sy - y0

    for (let x = 0; x < width; x++) {
      const sx = Math.min(src.width - 1, Math.max(0, (x + 0.5) * xRatio - 0.5))
      const x0 = Math.floor(sx)
      const x1 = Math.min(x0 + 1, src.width - 1)
      const wx = sx - x0

      const top = src.data[y0 * src.width + x0]! * (1 - wx) + src.data[y0 * src.width + x1]! * wx
      const bottom = src.data[y1 * src.width + x0]! * (1 - wx) + src.data[y1 * src.width + x1]! * wx
      out[y * width + x] = top * (1 - wy) + bottom * wy
    }
  }

  return { data: out, width, height }
}

/**
 * RGBA → the NCHW float tensor a model expects.
 *
 * The two scaling modes are not interchangeable. U²-Net's reference
 * implementation divides by the image's own brightest channel, so a photo
 * that never reaches full white is stretched up first — feeding it a flat
 * /255 washes out the matte on dark images. BiRefNet was trained the ordinary
 * way on a flat /255, and stretching for it would be equally wrong.
 */
export function toTensor(source: Rgba, spec: ModelSpec): Float32Array {
  const edge = spec.size
  const src = source.width === edge && source.height === edge
    ? source
    : resizeRgba(source, edge, edge)

  const size = edge * edge
  const tensor = new Float32Array(size * 3)

  let divisor = 255
  if (spec.scale === 'image-max') {
    let max = 0
    for (let i = 0; i < src.data.length; i += 4) {
      if (src.data[i]! > max)
        max = src.data[i]!
      if (src.data[i + 1]! > max)
        max = src.data[i + 1]!
      if (src.data[i + 2]! > max)
        max = src.data[i + 2]!
    }
    // A fully black image would divide by zero; it has no subject anyway.
    divisor = max === 0 ? 1 : max
  }

  for (let p = 0; p < size; p++) {
    const i = p * 4
    for (let c = 0; c < 3; c++)
      tensor[c * size + p] = (src.data[i + c]! / divisor - spec.mean[c]!) / spec.std[c]!
  }

  return tensor
}

/**
 * Model output → an 8-bit matte.
 *
 * Which activation applies is a property of the model, and using the wrong one
 * yields a matte that looks plausible and is quietly wrong. Measured on both
 * models here: U²-Net emits small non-negative saliency scores (0 to ~0.007)
 * that carry no absolute meaning and must be stretched against their own
 * range; BiRefNet emits logits (about -15 to +8, mostly negative) where zero
 * is the real decision boundary, so it needs a sigmoid. Stretching logits
 * instead would let a single outlier pixel squash everything else.
 */
export function toMatte(raw: ArrayLike<number>, spec: ModelSpec): Matte {
  const size = spec.size
  const count = size * size
  const data = new Uint8ClampedArray(count)

  if (spec.activation === 'sigmoid') {
    for (let i = 0; i < count; i++)
      data[i] = (1 / (1 + Math.exp(-raw[i]!))) * 255
    return { data, width: size, height: size }
  }

  let min = Infinity
  let max = -Infinity
  for (let i = 0; i < count; i++) {
    const v = raw[i]!
    if (v < min)
      min = v
    if (v > max)
      max = v
  }

  // Where the model saw nothing the range collapses, and stretching it would
  // amplify noise into a full-strength matte — return empty instead.
  const range = max - min
  if (range > 1e-6) {
    for (let i = 0; i < count; i++)
      data[i] = ((raw[i]! - min) / range) * 255
  }

  return { data, width: size, height: size }
}

/**
 * Smoothstep the matte between two coverage thresholds.
 *
 * One control for how decisive the cutout is: a narrow gap snaps edges to a
 * hard line, a wide one keeps the soft falloff that makes hair look right.
 */
export function adjustMatte(matte: Matte, low: number, high: number): Matte {
  const data = new Uint8ClampedArray(matte.data.length)
  const lo = Math.min(low, high)
  const hi = Math.max(low, high)
  const span = hi - lo

  for (let i = 0; i < data.length; i++) {
    const v = matte.data[i]!
    if (span < 1e-6) {
      data[i] = v >= hi ? 255 : 0
      continue
    }
    const t = Math.min(1, Math.max(0, (v - lo) / span))
    data[i] = t * t * (3 - 2 * t) * 255
  }

  return { data, width: matte.width, height: matte.height }
}

/**
 * Feather the matte with a separable box blur, run three times.
 *
 * Three box passes approximate a Gaussian closely enough for an edge that is
 * about to be composited, at a fraction of the cost of a true Gaussian kernel.
 */
export function featherMatte(matte: Matte, radius: number): Matte {
  const r = Math.max(0, Math.round(radius))
  if (r === 0)
    return { data: new Uint8ClampedArray(matte.data), width: matte.width, height: matte.height }

  const { width, height } = matte
  const buf = Float32Array.from(matte.data)
  const tmp = new Float32Array(buf.length)

  for (let pass = 0; pass < 3; pass++) {
    blurAxis(buf, tmp, width, height, r, true)
    blurAxis(tmp, buf, width, height, r, false)
  }

  const data = new Uint8ClampedArray(buf.length)
  for (let i = 0; i < buf.length; i++) data[i] = buf[i]!
  return { data, width, height }
}

/** One axis of a box blur, with edge pixels clamped rather than wrapped. */
function blurAxis(src: Float32Array, dst: Float32Array, width: number, height: number, r: number, horizontal: boolean) {
  const outer = horizontal ? height : width
  const inner = horizontal ? width : height
  const step = horizontal ? 1 : width
  const window = r * 2 + 1

  for (let o = 0; o < outer; o++) {
    const base = horizontal ? o * width : o
    let sum = 0
    for (let k = -r; k <= r; k++)
      sum += src[base + Math.min(inner - 1, Math.max(0, k)) * step]!

    for (let i = 0; i < inner; i++) {
      dst[base + i * step] = sum / window
      const outIdx = Math.min(inner - 1, Math.max(0, i - r))
      const inIdx = Math.min(inner - 1, Math.max(0, i + r + 1))
      sum += src[base + inIdx * step]! - src[base + outIdx * step]!
    }
  }
}

/** Write the matte into an image's alpha channel. */
export function applyMatte(src: Rgba, matte: Matte): Rgba {
  const data = new Uint8ClampedArray(src.data)
  for (let p = 0; p < matte.data.length; p++)
    data[p * 4 + 3] = (src.data[p * 4 + 3]! * matte.data[p]!) / 255
  return { data, width: src.width, height: src.height }
}

/**
 * Flatten a cutout onto a solid colour.
 *
 * Straight (un-premultiplied) alpha in, opaque pixels out — the browser hands
 * us straight alpha from canvas, so compositing has to weight by coverage
 * here rather than assuming the colour is already scaled.
 */
export function compositeOver(src: Rgba, background: Rgb): Rgba {
  const data = new Uint8ClampedArray(src.data)
  const bg = [background.r, background.g, background.b]

  for (let i = 0; i < data.length; i += 4) {
    const a = src.data[i + 3]! / 255
    for (let c = 0; c < 3; c++)
      data[i + c] = src.data[i + c]! * a + bg[c]! * (1 - a)
    data[i + 3] = 255
  }

  return { data, width: src.width, height: src.height }
}

export interface Bounds { x: number, y: number, width: number, height: number }

/**
 * Tightest box still containing the subject, for trimming the transparent
 * margin off a cutout. Returns null when nothing clears the threshold.
 */
export function contentBounds(matte: Matte, threshold = 8): Bounds | null {
  let minX = matte.width
  let minY = matte.height
  let maxX = -1
  let maxY = -1

  for (let y = 0; y < matte.height; y++) {
    for (let x = 0; x < matte.width; x++) {
      if (matte.data[y * matte.width + x]! < threshold)
        continue
      if (x < minX)
        minX = x
      if (x > maxX)
        maxX = x
      if (y < minY)
        minY = y
      if (y > maxY)
        maxY = y
    }
  }

  if (maxX < 0)
    return null
  return { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 }
}

/** Crop an RGBA buffer to a box, clamped to the image. */
export function cropRgba(src: Rgba, bounds: Bounds): Rgba {
  const x0 = Math.max(0, Math.min(src.width - 1, bounds.x))
  const y0 = Math.max(0, Math.min(src.height - 1, bounds.y))
  const width = Math.max(1, Math.min(src.width - x0, bounds.width))
  const height = Math.max(1, Math.min(src.height - y0, bounds.height))
  const data = new Uint8ClampedArray(width * height * 4)

  for (let y = 0; y < height; y++) {
    const from = ((y0 + y) * src.width + x0) * 4
    data.set(src.data.subarray(from, from + width * 4), y * width * 4)
  }

  return { data, width, height }
}

/**
 * How much of the frame the subject covers, 0–1. The UI uses it to tell the
 * difference between a clean cutout and one where the model found nothing.
 */
export function coverage(matte: Matte): number {
  let sum = 0
  for (let i = 0; i < matte.data.length; i++) sum += matte.data[i]!
  return sum / (matte.data.length * 255)
}
