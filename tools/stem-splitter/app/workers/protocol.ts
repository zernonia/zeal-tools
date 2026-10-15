/** Messages between the page and the separation worker. */

export type Backend = 'webgpu' | 'wasm'

export interface SeparateRequest {
  type: 'separate'
  left: Float32Array
  right: Float32Array
}

export type WorkerMessage
  = | { type: 'downloading', progress: number }
    | { type: 'starting', backend: Backend }
    /** WebGPU was tried and failed; `reason` is for the console, not the UI. */
    | { type: 'fallback', reason: string }
    | { type: 'progress', done: number, total: number, backend: Backend }
    /** Stems in display order (`STEMS`), each transferred, not copied. */
    | { type: 'done', stems: { left: Float32Array, right: Float32Array }[], backend: Backend }
    | { type: 'error', message: string }
