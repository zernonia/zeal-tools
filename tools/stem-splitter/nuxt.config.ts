import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'

const ortDist = dirname(createRequire(import.meta.url).resolve('onnxruntime-web'))

// stem-splitter slice — self-contained Nuxt layer.
export default defineNuxtConfig({
  vite: {
    resolve: {
      // The "extern wasm" WebGPU build: same runtime, but it loads its 24 MB
      // binary from `wasmPaths` on first use instead of making the bundler
      // emit it into every deploy. See shared/core/onnx.ts.
      alias: [{ find: /^onnxruntime-web\/webgpu$/, replacement: join(ortDist, 'ort.webgpu.min.mjs') }],
    },
    // The separation worker lazily imports onnxruntime-web, which in turn
    // imports its own wasm glue. Classic (iife) workers cannot code-split,
    // so the build refuses them; module workers can.
    worker: { format: 'es' },
  },
})
