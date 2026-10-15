/**
 * The STFT and its inverse, exactly as HT-Demucs computes them.
 *
 * The WebGPU build of the model leaves both transforms outside the graph, so
 * they are ours — and they have to match `demucs.htdemucs._spec` / `_ispec`
 * to the sample, because the network was trained on precisely that layout.
 * An almost-right spectrogram produces almost-right stems, which is the worst
 * kind of wrong. What has to agree with PyTorch:
 *
 * - a periodic Hann window (`torch.hann_window` default), n_fft 4096, hop 1024;
 * - `normalized=True`, i.e. scaled by 1/√n_fft forward and √n_fft back;
 * - demucs's own reflect padding of 1536 + whatever rounds the length up to a
 *   whole hop, then `center=True`'s further 2048 on each side;
 * - the Nyquist bin dropped, and the first and last two frames discarded;
 * - channels laid out as `[L.re, L.im, R.re, R.im]` ("complex as channels").
 *
 * Verified end to end against the single-graph model, which does all of this
 * internally — see the stem-splitter section of CLAUDE.md.
 */

export const N_FFT = 4096
export const HOP = 1024
const BINS = N_FFT / 2 // 2048 — the Nyquist bin is dropped
const DEMUCS_PAD = (HOP / 2) * 3 // 1536

/** Frames the model sees for a window of `length` samples. */
export function frameCount(length: number): number {
  return Math.ceil(length / HOP)
}

let cachedWindow: Float32Array | null = null
/** Periodic Hann, which is what `torch.hann_window(n)` returns by default. */
export function hannWindow(n = N_FFT): Float32Array {
  if (n === N_FFT && cachedWindow)
    return cachedWindow
  const w = new Float32Array(n)
  for (let i = 0; i < n; i++)
    w[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / n)
  if (n === N_FFT)
    cachedWindow = w
  return w
}

/**
 * In-place iterative radix-2 FFT over separate real and imaginary arrays.
 * `inverse` flips the twiddle sign and does not scale — callers decide that.
 */
export function fft(re: Float64Array, im: Float64Array, inverse = false): void {
  const n = re.length
  if (n & (n - 1))
    throw new RangeError('FFT size must be a power of two')

  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1
    for (; j & bit; bit >>= 1)
      j ^= bit
    j ^= bit
    if (i < j) {
      [re[i], re[j]] = [re[j]!, re[i]!]
      ;[im[i], im[j]] = [im[j]!, im[i]!]
    }
  }

  const sign = inverse ? 1 : -1
  for (let size = 2; size <= n; size <<= 1) {
    const half = size >> 1
    const step = (sign * 2 * Math.PI) / size
    const wr = Math.cos(step)
    const wi = Math.sin(step)
    for (let start = 0; start < n; start += size) {
      let cr = 1
      let ci = 0
      for (let k = 0; k < half; k++) {
        const a = start + k
        const b = a + half
        const tr = re[b]! * cr - im[b]! * ci
        const ti = re[b]! * ci + im[b]! * cr
        re[b] = re[a]! - tr
        im[b] = im[a]! - ti
        re[a]! += tr
        im[a]! += ti
        const next = cr * wr - ci * wi
        ci = cr * wi + ci * wr
        cr = next
      }
    }
  }
}

/** `torch.nn.functional.pad(mode='reflect')`: mirrors without repeating the edge. */
export function reflectPad(x: Float32Array, left: number, right: number): Float32Array {
  const n = x.length
  if (left >= n || right >= n)
    throw new RangeError('Reflect padding must be shorter than the signal')
  const out = new Float32Array(left + n + right)
  for (let i = 0; i < left; i++)
    out[i] = x[left - i]!
  out.set(x, left)
  for (let i = 0; i < right; i++)
    out[left + n + i] = x[n - 2 - i]!
  return out
}

/**
 * One channel's spectrogram as HT-Demucs builds it: `frameCount(length)`
 * frames of 2048 bins, written into `out` as two planes (real, then
 * imaginary), each `[bin][frame]`.
 */
function spectrumChannel(x: Float32Array, out: Float32Array, reOffset: number, imOffset: number): void {
  const length = x.length
  const frames = frameCount(length)
  // demucs pads first, then torch.stft(center=True) pads again by n_fft/2.
  const padded = reflectPad(x, DEMUCS_PAD, DEMUCS_PAD + frames * HOP - length)
  const centred = reflectPad(padded, N_FFT / 2, N_FFT / 2)
  const window = hannWindow()
  const scale = 1 / Math.sqrt(N_FFT)
  const re = new Float64Array(N_FFT)
  const im = new Float64Array(N_FFT)

  // torch yields frames + 4 frames here; demucs keeps [2, 2 + frames).
  for (let t = 0; t < frames; t++) {
    const offset = (t + 2) * HOP
    for (let i = 0; i < N_FFT; i++) {
      re[i] = centred[offset + i]! * window[i]!
      im[i] = 0
    }
    fft(re, im)
    for (let f = 0; f < BINS; f++) {
      out[reOffset + f * frames + t] = re[f]! * scale
      out[imOffset + f * frames + t] = im[f]! * scale
    }
  }
}

/**
 * The model's `mag` input for a stereo window: `[1, 4, 2048, frames]` with
 * channels `[L.re, L.im, R.re, R.im]`.
 */
export function spectrogram(left: Float32Array, right: Float32Array): Float32Array {
  const frames = frameCount(left.length)
  const plane = BINS * frames
  const out = new Float32Array(4 * plane)
  spectrumChannel(left, out, 0, plane)
  spectrumChannel(right, out, 2 * plane, 3 * plane)
  return out
}

/**
 * Inverse of one complex plane pair back to `length` samples, as `_ispec`
 * does it: restore the Nyquist bin and the four trimmed frames as zeros,
 * inverse-transform each frame, overlap-add with the window, divide by the
 * summed squared window, then cut the padding back off.
 *
 * `spec` is the model's frequency output; `reOffset`/`imOffset` locate one
 * channel's planes inside it. The result is *added* into `target`, because
 * the caller sums it with the time branch.
 */
export function inverseChannel(
  spec: Float32Array,
  reOffset: number,
  imOffset: number,
  frames: number,
  length: number,
  target: Float32Array,
  targetOffset = 0,
): void {
  const window = hannWindow()
  const total = frames + 4
  const span = N_FFT + HOP * (total - 1)
  const signal = new Float64Array(span)
  const envelope = new Float64Array(span)
  const re = new Float64Array(N_FFT)
  const im = new Float64Array(N_FFT)
  // normalized=True multiplies by √n; the inverse FFT itself wants 1/n.
  const scale = Math.sqrt(N_FFT) / N_FFT

  for (let t = 0; t < total; t++) {
    const offset = t * HOP
    const source = t - 2 // two zero frames either side of the model's own
    re.fill(0)
    im.fill(0)
    if (source >= 0 && source < frames) {
      for (let f = 0; f < BINS; f++) {
        re[f] = spec[reOffset + f * frames + source]!
        im[f] = spec[imOffset + f * frames + source]!
      }
      // Hermitian mirror so the inverse is real. Bin 0 and Nyquist (zero
      // here, as in _ispec) need no partner.
      for (let f = 1; f < BINS; f++) {
        re[N_FFT - f] = re[f]!
        im[N_FFT - f] = -im[f]!
      }
      // Nothing about a real signal's DC or Nyquist bins is imaginary, and
      // irfft ignores those parts — so must we.
      im[0] = 0
      fft(re, im, true)
    }
    for (let i = 0; i < N_FFT; i++) {
      const w = window[i]!
      signal[offset + i]! += re[i]! * scale * w
      envelope[offset + i]! += w * w
    }
  }

  // center=True starts the output n_fft/2 in; demucs then drops its own pad.
  const start = N_FFT / 2 + DEMUCS_PAD
  for (let j = 0; j < length; j++) {
    const e = envelope[start + j]!
    target[targetOffset + j]! += e > 1e-11 ? signal[start + j]! / e : 0
  }
}

/**
 * The model's two branches into finished stems, as HT-Demucs's forward pass
 * ends: the frequency branch is inverted back to a waveform and added to the
 * time branch. `freq` is `[stems, 4, 2048, frames]`, `time` is
 * `[stems, 2, size]`; the result has the time branch's layout.
 */
export function combineBranches(freq: Float32Array, time: Float32Array, stems: number, size: number): Float32Array {
  const frames = frameCount(size)
  const plane = BINS * frames
  const out = Float32Array.from(time.subarray(0, stems * 2 * size))
  for (let s = 0; s < stems; s++) {
    for (let c = 0; c < 2; c++) {
      const base = (s * 4 + c * 2) * plane
      inverseChannel(freq, base, base + plane, frames, size, out, (s * 2 + c) * size)
    }
  }
  return out
}
