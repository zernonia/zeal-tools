/**
 * Promptable segmentation — the maths behind the magic brush.
 *
 * A saliency model answers "what is this picture about?" and cannot be told
 * otherwise. SAM answers a different question: "what object is under this
 * point?" That is what makes correction possible — the click is an input, so
 * the model works *with* the correction instead of overruling it.
 *
 * The work splits in two: a vision encoder runs once per picture, and a small
 * decoder runs per click against the stored embeddings. Everything here is
 * the pure part — no DOM, no Vue, no npm.
 */
import type { Matte, Rgba } from './index'
import { resizeRgba } from './index'

/**
 * SlimSAM-77 (Apache-2.0), the quantized build: 8.5 MiB of encoder that runs
 * once per picture and 4.7 MiB of decoder that runs per click in about 125ms
 * — measured, and the reason a click can feel instant.
 */
export const SAM_MODEL = {
  encoder: 'https://huggingface.co/Xenova/slimsam-77-uniform/resolve/main/onnx/vision_encoder_quantized.onnx',
  decoder: 'https://huggingface.co/Xenova/slimsam-77-uniform/resolve/main/onnx/prompt_encoder_mask_decoder_quantized.onnx',
  megabytes: 13,
  licence: 'Apache-2.0',
  credit: 'SlimSAM-77',
} as const

/** The square the encoder expects, and the resolution masks come back at. */
export const SAM_INPUT = 1024
export const SAM_MASK = 256

const MEAN = [0.485, 0.456, 0.406] as const
const STD = [0.229, 0.224, 0.225] as const

/**
 * How a picture maps into SAM's padded square.
 *
 * The image is scaled so its longest edge is 1024 and then padded to a full
 * square — it is *not* stretched. Every coordinate crossing this boundary,
 * in either direction, has to go through the same transform, which is why it
 * is a value rather than something each call site recomputes.
 */
export interface SamTransform {
  scale: number
  /** Size of the real content inside the padded square. */
  width: number
  height: number
}

export function samTransform(width: number, height: number): SamTransform {
  const scale = SAM_INPUT / Math.max(width, height)
  return {
    scale,
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  }
}

/**
 * RGBA → the padded, normalised tensor the encoder wants.
 *
 * Padding is zeros *after* normalising, matching SamImageProcessor. Padding
 * before would put mid-grey into the model instead of the mean, and shift
 * every embedding slightly.
 */
export function samTensor(image: Rgba, transform: SamTransform): Float32Array {
  const resized = resizeRgba(image, transform.width, transform.height)
  const plane = SAM_INPUT * SAM_INPUT
  const tensor = new Float32Array(plane * 3)

  for (let y = 0; y < transform.height; y++) {
    for (let x = 0; x < transform.width; x++) {
      const src = (y * transform.width + x) * 4
      const dst = y * SAM_INPUT + x
      for (let c = 0; c < 3; c++)
        tensor[c * plane + dst] = (resized.data[src + c]! / 255 - MEAN[c]!) / STD[c]!
    }
  }

  return tensor
}

/** Image pixel → a point in SAM's padded square. */
export function samPoint(x: number, y: number, transform: SamTransform): [number, number] {
  return [x * transform.scale, y * transform.scale]
}

/**
 * SAM proposes three masks per click — roughly subpart, part and whole — and
 * scores each. Picking by score is what makes a single click land on the
 * object a person meant rather than on a random granularity.
 */
export function bestMaskIndex(scores: ArrayLike<number>): number {
  let best = 0
  for (let i = 1; i < scores.length; i++) {
    if (scores[i]! > scores[best]!)
      best = i
  }
  return best
}

/**
 * One 256×256 logit map → a matte at the picture's own size.
 *
 * Samples the logits bilinearly straight into the target, rather than
 * cropping then resizing, so the padded region never bleeds in and there is
 * only one interpolation to soften the edge. Logits become coverage through a
 * sigmoid: SAM's boundary is logit 0, which lands at half coverage and gives
 * an antialiased edge instead of a jagged binary one.
 */
export function samMask(
  logits: ArrayLike<number>,
  index: number,
  transform: SamTransform,
  width: number,
  height: number,
): Matte {
  const data = new Uint8ClampedArray(width * height)
  const offset = index * SAM_MASK * SAM_MASK

  // Extent of the real content within the mask grid; beyond this is padding.
  const spanX = (transform.width / SAM_INPUT) * SAM_MASK
  const spanY = (transform.height / SAM_INPUT) * SAM_MASK

  for (let y = 0; y < height; y++) {
    const my = Math.min(SAM_MASK - 1, Math.max(0, ((y + 0.5) / height) * spanY - 0.5))
    const y0 = Math.floor(my)
    const y1 = Math.min(y0 + 1, SAM_MASK - 1)
    const wy = my - y0

    for (let x = 0; x < width; x++) {
      const mx = Math.min(SAM_MASK - 1, Math.max(0, ((x + 0.5) / width) * spanX - 0.5))
      const x0 = Math.floor(mx)
      const x1 = Math.min(x0 + 1, SAM_MASK - 1)
      const wx = mx - x0

      const top = logits[offset + y0 * SAM_MASK + x0]! * (1 - wx) + logits[offset + y0 * SAM_MASK + x1]! * wx
      const bottom = logits[offset + y1 * SAM_MASK + x0]! * (1 - wx) + logits[offset + y1 * SAM_MASK + x1]! * wx
      const logit = top * (1 - wy) + bottom * wy

      data[y * width + x] = (1 / (1 + Math.exp(-logit))) * 255
    }
  }

  return { data, width, height }
}

/**
 * Fold a selected region into the existing matte.
 *
 * `add` takes the stronger of the two so a newly selected object joins what is
 * already kept; `remove` subtracts the selection's strength. Both work on
 * coverage rather than a binary decision, so SAM's soft edge survives instead
 * of being squared off at the join.
 */
export function mergeSelection(matte: Matte, selection: Matte, mode: 'add' | 'remove'): Matte {
  const data = new Uint8ClampedArray(matte.data.length)
  for (let i = 0; i < data.length; i++) {
    const base = matte.data[i]!
    const sel = selection.data[i]!
    data[i] = mode === 'add' ? Math.max(base, sel) : base - sel
  }
  return { data, width: matte.width, height: matte.height }
}
