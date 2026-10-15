import type { StereoBuffer } from './segments'

/**
 * Sum stems at the given gains. Because the four stems add back up to the
 * original, "everything but vocals" is a karaoke track and "everything" is
 * the song — the mixer is just this function.
 */
export function mixStems(stems: StereoBuffer[], gains: readonly number[]): StereoBuffer {
  const length = stems[0]?.left.length ?? 0
  const left = new Float32Array(length)
  const right = new Float32Array(length)
  stems.forEach((stem, k) => {
    const gain = gains[k] ?? 0
    if (!gain)
      return
    for (let i = 0; i < length; i++) {
      left[i]! += stem.left[i]! * gain
      right[i]! += stem.right[i]! * gain
    }
  })
  return { left, right }
}

/**
 * Loudest point in each of `buckets` equal slices, 0–1, for drawing a
 * waveform. Peak rather than RMS so a single snare hit is visible.
 */
export function waveformPeaks(buffer: StereoBuffer, buckets: number): Float32Array {
  const out = new Float32Array(buckets)
  const length = buffer.left.length
  if (!length)
    return out
  for (let b = 0; b < buckets; b++) {
    const from = Math.floor((b * length) / buckets)
    const to = Math.max(from + 1, Math.floor(((b + 1) * length) / buckets))
    let max = 0
    for (let i = from; i < to && i < length; i++) {
      const v = Math.max(Math.abs(buffer.left[i]!), Math.abs(buffer.right[i]!))
      if (v > max)
        max = v
    }
    out[b] = Math.min(1, max)
  }
  return out
}

/**
 * Sum of squares. Compared against the mix's own, it says whether a stem
 * holds anything at all — an a cappella track has no drums to find.
 */
export function energy(buffer: StereoBuffer): number {
  let sum = 0
  for (let i = 0; i < buffer.left.length; i++)
    sum += buffer.left[i]! ** 2 + buffer.right[i]! ** 2
  return sum
}

/**
 * How far the stems are from adding back up to the input, as a share of the
 * input's energy. HT-Demucs keeps this well under 1%; a backend that returns
 * garbage — NaN from an fp16 overflow, zeros from a GPU that silently failed —
 * lands near or above 1. That makes it a cheap test of whether a backend can
 * be trusted, run on the first window before committing to it.
 */
export function residual(input: Float32Array, output: Float32Array, stems: number): number {
  const n = input.length
  let error = 0
  let total = 0
  for (let i = 0; i < n; i++) {
    let sum = 0
    for (let k = 0; k < stems; k++)
      sum += output[k * n + i]!
    if (!Number.isFinite(sum))
      return Number.POSITIVE_INFINITY
    error += (sum - input[i]!) ** 2
    total += input[i]! ** 2
  }
  return total ? error / total : error ? Number.POSITIVE_INFINITY : 0
}
