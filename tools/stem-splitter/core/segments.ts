/**
 * Cutting a track into the model's fixed window and stitching it back.
 *
 * The model sees 7.8 s at a time and is least sure of itself near the edges
 * of each window, where it has no context. So windows overlap by a quarter and
 * are crossfaded: each one fades in over the previous one's tail with linear
 * ramps that sum to exactly one, which means the stitched result needs no
 * normalising pass and a steady signal passes through at unit gain.
 *
 * The first window does not fade in and the last does not fade out — nothing
 * overlaps them there, and fading would leave the start and end of the song
 * quieter than the rest.
 */

export interface Segment {
  /** First sample of the track this window covers. */
  start: number
  /** Real samples in the window; the remainder of the model input is silence. */
  length: number
}

export interface StereoBuffer {
  left: Float32Array
  right: Float32Array
}

/** Windows covering `total` samples, each `size` long, overlapping by `overlap`. */
export function planSegments(total: number, size: number, overlap = Math.floor(size / 4)): Segment[] {
  if (total <= 0)
    return []
  if (overlap < 0 || overlap >= size)
    throw new RangeError('Overlap must be shorter than the window')

  const stride = size - overlap
  const count = total <= size ? 1 : Math.ceil((total - size) / stride) + 1
  return Array.from({ length: count }, (_, i) => {
    const start = i * stride
    return { start, length: Math.min(size, total - start) }
  })
}

/**
 * The weight each sample of window `index` contributes. Ramps are sampled at
 * half-sample offsets so a fade-in and the fade-out it meets add to one at
 * every sample, not just on average.
 */
export function segmentWeights(index: number, count: number, length: number, overlap: number): Float32Array {
  const weights = new Float32Array(length).fill(1)
  if (overlap <= 0)
    return weights

  if (index > 0) {
    for (let j = 0; j < Math.min(overlap, length); j++)
      weights[j] = (j + 0.5) / overlap
  }
  if (index < count - 1) {
    // Only reached for a full-length window, since only the last can be short.
    for (let j = 0; j < overlap; j++)
      weights[length - overlap + j] = Math.min(weights[length - overlap + j]!, 1 - (j + 0.5) / overlap)
  }
  return weights
}

/** The model input for one window: `[left…, right…]`, padded with silence. */
export function segmentInput(source: StereoBuffer, segment: Segment, size: number): Float32Array {
  const input = new Float32Array(2 * size)
  const end = segment.start + segment.length
  input.set(source.left.subarray(segment.start, end), 0)
  input.set(source.right.subarray(segment.start, end), size)
  return input
}

/**
 * Add one window of model output into the stem buffers.
 *
 * `output` is the raw `[stems, 2, size]` tensor; `order[k]` is the output
 * index that belongs in `targets[k]`, so the caller can keep its own display
 * order without the model's leaking into it.
 */
export function accumulateSegment(
  targets: StereoBuffer[],
  output: Float32Array,
  order: readonly number[],
  segment: Segment,
  weights: Float32Array,
  size: number,
): void {
  for (let k = 0; k < targets.length; k++) {
    const target = targets[k]!
    const base = order[k]! * 2 * size
    for (let j = 0; j < segment.length; j++) {
      const w = weights[j]!
      target.left[segment.start + j]! += output[base + j]! * w
      target.right[segment.start + j]! += output[base + size + j]! * w
    }
  }
}

/**
 * Any decoded layout to the stereo pair the model expects. Mono is doubled;
 * beyond two channels the first two are front left and right in every
 * standard layout, which is the closest stereo image to what was decoded.
 */
export function toStereo(channels: Float32Array[]): StereoBuffer {
  if (!channels.length)
    throw new Error('The audio has no channels')
  return { left: channels[0]!, right: channels[1] ?? channels[0]! }
}
