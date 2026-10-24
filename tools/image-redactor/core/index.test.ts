import type { Rgba, Stroke } from './index'
import { describe, expect, it } from 'vitest'
import {
  applyEffect,
  blackOut,
  boxBlur,
  composite,
  createMask,
  effectSize,
  isMaskEmpty,
  outputFilename,
  outputType,
  pixelate,
  rasterizeStrokes,
  stampDisc,
  strokeSegment,
  wholeImageStroke,
} from './index'

/** Deterministic, non-uniform test image: every pixel differs from its neighbours. */
function noise(width: number, height: number): Rgba {
  const data = new Uint8ClampedArray(width * height * 4)
  let seed = 7
  for (let i = 0; i < data.length; i++) {
    seed = (seed * 1103515245 + 12345) & 0x7FFFFFFF
    data[i] = (i % 4 === 3) ? 255 : seed % 256
  }
  return { data, width, height }
}

function flat(width: number, height: number, rgba: [number, number, number, number]): Rgba {
  const data = new Uint8ClampedArray(width * height * 4)
  for (let i = 0; i < data.length; i += 4)
    data.set(rgba, i)
  return { data, width, height }
}

function pixel(image: Rgba, x: number, y: number): number[] {
  const i = (y * image.width + x) * 4
  return Array.from(image.data.slice(i, i + 4))
}

function covered(mask: Uint8Array): number {
  return mask.reduce((n, v) => n + v, 0)
}

describe('stampDisc', () => {
  it('covers a disc of about πr² pixels, centred where asked', () => {
    const mask = createMask(100, 100)
    stampDisc(mask, 100, 100, 50, 50, 10, false)
    expect(covered(mask)).toBeGreaterThan(Math.PI * 100 * 0.95)
    expect(covered(mask)).toBeLessThan(Math.PI * 100 * 1.05)
    expect(mask[50 * 100 + 50]).toBe(1)
    expect(mask[50 * 100 + 65]).toBe(0)
  })

  it('reports exactly the rectangle it touched, clipped to the image', () => {
    const mask = createMask(20, 20)
    const rect = stampDisc(mask, 20, 20, 2, 2, 5, false)!
    expect(rect.x).toBe(0)
    expect(rect.y).toBe(0)
    for (let y = 0; y < 20; y++) {
      for (let x = 0; x < 20; x++) {
        if (mask[y * 20 + x]) {
          expect(x).toBeLessThan(rect.x + rect.width)
          expect(y).toBeLessThan(rect.y + rect.height)
        }
      }
    }
  })

  it('returns null for a dab entirely off the picture', () => {
    expect(stampDisc(createMask(10, 10), 10, 10, -50, -50, 3, false)).toBeNull()
  })

  it('erases back to zero', () => {
    const mask = createMask(40, 40)
    stampDisc(mask, 40, 40, 20, 20, 10, false)
    stampDisc(mask, 40, 40, 20, 20, 11, true)
    expect(isMaskEmpty(mask)).toBe(true)
  })
})

describe('strokeSegment', () => {
  it('leaves no gaps along a fast drag', () => {
    const mask = createMask(200, 20)
    strokeSegment(mask, 200, 20, { x: 5, y: 10 }, { x: 195, y: 10 }, 4, false)
    for (let x = 5; x < 195; x++)
      expect(mask[10 * 200 + x], `gap at x=${x}`).toBe(1)
  })
})

describe('rasterizeStrokes', () => {
  const strokes: Stroke[] = [
    { erase: false, radius: 6, points: [{ x: 10, y: 10 }, { x: 40, y: 30 }] },
    { erase: false, radius: 3, points: [{ x: 45, y: 5 }] },
    { erase: true, radius: 4, points: [{ x: 25, y: 20 }, { x: 30, y: 22 }] },
  ]

  it('replays to the same mask that live drawing produced', () => {
    const live = createMask(50, 40)
    strokeSegment(live, 50, 40, strokes[0]!.points[0]!, strokes[0]!.points[1]!, 6, false)
    stampDisc(live, 50, 40, 45, 5, 3, false)
    strokeSegment(live, 50, 40, strokes[2]!.points[0]!, strokes[2]!.points[1]!, 4, true)
    expect(rasterizeStrokes(strokes, 50, 40)).toEqual(live)
  })

  it('undo is exact: dropping the last stroke restores the previous mask', () => {
    const before = rasterizeStrokes(strokes.slice(0, 2), 50, 40)
    const after = rasterizeStrokes(strokes, 50, 40)
    expect(after).not.toEqual(before)
    expect(rasterizeStrokes(strokes.slice(0, 2), 50, 40)).toEqual(before)
  })

  it('a whole-image stroke covers every corner', () => {
    const mask = rasterizeStrokes([wholeImageStroke(37, 11)], 37, 11)
    expect(covered(mask)).toBe(37 * 11)
  })
})

describe('effectSize', () => {
  it('scales with the picture so strength means the same thing at any size', () => {
    expect(effectSize(4000, 3000, 6)).toBe(60)
    expect(effectSize(1000, 600, 6)).toBe(15)
  })

  it('never drops below a visible floor, and clamps strength', () => {
    expect(effectSize(50, 50, 1)).toBe(4)
    expect(effectSize(1000, 1000, 99)).toBe(effectSize(1000, 1000, 10))
  })
})

describe('pixelate', () => {
  it('makes every block a single colour, the mean of the block', () => {
    const src = noise(16, 16)
    const out = pixelate(src, 8)
    for (let c = 0; c < 4; c++) {
      let sum = 0
      for (let y = 0; y < 8; y++) {
        for (let x = 0; x < 8; x++)
          sum += pixel(src, x, y)[c]!
      }
      expect(pixel(out, 0, 0)[c]).toBe(Math.round(sum / 64))
    }
    expect(pixel(out, 7, 7)).toEqual(pixel(out, 0, 0))
    expect(pixel(out, 8, 0)).not.toEqual(pixel(out, 0, 0))
  })

  it('averages a partial edge block over the pixels it actually holds', () => {
    // 10 wide with 8px blocks: the last column block is 2px wide.
    const src = flat(10, 8, [0, 0, 0, 255])
    for (let y = 0; y < 8; y++) {
      src.data.set([200, 100, 50, 255], (y * 10 + 8) * 4)
      src.data.set([100, 50, 0, 255], (y * 10 + 9) * 4)
    }
    expect(pixel(pixelate(src, 8), 9, 3)).toEqual([150, 75, 25, 255])
  })

  it('leaves the source untouched', () => {
    const src = noise(8, 8)
    const copy = src.data.slice()
    pixelate(src, 4)
    expect(src.data).toEqual(copy)
  })
})

describe('boxBlur', () => {
  it('does not change a flat colour, edges included', () => {
    const src = flat(30, 20, [12, 200, 90, 255])
    expect(boxBlur(src, 15).data).toEqual(src.data)
  })

  it('spreads a single bright pixel into a symmetric falloff', () => {
    const src = flat(41, 41, [0, 0, 0, 255])
    src.data.set([255, 255, 255, 255], (20 * 41 + 20) * 4)
    const out = boxBlur(src, 9)
    const centre = pixel(out, 20, 20)[0]!
    expect(centre).toBeGreaterThan(0)
    expect(centre).toBeLessThan(255)
    expect(pixel(out, 20, 20)[0]).toBeGreaterThan(pixel(out, 23, 20)[0]!)
    expect(pixel(out, 17, 20)).toEqual(pixel(out, 23, 20))
    expect(pixel(out, 20, 17)).toEqual(pixel(out, 20, 23))
  })

  it('actually destroys detail: neighbouring noise pixels end up close together', () => {
    const out = boxBlur(noise(60, 60), 18)
    const a = pixel(out, 30, 30)
    const b = pixel(out, 31, 30)
    for (let c = 0; c < 3; c++)
      expect(Math.abs(a[c]! - b[c]!)).toBeLessThan(8)
  })

  it('a radius too small to matter is an identity copy, not an alias', () => {
    const src = noise(5, 5)
    const out = boxBlur(src, 1)
    expect(out.data).toEqual(src.data)
    expect(out.data).not.toBe(src.data)
  })
})

describe('blackOut', () => {
  it('is opaque black everywhere, whatever the source alpha', () => {
    const out = blackOut(flat(3, 3, [200, 10, 10, 40]))
    expect(pixel(out, 1, 1)).toEqual([0, 0, 0, 255])
  })
})

describe('applyEffect', () => {
  it('routes each mode to its effect', () => {
    const src = noise(12, 12)
    expect(applyEffect(src, 'pixelate', 4)).toEqual(pixelate(src, 4))
    expect(applyEffect(src, 'blur', 9)).toEqual(boxBlur(src, 9))
    expect(applyEffect(src, 'solid', 4)).toEqual(blackOut(src))
  })
})

describe('composite', () => {
  it('takes the effect where masked and the original everywhere else', () => {
    const original = flat(4, 1, [255, 255, 255, 255])
    const effect = flat(4, 1, [0, 0, 0, 255])
    const mask = Uint8Array.from([0, 1, 1, 0])
    const out = new Uint8ClampedArray(16)
    composite(original, effect, mask, out)
    expect(Array.from(out)).toEqual([
      255,
      255,
      255,
      255,
      0,
      0,
      0,
      255,
      0,
      0,
      0,
      255,
      255,
      255,
      255,
      255,
    ])
  })

  it('touches only the rectangle it is given', () => {
    const original = flat(4, 4, [1, 1, 1, 1])
    const effect = flat(4, 4, [2, 2, 2, 2])
    const mask = new Uint8Array(16).fill(1)
    const out = new Uint8ClampedArray(64)
    composite(original, effect, mask, out, { x: 1, y: 1, width: 2, height: 2 })
    expect(pixel({ data: out, width: 4, height: 4 }, 0, 0)).toEqual([0, 0, 0, 0])
    expect(pixel({ data: out, width: 4, height: 4 }, 1, 1)).toEqual([2, 2, 2, 2])
    expect(pixel({ data: out, width: 4, height: 4 }, 3, 3)).toEqual([0, 0, 0, 0])
  })
})

describe('output', () => {
  it('keeps JPEG and WebP, and turns everything else into PNG', () => {
    expect(outputType('image/jpeg')).toBe('image/jpeg')
    expect(outputType('image/webp')).toBe('image/webp')
    expect(outputType('image/png')).toBe('image/png')
    expect(outputType('image/avif')).toBe('image/png')
    expect(outputType('image/gif')).toBe('image/png')
  })

  it('names the file after the original', () => {
    expect(outputFilename('IMG_2041.JPG', 'image/jpeg')).toBe('IMG_2041-redacted.jpg')
    expect(outputFilename('Screenshot 2026.10.24.png', 'image/png')).toBe('Screenshot 2026.10.24-redacted.png')
    expect(outputFilename('', 'image/png')).toBe('image-redacted.png')
  })
})
