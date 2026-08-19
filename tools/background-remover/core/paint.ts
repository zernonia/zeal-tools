/**
 * Manual retouching of a matte.
 *
 * No model is right every time, so the last word belongs to the person: paint
 * to bring back a limb the model dropped, or to cut away a shadow it kept.
 *
 * Strokes are held as data and the paint layer is *derived* from them by
 * replay. That is what makes undo exact rather than approximate — dropping the
 * last stroke and rebuilding gives precisely the state before it, with no
 * snapshot buffers to keep. Live drawing still stamps incrementally, so replay
 * only happens on undo.
 */
import type { Matte } from './index'

/**
 * Signed coverage adjustment per pixel, -255 (force clear) to +255 (force
 * opaque). Signed because a single layer has to express both directions, and
 * zero has to mean "the model's opinion stands".
 */
export type PaintLayer = Int16Array

export type BrushMode = 'restore' | 'erase'

export interface Point { x: number, y: number }

export interface Stroke {
  mode: BrushMode
  /** Radius in pixels of the layer this stroke was drawn on. */
  radius: number
  /** 0–1. Lets repeated passes build up rather than snapping to full. */
  strength: number
  points: Point[]
}

export function createPaint(width: number, height: number): PaintLayer {
  return new Int16Array(width * height)
}

/**
 * Stamp one dab.
 *
 * Falloff is smoothstep from centre to rim, so a stroke has a soft shoulder
 * and does not leave a hard disc outline on the alpha channel. Accumulates
 * toward the limit rather than setting, which is what makes a slow second
 * pass strengthen an area instead of doing nothing.
 *
 * Mutates `paint` — this runs per pointer-move, and allocating a copy each
 * time would make drawing stutter. Still pure in the sense this codebase
 * means: no DOM, no Vue, no globals.
 */
export function stampBrush(
  paint: PaintLayer,
  width: number,
  height: number,
  x: number,
  y: number,
  radius: number,
  strength: number,
  mode: BrushMode,
): void {
  const r = Math.max(1, radius)
  const sign = mode === 'restore' ? 1 : -1
  const limit = 255 * sign
  const rate = Math.min(1, Math.max(0, strength)) * 255

  const minX = Math.max(0, Math.floor(x - r))
  const maxX = Math.min(width - 1, Math.ceil(x + r))
  const minY = Math.max(0, Math.floor(y - r))
  const maxY = Math.min(height - 1, Math.ceil(y + r))

  for (let py = minY; py <= maxY; py++) {
    const dy = py - y
    for (let px = minX; px <= maxX; px++) {
      const dx = px - x
      const distance = Math.sqrt(dx * dx + dy * dy)
      if (distance > r)
        continue

      const t = 1 - distance / r
      const falloff = t * t * (3 - 2 * t)
      const i = py * width + px
      const next = paint[i]! + sign * falloff * rate

      // Clamp toward the limit in this direction only, so an erase stroke
      // cannot be dragged past fully-clear into restoring.
      paint[i] = sign > 0 ? Math.min(limit, next) : Math.max(limit, next)
    }
  }
}

/**
 * Stamp along a segment.
 *
 * Pointer events arrive far apart during a fast drag — without interpolation a
 * quick stroke lands as a row of disconnected dots. Spacing is a fraction of
 * the radius so overlap stays smooth at any brush size.
 */
export function strokeSegment(
  paint: PaintLayer,
  width: number,
  height: number,
  from: Point,
  to: Point,
  radius: number,
  strength: number,
  mode: BrushMode,
): void {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const distance = Math.sqrt(dx * dx + dy * dy)
  const spacing = Math.max(1, radius * 0.25)
  const steps = Math.max(1, Math.ceil(distance / spacing))

  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    stampBrush(paint, width, height, from.x + dx * t, from.y + dy * t, radius, strength, mode)
  }
}

/** Rebuild a paint layer from scratch by replaying strokes — this is undo. */
export function rasterizeStrokes(strokes: Stroke[], width: number, height: number): PaintLayer {
  const paint = createPaint(width, height)
  for (const stroke of strokes) {
    if (stroke.points.length === 0)
      continue
    if (stroke.points.length === 1) {
      const p = stroke.points[0]!
      stampBrush(paint, width, height, p.x, p.y, stroke.radius, stroke.strength, stroke.mode)
      continue
    }
    for (let i = 1; i < stroke.points.length; i++) {
      strokeSegment(paint, width, height, stroke.points[i - 1]!, stroke.points[i]!, stroke.radius, stroke.strength, stroke.mode)
    }
  }
  return paint
}

/**
 * Combine the model's matte with the manual layer.
 *
 * Applied last, after thresholding and feathering, so a stroke is decisive:
 * having painted something back, no edge setting should quietly remove it
 * again.
 */
export function applyPaint(matte: Matte, paint: PaintLayer): Matte {
  const data = new Uint8ClampedArray(matte.data.length)
  for (let i = 0; i < data.length; i++)
    data[i] = matte.data[i]! + paint[i]!
  return { data, width: matte.width, height: matte.height }
}

/**
 * Resample the paint layer, for applying preview-resolution strokes to the
 * full-resolution export. Bilinear, and signed — nearest-neighbour here would
 * put a staircase on every retouched edge.
 */
export function resizePaint(
  paint: PaintLayer,
  width: number,
  height: number,
  targetWidth: number,
  targetHeight: number,
): PaintLayer {
  if (width === targetWidth && height === targetHeight)
    return paint.slice()

  const out = createPaint(targetWidth, targetHeight)
  const xRatio = width / targetWidth
  const yRatio = height / targetHeight

  for (let y = 0; y < targetHeight; y++) {
    const sy = Math.min(height - 1, Math.max(0, (y + 0.5) * yRatio - 0.5))
    const y0 = Math.floor(sy)
    const y1 = Math.min(y0 + 1, height - 1)
    const wy = sy - y0

    for (let x = 0; x < targetWidth; x++) {
      const sx = Math.min(width - 1, Math.max(0, (x + 0.5) * xRatio - 0.5))
      const x0 = Math.floor(sx)
      const x1 = Math.min(x0 + 1, width - 1)
      const wx = sx - x0

      const top = paint[y0 * width + x0]! * (1 - wx) + paint[y0 * width + x1]! * wx
      const bottom = paint[y1 * width + x0]! * (1 - wx) + paint[y1 * width + x1]! * wx
      out[y * targetWidth + x] = Math.round(top * (1 - wy) + bottom * wy)
    }
  }

  return out
}

/** Whether anything has been painted, so the UI can hide Undo when idle. */
export function isPaintEmpty(paint: PaintLayer): boolean {
  for (let i = 0; i < paint.length; i++) {
    if (paint[i] !== 0)
      return false
  }
  return true
}
