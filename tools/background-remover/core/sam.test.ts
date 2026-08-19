import type { Matte, Rgba } from './index'
import { describe, expect, it } from 'vitest'
import {
  bestMaskIndex,
  mergeSelection,
  SAM_INPUT,
  SAM_MASK,
  samMask,
  samPoint,
  samTensor,
  samTransform,
} from './sam'

function rgba(width: number, height: number, fill: (x: number, y: number) => [number, number, number, number]): Rgba {
  const data = new Uint8ClampedArray(width * height * 4)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = fill(x, y)
      const i = (y * width + x) * 4
      data[i] = r; data[i + 1] = g; data[i + 2] = b; data[i + 3] = a
    }
  }
  return { data, width, height }
}

function matte(width: number, height: number, fill: (i: number) => number): Matte {
  const data = new Uint8ClampedArray(width * height)
  for (let i = 0; i < data.length; i++) data[i] = fill(i)
  return { data, width, height }
}

describe('samTransform', () => {
  it('scales the longest edge to the model square', () => {
    expect(samTransform(2000, 1000)).toEqual({ scale: 1024 / 2000, width: 1024, height: 512 })
    expect(samTransform(1000, 2000)).toEqual({ scale: 1024 / 2000, width: 512, height: 1024 })
  })

  it('fills the square exactly when the picture is already square', () => {
    const t = samTransform(500, 500)
    expect(t.width).toBe(SAM_INPUT)
    expect(t.height).toBe(SAM_INPUT)
  })

  it('preserves aspect ratio rather than stretching', () => {
    const t = samTransform(1600, 400)
    expect(t.width / t.height).toBeCloseTo(4, 5)
  })

  it('scales small pictures up as well as large ones down', () => {
    expect(samTransform(256, 128).scale).toBe(4)
  })
})

describe('samTensor', () => {
  const transform = samTransform(2000, 1000)

  it('is the full padded square regardless of the picture shape', () => {
    const t = samTensor(rgba(64, 32, () => [255, 255, 255, 255]), transform)
    expect(t.length).toBe(3 * SAM_INPUT * SAM_INPUT)
  })

  it('normalises with the ImageNet statistics', () => {
    const t = samTensor(rgba(64, 32, () => [255, 255, 255, 255]), transform)
    expect(t[0]).toBeCloseTo((1 - 0.485) / 0.229, 4)
    expect(t[SAM_INPUT * SAM_INPUT]).toBeCloseTo((1 - 0.456) / 0.224, 4)
  })

  it('leaves the padding below a landscape picture at zero', () => {
    // Padding is applied after normalising, matching SamImageProcessor —
    // padding first would feed mid-grey in and shift every embedding.
    // A 2:1 picture spans the full width, so its only padding is below.
    const t = samTensor(rgba(64, 32, () => [255, 255, 255, 255]), transform)
    expect(t[(transform.height + 4) * SAM_INPUT + 10]).toBe(0)
  })

  it('leaves the padding beside a portrait picture at zero', () => {
    const portrait = samTransform(1000, 2000)
    const t = samTensor(rgba(32, 64, () => [255, 255, 255, 255]), portrait)
    expect(portrait.width).toBeLessThan(SAM_INPUT)
    expect(t[10 * SAM_INPUT + portrait.width + 4]).toBe(0)
    // ...while the content on that same row is not zero.
    expect(t[10 * SAM_INPUT + portrait.width - 4]).not.toBe(0)
  })

  it('places content at the top-left of the square', () => {
    const t = samTensor(rgba(64, 32, () => [255, 255, 255, 255]), transform)
    expect(t[0]).not.toBe(0)
    expect(t[(transform.height - 1) * SAM_INPUT]).not.toBe(0)
  })
})

describe('samPoint', () => {
  it('maps a picture pixel into the padded square', () => {
    const t = samTransform(2000, 1000)
    expect(samPoint(100, 50, t)).toEqual([100 * t.scale, 50 * t.scale])
  })

  it('sends the far corner of the content to the content edge, not the square edge', () => {
    const t = samTransform(2000, 1000)
    const [x, y] = samPoint(2000, 1000, t)
    expect(x).toBeCloseTo(SAM_INPUT, 3)
    expect(y).toBeCloseTo(512, 3)
  })
})

describe('bestMaskIndex', () => {
  it('picks the highest-scoring proposal', () => {
    expect(bestMaskIndex([0.4, 0.9, 0.7])).toBe(1)
    expect(bestMaskIndex([0.95, 0.2, 0.3])).toBe(0)
  })

  it('is stable on ties, preferring the earlier proposal', () => {
    expect(bestMaskIndex([0.8, 0.8, 0.1])).toBe(0)
  })
})

describe('samMask', () => {
  /** Three 256×256 logit planes. */
  function logits(fill: (plane: number, x: number, y: number) => number) {
    const out = new Float32Array(3 * SAM_MASK * SAM_MASK)
    for (let p = 0; p < 3; p++) {
      for (let y = 0; y < SAM_MASK; y++) {
        for (let x = 0; x < SAM_MASK; x++) out[p * SAM_MASK * SAM_MASK + y * SAM_MASK + x] = fill(p, x, y)
      }
    }
    return out
  }

  it('maps logits through a sigmoid, so the boundary lands mid-coverage', () => {
    const m = samMask(logits(() => 0), 0, samTransform(100, 100), 8, 8)
    expect(m.data[0]).toBe(128)
  })

  it('saturates confident logits', () => {
    const hi = samMask(logits(() => 12), 0, samTransform(100, 100), 8, 8)
    const lo = samMask(logits(() => -12), 0, samTransform(100, 100), 8, 8)
    expect(hi.data[0]).toBe(255)
    expect(lo.data[0]).toBe(0)
  })

  it('reads the requested proposal, not always the first', () => {
    const l = logits(plane => (plane === 2 ? 12 : -12))
    expect(samMask(l, 2, samTransform(100, 100), 4, 4).data[0]).toBe(255)
    expect(samMask(l, 0, samTransform(100, 100), 4, 4).data[0]).toBe(0)
  })

  it('returns a matte at the picture size, not the mask size', () => {
    const m = samMask(logits(() => 0), 0, samTransform(200, 100), 37, 19)
    expect(m.width).toBe(37)
    expect(m.height).toBe(19)
    expect(m.data.length).toBe(37 * 19)
  })

  it('never samples the padded region of a non-square picture', () => {
    // A 2:1 picture fills only the top half of the square, so the bottom half
    // of the mask grid is padding. Marking it strongly negative must not drag
    // the bottom of the result down.
    const transform = samTransform(2000, 1000)
    const contentRows = (transform.height / SAM_INPUT) * SAM_MASK
    const l = logits((_p, _x, y) => (y < contentRows ? 12 : -40))
    const m = samMask(l, 0, transform, 16, 16)
    expect([...m.data].every(v => v === 255)).toBe(true)
  })

  it('keeps left-right orientation', () => {
    const transform = samTransform(100, 100)
    const l = logits((_p, x) => (x < SAM_MASK / 2 ? 12 : -12))
    const m = samMask(l, 0, transform, 8, 8)
    expect(m.data[0]).toBe(255)
    expect(m.data[7]).toBe(0)
  })
})

describe('mergeSelection', () => {
  it('adds a selection by keeping whichever covers more', () => {
    const base = matte(3, 1, i => [0, 200, 255][i]!)
    const sel = matte(3, 1, i => [255, 100, 0][i]!)
    expect([...mergeSelection(base, sel, 'add').data]).toEqual([255, 200, 255])
  })

  it('removes a selection by subtracting its strength', () => {
    const base = matte(3, 1, () => 255)
    const sel = matte(3, 1, i => [255, 128, 0][i]!)
    expect([...mergeSelection(base, sel, 'remove').data]).toEqual([0, 127, 255])
  })

  it('clamps instead of wrapping when removing more than is there', () => {
    const out = mergeSelection(matte(2, 1, () => 40), matte(2, 1, () => 255), 'remove')
    expect([...out.data]).toEqual([0, 0])
  })

  it('preserves the soft edge of a selection rather than squaring it off', () => {
    const base = matte(5, 1, () => 0)
    const sel = matte(5, 1, i => i * 60)
    expect([...mergeSelection(base, sel, 'add').data]).toEqual([0, 60, 120, 180, 240])
  })

  it('keeps the matte dimensions', () => {
    const out = mergeSelection(matte(4, 3, () => 10), matte(4, 3, () => 20), 'add')
    expect(out.width).toBe(4)
    expect(out.height).toBe(3)
  })
})
