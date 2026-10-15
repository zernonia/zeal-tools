import { describe, expect, it } from 'vitest'
import { combineBranches, fft, frameCount, hannWindow, HOP, inverseChannel, N_FFT, reflectPad, residual, spectrogram } from './index'

/** The textbook O(n²) DFT, as an independent check on the fast one. */
function dft(re: number[], im: number[]) {
  const n = re.length
  const outRe: number[] = []
  const outIm: number[] = []
  for (let k = 0; k < n; k++) {
    let sr = 0
    let si = 0
    for (let t = 0; t < n; t++) {
      const a = (-2 * Math.PI * k * t) / n
      sr += re[t]! * Math.cos(a) - im[t]! * Math.sin(a)
      si += re[t]! * Math.sin(a) + im[t]! * Math.cos(a)
    }
    outRe.push(sr)
    outIm.push(si)
  }
  return { re: outRe, im: outIm }
}

/**
 * Deterministic test signal: a spread of partials, all well below Nyquist.
 * Not white noise — HT-Demucs drops the Nyquist bin, so anything there is
 * lost by design and would read as a reconstruction error.
 */
function signal(length: number, seed = 1): Float32Array {
  const out = new Float32Array(length)
  for (let p = 1; p <= 12; p++) {
    const freq = ((p * 37 + seed * 11) % 900) / 1024
    const amp = 0.3 / p
    for (let i = 0; i < length; i++)
      out[i]! += amp * Math.sin(Math.PI * freq * i + p * seed)
  }
  return out
}

describe('fft', () => {
  it('matches a direct DFT', () => {
    const re = Array.from({ length: 16 }, (_, i) => Math.sin(i) + i / 10)
    const im = Array.from({ length: 16 }, (_, i) => Math.cos(i * 2))
    const expected = dft(re, im)
    const r = Float64Array.from(re)
    const m = Float64Array.from(im)
    fft(r, m)
    for (let k = 0; k < 16; k++) {
      expect(r[k]).toBeCloseTo(expected.re[k]!, 9)
      expect(m[k]).toBeCloseTo(expected.im[k]!, 9)
    }
  })

  it('inverts itself, up to the 1/n the caller applies', () => {
    const original = Array.from({ length: 64 }, (_, i) => Math.sin(i * 0.7))
    const r = Float64Array.from(original)
    const m = new Float64Array(64)
    fft(r, m)
    fft(r, m, true)
    original.forEach((v, i) => expect(r[i]! / 64).toBeCloseTo(v, 10))
  })

  it('refuses a size that is not a power of two', () => {
    expect(() => fft(new Float64Array(12), new Float64Array(12))).toThrow(RangeError)
  })
})

describe('hannWindow', () => {
  it('is periodic, as torch.hann_window is by default', () => {
    const w = hannWindow(8)
    expect(w[0]).toBe(0)
    expect(w[4]).toBeCloseTo(1, 12)
    // Symmetric about n/2, not (n-1)/2 — the periodic form.
    expect(w[1]).toBeCloseTo(w[7]!, 6)
  })
})

describe('reflectPad', () => {
  it('mirrors without repeating the edge sample', () => {
    expect(Array.from(reflectPad(Float32Array.from([1, 2, 3, 4]), 2, 3))).toEqual([3, 2, 1, 2, 3, 4, 3, 2, 1])
  })

  it('refuses padding as long as the signal, as torch does', () => {
    expect(() => reflectPad(new Float32Array(3), 3, 0)).toThrow(RangeError)
  })
})

describe('spectrogram', () => {
  it('has the shape the model was exported with', () => {
    expect(frameCount(343_980)).toBe(336)
    const x = new Float32Array(8192)
    expect(spectrogram(x, x)).toHaveLength(4 * 2048 * frameCount(8192))
  })

  it('puts a pure tone in its bin, on both channels, with the normalised scale', () => {
    const length = 8 * HOP
    const bin = 64
    const tone = Float32Array.from({ length }, (_, i) => Math.cos((2 * Math.PI * bin * i) / N_FFT))
    const frames = frameCount(length)
    const plane = 2048 * frames
    const spec = spectrogram(tone, tone)
    const t = Math.floor(frames / 2)
    const magnitude = (base: number, f: number) => Math.hypot(spec[base + f * frames + t]!, spec[base + plane + f * frames + t]!)

    // A unit cosine through a Hann window peaks at n/4, then normalized=True
    // divides by √n: √4096 / 4 = 16.
    expect(magnitude(0, bin)).toBeCloseTo(16, 3)
    expect(magnitude(2 * plane, bin)).toBeCloseTo(16, 3)
    expect(magnitude(0, bin + 5)).toBeLessThan(1e-3)
  })

  it('keeps channels separate', () => {
    const length = 4 * HOP
    const spec = spectrogram(signal(length), new Float32Array(length))
    const plane = 2048 * frameCount(length)
    expect(spec.subarray(2 * plane).every(v => v === 0)).toBe(true)
    expect(spec.subarray(0, plane).some(v => v !== 0)).toBe(true)
  })
})

describe('inverseChannel', () => {
  it('reconstructs the signal away from the edges demucs trims', () => {
    const length = 32 * HOP
    const left = signal(length, 7)
    const right = signal(length, 11)
    const frames = frameCount(length)
    const plane = 2048 * frames
    const spec = spectrogram(left, right)

    const outL = new Float32Array(length)
    const outR = new Float32Array(length)
    inverseChannel(spec, 0, plane, frames, length, outL)
    inverseChannel(spec, 2 * plane, 3 * plane, frames, length, outR)

    // _spec drops two frames each side, so the first and last ~1.5 frames
    // are partly lost by design. Everything between must come back exactly.
    for (let i = 2 * HOP; i < length - 2 * HOP; i++) {
      expect(outL[i]).toBeCloseTo(left[i]!, 4)
      expect(outR[i]).toBeCloseTo(right[i]!, 4)
    }
  })

  it('adds into the target rather than overwriting it', () => {
    const length = 8 * HOP
    const frames = frameCount(length)
    const target = new Float32Array(length).fill(0.25)
    inverseChannel(new Float32Array(4 * 2048 * frames), 0, 2048 * frames, frames, length, target)
    expect(target.every(v => v === 0.25)).toBe(true)
  })
})

describe('combineBranches', () => {
  it('sums the inverted frequency branch onto the time branch, stem by stem', () => {
    const size = 16 * HOP
    const frames = frameCount(size)
    const plane = 2048 * frames
    const a = signal(size, 3)
    const spec = spectrogram(a, a)

    // Stem 1's frequency branch carries the signal; stem 0's is silent. Both
    // time branches carry a constant, which must survive untouched.
    const freq = new Float32Array(2 * 4 * plane)
    freq.set(spec, 4 * plane)
    const time = new Float32Array(2 * 2 * size).fill(0.5)

    const out = combineBranches(freq, time, 2, size)
    const mid = size / 2
    expect(out[mid]).toBeCloseTo(0.5, 6)
    expect(out[(2 + 1) * size + mid]).toBeCloseTo(0.5 + a[mid]!, 4)
  })
})

describe('residual', () => {
  it('is zero when the stems add up exactly', () => {
    const input = Float32Array.from([1, -2, 3, 0.5])
    const output = Float32Array.from([0.5, -1, 1, 0.25, 0.5, -1, 2, 0.25])
    expect(residual(input, output, 2)).toBeCloseTo(0, 12)
  })

  it('is about one when a backend returns silence', () => {
    expect(residual(Float32Array.from([1, 2]), new Float32Array(4), 2)).toBe(1)
  })

  it('is infinite on NaN, so a broken GPU path is always rejected', () => {
    expect(residual(Float32Array.from([1, 2]), Float32Array.from([Number.NaN, 0, 0, 0]), 2)).toBe(Number.POSITIVE_INFINITY)
  })
})
