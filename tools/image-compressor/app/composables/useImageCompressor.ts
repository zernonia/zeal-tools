import type { OutputFormat, Resize } from '../../core'
import { formatBytes } from '../../../../shared/core/bytes'
import { createZip } from '../../../../shared/core/zip'
import { fitDimensions, isDecodable, isLossy, outputFilename, savingsFraction } from '../../core'

export interface Job {
  id: number
  file: File
  name: string
  originalSize: number
  status: 'waiting' | 'working' | 'done' | 'failed'
  error?: string
  result?: {
    blob: Blob
    url: string
    size: number
    width: number
    height: number
  }
}

/**
 * Halving repeatedly, rather than one big jump.
 *
 * Drawing a 4000px photo straight into a 400px canvas makes the browser
 * sample roughly one pixel in ten and throw the rest away, which turns fine
 * detail into aliased noise. Stepping down by halves lets each pass average
 * the pixels it is discarding, which is what makes a downscale look like the
 * original rather than a bad screenshot of it.
 */
function drawScaled(bitmap: ImageBitmap, width: number, height: number): HTMLCanvasElement {
  let source: CanvasImageSource = bitmap
  let currentWidth = bitmap.width
  let currentHeight = bitmap.height

  while (currentWidth > width * 2 && currentHeight > height * 2) {
    const halfWidth = Math.max(width, Math.floor(currentWidth / 2))
    const halfHeight = Math.max(height, Math.floor(currentHeight / 2))
    const step = document.createElement('canvas')
    step.width = halfWidth
    step.height = halfHeight
    const stepCtx = step.getContext('2d')!
    stepCtx.imageSmoothingEnabled = true
    stepCtx.imageSmoothingQuality = 'high'
    stepCtx.drawImage(source, 0, 0, halfWidth, halfHeight)
    source = step
    currentWidth = halfWidth
    currentHeight = halfHeight
  }

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(source, 0, 0, width, height)
  return canvas
}

export function useImageCompressor(options: { defaultFormat?: OutputFormat } = {}) {
  const jobs = ref<Job[]>([])
  // Set as the initial value rather than assigned afterwards, so a variant
  // page starts in its format instead of visibly switching after mount.
  const format = ref<OutputFormat>(options.defaultFormat ?? 'image/webp')
  const quality = ref(80)
  const resizeMode = ref<Resize['mode']>('none')
  const resizeValue = ref(1920)
  const working = ref(false)

  let nextId = 1
  let run = 0

  const resize = computed<Resize>(() => ({ mode: resizeMode.value, value: resizeValue.value }))
  const qualityApplies = computed(() => isLossy(format.value))

  const done = computed(() => jobs.value.filter(j => j.status === 'done' && j.result))
  const originalTotal = computed(() => jobs.value.reduce((n, j) => n + j.originalSize, 0))
  const outputTotal = computed(() => done.value.reduce((n, j) => n + (j.result?.size ?? 0), 0))
  const savedFraction = computed(() => savingsFraction(originalTotal.value, outputTotal.value))
  const savedLabel = computed(() => `${Math.round(Math.abs(savedFraction.value) * 100)}%`)
  const originalLabel = computed(() => formatBytes(originalTotal.value))
  const outputLabel = computed(() => formatBytes(outputTotal.value))

  function add(files: FileList | File[] | null) {
    if (!files)
      return
    for (const file of Array.from(files)) {
      if (!isDecodable(file.type))
        continue
      jobs.value.push({
        id: nextId++,
        file,
        name: file.name,
        originalSize: file.size,
        status: 'waiting',
      })
    }
    void process()
  }

  function releaseResult(job: Job) {
    if (job.result)
      URL.revokeObjectURL(job.result.url)
    job.result = undefined
  }

  function remove(id: number) {
    const job = jobs.value.find(j => j.id === id)
    if (job)
      releaseResult(job)
    jobs.value = jobs.value.filter(j => j.id !== id)
  }

  function clear() {
    jobs.value.forEach(releaseResult)
    jobs.value = []
  }

  async function encode(job: Job, token: number) {
    const bitmap = await createImageBitmap(job.file, { imageOrientation: 'from-image' })
    try {
      const target = fitDimensions(bitmap.width, bitmap.height, resize.value)
      const canvas = drawScaled(bitmap, target.width, target.height)
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, format.value, quality.value / 100)
      })
      if (!blob)
        throw new Error('This browser could not write that format.')
      if (token !== run)
        return

      releaseResult(job)
      job.result = {
        blob,
        url: URL.createObjectURL(blob),
        size: blob.size,
        width: target.width,
        height: target.height,
      }
      job.status = 'done'
    }
    finally {
      bitmap.close()
    }
  }

  /**
   * Re-encode everything for the current settings.
   *
   * `run` is the guard: changing a setting mid-batch starts a new pass, and
   * results from the abandoned one must not overwrite the new ones — the
   * slowest file from the old settings would otherwise land last and win.
   */
  async function process() {
    const token = ++run
    working.value = true
    try {
      for (const job of jobs.value) {
        if (token !== run)
          return
        job.status = 'working'
        job.error = undefined
        try {
          await encode(job, token)
        }
        catch (cause) {
          if (token !== run)
            return
          job.status = 'failed'
          job.error = cause instanceof Error ? cause.message : 'That image could not be read.'
        }
      }
    }
    finally {
      if (token === run)
        working.value = false
    }
  }

  function nameFor(job: Job) {
    return outputFilename(job.name, format.value)
  }

  async function downloadAll() {
    const finished = done.value
    if (finished.length === 0)
      return

    const seen = new Map<string, number>()
    const entries = await Promise.all(finished.map(async (job) => {
      // Two files called photo.png would otherwise collide in the archive.
      let name = nameFor(job)
      const count = seen.get(name) ?? 0
      seen.set(name, count + 1)
      if (count > 0) {
        const dot = name.lastIndexOf('.')
        name = `${name.slice(0, dot)}-${count + 1}${name.slice(dot)}`
      }
      return { name, data: new Uint8Array(await job.result!.blob.arrayBuffer()) }
    }))

    const zip = createZip(entries, new Date())
    const url = URL.createObjectURL(new Blob([zip as unknown as BlobPart], { type: 'application/zip' }))
    const link = document.createElement('a')
    link.href = url
    link.download = 'compressed-images.zip'
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 10_000)
  }

  // Any setting change re-encodes from the originals, which are kept for
  // exactly this reason — quality is never applied on top of quality.
  watch([format, quality, resizeMode, resizeValue], () => {
    if (jobs.value.length)
      void process()
  })

  onScopeDispose(clear)

  return {
    jobs,
    format,
    quality,
    resizeMode,
    resizeValue,
    working,
    qualityApplies,
    done,
    savedFraction,
    savedLabel,
    originalLabel,
    outputLabel,
    add,
    remove,
    clear,
    nameFor,
    downloadAll,
    formatBytes,
  }
}
