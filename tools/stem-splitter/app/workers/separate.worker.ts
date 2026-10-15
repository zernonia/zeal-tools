/// <reference lib="webworker" />
/**
 * The whole separation, off the main thread.
 *
 * A dedicated worker rather than ORT's `proxy` mode (which the background
 * remover uses) for two reasons: the proxy only covers the wasm backend, and
 * around every four-stem model call sit an STFT and an ISTFT of our own,
 * ~0.4 s of JavaScript per window that would otherwise jank the page 31 times
 * a song. Here the page only ever sees progress messages, and the stems at
 * the end.
 */
import type { InferenceSession, Tensor } from 'onnxruntime-web'
import type { ChainModel, GraphModel, ModelSpec, StereoBuffer } from '../../core'
import type { Backend, SeparateRequest, WorkerMessage } from './protocol'
import { onnxWasmPaths } from '#zeal/onnx'
import {
  accumulateSegment,
  AUDIO,
  combineBranches,
  MODELS,
  outputOrder,
  planSegments,
  residual,
  segmentInput,
  segmentWeights,
  spectrogram,
} from '../../core'

declare const self: DedicatedWorkerGlobalScope

/** Bump when a model revision changes, so old files are not served forever. */
const MODEL_CACHE = 'zeal-stem-model-v1'

/**
 * Above this, the stems do not add back up to the input and the backend is
 * not to be trusted. Real separations measure 0.5% (four stems) to 4% (six);
 * what this exists to catch — NaN from an fp16 overflow, silence from a GPU
 * that failed quietly — lands at 100% or at infinity.
 */
const RESIDUAL_LIMIT = 0.25

type Ort = typeof import('onnxruntime-web')

function post(message: WorkerMessage, transfer: Transferable[] = []) {
  self.postMessage(message, transfer)
}

let ortPromise: Promise<Ort> | null = null
function loadOrt(): Promise<Ort> {
  // The WebGPU bundle carries the wasm backend too, so one runtime covers
  // both paths and falling back costs no second download.
  ortPromise ??= import('onnxruntime-web/webgpu').then((ort) => {
    // The binary is fetched from jsDelivr on first use rather than bundled —
    // see onnxWasmPaths.
    ort.env.wasm.wasmPaths = onnxWasmPaths(ort.env.versions.web!)
    // No COOP/COEP on this site, so threads are unavailable; say so rather
    // than letting ORT try and warn.
    ort.env.wasm.numThreads = 1
    ort.env.logLevel = 'fatal'
    return ort as unknown as Ort
  })
  return ortPromise
}

/**
 * Every file of a model, from the Cache API when present. Fetched four at a
 * time and reported as bytes against the known total, so the bar moves
 * smoothly rather than in uneven per-file steps.
 */
async function downloadModel(model: ModelSpec): Promise<Uint8Array[]> {
  const cache = await caches.open(MODEL_CACHE).catch(() => null)
  const received: number[] = Array.from({ length: model.files.length }).fill(0)
  let reported = -1
  const report = () => {
    const progress = Math.min(1, received.reduce((a, b) => a + b, 0) / model.bytes)
    // Coalesce: a fast connection would otherwise post thousands of messages.
    if (progress - reported >= 0.005 || progress === 1) {
      reported = progress
      post({ type: 'downloading', progress })
    }
  }

  async function one(index: number): Promise<Uint8Array> {
    const url = model.files[index]!
    const hit = await cache?.match(url)
    const response = hit ?? await fetch(url)
    if (!response.ok)
      throw new Error(`The model could not be downloaded (${response.status}).`)
    if (!hit)
      void cache?.put(url, response.clone()).catch(() => {})

    if (!response.body) {
      const bytes = new Uint8Array(await response.arrayBuffer())
      received[index] = bytes.length
      report()
      return bytes
    }

    const reader = response.body.getReader()
    const chunks: Uint8Array[] = []
    let size = 0
    for (;;) {
      const { done, value } = await reader.read()
      if (done)
        break
      chunks.push(value)
      size += value.length
      received[index] = size
      report()
    }
    const bytes = new Uint8Array(size)
    let offset = 0
    for (const chunk of chunks) {
      bytes.set(chunk, offset)
      offset += chunk.length
    }
    return bytes
  }

  const out: Uint8Array[] = []
  let next = 0
  await Promise.all(Array.from({ length: Math.min(4, model.files.length) }, async () => {
    while (next < model.files.length) {
      const index = next++
      out[index] = await one(index)
    }
  }))
  return out
}

interface Loaded {
  model: ModelSpec
  backend: Backend
  sessions: InferenceSession[]
}

/**
 * One model resident at a time. Both together would hold ~400 MB of weights
 * in a worker for no benefit — switching is rare, and a cached model reloads
 * from the Cache API in about a second.
 */
let loaded: Loaded | null = null

async function webgpuAvailable(): Promise<boolean> {
  try {
    return !!(await navigator.gpu?.requestAdapter())
  }
  catch {
    return false
  }
}

async function load(model: ModelSpec, backend: Backend): Promise<Loaded> {
  const ort = await loadOrt()
  const files = await downloadModel(model)
  post({ type: 'starting', backend })

  const sessions: InferenceSession[] = []
  try {
    for (let i = 0; i < files.length; i++) {
      const provider = backend === 'wasm'
        ? 'wasm'
        // The four-stem chain's fp16 normalisation overflows to NaN on the
        // GPU; the export's own instructions pin it to the CPU.
        : model.format === 'chain' && i === 0
          ? { name: 'webgpu' as const, forceCpuNodeNames: model.cpuNodes }
          : 'webgpu'
      sessions.push(await ort.InferenceSession.create(files[i]!, {
        executionProviders: [provider],
        graphOptimizationLevel: 'all',
        logSeverityLevel: 4,
      }))
      // The bytes are copied into the runtime; drop ours as we go so the
      // peak is one copy of the weights, not two.
      files[i] = new Uint8Array(0)
    }
  }
  catch (cause) {
    await Promise.all(sessions.map(s => s.release().catch(() => {})))
    throw cause
  }
  return { model, backend, sessions }
}

async function unload() {
  const old = loaded
  loaded = null
  await Promise.all(old?.sessions.map(s => s.release().catch(() => {})) ?? [])
}

/** The 21-piece chain: STFT in, both branches out, ISTFT and sum. */
async function runChain(model: ChainModel, sessions: InferenceSession[], input: Float32Array): Promise<Float32Array> {
  const ort = await loadOrt()
  const size = AUDIO.segment
  const spectrum = spectrogram(input.subarray(0, size), input.subarray(size))

  const feeds = new Map<string, Tensor>([
    [model.inputs.wave, new ort.Tensor('float32', input, [1, 2, size])],
    [model.inputs.spectrum, new ort.Tensor('float32', spectrum, [1, 4, 2048, spectrum.length / (4 * 2048)])],
  ])

  // Each piece names the tensors it needs; every output goes back into the
  // pool for whichever later piece asks for it. Run strictly in order.
  for (const session of sessions) {
    const inputs: Record<string, Tensor> = {}
    for (const name of session.inputNames)
      inputs[name] = feeds.get(name)!
    const outputs = await session.run(inputs)
    for (const [name, tensor] of Object.entries(outputs))
      feeds.set(name, tensor)
  }

  const freq = await feeds.get(model.outputs.freq)!.getData() as Float32Array
  const time = await feeds.get(model.outputs.time)!.getData() as Float32Array
  return combineBranches(freq, time, model.stems.length, size)
}

/** The single graph: waveform in, stems out. */
async function runGraph(model: GraphModel, session: InferenceSession, input: Float32Array): Promise<Float32Array> {
  const ort = await loadOrt()
  const outputs = await session.run({ [model.input]: new ort.Tensor('float32', input, [1, 2, AUDIO.segment]) })
  return await outputs[model.output]!.getData() as Float32Array
}

/** One 7.8 s window: `[2, size]` in, `[stems, 2, size]` out in model order. */
function runWindow({ model, sessions }: Loaded, input: Float32Array): Promise<Float32Array> {
  return model.format === 'chain'
    ? runChain(model, sessions, input)
    : runGraph(model, sessions[0]!, input)
}

async function separate({ model: id, left, right }: SeparateRequest) {
  const model = MODELS[id]
  const size = AUDIO.segment
  const overlap = Math.floor(size / 4)
  const source: StereoBuffer = { left, right }
  const plan = planSegments(left.length, size, overlap)
  const targets: StereoBuffer[] = model.stems.map(() => ({
    left: new Float32Array(left.length),
    right: new Float32Array(left.length),
  }))
  const order = outputOrder(model)

  if (loaded?.model.id !== id) {
    // A different model was asked for: keep the backend that worked, but
    // free the old weights before downloading the new ones.
    const previous = loaded?.backend
    await unload()
    const preferred: Backend = previous ?? (await webgpuAvailable() ? 'webgpu' : 'wasm')
    try {
      loaded = await load(model, preferred)
    }
    catch (cause) {
      if (preferred === 'wasm')
        throw cause
      post({ type: 'fallback', reason: String(cause) })
      loaded = await load(model, 'wasm')
    }
  }

  let current = loaded!
  post({ type: 'progress', done: 0, total: plan.length, backend: current.backend })

  for (let i = 0; i < plan.length; i++) {
    const segment = plan[i]!
    const input = segmentInput(source, segment, size)
    let output: Float32Array
    try {
      // The Tensor takes the array as-is; hand it a copy so the residual
      // check below still has the input to compare against.
      output = await runWindow(current, input.slice())
      if (residual(input, output, model.stems.length) > RESIDUAL_LIMIT)
        throw new Error('stems do not add back up to the input')
    }
    catch (cause) {
      // A GPU that fails — at the first window or the thirtieth, from a bad
      // driver or a lost device — falls back and redoes only this window.
      // The windows already accumulated are correct and are kept.
      if (current.backend !== 'webgpu')
        throw cause
      post({ type: 'fallback', reason: String(cause) })
      await unload()
      loaded = current = await load(model, 'wasm')
      output = await runWindow(current, input.slice())
    }

    accumulateSegment(targets, output, order, segment, segmentWeights(i, plan.length, segment.length, overlap), size)
    post({ type: 'progress', done: i + 1, total: plan.length, backend: current.backend })
  }

  post(
    { type: 'done', stems: targets, backend: current.backend },
    targets.flatMap(t => [t.left.buffer, t.right.buffer]),
  )
}

self.onmessage = (event: MessageEvent<SeparateRequest>) => {
  if (event.data.type !== 'separate')
    return
  separate(event.data).catch((cause) => {
    post({ type: 'error', message: cause instanceof Error ? cause.message : 'Separation failed.' })
  })
}
