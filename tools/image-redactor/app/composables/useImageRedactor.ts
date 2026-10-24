import type { Mask, OutputType, Point, RedactMode, Rgba, Stroke } from '../../core'
import {
  applyEffect,
  composite,
  createMask,
  effectSize,
  isMaskEmpty,
  outputFilename,
  outputType,
  rasterizeStrokes,
  stampDisc,
  strokeSegment,
  wholeImageStroke,
} from '../../core'

const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/bmp', 'image/avif']

export function useImageRedactor() {
  const name = ref('')
  const loaded = ref(false)
  const loading = ref(false)
  const error = ref('')
  const width = ref(0)
  const height = ref(0)
  const mode = ref<RedactMode>('pixelate')
  const strength = ref(6)
  const erasing = ref(false)
  /** Diameter on screen, in CSS pixels — the ring is drawn at this size. */
  const brushSize = ref(48)
  const strokes = shallowRef<Stroke[]>([])
  const undone = shallowRef<Stroke[]>([])
  const painted = ref(false)
  const type = ref<OutputType>('image/png')

  let canvas: HTMLCanvasElement | null = null
  let original: Rgba | null = null
  let effect: Rgba | null = null
  let mask: Mask | null = null
  let view: ImageData | null = null
  let current: Stroke | null = null
  let pending: ReturnType<typeof setTimeout> | undefined

  const canUndo = computed(() => strokes.value.length > 0)
  const canRedo = computed(() => undone.value.length > 0)
  const filename = computed(() => outputFilename(name.value, type.value))

  function context() {
    return canvas?.getContext('2d') ?? null
  }

  function render(rect?: { x: number, y: number, width: number, height: number }) {
    const ctx = context()
    if (!ctx || !original || !effect || !mask || !view)
      return
    composite(original, effect, mask, view.data, rect)
    if (rect)
      ctx.putImageData(view, 0, 0, rect.x, rect.y, rect.width, rect.height)
    else
      ctx.putImageData(view, 0, 0)
  }

  function rebuildEffect() {
    if (!original)
      return
    effect = applyEffect(original, mode.value, effectSize(original.width, original.height, strength.value))
    render()
  }

  function rebuildMask() {
    if (!original)
      return
    mask = rasterizeStrokes(strokes.value, original.width, original.height)
    painted.value = !isMaskEmpty(mask)
    render()
  }

  /** The component hands over its canvas; drawing waits for both. */
  function attach(element: HTMLCanvasElement | null) {
    canvas = element
    if (canvas && original) {
      canvas.width = original.width
      canvas.height = original.height
      render()
    }
  }

  async function load(file: File | null | undefined) {
    if (!file)
      return
    if (!ACCEPTED.includes(file.type)) {
      error.value = 'That file is not an image this browser can open. Try a JPEG, PNG or WebP.'
      return
    }
    error.value = ''
    loading.value = true
    try {
      // `from-image` applies the EXIF rotation, so a phone photo is upright
      // here and in the download, where the orientation tag no longer exists.
      const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
      const scratch = document.createElement('canvas')
      scratch.width = bitmap.width
      scratch.height = bitmap.height
      const ctx = scratch.getContext('2d')!
      ctx.drawImage(bitmap, 0, 0)
      bitmap.close()
      const pixels = ctx.getImageData(0, 0, scratch.width, scratch.height)

      original = { data: pixels.data, width: pixels.width, height: pixels.height }
      view = new ImageData(new Uint8ClampedArray(pixels.data), pixels.width, pixels.height)
      mask = createMask(pixels.width, pixels.height)
      strokes.value = []
      undone.value = []
      painted.value = false
      name.value = file.name
      type.value = outputType(file.type)
      width.value = pixels.width
      height.value = pixels.height
      effect = applyEffect(original, mode.value, effectSize(pixels.width, pixels.height, strength.value))
      loaded.value = true
      attach(canvas)
    }
    catch {
      error.value = 'That image could not be read. It may be damaged, or a format this browser cannot decode.'
    }
    finally {
      loading.value = false
    }
  }

  function reset() {
    loaded.value = false
    original = effect = mask = view = null
    strokes.value = []
    undone.value = []
    painted.value = false
    name.value = ''
  }

  function strokeStart(point: Point, radius: number) {
    if (!original || !mask)
      return
    current = { erase: erasing.value, radius, points: [point] }
    const rect = stampDisc(mask, original.width, original.height, point.x, point.y, radius, current.erase)
    if (rect)
      render(rect)
  }

  function strokeMove(point: Point) {
    if (!current || !original || !mask)
      return
    const last = current.points.at(-1)!
    current.points.push(point)
    const rect = strokeSegment(mask, original.width, original.height, last, point, current.radius, current.erase)
    if (rect)
      render(rect)
  }

  function strokeEnd() {
    if (!current)
      return
    strokes.value = [...strokes.value, current]
    undone.value = []
    current = null
    painted.value = !!mask && !isMaskEmpty(mask)
  }

  function coverAll() {
    if (!original)
      return
    strokes.value = [...strokes.value, wholeImageStroke(original.width, original.height)]
    undone.value = []
    rebuildMask()
  }

  function undo() {
    const last = strokes.value.at(-1)
    if (!last)
      return
    strokes.value = strokes.value.slice(0, -1)
    undone.value = [...undone.value, last]
    rebuildMask()
  }

  function redo() {
    const next = undone.value.at(-1)
    if (!next)
      return
    undone.value = undone.value.slice(0, -1)
    strokes.value = [...strokes.value, next]
    rebuildMask()
  }

  function clear() {
    if (!strokes.value.length)
      return
    strokes.value = []
    undone.value = []
    rebuildMask()
  }

  /**
   * The download is the canvas itself, at the picture's full resolution — what
   * you see is exactly what is saved. Re-encoding through a canvas also writes
   * no EXIF, so a photo's location does not ride along in the redacted copy.
   */
  function toBlob(as: OutputType = type.value): Promise<Blob | null> {
    return new Promise((resolve) => {
      if (!canvas)
        return resolve(null)
      canvas.toBlob(resolve, as, 0.92)
    })
  }

  /**
   * The effect is computed for the whole picture, which on a large photo is
   * a few hundred milliseconds of work — debounced so dragging the strength
   * slider does not queue one per pixel of travel.
   */
  watch(mode, rebuildEffect)
  watch(strength, () => {
    clearTimeout(pending)
    pending = setTimeout(rebuildEffect, 120)
  })

  onScopeDispose(() => clearTimeout(pending))

  return {
    name,
    loaded,
    loading,
    error,
    width,
    height,
    mode,
    strength,
    erasing,
    brushSize,
    painted,
    canUndo,
    canRedo,
    filename,
    attach,
    load,
    reset,
    strokeStart,
    strokeMove,
    strokeEnd,
    coverAll,
    undo,
    redo,
    clear,
    toBlob,
  }
}
