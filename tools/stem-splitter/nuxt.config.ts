// stem-splitter slice — self-contained Nuxt layer.
export default defineNuxtConfig({
  vite: {
    // The separation worker lazily imports onnxruntime-web, which in turn
    // imports its own wasm glue. Classic (iife) workers cannot code-split,
    // so the build refuses them; module workers can.
    worker: { format: 'es' },
  },
})
