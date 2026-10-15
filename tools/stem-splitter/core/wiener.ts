import type { Stem } from './model'
import type { StereoBuffer } from './segments'
import { fft, hannWindow } from './spectrogram'

/**
 * Wiener-style refinement: re-split the original mix using the model's stems
 * as a guide, rather than keeping the model's waveforms as they are.
 *
 * In every time-frequency cell, each stem receives the share of the *mix*
 * that its estimated power claims there. Where a pad is loud in "other" and
 * faint in the guitar stem, the guitar's share of that cell shrinks towards
 * zero — which is what removes bleed. Two properties follow by construction:
 * the stems add back up to the mix exactly, and each is built from the mix's
 * own phase, so nothing is invented. What it cannot do is move content the
 * model put wholly in the wrong stem; it can only sharpen the model's own
 * opinion, never overrule it.
 *
 * `power` sharpens the masks: 1 is the classic Wiener ratio, higher values
 * push each cell further towards its dominant stem — less bleed, at the cost
 * of thinner stems where instruments genuinely overlap.
 *
 * The mask is computed from both channels' power together and applied to
 * each channel alike, so the stereo image of every stem is preserved.
 *
 * Runs frame by frame and writes the result back into `stems` in place: a
 * six-minute, six-stem song is ~850 MB of float32, and a second copy of it
 * would not fit.
 */
export function wienerRefine(mix: StereoBuffer, stems: StereoBuffer[], options: { power?: number, size?: number } = {}): void {
  const power = options.power ?? 1
  const n = options.size ?? 4096
  const hop = n / 4
  const length = mix.left.length
  const count = stems.length
  if (!count || !length)
    return

  const window = hannWindow(n)
  // A periodic Hann applied twice at a quarter-window hop sums to exactly
  // 1.5 at every sample, so the overlap-add needs one constant, no envelope.
  const norm = 1 / (1.5 * n)

  const plane = () => new Float64Array(n)
  const mixRe = [plane(), plane()]
  const mixIm = [plane(), plane()]
  const stemRe = Array.from({ length: count * 2 }, plane)
  const stemIm = Array.from({ length: count * 2 }, plane)
  const mask = Array.from({ length: count }, () => new Float64Array(n / 2 + 1))
  const outRe = new Float64Array(n)
  const outIm = new Float64Array(n)

  // Accumulates overlap-added output for the samples still being written:
  // a ring of one window per stem and channel.
  const ring = Array.from({ length: count * 2 }, () => new Float64Array(n))

  const channel = (buffer: StereoBuffer, c: number) => (c === 0 ? buffer.left : buffer.right)

  function load(source: Float32Array, start: number, r: Float64Array, i: Float64Array) {
    for (let j = 0; j < n; j++) {
      const at = start + j
      r[j] = at >= 0 && at < length ? source[at]! * window[j]! : 0
      i[j] = 0
    }
    fft(r, i)
  }

  // Frames start one window before the signal so the first sample is
  // covered by four of them, exactly as every later sample is.
  for (let start = hop - n; start < length; start += hop) {
    for (let c = 0; c < 2; c++) {
      load(channel(mix, c), start, mixRe[c]!, mixIm[c]!)
      for (let k = 0; k < count; k++)
        load(channel(stems[k]!, c), start, stemRe[k * 2 + c]!, stemIm[k * 2 + c]!)
    }

    // Masks for the non-negative bins; the rest mirror them.
    for (let f = 0; f <= n / 2; f++) {
      let total = 0
      for (let k = 0; k < count; k++) {
        let p = 0
        for (let c = 0; c < 2; c++) {
          const a = stemRe[k * 2 + c]![f]!
          const b = stemIm[k * 2 + c]![f]!
          p += a * a + b * b
        }
        const v = power === 1 ? p : p ** power
        mask[k]![f] = v
        total += v
      }
      for (let k = 0; k < count; k++)
        // Where every stem is silent, split evenly rather than drop the mix.
        mask[k]![f] = total > 1e-20 ? mask[k]![f]! / total : 1 / count
    }

    const slot = ((start % n) + n) % n
    for (let k = 0; k < count; k++) {
      for (let c = 0; c < 2; c++) {
        const mr = mixRe[c]!
        const mi = mixIm[c]!
        const m = mask[k]!
        for (let f = 0; f < n; f++) {
          const g = m[f <= n / 2 ? f : n - f]!
          outRe[f] = mr[f]! * g
          outIm[f] = mi[f]! * g
        }
        fft(outRe, outIm, true)
        const acc = ring[k * 2 + c]!
        for (let j = 0; j < n; j++)
          acc[(slot + j) % n]! += outRe[j]! * window[j]! * norm
      }
    }

    // Every frame that touches [start, start + hop) has now been added, so
    // those samples are final. They are also behind every frame still to
    // come, so they can overwrite the stem's own input safely.
    for (let k = 0; k < count; k++) {
      for (let c = 0; c < 2; c++) {
        const target = channel(stems[k]!, c)
        const acc = ring[k * 2 + c]!
        for (let j = 0; j < hop; j++) {
          const at = start + j
          const s = (slot + j) % n
          if (at >= 0 && at < length)
            target[at] = acc[s]!
          acc[s] = 0
        }
      }
    }
  }
}

/**
 * The stems re-split by `reduceBleed`: the ones the six-stem model is weakest
 * at, and the "other" stem they trade content with.
 */
export const BLEED_PRONE: readonly Stem[] = ['guitar', 'piano', 'other']

/**
 * Wiener refinement restricted to `BLEED_PRONE`, which is the only form that
 * measured as an improvement. Vocals, drums and bass are kept exactly as the
 * model made them; what remains of the mix once they are subtracted is
 * re-split between guitar, piano and other.
 *
 * Measured on the six-stem model with a synth pad mixed over known guitar,
 * piano and speech: pad bleed in the guitar stem fell from 2.9% to 2.2%,
 * piano SDR rose 0.7 dB, guitar held within 0.1 dB. Refining all six stems
 * instead cost the vocals 1.8 dB — a 93 ms window smears speech — and a
 * sharper mask (`power: 2`) or a shorter window traded the gains away again.
 *
 * Returns false, changing nothing, when the model has no stem to refine.
 */
export function reduceBleed(mix: StereoBuffer, stems: StereoBuffer[], names: readonly Stem[]): boolean {
  const refine = names.flatMap((name, k) => (BLEED_PRONE.includes(name) ? [k] : []))
  if (!names.includes('guitar') || refine.length < 2)
    return false

  const residual: StereoBuffer = { left: mix.left.slice(), right: mix.right.slice() }
  names.forEach((name, k) => {
    if (BLEED_PRONE.includes(name))
      return
    const stem = stems[k]!
    for (let i = 0; i < residual.left.length; i++) {
      residual.left[i]! -= stem.left[i]!
      residual.right[i]! -= stem.right[i]!
    }
  })
  wienerRefine(residual, refine.map(k => stems[k]!))
  return true
}
