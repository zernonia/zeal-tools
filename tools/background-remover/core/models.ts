/**
 * The segmentation model this tool runs.
 *
 * One model, streamed from Hugging Face on first use. Nothing is vendored:
 * the ONNX runtime comes from jsDelivr and the weights from Hugging Face, so
 * there is no build step and nothing under public/. What that costs is a
 * 94 MB download before the first cutout — there is no smaller permissive
 * model to fall back to, since the one good small option (ISNet, 42 MB
 * quantized) is AGPL-3.0 and unusable in an MIT project.
 *
 * Every field is something `core/` needs in order to stay pure: preprocessing
 * and activation are properties of the model, and getting either wrong yields
 * a plausible-looking but quietly wrong matte.
 */
export interface ModelSpec {
  id: string
  label: string
  url: string
  /** Download size in MiB, so the wait can be explained before it starts. */
  megabytes: number
  /** Square input edge the model was trained at. */
  size: number
  /** How pixel bytes become floats: a flat /255, or the image's own maximum. */
  scale: 'image-max' | 'unit'
  mean: readonly [number, number, number]
  std: readonly [number, number, number]
  /**
   * How raw output becomes coverage. Measured, not assumed: BiRefNet emits
   * logits from about -15 to +8 that need a sigmoid, where zero is the real
   * decision boundary. Stretching them against their own range instead would
   * let a single outlier pixel squash the whole matte.
   */
  activation: 'minmax' | 'sigmoid'
  /** Measured single-thread wasm inference, seconds. */
  seconds: number
  licence: string
  credit: string
}

export const MODEL: ModelSpec = {
  id: 'birefnet',
  label: 'BiRefNet-lite',
  url: 'https://huggingface.co/studioludens/birefnet-lite-512/resolve/main/onnx/model_fp16.onnx',
  megabytes: 94,
  size: 512,
  scale: 'unit',
  mean: [0.485, 0.456, 0.406],
  std: [0.229, 0.224, 0.225],
  activation: 'sigmoid',
  seconds: 6,
  licence: 'MIT',
  credit: 'BiRefNet-lite',
}
