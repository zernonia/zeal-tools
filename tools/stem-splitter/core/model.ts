/**
 * The separation models this tool runs — two members of Meta's HT-Demucs
 * family (MIT), both streamed from Hugging Face on first use, cached, and
 * pinned by commit. Nothing is vendored.
 *
 * Measured, not assumed (Chrome, Apple M-series, one 7.8 s window):
 *
 * **Four stems** — `monteslu/htdemucs-web-onnx`, mixed precision, cut into 21
 * chained graphs so no single GPU submission stalls the compositor. The
 * revision is pinned because the piece boundaries are an interface.
 *
 * - WebGPU ≈ 1.4 s, wasm ≈ 12.4 s, from the same files.
 * - The STFT/ISTFT are outside the graph and ours (`spectrogram.ts`). Against
 *   `adowu/htdemucs-onnx`, which computes them inside, the wasm path agrees to
 *   1e-6 relative error and the WebGPU path to correlation ≥ 0.99998. That
 *   single-graph file was the first choice and is unusable: its ISTFT holds a
 *   `ConstantOfShape` that ORT's WebGPU build has no kernel for on any
 *   provider, and on wasm it only loads with graph optimisation disabled.
 * - Piece 0 must pin its normalisation prologue to the CPU on WebGPU, or the
 *   fp16 graph produces NaN. The node names come from the export's README.
 *
 * **Six stems** — `kramp/htdemucs-6s-webgpu-onnx`, the 6-source model adding
 * guitar and piano, as one fp32 graph with the STFT inside. It is the same
 * export as above with that `ConstantOfShape` folded to a constant, which is
 * what lets it run on WebGPU at all.
 *
 * - WebGPU ≈ 3.2 s, wasm ≈ 13.3 s; both backends agree.
 * - On a mix of known sources each landed in its own stem: piano 0.85,
 *   plucked-string guitar 0.83, speech 0.96 correlation.
 * - Its stems add back up less tightly — 2–4% residual against the four-stem
 *   model's ~0.5% — which is why the fallback threshold is not tighter.
 * - Upstream's own README says the piano stem "doesn't work so well", and the
 *   guitar stem holds acoustic and electric alike. The UI says both.
 */
export type Stem = 'vocals' | 'drums' | 'bass' | 'guitar' | 'piano' | 'other'

export type ModelId = 'four' | 'six'

interface BaseModel {
  id: ModelId
  /** Display order. */
  stems: readonly Stem[]
  /** Index of each stem in the model's output tensor — not display order. */
  outputIndex: Partial<Record<Stem, number>>
  files: readonly string[]
  /** Exact total of the files, so download progress is bytes, not files. */
  bytes: number
  /** Download size in MiB, so the wait can be explained before it starts. */
  megabytes: number
  /**
   * Longest input accepted. The stems are held as stereo float32, so memory
   * grows with the stem count: six stems of ten minutes would be 1.3 GB
   * before the model's own working memory.
   */
  maxSeconds: number
}

/** STFT outside the graph; 21 pieces run in order. */
export interface ChainModel extends BaseModel {
  format: 'chain'
  inputs: { wave: string, spectrum: string }
  outputs: { freq: string, time: string }
  /** Piece-0 nodes WebGPU must leave on the CPU. */
  cpuNodes: readonly string[]
}

/** One graph, waveform in, stems out. */
export interface GraphModel extends BaseModel {
  format: 'graph'
  input: string
  output: string
}

export type ModelSpec = ChainModel | GraphModel

const FOUR_BASE = 'https://huggingface.co/monteslu/htdemucs-web-onnx/resolve/a4a57cc0cf707e5b9a3e6ad3c2c4b21fcbe608c1'
const SIX_BASE = 'https://huggingface.co/kramp/htdemucs-6s-webgpu-onnx/resolve/0c850a01007f48d94900b21b49a0d0ae1a17239f'

export const MODELS: Record<ModelId, ModelSpec> = {
  four: {
    id: 'four',
    format: 'chain',
    stems: ['vocals', 'drums', 'bass', 'other'],
    outputIndex: { drums: 0, bass: 1, other: 2, vocals: 3 },
    files: Array.from({ length: 21 }, (_, i) => `${FOUR_BASE}/htdemucs_p${String(i).padStart(2, '0')}.onnx`),
    bytes: 125_881_245,
    megabytes: 120,
    maxSeconds: 600,
    inputs: { wave: 'mix', spectrum: 'mag' },
    outputs: { freq: 'x', time: 'xt' },
    cpuNodes: [
      '/ReduceMean',
      '/Sub',
      '/Pow',
      '/ReduceMean_1',
      '/Clip',
      '/Sqrt',
      '/Add',
      '/Div',
      '/ReduceMean_2',
      '/Sub_1',
      '/Pow_1',
      '/ReduceMean_3',
      '/Clip_1',
      '/Sqrt_1',
      '/Add_1',
      '/Div_1',
    ],
  },
  six: {
    id: 'six',
    format: 'graph',
    stems: ['vocals', 'drums', 'bass', 'guitar', 'piano', 'other'],
    outputIndex: { drums: 0, bass: 1, other: 2, vocals: 3, guitar: 4, piano: 5 },
    files: [`${SIX_BASE}/htdemucs_6s.onnx`],
    bytes: 284_797_240,
    megabytes: 272,
    maxSeconds: 400,
    input: 'mix',
    output: 'stems',
  },
}

/** What every model shares. */
export const AUDIO = {
  sampleRate: 44100,
  /** The fixed window both graphs were exported at: 7.8 s of 44.1 kHz audio. */
  segment: 343_980,
  licence: 'MIT',
  credit: 'HT-Demucs (Meta AI)',
} as const

export const STEM_LABELS: Record<Stem, string> = {
  vocals: 'Vocals',
  drums: 'Drums',
  bass: 'Bass',
  guitar: 'Guitar',
  piano: 'Piano',
  other: 'Other',
}

/** The model's output index for each display stem, in display order. */
export function outputOrder(model: ModelSpec): number[] {
  return model.stems.map((stem) => {
    const index = model.outputIndex[stem]
    if (index === undefined)
      throw new Error(`${model.id} has no output for ${stem}`)
    return index
  })
}
