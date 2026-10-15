/// <reference lib="webworker" />
/**
 * The whole separation, off the main thread.
 *
 * A dedicated worker rather than ORT's `proxy` mode (which the background
 * remover uses) for two reasons: the proxy only covers the wasm backend, and
 * around every model call sit an STFT and an ISTFT of our own, ~0.4 s of
 * JavaScript per window that would otherwise jank the page 31 times a song.
 * Here the page only ever sees progress messages, and the stems at the end.
 */
import type { InferenceSession, Tensor } from 'onnxruntime-web'
import type { StereoBuffer } from '../../core'
import type { Backend, SeparateRequest, WorkerMessage } from './protocol'
import {
  accumulateSegment,
  combineBranches,
  MODEL,
  planSegments,
  residual,
  segmentInput,
  segmentWeights,
  spectrogram,
  STEM_INDEX,
  STEMS,
} from '../../core'

declare const self: DedicatedWorkerGlobalScope

/** Bump when the model revision changes, so old pieces are not served forever. */
const MODEL_CACHE = 'zeal-stem-model-v1'

/**
 * Above this, the stems do not add back up to the input and the backend is
 * not to be trusted. HT-Demucs measures around 0.5%, garbage near 100%.
 */
const RESIDUAL_LIMIT = 0.05

type Ort = typeof import('onnxruntime-web')

function post(message: WorkerMessage, transfer: Transferable[] = []) {
  self.postMessage(message, transfer)
}

let ortPromise: Promise<Ort> | null = null
function loadOrt(): Promise<Ort> {
  // The WebGPU bundle carries the wasm backend too, so one runtime covers
  // both paths and falling back costs no second download.
  ortPromise ??= import('onnxruntime-web/webgpu').then((ort) => {
    // No COOP/COEP on this site, so threads are unavailable; say so rather
    // than letting ORT try and warn.
    ort.env.wasm.numThreads = 1
    ort.env.logLevel = 'fatal'
    return ort as unknown as Ort
  })
  return ortPromise
}

/**
 * All 21 pieces, from the Cache API when present. Fetched four at a time and
 * reported as bytes against the known total, so the bar moves smoothly
 * rather than in 21 uneven steps.
 */
async function downloadPieces(): Promise<Uint8Array[]> {
  const cache = await caches.open(MODEL_CACHE).catch(() => null)
  const received: number[] = Array.from({ length: MODEL.pieces.length }).fill(0)
  let reported = -1
  const report = () => {
    const progress = Math.min(1, received.reduce((a, b) => a + b, 0) / MODEL.bytes)
    // Coalesce: a fast connection would otherwise post thousands of messages.
    if (progress - reported >= 0.005 || progress === 1) {
      reported = progress
      post({ type: 'downloading', progress })
    }
  }

  async function one(index: number): Promise<Uint8Array> {
    const url = MODEL.pieces[index]!
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
  await Promise.all(Array.from({ length: 4 }, async () => {
    while (next < MODEL.pieces.length) {
      const index = next++
      out[index] = await one(index)
    }
  }))
  return out
}

interface Chain {
  backend: Backend
  sessions: InferenceSession[]
}

let chain: Chain | null = null

async function webgpuAvailable(): Promise<boolean> {
  try {
    return !!(await navigator.gpu?.requestAdapter())
  }
  catch {
    return false
  }
}

async function createChain(backend: Backend): Promise<Chain> {
  const ort = await loadOrt()
  const pieces = await downloadPieces()
  post({ type: 'starting', backend })

  const sessions: InferenceSession[] = []
  try {
    for (let i = 0; i < pieces.length; i++) {
      const provider = backend === 'wasm'
        ? 'wasm'
        // The fp16 normalisation in piece 0 overflows to NaN on the GPU;
        // the export's own instructions pin it to the CPU.
        : i === 0 ? { name: 'webgpu' as const, forceCpuNodeNames: MODEL.cpuNodes } : 'webgpu'
      sessions.push(await ort.InferenceSession.create(pieces[i]!, {
        executionProviders: [provider],
        graphOptimizationLevel: 'all',
        logSeverityLevel: 4,
      }))
      // The bytes are copied into the runtime; drop ours as we go so the
      // peak is one copy of the weights, not two.
      pieces[i] = new Uint8Array(0)
    }
  }
  catch (cause) {
    await Promise.all(sessions.map(s => s.release().catch(() => {})))
    throw cause
  }
  return { backend, sessions }
}

async function releaseChain() {
  const old = chain
  chain = null
  await Promise.all(old?.sessions.map(s => s.release().catch(() => {})) ?? [])
}

/** One 7.8 s window through the chain: `[2, size]` in, `[4, 2, size]` out in model order. */
async function runWindow(current: Chain, input: Float32Array): Promise<Float32Array> {
  const ort = await loadOrt()
  const size = MODEL.segment
  const spectrum = spectrogram(input.subarray(0, size), input.subarray(size))

  const feeds = new Map<string, Tensor>([
    [MODEL.inputs.wave, new ort.Tensor('float32', input, [1, 2, size])],
    [MODEL.inputs.spectrum, new ort.Tensor('float32', spectrum, [1, 4, 2048, spectrum.length / (4 * 2048)])],
  ])

  // Each piece names the tensors it needs; every output goes back into the
  // pool for whichever later piece asks for it. Run strictly in order.
  for (const session of current.sessions) {
    const inputs: Record<string, Tensor> = {}
    for (const name of session.inputNames)
      inputs[name] = feeds.get(name)!
    const outputs = await session.run(inputs)
    for (const [name, tensor] of Object.entries(outputs))
      feeds.set(name, tensor)
  }

  const freq = await feeds.get(MODEL.outputs.freq)!.getData() as Float32Array
  const time = await feeds.get(MODEL.outputs.time)!.getData() as Float32Array
  return combineBranches(freq, time, STEMS.length, size)
}

async function separate({ left, right }: SeparateRequest) {
  const size = MODEL.segment
  const overlap = Math.floor(size / 4)
  const source: StereoBuffer = { left, right }
  const plan = planSegments(left.length, size, overlap)
  const targets: StereoBuffer[] = STEMS.map(() => ({
    left: new Float32Array(left.length),
    right: new Float32Array(left.length),
  }))
  const order = STEMS.map(stem => STEM_INDEX[stem])

  if (!chain) {
    const preferred: Backend = await webgpuAvailable() ? 'webgpu' : 'wasm'
    try {
      chain = await createChain(preferred)
    }
    catch (cause) {
      if (preferred === 'wasm')
        throw cause
      post({ type: 'fallback', reason: String(cause) })
      chain = await createChain('wasm')
    }
  }

  post({ type: 'progress', done: 0, total: plan.length, backend: chain.backend })

  for (let i = 0; i < plan.length; i++) {
    const segment = plan[i]!
    const input = segmentInput(source, segment, size)
    let output: Float32Array
    try {
      // The Tensor takes the array as-is; hand it a copy so the residual
      // check below still has the input to compare against.
      output = await runWindow(chain, input.slice())
      if (residual(input, output, STEMS.length) > RESIDUAL_LIMIT)
        throw new Error('stems do not add back up to the input')
    }
    catch (cause) {
      // A GPU that fails — at the first window or the thirtieth, from a bad
      // driver or a lost device — falls back and redoes only this window.
      // The windows already accumulated are correct and are kept.
      if (chain.backend !== 'webgpu')
        throw cause
      post({ type: 'fallback', reason: String(cause) })
      await releaseChain()
      chain = await createChain('wasm')
      output = await runWindow(chain, input.slice())
    }

    accumulateSegment(targets, output, order, segment, segmentWeights(i, plan.length, segment.length, overlap), size)
    post({ type: 'progress', done: i + 1, total: plan.length, backend: chain.backend })
  }

  post(
    { type: 'done', stems: targets, backend: chain.backend },
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
