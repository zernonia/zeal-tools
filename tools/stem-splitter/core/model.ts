/**
 * The separation model this tool runs.
 *
 * HT-Demucs, Meta's hybrid transformer Demucs (MIT), in an export built for
 * the browser: mixed precision, cut into 21 chained graphs so no single GPU
 * submission is long enough to stall the compositor. Streamed from Hugging
 * Face on first use and cached; nothing is vendored. The revision is pinned,
 * because the piece boundaries are an interface — a re-export upstream could
 * rename every tensor between them.
 *
 * Measured, not assumed (Chrome, Apple M-series, one 7.8 s window):
 *
 * - **WebGPU ≈ 1.4 s, wasm ≈ 12.4 s.** The same files serve both backends,
 *   so a browser without WebGPU falls back without a second download.
 * - **Matches the single-graph export.** Against `adowu/htdemucs-onnx`, which
 *   computes the STFT inside the graph, the wasm path agrees to a relative
 *   error of 1e-6 per stem — which is what proves `spectrogram.ts` right —
 *   and the WebGPU path to correlation ≥ 0.99998 on music with speech mixed
 *   in. That single-graph file was the first choice and is not usable: its
 *   ISTFT contains a `ConstantOfShape` that the WebGPU build of ORT has no
 *   kernel for on any provider, and on wasm it only loads with graph
 *   optimisation disabled, at 158 MB.
 * - **Piece 0 must pin its normalisation prologue to the CPU** on WebGPU, or
 *   the fp16 graph produces NaN. The node names come from the export's README.
 */
const REVISION = 'a4a57cc0cf707e5b9a3e6ad3c2c4b21fcbe608c1'
const BASE = `https://huggingface.co/monteslu/htdemucs-web-onnx/resolve/${REVISION}`
const PIECES = 21

export const MODEL = {
  pieces: Array.from({ length: PIECES }, (_, i) => `${BASE}/htdemucs_p${String(i).padStart(2, '0')}.onnx`),
  /** Exact total of the 21 files, so download progress is bytes, not files. */
  bytes: 125_881_245,
  /** Download size in MiB, so the wait can be explained before it starts. */
  megabytes: 120,
  licence: 'MIT',
  credit: 'HT-Demucs (Meta AI)',
  sampleRate: 44100,
  /** The fixed window the graph was exported at: 7.8 s of 44.1 kHz audio. */
  segment: 343_980,
  /** Inputs to piece 0, and the frequency/time outputs of the chain. */
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
} as const

/** Display order. */
export const STEMS = ['vocals', 'drums', 'bass', 'other'] as const
export type Stem = typeof STEMS[number]

/** Index of each stem in the model's output tensors, which is not display order. */
export const STEM_INDEX: Record<Stem, number> = { drums: 0, bass: 1, other: 2, vocals: 3 }

export const STEM_LABELS: Record<Stem, string> = {
  vocals: 'Vocals',
  drums: 'Drums',
  bass: 'Bass',
  other: 'Other',
}

/**
 * Longest input accepted. Four stereo float stems of a ten-minute track are
 * 850 MB before the model's own working memory, which is already more than
 * many phones will give one tab.
 */
export const MAX_SECONDS = 600
