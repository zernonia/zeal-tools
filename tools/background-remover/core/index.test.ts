import type { Matte, Rgba } from './index'
import { describe, expect, it } from 'vitest'
import {
  adjustMatte,
  applyMatte,
  compositeOver,
  contentBounds,
  coverage,
  cropRgba,
  featherMatte,
  MODEL,
  resizeMatte,
  resizeRgba,
  toMatte,
  toTensor,
} from './index'

const BIREFNET = MODEL

/**
 * A second spec, defined only here, so the per-model preprocessing and
 * activation paths both stay covered even though one model ships. Getting
 * either wrong produces a plausible but quietly wrong matte, so the branches
 * are worth holding onto.
 */
const U2NET = { ...MODEL, id: 'u2netp', size: 320, scale: 'image-max', activation: 'minmax' } as typeof MODEL

function rgba(width: number, height: number, fill: (x: number, y: number) => [number, number, number, number]): Rgba {
  const data = new Uint8ClampedArray(width * height * 4)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = fill(x, y)
      const i = (y * width + x) * 4
      data[i] = r
      data[i + 1] = g
      data[i + 2] = b
      data[i + 3] = a
    }
  }
  return { data, width, height }
}

function matte(width: number, height: number, fill: (x: number, y: number) => number): Matte {
  const data = new Uint8ClampedArray(width * height)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) data[y * width + x] = fill(x, y)
  }
  return { data, width, height }
}

describe('resizeRgba', () => {
  it('returns a copy, not the same buffer, at identical size', () => {
    const src = rgba(2, 2, () => [10, 20, 30, 40])
    const out = resizeRgba(src, 2, 2)
    expect([...out.data]).toEqual([...src.data])
    expect(out.data).not.toBe(src.data)
  })

  it('averages all four pixels when collapsing 2x2 to 1x1', () => {
    const src = rgba(2, 2, (x, y) => {
      const v = [0, 100, 200, 255][y * 2 + x]!
      return [v, v, v, 255]
    })
    const out = resizeRgba(src, 1, 1)
    // (0 + 100 + 200 + 255) / 4 = 138.75, rounded by Uint8ClampedArray
    expect(out.data[0]).toBe(139)
  })

  it('preserves corner pixels when upscaling', () => {
    const src = rgba(2, 2, (x, y) => (x === 0 && y === 0 ? [255, 0, 0, 255] : [0, 0, 255, 255]))
    const out = resizeRgba(src, 4, 4)
    expect([...out.data.slice(0, 4)]).toEqual([255, 0, 0, 255])
    const bottomRight = (3 * 4 + 3) * 4
    expect([...out.data.slice(bottomRight, bottomRight + 4)]).toEqual([0, 0, 255, 255])
  })

  it('carries the alpha channel through', () => {
    const src = rgba(4, 4, () => [0, 0, 0, 128])
    const out = resizeRgba(src, 2, 2)
    expect([...out.data].filter((_, i) => i % 4 === 3)).toEqual([128, 128, 128, 128])
  })

  it('keeps a flat image flat at any scale', () => {
    const src = rgba(7, 5, () => [64, 64, 64, 255])
    for (const [w, h] of [[3, 2], [13, 11], [7, 5]] as const) {
      const out = resizeRgba(src, w, h)
      expect([...out.data].every(v => v === 64 || v === 255)).toBe(true)
    }
  })
})

describe('resizeMatte', () => {
  it('averages when downscaling', () => {
    const src = matte(2, 2, (x, y) => [0, 100, 200, 255][y * 2 + x]!)
    expect(resizeMatte(src, 1, 1).data[0]).toBe(139)
  })

  it('is size-stable and lossless at identical size', () => {
    const src = matte(3, 3, (x, y) => x * 30 + y * 10)
    const out = resizeMatte(src, 3, 3)
    expect([...out.data]).toEqual([...src.data])
  })
})

describe('toTensor', () => {
  it('emits channel-planar NCHW at each model\'s own input size', () => {
    expect(toTensor(rgba(8, 8, () => [255, 255, 255, 255]), U2NET).length).toBe(3 * 320 * 320)
    expect(toTensor(rgba(8, 8, () => [255, 255, 255, 255]), BIREFNET).length).toBe(3 * 512 * 512)
  })

  it('normalises with the ImageNet statistics', () => {
    const t = toTensor(rgba(320, 320, () => [255, 255, 255, 255]), U2NET)
    const plane = 320 * 320
    expect(t[0]).toBeCloseTo((1 - 0.485) / 0.229, 5)
    expect(t[plane]).toBeCloseTo((1 - 0.456) / 0.224, 5)
    expect(t[plane * 2]).toBeCloseTo((1 - 0.406) / 0.225, 5)
  })

  it('separates the channel planes', () => {
    const t = toTensor(rgba(320, 320, () => [255, 0, 0, 255]), U2NET)
    expect(t[0]).toBeCloseTo((1 - 0.485) / 0.229, 5)
    expect(t[320 * 320]).toBeCloseTo((0 - 0.456) / 0.224, 5)
  })

  it('scales against the image maximum for U²-Net', () => {
    // Nothing brighter than 128, so 128 must map to 1.0 — the behaviour that
    // stops dark photographs producing a washed-out matte.
    const t = toTensor(rgba(320, 320, () => [128, 128, 128, 255]), U2NET)
    expect(t[0]).toBeCloseTo((1 - 0.485) / 0.229, 5)
  })

  it('scales against a flat 255 for BiRefNet', () => {
    // Same input, different model: BiRefNet was trained on a plain /255, so
    // 128 must stay at roughly half rather than being stretched to 1.0.
    const t = toTensor(rgba(512, 512, () => [128, 128, 128, 255]), BIREFNET)
    expect(t[0]).toBeCloseTo((128 / 255 - 0.485) / 0.229, 5)
  })

  it('gives the two models genuinely different tensors for one image', () => {
    // Mid-grey everywhere with a single brighter pixel in the middle, so the
    // image maximum (200) and a flat 255 disagree. A corner pixel of 0 would
    // not have shown this: zero divided by either divisor is still zero.
    const image = rgba(64, 64, (x, y) => (x === 32 && y === 32 ? [200, 200, 200, 255] : [128, 128, 128, 255]))
    const u2 = toTensor(image, U2NET)[0]!
    const bi = toTensor(image, BIREFNET)[0]!
    expect(u2).toBeCloseTo((128 / 200 - 0.485) / 0.229, 4)
    expect(bi).toBeCloseTo((128 / 255 - 0.485) / 0.229, 4)
    expect(u2).not.toBeCloseTo(bi, 3)
  })

  it('survives an all-black image instead of dividing by zero', () => {
    const t = toTensor(rgba(320, 320, () => [0, 0, 0, 255]), U2NET)
    expect([...t.slice(0, 8)].every(Number.isFinite)).toBe(true)
  })

  it('resizes rather than reading past the buffer', () => {
    const t = toTensor(rgba(64, 48, () => [255, 255, 255, 255]), BIREFNET)
    expect(t.length).toBe(3 * 512 * 512)
    expect([...t.slice(0, 64)].every(Number.isFinite)).toBe(true)
  })
})

describe('toMatte — min-max activation (U²-Net)', () => {
  it('stretches the score range across the full byte range', () => {
    const raw = new Float32Array(320 * 320).fill(0.2)
    raw[0] = 0.1
    raw[1] = 0.9
    const m = toMatte(raw, U2NET)
    expect(m.data[0]).toBe(0)
    expect(m.data[1]).toBe(255)
    expect(m.width).toBe(320)
  })

  it('returns an empty matte when the model saw nothing', () => {
    // A flat map has no range to stretch; amplifying it would turn noise into
    // a full-strength cutout.
    const m = toMatte(new Float32Array(320 * 320).fill(0.4), U2NET)
    expect([...m.data].every(v => v === 0)).toBe(true)
  })
})

describe('toMatte — sigmoid activation (BiRefNet)', () => {
  it('puts the decision boundary at a logit of zero', () => {
    const raw = new Float32Array(512 * 512).fill(0)
    const m = toMatte(raw, BIREFNET)
    expect(m.data[0]).toBe(128)
    expect(m.width).toBe(512)
  })

  it('saturates at the extremes the model actually emits', () => {
    // Measured range for this model is about -15 to +8.
    const raw = new Float32Array(512 * 512).fill(-15)
    raw[0] = 8
    const m = toMatte(raw, BIREFNET)
    expect(m.data[0]).toBe(255)
    expect(m.data[1]).toBe(0)
  })

  it('is monotonic in the logit', () => {
    const raw = new Float32Array(512 * 512)
    for (let i = 0; i < 200; i++) raw[i] = -10 + i * 0.1
    const m = toMatte(raw, BIREFNET)
    for (let i = 1; i < 200; i++) expect(m.data[i]!).toBeGreaterThanOrEqual(m.data[i - 1]!)
  })

  it('does not stretch, so an outlier cannot squash the rest', () => {
    // The reason the activation is per-model: under min-max, one +40 logit
    // would drag every ordinary positive pixel down toward transparent.
    const raw = new Float32Array(512 * 512).fill(-8)
    raw[0] = 2
    raw[1] = 40
    const m = toMatte(raw, BIREFNET)
    expect(m.data[0]).toBeGreaterThan(200)
    expect(m.data[2]).toBeLessThan(10)
  })
})

describe('adjustMatte', () => {
  it('clamps below the low threshold and above the high one', () => {
    const m = adjustMatte(matte(3, 1, x => [10, 128, 250][x]!), 64, 192)
    expect(m.data[0]).toBe(0)
    expect(m.data[2]).toBe(255)
  })

  it('is monotonic across the ramp', () => {
    const m = adjustMatte(matte(256, 1, x => x), 32, 224)
    for (let i = 1; i < 256; i++) expect(m.data[i]!).toBeGreaterThanOrEqual(m.data[i - 1]!)
  })

  it('sits at the midpoint in the centre of the ramp', () => {
    const m = adjustMatte(matte(1, 1, () => 128), 0, 255)
    expect(m.data[0]).toBeGreaterThan(120)
    expect(m.data[0]).toBeLessThan(136)
  })

  it('degenerates to a hard threshold when the band collapses', () => {
    const m = adjustMatte(matte(2, 1, x => [100, 200][x]!), 150, 150)
    expect([...m.data]).toEqual([0, 255])
  })

  it('tolerates reversed thresholds', () => {
    const a = adjustMatte(matte(4, 1, x => x * 60), 200, 50)
    const b = adjustMatte(matte(4, 1, x => x * 60), 50, 200)
    expect([...a.data]).toEqual([...b.data])
  })
})

describe('featherMatte', () => {
  it('copies at radius 0', () => {
    const src = matte(4, 4, (x, y) => (x + y) * 20)
    const out = featherMatte(src, 0)
    expect([...out.data]).toEqual([...src.data])
    expect(out.data).not.toBe(src.data)
  })

  it('leaves a constant matte constant', () => {
    const out = featherMatte(matte(16, 16, () => 200), 3)
    expect([...out.data].every(v => v === 200)).toBe(true)
  })

  it('spreads an isolated point outwards', () => {
    const src = matte(21, 21, (x, y) => (x === 10 && y === 10 ? 255 : 0))
    const out = featherMatte(src, 3)
    expect(out.data[10 * 21 + 10]!).toBeLessThan(255)
    expect(out.data[10 * 21 + 12]!).toBeGreaterThan(0)
  })

  it('softens a hard edge without moving it', () => {
    const src = matte(32, 1, x => (x < 16 ? 255 : 0))
    const out = featherMatte(src, 4)
    // Still fully opaque and fully clear far from the edge...
    expect(out.data[0]).toBe(255)
    expect(out.data[31]).toBe(0)
    // ...but no longer a step at the boundary.
    expect(out.data[15]!).toBeLessThan(255)
    expect(out.data[16]!).toBeGreaterThan(0)
  })
})

describe('applyMatte', () => {
  it('writes coverage into the alpha channel', () => {
    const out = applyMatte(rgba(2, 1, () => [10, 20, 30, 255]), matte(2, 1, x => (x === 0 ? 0 : 255)))
    expect(out.data[3]).toBe(0)
    expect(out.data[7]).toBe(255)
  })

  it('keeps the colour channels untouched', () => {
    const out = applyMatte(rgba(1, 1, () => [10, 20, 30, 255]), matte(1, 1, () => 128))
    expect([...out.data.slice(0, 3)]).toEqual([10, 20, 30])
  })

  it('multiplies with existing transparency rather than replacing it', () => {
    const out = applyMatte(rgba(1, 1, () => [0, 0, 0, 128]), matte(1, 1, () => 128))
    expect(out.data[3]).toBe(64)
  })
})

describe('compositeOver', () => {
  const white = { r: 255, g: 255, b: 255 }

  it('shows only the background where the cutout is clear', () => {
    const out = compositeOver(rgba(1, 1, () => [255, 0, 0, 0]), white)
    expect([...out.data]).toEqual([255, 255, 255, 255])
  })

  it('shows only the subject where the cutout is solid', () => {
    const out = compositeOver(rgba(1, 1, () => [255, 0, 0, 255]), white)
    expect([...out.data]).toEqual([255, 0, 0, 255])
  })

  it('blends by coverage in between', () => {
    const out = compositeOver(rgba(1, 1, () => [0, 0, 0, 128]), white)
    expect(out.data[0]).toBeGreaterThan(120)
    expect(out.data[0]).toBeLessThan(136)
  })

  it('always produces an opaque image', () => {
    const out = compositeOver(rgba(4, 4, (x, y) => [0, 0, 0, (x + y) * 20]), white)
    expect([...out.data].filter((_, i) => i % 4 === 3).every(a => a === 255)).toBe(true)
  })
})

describe('contentBounds', () => {
  it('finds the tightest box around the subject', () => {
    const m = matte(10, 10, (x, y) => (x >= 2 && x <= 5 && y >= 3 && y <= 7 ? 255 : 0))
    expect(contentBounds(m)).toEqual({ x: 2, y: 3, width: 4, height: 5 })
  })

  it('returns null for an empty matte', () => {
    expect(contentBounds(matte(8, 8, () => 0))).toBeNull()
  })

  it('ignores coverage below the threshold', () => {
    const m = matte(8, 8, (x, y) => (x === 0 && y === 0 ? 4 : x === 4 && y === 4 ? 255 : 0))
    expect(contentBounds(m, 8)).toEqual({ x: 4, y: 4, width: 1, height: 1 })
  })

  it('covers the whole frame when the subject fills it', () => {
    expect(contentBounds(matte(6, 4, () => 255))).toEqual({ x: 0, y: 0, width: 6, height: 4 })
  })
})

describe('cropRgba', () => {
  it('lifts out the requested box', () => {
    const src = rgba(4, 4, (x, y) => [x * 10, y * 10, 0, 255])
    const out = cropRgba(src, { x: 1, y: 2, width: 2, height: 2 })
    expect(out.width).toBe(2)
    expect(out.height).toBe(2)
    expect([...out.data.slice(0, 4)]).toEqual([10, 20, 0, 255])
  })

  it('clamps a box that runs past the edge', () => {
    const src = rgba(4, 4, () => [1, 2, 3, 255])
    const out = cropRgba(src, { x: 3, y: 3, width: 99, height: 99 })
    expect(out.width).toBe(1)
    expect(out.height).toBe(1)
  })

  it('round-trips with contentBounds', () => {
    const m = matte(12, 12, (x, y) => (x >= 4 && x <= 8 && y >= 1 && y <= 6 ? 255 : 0))
    const bounds = contentBounds(m)!
    const out = cropRgba(rgba(12, 12, () => [0, 0, 0, 255]), bounds)
    expect(out.width).toBe(5)
    expect(out.height).toBe(6)
  })
})

describe('coverage', () => {
  it('is 0 for an empty matte and 1 for a full one', () => {
    expect(coverage(matte(8, 8, () => 0))).toBe(0)
    expect(coverage(matte(8, 8, () => 255))).toBe(1)
  })

  it('reports the fraction of the frame the subject fills', () => {
    expect(coverage(matte(10, 10, (_x, y) => (y < 5 ? 255 : 0)))).toBeCloseTo(0.5, 5)
  })
})
