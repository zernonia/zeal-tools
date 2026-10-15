import type { StereoBuffer } from './segments'

/**
 * 16-bit PCM WAV, the one audio format every editor, DAW and phone opens.
 *
 * Lossless relative to what a 16-bit master holds, and trivially written by
 * hand: a 44-byte RIFF header and interleaved little-endian samples. The
 * samples are clamped rather than wrapped, so an over-full mix distorts the
 * way a meter would warn about instead of turning into full-scale noise.
 */
export function encodeWav(buffer: StereoBuffer, sampleRate: number): Uint8Array {
  const frames = buffer.left.length
  const channels = 2
  const bytesPerSample = 2
  const dataSize = frames * channels * bytesPerSample
  const out = new Uint8Array(44 + dataSize)
  const view = new DataView(out.buffer)

  const ascii = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i++)
      out[offset + i] = text.charCodeAt(i)
  }

  ascii(0, 'RIFF')
  view.setUint32(4, 36 + dataSize, true)
  ascii(8, 'WAVE')
  ascii(12, 'fmt ')
  view.setUint32(16, 16, true) // fmt chunk size
  view.setUint16(20, 1, true) // PCM
  view.setUint16(22, channels, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * channels * bytesPerSample, true)
  view.setUint16(32, channels * bytesPerSample, true)
  view.setUint16(34, bytesPerSample * 8, true)
  ascii(36, 'data')
  view.setUint32(40, dataSize, true)

  let offset = 44
  for (let i = 0; i < frames; i++) {
    view.setInt16(offset, toInt16(buffer.left[i]!), true)
    view.setInt16(offset + 2, toInt16(buffer.right[i]!), true)
    offset += 4
  }
  return out
}

/** Float in −1…1 to a 16-bit sample, asymmetric because the range is. */
export function toInt16(sample: number): number {
  const s = Math.max(-1, Math.min(1, Number.isFinite(sample) ? sample : 0))
  return s < 0 ? Math.round(s * 0x8000) : Math.round(s * 0x7FFF)
}
