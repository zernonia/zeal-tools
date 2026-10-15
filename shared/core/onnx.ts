/**
 * Where ONNX Runtime's wasm comes from: jsDelivr, at exactly the version the
 * running JavaScript reports, never from our own assets.
 *
 * The wasm is the heavy half of the runtime — 13 MB for the plain build,
 * 24 MB for the WebGPU one — and it is only ever needed by someone who drops
 * a file into an AI tool. Bundling it put both into every deploy, the larger
 * a hair under Cloudflare's 25 MiB per-asset ceiling. Each slice therefore
 * aliases its ORT import to the "extern wasm" build, which ships no binary
 * and loads one from this path on first use.
 *
 * Version-locked by construction: `version` is `ort.env.versions.web`, read
 * from the runtime itself, so the glue and the binary cannot drift apart the
 * way the old vendoring copy step once did.
 */
export function onnxWasmPaths(version: string): string {
  return `https://cdn.jsdelivr.net/npm/onnxruntime-web@${version}/dist/`
}
