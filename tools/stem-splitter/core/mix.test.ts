import type { StereoBuffer } from './index'
import { describe, expect, it } from 'vitest'
import { energy, mixStems, stemFileName, waveformPeaks } from './index'

const buf = (left: number[], right = left): StereoBuffer => ({ left: Float32Array.from(left), right: Float32Array.from(right) })

describe('mixStems', () => {
  it('sums stems at their gains', () => {
    const out = mixStems([buf([1, 2]), buf([10, 20]), buf([100, 200])], [1, 0.5, 0])
    expect(Array.from(out.left)).toEqual([6, 12])
  })

  it('returns silence when everything is muted', () => {
    const out = mixStems([buf([1, 2]), buf([3, 4])], [0, 0])
    expect(Array.from(out.left)).toEqual([0, 0])
  })

  it('keeps channels independent', () => {
    const out = mixStems([buf([1], [2])], [1])
    expect([out.left[0], out.right[0]]).toEqual([1, 2])
  })

  it('does not modify its inputs', () => {
    const stem = buf([1, 1])
    mixStems([stem, stem], [1, 1])
    expect(Array.from(stem.left)).toEqual([1, 1])
  })
})

describe('waveformPeaks', () => {
  it('reports the loudest sample in each bucket', () => {
    const out = waveformPeaks(buf([0.1, 0.5, -0.8, 0.2]), 2)
    expect(Array.from(out).map(v => +v.toFixed(2))).toEqual([0.5, 0.8])
  })

  it('handles more buckets than samples', () => {
    expect(waveformPeaks(buf([0.5]), 4)).toHaveLength(4)
  })

  it('clamps at one so a clipping stem stays inside its lane', () => {
    expect(waveformPeaks(buf([3]), 1)[0]).toBe(1)
  })

  it('is empty for empty audio', () => {
    expect(Array.from(waveformPeaks(buf([]), 3))).toEqual([0, 0, 0])
  })
})

describe('energy', () => {
  it('sums squares across both channels', () => {
    expect(energy(buf([1, 2], [3, 0]))).toBe(14)
  })
})

describe('stemFileName', () => {
  it('swaps the extension for the part name', () => {
    expect(stemFileName('My Song.mp3', 'vocals')).toBe('My Song-vocals.wav')
  })

  it('strips characters no file system accepts', () => {
    expect(stemFileName('a/b:c?.flac', 'bass')).toBe('abc-bass.wav')
  })

  it('falls back when nothing usable is left', () => {
    expect(stemFileName('.wav', 'drums')).toBe('track-drums.wav')
  })
})
