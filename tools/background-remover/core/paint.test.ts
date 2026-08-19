import type { Matte } from './index'
import type { Stroke } from './paint'
import { describe, expect, it } from 'vitest'
import {
  applyPaint,
  createPaint,
  isPaintEmpty,
  rasterizeStrokes,
  resizePaint,
  stampBrush,
  strokeSegment,
} from './paint'

function matte(width: number, height: number, fill: (x: number, y: number) => number): Matte {
  const data = new Uint8ClampedArray(width * height)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) data[y * width + x] = fill(x, y)
  }
  return { data, width, height }
}

const at = (p: Int16Array, w: number, x: number, y: number) => p[y * w + x]!

describe('createPaint', () => {
  it('starts empty, meaning the model\'s opinion stands everywhere', () => {
    const p = createPaint(4, 3)
    expect(p.length).toBe(12)
    expect([...p].every(v => v === 0)).toBe(true)
    expect(isPaintEmpty(p)).toBe(true)
  })
})

describe('stampBrush', () => {
  it('is strongest at the centre and fades to nothing at the rim', () => {
    const p = createPaint(41, 41)
    stampBrush(p, 41, 41, 20, 20, 10, 1, 'restore')
    expect(at(p, 41, 20, 20)).toBe(255)
    // Half way out, smoothstep gives half strength.
    expect(at(p, 41, 25, 20)).toBeGreaterThan(100)
    expect(at(p, 41, 25, 20)).toBeLessThan(160)
    // At the rim, nothing.
    expect(at(p, 41, 30, 20)).toBe(0)
  })

  it('leaves everything outside the radius untouched', () => {
    const p = createPaint(41, 41)
    stampBrush(p, 41, 41, 20, 20, 5, 1, 'restore')
    expect(at(p, 41, 0, 0)).toBe(0)
    expect(at(p, 41, 40, 40)).toBe(0)
  })

  it('signs restore positive and erase negative', () => {
    const a = createPaint(21, 21)
    const b = createPaint(21, 21)
    stampBrush(a, 21, 21, 10, 10, 6, 1, 'restore')
    stampBrush(b, 21, 21, 10, 10, 6, 1, 'erase')
    expect(at(a, 21, 10, 10)).toBe(255)
    expect(at(b, 21, 10, 10)).toBe(-255)
  })

  it('builds up over repeated light passes', () => {
    const p = createPaint(21, 21)
    stampBrush(p, 21, 21, 10, 10, 6, 0.3, 'restore')
    const first = at(p, 21, 10, 10)
    stampBrush(p, 21, 21, 10, 10, 6, 0.3, 'restore')
    expect(at(p, 21, 10, 10)).toBeGreaterThan(first)
  })

  it('clamps rather than running away over many passes', () => {
    const p = createPaint(21, 21)
    for (let i = 0; i < 20; i++) stampBrush(p, 21, 21, 10, 10, 6, 1, 'restore')
    expect(at(p, 21, 10, 10)).toBe(255)
    for (let i = 0; i < 40; i++) stampBrush(p, 21, 21, 10, 10, 6, 1, 'erase')
    expect(at(p, 21, 10, 10)).toBe(-255)
  })

  it('erasing over a restored area cancels it', () => {
    const p = createPaint(21, 21)
    stampBrush(p, 21, 21, 10, 10, 6, 1, 'restore')
    stampBrush(p, 21, 21, 10, 10, 6, 1, 'erase')
    expect(at(p, 21, 10, 10)).toBe(0)
  })

  it('clips at the edges instead of wrapping to the other side', () => {
    const p = createPaint(20, 20)
    stampBrush(p, 20, 20, 0, 0, 6, 1, 'restore')
    expect(at(p, 20, 0, 0)).toBe(255)
    // The row above wraps to the far edge if indices are not bounded.
    expect(at(p, 20, 19, 0)).toBe(0)
    expect(at(p, 20, 19, 19)).toBe(0)
  })
})

describe('strokeSegment', () => {
  it('leaves no gap when pointer events arrive far apart', () => {
    // A fast drag delivers two distant points; without interpolation the
    // middle of the stroke would be untouched.
    const p = createPaint(60, 20)
    strokeSegment(p, 60, 20, { x: 5, y: 10 }, { x: 55, y: 10 }, 4, 1, 'restore')
    for (let x = 5; x <= 55; x++)
      expect(at(p, 60, x, 10)).toBeGreaterThan(0)
  })

  it('covers a diagonal drag as continuously as a straight one', () => {
    const p = createPaint(40, 40)
    strokeSegment(p, 40, 40, { x: 5, y: 5 }, { x: 35, y: 35 }, 3, 1, 'restore')
    for (let i = 6; i <= 34; i++)
      expect(at(p, 40, i, i)).toBeGreaterThan(0)
  })

  it('handles a zero-length segment as a single dab', () => {
    const p = createPaint(21, 21)
    strokeSegment(p, 21, 21, { x: 10, y: 10 }, { x: 10, y: 10 }, 5, 1, 'restore')
    expect(at(p, 21, 10, 10)).toBe(255)
  })
})

describe('rasterizeStrokes', () => {
  it('replaying strokes reproduces live drawing exactly', () => {
    // This equivalence is what makes undo exact: the layer is derived from
    // the stroke list, so dropping one and rebuilding is the true prior state.
    const stroke: Stroke = {
      mode: 'restore',
      radius: 5,
      strength: 0.6,
      points: [{ x: 10, y: 10 }, { x: 25, y: 14 }, { x: 40, y: 30 }],
    }

    const live = createPaint(60, 60)
    for (let i = 1; i < stroke.points.length; i++)
      strokeSegment(live, 60, 60, stroke.points[i - 1]!, stroke.points[i]!, stroke.radius, stroke.strength, stroke.mode)

    expect([...rasterizeStrokes([stroke], 60, 60)]).toEqual([...live])
  })

  it('dropping the last stroke undoes only that stroke', () => {
    const a: Stroke = { mode: 'restore', radius: 4, strength: 1, points: [{ x: 10, y: 10 }] }
    const b: Stroke = { mode: 'erase', radius: 4, strength: 1, points: [{ x: 40, y: 40 }] }

    const both = rasterizeStrokes([a, b], 60, 60)
    const undone = rasterizeStrokes([a], 60, 60)

    expect(at(both, 60, 40, 40)).toBe(-255)
    expect(at(undone, 60, 40, 40)).toBe(0)
    expect(at(undone, 60, 10, 10)).toBe(255)
  })

  it('is empty for no strokes, and ignores empty ones', () => {
    expect(isPaintEmpty(rasterizeStrokes([], 20, 20))).toBe(true)
    expect(isPaintEmpty(rasterizeStrokes([{ mode: 'restore', radius: 4, strength: 1, points: [] }], 20, 20))).toBe(true)
  })

  it('stamps a single-point stroke, so a tap still marks', () => {
    const p = rasterizeStrokes([{ mode: 'restore', radius: 5, strength: 1, points: [{ x: 10, y: 10 }] }], 21, 21)
    expect(at(p, 21, 10, 10)).toBe(255)
  })
})

describe('applyPaint', () => {
  it('forces coverage opaque where fully restored', () => {
    const p = createPaint(4, 1)
    p[0] = 255
    expect(applyPaint(matte(4, 1, () => 30), p).data[0]).toBe(255)
  })

  it('forces coverage clear where fully erased', () => {
    const p = createPaint(4, 1)
    p[0] = -255
    expect(applyPaint(matte(4, 1, () => 220), p).data[0]).toBe(0)
  })

  it('leaves the model\'s matte alone where nothing was painted', () => {
    const p = createPaint(4, 1)
    const out = applyPaint(matte(4, 1, x => x * 40), p)
    expect([...out.data]).toEqual([0, 40, 80, 120])
  })

  it('blends partial strokes rather than snapping', () => {
    const p = createPaint(1, 1)
    p[0] = 60
    expect(applyPaint(matte(1, 1, () => 100), p).data[0]).toBe(160)
  })

  it('never produces values outside the byte range', () => {
    const p = createPaint(3, 1)
    p[0] = 255
    p[1] = -255
    p[2] = 200
    const out = applyPaint(matte(3, 1, () => 200), p)
    expect([...out.data].every(v => v >= 0 && v <= 255)).toBe(true)
  })
})

describe('resizePaint', () => {
  it('returns a copy at identical size, not the same buffer', () => {
    const p = createPaint(4, 4)
    p[5] = 120
    const out = resizePaint(p, 4, 4, 4, 4)
    expect([...out]).toEqual([...p])
    expect(out).not.toBe(p)
  })

  it('carries preview strokes up to full resolution', () => {
    const p = createPaint(10, 10)
    stampBrush(p, 10, 10, 5, 5, 3, 1, 'restore')
    const out = resizePaint(p, 10, 10, 40, 40)
    expect(out.length).toBe(1600)
    expect(at(out, 40, 20, 20)).toBeGreaterThan(200)
    expect(at(out, 40, 0, 0)).toBe(0)
  })

  it('keeps erase strokes negative through resampling', () => {
    const p = createPaint(10, 10)
    stampBrush(p, 10, 10, 5, 5, 3, 1, 'erase')
    const out = resizePaint(p, 10, 10, 30, 30)
    expect(at(out, 30, 15, 15)).toBeLessThan(-200)
  })

  it('does not introduce a staircase, unlike nearest-neighbour', () => {
    const p = createPaint(8, 8)
    stampBrush(p, 8, 8, 4, 4, 3, 1, 'restore')
    const out = resizePaint(p, 8, 8, 32, 32)

    // Find the peak rather than assuming where it lands: centre-aligned
    // resampling puts it near x=17.5, not at the naive 16.
    let peak = 0
    for (let x = 0; x < 32; x++) {
      if (at(out, 32, x, 16) > at(out, 32, peak, 16))
        peak = x
    }

    // Walking outwards from there the value must fall smoothly, never
    // repeating a plateau then jumping the way nearest-neighbour would.
    let previous = at(out, 32, peak, 16)
    let plateaus = 0
    for (let x = peak + 1; x < 30; x++) {
      const v = at(out, 32, x, 16)
      expect(v).toBeLessThanOrEqual(previous)
      if (v === previous && v !== 0)
        plateaus++
      previous = v
    }
    expect(plateaus).toBeLessThan(3)
  })
})

describe('isPaintEmpty', () => {
  it('notices a single painted pixel', () => {
    const p = createPaint(10, 10)
    expect(isPaintEmpty(p)).toBe(true)
    p[42] = -1
    expect(isPaintEmpty(p)).toBe(false)
  })
})
