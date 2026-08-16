import { describe, expect, it } from 'vitest'
import { silentWav } from './silent-wav'

function ascii(bytes: Uint8Array, from: number, length: number) {
  return String.fromCharCode(...bytes.subarray(from, from + length))
}

describe('silentWav', () => {
  it('writes a valid RIFF/WAVE container', () => {
    const wav = silentWav(1, 8000)
    expect(ascii(wav, 0, 4)).toBe('RIFF')
    expect(ascii(wav, 8, 4)).toBe('WAVE')
    expect(ascii(wav, 12, 4)).toBe('fmt ')
    expect(ascii(wav, 36, 4)).toBe('data')
  })

  it('declares 16-bit mono PCM at the requested rate', () => {
    const view = new DataView(silentWav(1, 8000).buffer)
    expect(view.getUint16(20, true)).toBe(1) // PCM
    expect(view.getUint16(22, true)).toBe(1) // mono
    expect(view.getUint32(24, true)).toBe(8000) // sample rate
    expect(view.getUint32(28, true)).toBe(16000) // byte rate = rate * 2
    expect(view.getUint16(34, true)).toBe(16) // bits per sample
  })

  it('sizes the header fields to match the actual payload', () => {
    const wav = silentWav(0.5, 8000)
    const view = new DataView(wav.buffer)
    const dataBytes = 4000 * 2
    expect(wav.length).toBe(44 + dataBytes)
    expect(view.getUint32(40, true)).toBe(dataBytes)
    expect(view.getUint32(4, true)).toBe(36 + dataBytes)
  })

  it('is actually silent', () => {
    const wav = silentWav(0.25, 8000)
    expect(wav.subarray(44).every(byte => byte === 0)).toBe(true)
  })

  it('never emits a zero-length file', () => {
    expect(silentWav(0).length).toBeGreaterThan(44)
  })
})
