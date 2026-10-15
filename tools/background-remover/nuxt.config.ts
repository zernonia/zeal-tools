import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'

const ortDist = dirname(createRequire(import.meta.url).resolve('onnxruntime-web'))

// background-remover slice — self-contained Nuxt layer.
export default defineNuxtConfig({
  vite: {
    resolve: {
      // The "extern wasm" build: same runtime, but it loads its 13 MB binary
      // from `wasmPaths` on first use instead of making the bundler emit it
      // into every deploy. See shared/core/onnx.ts.
      alias: [{ find: /^onnxruntime-web\/wasm$/, replacement: join(ortDist, 'ort.wasm.min.mjs') }],
    },
  },
})
