import { formatBytes } from '../../../../shared/core/bytes'
import { createZip } from '../../../../shared/core/zip'
import { buildIco, htmlSnippet, ICO_SIZES, ICON_SIZES, manifestJson } from '../../core'

export interface RenderedIcon {
  size: number
  file: string
  purpose: string
  url: string
  bytes: Uint8Array
}

/**
 * Decode any image the browser can render, including SVG.
 *
 * An SVG with a viewBox but no intrinsic width reports zero, so the natural
 * size is read first and a sensible square assumed when it is missing —
 * otherwise the icon renders as nothing at all.
 */
function decode(url: string): Promise<{ image: CanvasImageSource, width: number, height: number }> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.decoding = 'sync'
    image.onload = () => {
      const width = image.naturalWidth || 512
      const height = image.naturalHeight || 512
      // A sizeless SVG needs explicit dimensions before it will rasterise.
      image.width = width
      image.height = height
      resolve({ image, width, height })
    }
    image.onerror = () => reject(new Error('That image could not be decoded.'))
    image.src = url
  })
}

export function useFaviconGenerator() {
  const sourceName = ref('')
  const sourceUrl = ref('')
  const icons = ref<RenderedIcon[]>([])
  const working = ref(false)
  const error = ref('')
  const siteName = ref('My site')
  const background = ref('#ffffff')
  const useBackground = ref(false)
  const padding = ref(0)

  /**
   * The decoded source, plus its size.
   *
   * Not an ImageBitmap: `createImageBitmap` cannot decode SVG in Chrome, and
   * a logo is exactly the thing people have as an SVG. An <img> element
   * handles every format the browser can render, including SVG, and is a
   * perfectly good `drawImage` source.
   */
  let source: { image: CanvasImageSource, width: number, height: number } | null = null

  const ready = computed(() => icons.value.length > 0)
  const snippet = computed(() => htmlSnippet())

  function release() {
    icons.value.forEach(icon => URL.revokeObjectURL(icon.url))
    icons.value = []
  }

  /**
   * Draw the source into a square of `size`, letterboxed rather than stretched.
   *
   * A favicon is always square and a source image usually is not. Squashing a
   * wide logo into 32×32 makes it unreadable at exactly the size where
   * legibility is the only thing that matters, so it is fitted and centred.
   */
  function renderSize(size: number): HTMLCanvasElement {
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')!

    if (useBackground.value) {
      ctx.fillStyle = background.value
      ctx.fillRect(0, 0, size, size)
    }

    const inset = Math.round((size * padding.value) / 100)
    const box = Math.max(1, size - inset * 2)
    const scale = Math.min(box / source!.width, box / source!.height)
    const width = Math.max(1, Math.round(source!.width * scale))
    const height = Math.max(1, Math.round(source!.height * scale))

    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(
      source!.image,
      Math.round((size - width) / 2),
      Math.round((size - height) / 2),
      width,
      height,
    )
    return canvas
  }

  function toPng(canvas: HTMLCanvasElement): Promise<Blob> {
    return new Promise((resolve, reject) => {
      canvas.toBlob(b => (b ? resolve(b) : reject(new Error('Could not encode a PNG'))), 'image/png')
    })
  }

  async function render() {
    if (!source)
      return
    working.value = true
    try {
      release()
      const made: RenderedIcon[] = []
      for (const spec of ICON_SIZES) {
        const blob = await toPng(renderSize(spec.size))
        const bytes = new Uint8Array(await blob.arrayBuffer())
        made.push({ ...spec, url: URL.createObjectURL(blob), bytes })
      }
      icons.value = made
    }
    catch (cause) {
      error.value = cause instanceof Error ? cause.message : 'Could not render the icons.'
    }
    finally {
      working.value = false
    }
  }

  async function load(file: File | null | undefined) {
    if (!file)
      return
    try {
      error.value = ''
      sourceName.value = file.name
      if (sourceUrl.value)
        URL.revokeObjectURL(sourceUrl.value)
      sourceUrl.value = URL.createObjectURL(file)
      source = await decode(sourceUrl.value)
      await render()
    }
    catch {
      error.value = 'That image could not be read. Try a PNG, JPEG or SVG.'
    }
  }

  /** The ICO carries the small sizes; the rest ship as separate PNGs. */
  function icoBytes(): Uint8Array {
    const packed = ICO_SIZES
      .map(size => icons.value.find(i => i.size === size))
      .filter((i): i is RenderedIcon => !!i)
      .map(i => ({ size: i.size, png: i.bytes }))
    return buildIco(packed)
  }

  function downloadPack() {
    if (!ready.value)
      return
    const entries = [
      { name: 'favicon.ico', data: icoBytes() },
      ...icons.value.map(icon => ({ name: icon.file, data: icon.bytes })),
      { name: 'site.webmanifest', data: new TextEncoder().encode(manifestJson({ name: siteName.value })) },
      { name: 'head.html', data: new TextEncoder().encode(`${htmlSnippet()}\n`) },
    ]
    const zip = createZip(entries, new Date())
    const url = URL.createObjectURL(new Blob([zip as unknown as BlobPart], { type: 'application/zip' }))
    const link = document.createElement('a')
    link.href = url
    link.download = 'favicons.zip'
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 10_000)
  }

  function icoUrl(): string {
    return URL.createObjectURL(new Blob([icoBytes() as unknown as BlobPart], { type: 'image/x-icon' }))
  }

  watch([useBackground, background, padding], () => {
    if (source)
      void render()
  })

  onScopeDispose(() => {
    release()
    if (sourceUrl.value)
      URL.revokeObjectURL(sourceUrl.value)
  })

  return {
    sourceName,
    sourceUrl,
    icons,
    working,
    error,
    siteName,
    background,
    useBackground,
    padding,
    ready,
    snippet,
    load,
    downloadPack,
    icoUrl,
    formatBytes,
  }
}
