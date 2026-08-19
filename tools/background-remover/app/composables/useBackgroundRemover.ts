import type { InferenceSession } from 'onnxruntime-web'
import type { BrushMode, Matte, ModelSpec, PaintLayer, Rgb, Rgba, SamTransform, Stroke } from '../../core'
import {
  adjustMatte,
  applyMatte,
  applyPaint,
  bestMaskIndex,
  compositeOver,
  contentBounds,
  coverage,
  createPaint,
  cropRgba,
  featherMatte,
  isPaintEmpty,
  mergeSelection,
  MODEL,
  rasterizeStrokes,
  resizeMatte,
  resizePaint,
  resizeRgba,
  SAM_MASK,
  SAM_MODEL,
  samMask,
  samPoint,
  samTensor,
  samTransform,
  stampBrush,
  strokeSegment,
  toMatte,
  toTensor,
} from '../../core'

/** Bump when a model URL changes, so old copies are not served forever. */
const MODEL_CACHE = 'zeal-background-model-v1'

/**
 * Full-resolution ceiling. Beyond this the matte costs more memory than the
 * extra detail is worth, and phone panoramas would otherwise allocate
 * hundreds of megabytes.
 */
const MAX_SOURCE = 4096

/**
 * Edits are previewed at this size. The model runs once at 320×320 and the
 * matte is kept at full resolution, so sliders can stay live without ever
 * re-running inference — they only recompute the preview.
 */
const MAX_PREVIEW = 1400

/**
 * One correction, from either tool. Both are stored as instructions rather
 * than as pixels — a stroke is its points, a selection is the single 256×256
 * logit plane SAM chose — so the whole history costs a few hundred KB however
 * large the picture is, and every state can be rebuilt exactly.
 */
export type Edit
  = | { kind: 'stroke', stroke: Stroke }
    | { kind: 'selection', logits: Float32Array, mode: 'add' | 'remove' }

export type Status = 'idle' | 'decoding' | 'downloading' | 'starting' | 'removing' | 'ready' | 'error'

export interface BackgroundOption {
  id: string
  label: string
  color: Rgb | null
}

export const BACKGROUNDS: BackgroundOption[] = [
  { id: 'transparent', label: 'Transparent', color: null },
  { id: 'white', label: 'White', color: { r: 255, g: 255, b: 255 } },
  { id: 'black', label: 'Black', color: { r: 10, g: 10, b: 10 } },
]

export function useBackgroundRemover() {
  const status = ref<Status>('idle')
  const error = ref('')
  /** 0–1 while the model downloads; null when there is nothing to report. */
  const downloadProgress = ref<number | null>(null)
  const fileName = ref('')

  // Settings — every one of these is a pure recompute, never a re-run.
  const softness = ref(2)
  const strength = ref(50)
  const backgroundId = ref('transparent')
  const trim = ref(false)
  const customColor = ref('#ffffff')
  const useCustomColor = ref(false)

  /**
   * Retouching. Strokes are the record; `paint` is derived from them, which is
   * what makes undo exact rather than an approximation. Both live at preview
   * resolution and are resampled up only when exporting.
   */
  /**
   * Every correction, newest last, whichever tool made it.
   *
   * One log rather than one per tool, so undo always steps back through what
   * the person actually did. Note this governs undo *order* only: a hand
   * stroke still composites after the magic selections, because paint is
   * applied last in the pipeline so a hand correction stays decisive.
   */
  const edits = ref<Edit[]>([])
  const redoStack = ref<Edit[]>([])
  const paint = shallowRef<PaintLayer>(createPaint(1, 1))
  let paintWidth = 1
  let paintHeight = 1
  const brushMode = ref<BrushMode>('restore')
  const brushSize = ref(28)
  const brushStrength = ref(0.85)
  const canUndo = computed(() => edits.value.length > 0)
  const canRedo = computed(() => redoStack.value.length > 0)

  /**
   * Magic selections. Each entry is the single chosen 256×256 logit plane plus
   * whether it added or removed — a few hundred KB, not a full-resolution
   * matte. Undo replays the chain from the model's own matte, so history costs
   * almost nothing however large the picture is.
   */
  const magicStatus = ref<'off' | 'loading' | 'encoding' | 'ready' | 'thinking'>('off')
  /** 0–1 while the magic models download; null when there is nothing to report. */
  const magicProgress = ref<number | null>(null)
  const magicError = ref('')

  let samSessions: Promise<{ encoder: InferenceSession, decoder: InferenceSession }> | null = null
  /**
   * The encoder's output, kept as plain arrays rather than as ORT tensors.
   *
   * In worker mode ORT *transfers* input tensors instead of copying them, so
   * passing the same tensor into a second run posts an already-detached
   * ArrayBuffer and throws. The embeddings are computed once and reused for
   * every click, so they must be held as data we own and handed to each run as
   * a fresh copy.
   */
  let embeddings: {
    image: Float32Array
    positional: Float32Array
    dims: readonly number[]
    transform: SamTransform
  } | null = null

  const sourceFull = shallowRef<Rgba | null>(null)
  const sourcePreview = shallowRef<Rgba | null>(null)
  const matteFull = shallowRef<Matte | null>(null)
  const mattePreview = shallowRef<Matte | null>(null)

  /**
   * Raw pixels, not data URLs. The component paints these straight onto a
   * canvas — encoding a PNG and making the browser decode it again on every
   * slider tick was the single biggest reason edits felt sluggish.
   */
  const previewImage = shallowRef<Rgba | null>(null)
  const originalImage = shallowRef<Rgba | null>(null)
  const subjectCoverage = ref(0)

  const hasResult = computed(() => status.value === 'ready' && !!matteFull.value)

  const background = computed<Rgb | null>(() => {
    if (useCustomColor.value)
      return hexToRgb(customColor.value)
    return BACKGROUNDS.find(b => b.id === backgroundId.value)?.color ?? null
  })

  /**
   * The model is only worth loading once per browser, so it is kept in the
   * Cache API rather than memory — a second visit skips the 4 MiB entirely.
   * Read through a streamed response so the UI can show real progress instead
   * of an indeterminate spinner on a slow connection.
   */
  async function downloadWeights(url: string, onProgress: (fraction: number) => void): Promise<ArrayBuffer> {
    const cache = await caches.open(MODEL_CACHE).catch(() => null)
    const hit = await cache?.match(url)
    if (hit)
      return hit.arrayBuffer()

    const response = await fetch(url)
    if (!response.ok)
      throw new Error(`The model could not be downloaded (${response.status}).`)

    // Clone before draining: the body can only be read once, and the cache
    // needs its own copy.
    void cache?.put(url, response.clone()).catch(() => {})

    const total = Number(response.headers.get('content-length')) || 0
    if (!response.body || !total)
      return response.arrayBuffer()

    const reader = response.body.getReader()
    const chunks: Uint8Array[] = []
    let received = 0
    onProgress(0)

    for (;;) {
      const { done, value } = await reader.read()
      if (done)
        break
      chunks.push(value)
      received += value.length
      onProgress(Math.min(1, received / total))
    }

    const buffer = new Uint8Array(received)
    let offset = 0
    for (const chunk of chunks) {
      buffer.set(chunk, offset)
      offset += chunk.length
    }
    return buffer.buffer
  }

  const sessions = new Map<string, Promise<InferenceSession>>()

  function getSession(spec: ModelSpec) {
    // Cached as the promise, not the result, so two quick drops share one
    // download instead of racing two downloads of the same weights. Keyed by
    // model so switching back to one already loaded is instant.
    const existing = sessions.get(spec.id)
    if (existing)
      return existing

    const created = (async () => {
      const ort = await import('onnxruntime-web/wasm')
      // wasmPaths is left at its default, which resolves the runtime from
      // jsDelivr at the exact version we depend on. Nothing is vendored.
      //
      // No COOP/COEP on this site, so SharedArrayBuffer is unavailable and
      // threading would silently fail. Say so explicitly instead.
      ort.env.wasm.numThreads = 1
      // Run the session in a worker. WASM is fast but not asynchronous — it
      // executes on whichever thread calls it, so on the main thread a long
      // inference freezes the page outright (measured: a 5.5s stall). This
      // moves it off, which is what lets a progress state actually animate.
      ort.env.wasm.proxy = true
      // BiRefNet makes ORT emit a couple of dozen constant-folding warnings
      // it writes to console.error. They are harmless graph-optimisation
      // notes, but a wall of red on first use looks like a broken tool, so
      // both the global and per-session levels are turned down to fatal.
      ort.env.logLevel = 'fatal'

      status.value = 'downloading'
      const weights = await downloadWeights(spec.url, f => downloadProgress.value = f)
      downloadProgress.value = null

      status.value = 'starting'
      return ort.InferenceSession.create(weights, { executionProviders: ['wasm'], logSeverityLevel: 4 })
    })().catch((cause) => {
      // A failed load must not poison every later attempt.
      sessions.delete(spec.id)
      throw cause
    })

    sessions.set(spec.id, created)
    return created
  }

  /** File → RGBA, honouring EXIF rotation so phone photos are upright. */
  async function decode(file: File): Promise<Rgba> {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
    const scale = Math.min(1, MAX_SOURCE / Math.max(bitmap.width, bitmap.height))
    const width = Math.max(1, Math.round(bitmap.width * scale))
    const height = Math.max(1, Math.round(bitmap.height * scale))

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx)
      throw new Error('This browser would not give us a canvas to work on.')
    ctx.drawImage(bitmap, 0, 0, width, height)
    bitmap.close()

    const { data } = ctx.getImageData(0, 0, width, height)
    return { data, width, height }
  }

  /**
   * Run the model over an image and return its matte at model resolution.
   */
  async function infer(image: Rgba, spec: ModelSpec): Promise<Matte> {
    const session = await getSession(spec)

    status.value = 'removing'
    // Yield a frame so the status actually paints before inference blocks.
    await new Promise(resolve => requestAnimationFrame(resolve))

    const ort = await import('onnxruntime-web/wasm')
    const input = new ort.Tensor('float32', toTensor(image, spec), [1, 3, spec.size, spec.size])
    const output = await session.run({ [session.inputNames[0]!]: input })
    return toMatte(output[session.outputNames[0]!]!.data as Float32Array, spec)
  }

  /**
   * The background model's own matte, kept untouched. Magic selections are
   * replayed onto this rather than onto each other, so undo is exact and
   * switching quality re-applies the same selections to the new matte.
   */
  let baseMatte: Matte | null = null

  /** Store a fresh matte at both working resolutions. */
  function adoptMatte(small: Matte, full: Rgba, preview: Rgba) {
    baseMatte = resizeMatte(small, full.width, full.height)
    matteFull.value = baseMatte
    mattePreview.value = preview === full
      ? baseMatte
      : resizeMatte(small, preview.width, preview.height)
    subjectCoverage.value = coverage(small)
  }

  async function process(file: File) {
    error.value = ''
    fileName.value = file.name

    try {
      status.value = 'decoding'
      const full = await decode(file)
      sourceFull.value = full

      const scale = Math.min(1, MAX_PREVIEW / Math.max(full.width, full.height))
      const preview = scale < 1
        ? resizeRgba(full, Math.round(full.width * scale), Math.round(full.height * scale))
        : full
      sourcePreview.value = preview
      originalImage.value = preview

      // A new picture invalidates any retouching; swapping the model on the
      // same picture must not throw the person's brushwork away.
      // A new picture invalidates the embeddings and every correction.
      embeddings = null
      magicStatus.value = 'off'
      edits.value = []
      redoStack.value = []
      paintWidth = preview.width
      paintHeight = preview.height
      paint.value = createPaint(paintWidth, paintHeight)

      adoptMatte(await infer(full, MODEL), full, preview)

      status.value = 'ready'
      render()
    }
    catch (cause) {
      status.value = 'error'
      error.value = cause instanceof Error ? cause.message : 'Something went wrong removing the background.'
    }
  }

  /**
   * Thresholding and feathering, which depend only on the sliders. Cached
   * because a brush stroke must not re-run a three-pass blur on every pointer
   * move — at preview size that is the difference between drawing and
   * stuttering.
   */
  function shape(image: Rgba, matte: Matte): Matte {
    const centre = 40 + (strength.value / 100) * 140
    const band = 90 - (strength.value / 100) * 70
    let shaped = adjustMatte(matte, centre - band / 2, centre + band / 2)

    if (softness.value > 0) {
      // Scale the feather with the image so a slider notch means the same
      // thing on a thumbnail and on a 4000px photo.
      const radius = Math.max(1, Math.round((softness.value / 100) * Math.max(image.width, image.height) * 0.01))
      shaped = featherMatte(shaped, radius)
    }

    return shaped
  }

  let shapedPreview: Matte | null = null

  /** Everything after shaping: manual strokes, alpha, background, trim. */
  function finish(image: Rgba, shaped: Matte, layer: PaintLayer): Rgba {
    // Paint is applied after the edge settings so a stroke is decisive — once
    // something is painted back, no slider should quietly remove it again.
    const merged = isPaintEmpty(layer) ? shaped : applyPaint(shaped, layer)

    let out = applyMatte(image, merged)
    if (background.value)
      out = compositeOver(out, background.value)

    if (trim.value) {
      const bounds = contentBounds(merged)
      if (bounds)
        out = cropRgba(out, bounds)
    }

    return out
  }

  /**
   * Renders are coalesced to one per frame. A slider drag fires far more
   * updates than the screen can show, and without this each one paid for a
   * full shape-and-composite pass that was thrown away microseconds later.
   */
  let frame = 0
  let pendingShape = false

  function schedule(reshape: boolean) {
    pendingShape ||= reshape
    if (frame)
      return
    frame = requestAnimationFrame(() => {
      frame = 0
      const reshaping = pendingShape
      pendingShape = false
      draw(reshaping)
    })
  }

  function draw(reshape: boolean) {
    const image = sourcePreview.value
    const matte = mattePreview.value
    if (!image || !matte)
      return
    if (reshape || !shapedPreview)
      shapedPreview = shape(image, matte)
    previewImage.value = finish(image, shapedPreview, paint.value)
  }

  /** Re-shape and redraw. Used when a slider moves, not while drawing. */
  function render() {
    schedule(true)
  }

  /** Redraw from the cached shape. This is the one that runs mid-stroke. */
  function repaint() {
    schedule(false)
  }

  /** Re-render on any edit setting; inference never runs again for these. */
  watch([softness, strength, backgroundId, trim, customColor, useCustomColor], () => {
    if (hasResult.value)
      render()
  })

  /** Full-resolution export, composed only when actually asked for. */
  async function toBlob(): Promise<Blob | null> {
    const image = sourceFull.value
    const matte = matteFull.value
    if (!image || !matte)
      return null

    // Strokes were drawn at preview scale; carry them up to the real pixels.
    const layer = resizePaint(
      paint.value,
      sourcePreview.value?.width ?? image.width,
      sourcePreview.value?.height ?? image.height,
      image.width,
      image.height,
    )
    const out = finish(image, shape(image, matte), layer)
    const canvas = document.createElement('canvas')
    canvas.width = out.width
    canvas.height = out.height
    canvas.getContext('2d')!.putImageData(new ImageData(out.data, out.width, out.height), 0, 0)

    return new Promise(resolve => canvas.toBlob(resolve, 'image/png'))
  }

  /**
   * Drawing. Points arrive in preview-pixel coordinates; the component owns
   * converting from client space, since only it knows the rendered box.
   */
  let active: Stroke | null = null

  function beginStroke(x: number, y: number) {
    active = {
      mode: brushMode.value,
      radius: brushSize.value / 2,
      strength: brushStrength.value,
      points: [{ x, y }],
    }
    stampBrush(paint.value, paintWidth, paintHeight, x, y, active.radius, active.strength, active.mode)
    repaint()
  }

  function extendStroke(x: number, y: number) {
    if (!active)
      return
    const previous = active.points[active.points.length - 1]!
    active.points.push({ x, y })
    strokeSegment(paint.value, paintWidth, paintHeight, previous, { x, y }, active.radius, active.strength, active.mode)
    repaint()
  }

  function endStroke() {
    if (!active)
      return
    pushEdit({ kind: 'stroke', stroke: active })
    active = null
  }

  /**
   * The magic brush.
   *
   * A saliency model cannot be corrected — it only ever restates its own
   * opinion, which is why re-running one discards edits. SAM answers a
   * different question, "what object is under this point?", so the click is an
   * input and the correction is respected by construction.
   *
   * Split in two on purpose: the encoder is the expensive half and runs once
   * per picture, after which each click only pays for the small decoder.
   */
  function getSam() {
    samSessions ??= (async () => {
      const ort = await import('onnxruntime-web/wasm')
      ort.env.wasm.numThreads = 1
      // Run the session in a worker. WASM is fast but not asynchronous — it
      // executes on whichever thread calls it, so on the main thread a long
      // inference freezes the page outright (measured: a 5.5s stall). This
      // moves it off, which is what lets a progress state actually animate.
      ort.env.wasm.proxy = true
      ort.env.logLevel = 'fatal'
      const options = { executionProviders: ['wasm'], logSeverityLevel: 4 } as const

      // Two files, one number: weight them by size so the bar tracks bytes
      // rather than jumping when the smaller one happens to finish first.
      const share = [8.5 / 13.2, 4.7 / 13.2]
      const done = [0, 0]
      const report = () => { magicProgress.value = done[0]! * share[0]! + done[1]! * share[1]! }

      const [encoder, decoder] = await Promise.all([
        downloadWeights(SAM_MODEL.encoder, (f) => { done[0] = f; report() })
          .then(bytes => ort.InferenceSession.create(bytes, options)),
        downloadWeights(SAM_MODEL.decoder, (f) => { done[1] = f; report() })
          .then(bytes => ort.InferenceSession.create(bytes, options)),
      ])

      magicProgress.value = null
      return { encoder, decoder }
    })().catch((cause) => {
      samSessions = null
      throw cause
    })
    return samSessions
  }

  /** Prepare the current picture so clicks can be answered quickly. */
  async function armMagic() {
    const full = sourceFull.value
    if (!full || magicStatus.value === 'thinking')
      return

    magicError.value = ''
    try {
      magicStatus.value = magicStatus.value === 'off' ? 'loading' : magicStatus.value
      const { encoder } = await getSam()

      if (!embeddings) {
        magicStatus.value = 'encoding'
        await new Promise(resolve => requestAnimationFrame(resolve))

        const ort = await import('onnxruntime-web/wasm')
        const transform = samTransform(full.width, full.height)
        const out = await encoder.run({
          pixel_values: new ort.Tensor('float32', samTensor(full, transform), [1, 3, 1024, 1024]),
        })
        const image = out.image_embeddings!
        const positional = out.image_positional_embeddings!
        embeddings = {
          // Copy now: these tensors are about to be handed to the decoder,
          // which will transfer and detach whatever buffer it is given.
          image: Float32Array.from(image.data as Float32Array),
          positional: Float32Array.from(positional.data as Float32Array),
          dims: [...image.dims],
          transform,
        }
      }

      magicStatus.value = 'ready'
    }
    catch (cause) {
      magicStatus.value = 'off'
      magicProgress.value = null
      magicError.value = cause instanceof Error ? cause.message : 'The magic brush could not start.'
    }
  }

  /**
   * Rebuild the whole result from the model's own matte plus the edit log.
   *
   * Everything is derived, never patched in place, so undo and redo land on
   * exactly the state that existed before — no drift after many edits.
   */
  function applyEdits() {
    const full = sourceFull.value
    const preview = sourcePreview.value
    if (!full || !preview || !baseMatte)
      return

    let matte = baseMatte
    for (const edit of edits.value) {
      if (edit.kind !== 'selection' || !embeddings)
        continue
      const selection = samMask(edit.logits, 0, embeddings.transform, full.width, full.height)
      matte = mergeSelection(matte, selection, edit.mode)
    }

    matteFull.value = matte
    mattePreview.value = resizeMatte(matte, preview.width, preview.height)
    subjectCoverage.value = coverage(matte)

    paint.value = rasterizeStrokes(
      edits.value.flatMap(edit => (edit.kind === 'stroke' ? [edit.stroke] : [])),
      paintWidth,
      paintHeight,
    )

    render()
  }

  /** Record an edit. Any new edit abandons the redo branch, as usual. */
  function pushEdit(edit: Edit) {
    edits.value = [...edits.value, edit]
    redoStack.value = []
  }

  function undo() {
    const last = edits.value[edits.value.length - 1]
    if (!last)
      return
    edits.value = edits.value.slice(0, -1)
    redoStack.value = [...redoStack.value, last]
    applyEdits()
  }

  function redo() {
    const next = redoStack.value[redoStack.value.length - 1]
    if (!next)
      return
    redoStack.value = redoStack.value.slice(0, -1)
    edits.value = [...edits.value, next]
    applyEdits()
  }

  function clearEdits() {
    if (!edits.value.length)
      return
    redoStack.value = [...redoStack.value, ...edits.value].slice(-40)
    edits.value = []
    applyEdits()
  }

  /** One click: select whatever object sits under it, then add or remove it. */
  async function magicPick(x: number, y: number, mode: 'add' | 'remove') {
    const full = sourceFull.value
    const preview = sourcePreview.value
    if (!full || !preview || !embeddings || magicStatus.value === 'thinking')
      return

    magicStatus.value = 'thinking'
    try {
      const ort = await import('onnxruntime-web/wasm')
      const { decoder } = await getSam()
      // The click arrives in preview pixels, but the embeddings were built
      // from the full-resolution picture — so the point has to cross into
      // full-resolution space before SAM's own transform is applied. Miss this
      // and clicks land short by exactly the preview downscale, which is
      // invisible on any picture small enough to skip that downscale.
      const toFull = full.width / preview.width
      const [px, py] = samPoint(x * toFull, y * toFull, embeddings.transform)

      const out = await decoder.run({
        input_points: new ort.Tensor('float32', Float32Array.from([px, py]), [1, 1, 1, 2]),
        input_labels: new ort.Tensor('int64', BigInt64Array.from([1n]), [1, 1, 1]),
        // A fresh copy per run — the worker takes ownership of each one.
        image_embeddings: new ort.Tensor('float32', embeddings.image.slice(), embeddings.dims as number[]),
        image_positional_embeddings: new ort.Tensor('float32', embeddings.positional.slice(), embeddings.dims as number[]),
      })

      // SAM proposes three granularities; its own scores say which was meant.
      const scores = out.iou_scores!.data as Float32Array
      const index = bestMaskIndex(scores)
      const masks = out.pred_masks!.data as Float32Array
      const plane = masks.slice(index * SAM_MASK * SAM_MASK, (index + 1) * SAM_MASK * SAM_MASK)

      pushEdit({ kind: 'selection', logits: plane, mode })
      applyEdits()
      magicStatus.value = 'ready'
    }
    catch (cause) {
      magicStatus.value = 'ready'
      magicError.value = cause instanceof Error ? cause.message : 'That click did not produce a selection.'
    }
  }

  function reset() {
    status.value = 'idle'
    error.value = ''
    fileName.value = ''
    embeddings = null
    baseMatte = null
    magicStatus.value = 'off'
    edits.value = []
    redoStack.value = []
    shapedPreview = null
    sourceFull.value = null
    sourcePreview.value = null
    matteFull.value = null
    mattePreview.value = null
    previewImage.value = null
    originalImage.value = null
  }

  onScopeDispose(() => {
    if (frame)
      cancelAnimationFrame(frame)
  })

  return {
    status,
    error,
    downloadProgress,
    fileName,
    hasResult,
    previewImage,
    originalImage,
    subjectCoverage,
    softness,
    strength,
    backgroundId,
    customColor,
    useCustomColor,
    trim,
    brushMode,
    brushSize,
    brushStrength,
    canUndo,
    magicStatus,
    magicProgress,
    magicError,
    canRedo,
    undo,
    redo,
    clearEdits,
    armMagic,
    magicPick,
    beginStroke,
    extendStroke,
    endStroke,
    process,
    toBlob,
    reset,
  }
}

function hexToRgb(hex: string): Rgb {
  const value = hex.replace('#', '')
  const full = value.length === 3 ? value.split('').map(c => c + c).join('') : value
  return {
    r: Number.parseInt(full.slice(0, 2), 16) || 0,
    g: Number.parseInt(full.slice(2, 4), 16) || 0,
    b: Number.parseInt(full.slice(4, 6), 16) || 0,
  }
}
