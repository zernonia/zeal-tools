import { describe, expect, it } from 'vitest'
import { encodeWav, toInt16 } from './index'

/**
 * A reader written from the RIFF/WAVE layout, independently of the writer:
 * it walks chunks by id and size rather than assuming the 44-byte header,
 * so a writer that put the right bytes in the wrong place would fail here.
 */
function readWav(bytes: Uint8Array) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const id = (o: number) => String.fromCharCode(...bytes.subarray(o, o + 4))
  expect(id(0)).toBe('RIFF')
  expect(view.getUint32(4, true)).toBe(bytes.length - 8)
  expect(id(8)).toBe('WAVE')

  let format: { audioFormat: number, channels: number, sampleRate: number, byteRate: number, blockAlign: number, bits: number } | null = null
  let samples: number[][] = []
  for (let o = 12; o < bytes.length;) {
    const chunk = id(o)
    const size = view.getUint32(o + 4, true)
    const body = o + 8
    if (chunk === 'fmt ') {
      format = {
        audioFormat: view.getUint16(body, true),
        channels: view.getUint16(body + 2, true),
        sampleRate: view.getUint32(body + 4, true),
        byteRate: view.getUint32(body + 8, true),
        blockAlign: view.getUint16(body + 12, true),
        bits: view.getUint16(body + 14, true),
      }
    }
    else if (chunk === 'data') {
      const channels = format!.channels
      samples = Array.from({ length: channels }, () => [])
      for (let i = 0; i < size / 2; i++)
        samples[i % channels]!.push(view.getInt16(body + i * 2, true))
    }
    o = body + size + (size & 1)
  }
  return { format: format!, samples }
}

describe('encodeWav', () => {
  it('writes a valid 16-bit stereo PCM file', () => {
    const wav = encodeWav({ left: Float32Array.from([0, 0.5]), right: Float32Array.from([-0.5, 1]) }, 44100)
    const { format, samples } = readWav(wav)
    expect(format).toEqual({ audioFormat: 1, channels: 2, sampleRate: 44100, byteRate: 176400, blockAlign: 4, bits: 16 })
    expect(samples[0]).toEqual([0, 16384])
    expect(samples[1]).toEqual([-16384, 32767])
  })

  it('is exactly header plus four bytes a frame', () => {
    const wav = encodeWav({ left: new Float32Array(1000), right: new Float32Array(1000) }, 48000)
    expect(wav.length).toBe(44 + 4000)
  })

  it('round-trips a signal within one quantisation step', () => {
    const left = Float32Array.from({ length: 500 }, (_, i) => Math.sin(i / 9) * 0.8)
    const right = Float32Array.from({ length: 500 }, (_, i) => Math.cos(i / 5) * 0.3)
    const { samples } = readWav(encodeWav({ left, right }, 44100))
    for (let i = 0; i < 500; i++) {
      expect(Math.abs(samples[0]![i]! / 32768 - left[i]!)).toBeLessThan(1 / 16384)
      expect(Math.abs(samples[1]![i]! / 32768 - right[i]!)).toBeLessThan(1 / 16384)
    }
  })
})

describe('toInt16', () => {
  it('clamps instead of wrapping', () => {
    expect(toInt16(1.7)).toBe(32767)
    expect(toInt16(-3)).toBe(-32768)
  })

  it('maps the extremes to the full asymmetric range', () => {
    expect(toInt16(1)).toBe(32767)
    expect(toInt16(-1)).toBe(-32768)
    expect(toInt16(0)).toBe(0)
  })

  it('treats a NaN from the model as silence', () => {
    expect(toInt16(Number.NaN)).toBe(0)
  })
})
