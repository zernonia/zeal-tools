import { Buffer } from 'node:buffer'
import { PNG } from 'pngjs'
import { describe, expect, it } from 'vitest'
import { encodePng, hexToRgba } from './png'

describe('encodePng', () => {
  it('produces a PNG that an independent decoder can read back', () => {
    const w = 130; const h = 71 // >1 deflate block once filtered? small but odd sizes
    const rgba = new Uint8Array(w * h * 4)
    for (let i = 0; i < w * h; i++) {
      rgba[i * 4] = (i * 7) % 256
      rgba[i * 4 + 1] = (i * 13) % 256
      rgba[i * 4 + 2] = (i * 29) % 256
      rgba[i * 4 + 3] = 255
    }
    const png = PNG.sync.read(Buffer.from(encodePng(w, h, rgba)))
    expect(png.width).toBe(w)
    expect(png.height).toBe(h)
    expect(new Uint8Array(png.data)).toEqual(rgba)
  })

  it('handles images larger than one stored deflate block (>64KB raw)', () => {
    const w = 200; const h = 200
    const rgba = new Uint8Array(w * h * 4).fill(128)
    const png = PNG.sync.read(Buffer.from(encodePng(w, h, rgba)))
    expect(png.width).toBe(w)
    expect(new Uint8Array(png.data)).toEqual(rgba)
  })

  it('validates input length', () => {
    expect(() => encodePng(10, 10, new Uint8Array(3))).toThrow()
  })
})

describe('hexToRgba', () => {
  it('parses 3/6/8 digit hex', () => {
    expect(hexToRgba('#fff')).toEqual([255, 255, 255, 255])
    expect(hexToRgba('#112233')).toEqual([17, 34, 51, 255])
    expect(hexToRgba('#11223344')).toEqual([17, 34, 51, 68])
  })
  it('falls back on garbage', () => {
    expect(hexToRgba('red-ish', [1, 2, 3, 4])).toEqual([1, 2, 3, 4])
  })
})
