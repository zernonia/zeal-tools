import { describe, expect, it } from 'vitest'
import {
  extensionFor,
  fitDimensions,
  isDecodable,
  isLossy,
  OUTPUT_FORMATS,
  outputFilename,
  savingsFraction,
} from './index'

describe('fitDimensions', () => {
  it('leaves an image alone when no resize is asked for', () => {
    expect(fitDimensions(4000, 3000, { mode: 'none', value: 0 })).toEqual({ width: 4000, height: 3000 })
  })

  it('fits the longest edge and keeps the aspect ratio', () => {
    expect(fitDimensions(4000, 3000, { mode: 'longest', value: 2000 })).toEqual({ width: 2000, height: 1500 })
    expect(fitDimensions(3000, 4000, { mode: 'longest', value: 2000 })).toEqual({ width: 1500, height: 2000 })
  })

  it('fits a target width or height', () => {
    expect(fitDimensions(4000, 3000, { mode: 'width', value: 800 })).toEqual({ width: 800, height: 600 })
    expect(fitDimensions(4000, 3000, { mode: 'height', value: 600 })).toEqual({ width: 800, height: 600 })
  })

  it('scales by percentage', () => {
    expect(fitDimensions(1000, 500, { mode: 'percent', value: 50 })).toEqual({ width: 500, height: 250 })
  })

  it('never enlarges, whatever it is asked', () => {
    // A compressor that upscales turns a 200 KB photo into a 4 MB one while
    // claiming to have optimised it, and invents no detail doing so.
    expect(fitDimensions(800, 600, { mode: 'longest', value: 4000 })).toEqual({ width: 800, height: 600 })
    expect(fitDimensions(800, 600, { mode: 'width', value: 5000 })).toEqual({ width: 800, height: 600 })
    expect(fitDimensions(800, 600, { mode: 'percent', value: 400 })).toEqual({ width: 800, height: 600 })
  })

  it('never produces a zero-pixel image', () => {
    // Rounding a very wide, very short image down can otherwise reach 0.
    const out = fitDimensions(4000, 3, { mode: 'longest', value: 10 })
    expect(out.width).toBeGreaterThanOrEqual(1)
    expect(out.height).toBeGreaterThanOrEqual(1)
  })

  it('ignores a nonsense target rather than collapsing the image', () => {
    for (const value of [0, -100, Number.NaN, Infinity])
      expect(fitDimensions(800, 600, { mode: 'longest', value })).toEqual({ width: 800, height: 600 })
  })

  it('keeps the ratio within a pixel of the original', () => {
    const out = fitDimensions(1999, 1001, { mode: 'longest', value: 640 })
    expect(Math.abs(out.width / out.height - 1999 / 1001)).toBeLessThan(0.01)
  })
})

describe('savingsFraction', () => {
  it('reports the share removed', () => {
    expect(savingsFraction(1000, 250)).toBe(0.75)
    expect(savingsFraction(1000, 1000)).toBe(0)
  })

  it('goes negative when the output is bigger, rather than lying', () => {
    // Re-encoding a small PNG as PNG can genuinely grow it, and the UI needs
    // to be able to say so.
    expect(savingsFraction(100, 150)).toBeLessThan(0)
  })

  it('is zero for an unusable original size', () => {
    expect(savingsFraction(0, 10)).toBe(0)
    expect(savingsFraction(Number.NaN, 10)).toBe(0)
  })
})

describe('outputFilename', () => {
  it('swaps the extension', () => {
    expect(outputFilename('holiday.png', 'image/webp')).toBe('holiday.webp')
    expect(outputFilename('shot.jpeg', 'image/jpeg')).toBe('shot.jpg')
  })

  it('only replaces a real trailing extension', () => {
    expect(outputFilename('holiday.2024.png', 'image/webp')).toBe('holiday.2024.webp')
  })

  it('appends when there is no extension', () => {
    expect(outputFilename('screenshot', 'image/png')).toBe('screenshot.png')
  })

  it('does not mistake a dotfile for an extension', () => {
    expect(outputFilename('.gitignore', 'image/png')).toBe('.gitignore.png')
  })

  it('falls back rather than producing a nameless file', () => {
    expect(outputFilename('', 'image/webp')).toBe('image.webp')
    expect(outputFilename('   ', 'image/webp')).toBe('image.webp')
  })
})

describe('formats', () => {
  it('offers only what a canvas can actually encode', () => {
    // Measured in Chrome: canvas.toBlob returns null for AVIF.
    expect(OUTPUT_FORMATS.map(f => f.value)).toEqual(['image/webp', 'image/jpeg', 'image/png'])
    expect(OUTPUT_FORMATS.some(f => f.value.includes('avif'))).toBe(false)
  })

  it('knows which formats a quality slider applies to', () => {
    expect(isLossy('image/jpeg')).toBe(true)
    expect(isLossy('image/webp')).toBe(true)
    expect(isLossy('image/png')).toBe(false)
  })

  it('maps formats to the extension people expect', () => {
    expect(extensionFor('image/jpeg')).toBe('jpg')
    expect(extensionFor('image/webp')).toBe('webp')
  })

  it('accepts the inputs browsers decode and refuses the rest', () => {
    expect(isDecodable('image/png')).toBe(true)
    expect(isDecodable('IMAGE/JPEG')).toBe(true)
    // HEIC decodes only in Safari, so it is not offered anywhere.
    expect(isDecodable('image/heic')).toBe(false)
    expect(isDecodable('application/pdf')).toBe(false)
  })
})
