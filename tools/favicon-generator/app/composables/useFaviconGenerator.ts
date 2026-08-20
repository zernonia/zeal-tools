import type { PlatformIcon } from '../../core'
import { formatBytes } from '../../../../shared/core/bytes'
import { assemblePng, pngScanlines } from '../../../../shared/core/png'
import { createZip } from '../../../../shared/core/zip'
import {
  adaptiveIconXml,
  ANDROID_ICONS,
  appleContentsJson,
  buildIco,
  htmlSnippet,
  ICO_SIZES,
  ICON_SIZES,
  IOS_ICONS,
  manifestJson,
  MASKABLE_ICON,
  SAFE_ZONE,
} from '../../core'

/**
 * zlib-wrapped deflate, which is exactly what a PNG's IDAT chunk holds.
 *
 * `CompressionStream('deflate')` is the zlib format from RFC 1950, not the
 * raw variant — so its output drops straight in. Without it our encoder falls
 * back to stored blocks, and a 1024x1024 icon would ship as three megabytes.
 */
async function deflate(raw: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([raw as unknown as BlobPart])
    .stream()
    .pipeThrough(new CompressionStream('deflate'))
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

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
  const includeIos = ref(false)
  const includeAndroid = ref(false)
  const includeMaskable = ref(false)
  const packing = ref(false)

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
  function renderSize(size: number, options: { opaque?: boolean, safeZone?: boolean } = {}): HTMLCanvasElement {
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')!

    // An opaque icon must have something behind it: iOS composites
    // transparency onto black, so white is a far better default than nothing.
    if (useBackground.value || options.opaque) {
      ctx.fillStyle = useBackground.value ? background.value : '#ffffff'
      ctx.fillRect(0, 0, size, size)
    }

    const zone = options.safeZone ? SAFE_ZONE : 1
    const inset = Math.round((size * padding.value) / 100) + Math.round((size * (1 - zone)) / 2)
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

  /**
   * Encode with no alpha channel at all.
   *
   * A canvas always writes RGBA, even when every pixel is opaque, and Apple
   * rejects an App Store icon whose PNG merely *has* the channel. Filling a
   * background is not enough; the file has to be colour type 2, so the pixels
   * are read back and re-encoded without it.
   */
  async function toOpaquePng(canvas: HTMLCanvasElement): Promise<Uint8Array> {
    const { width, height } = canvas
    const { data } = canvas.getContext('2d')!.getImageData(0, 0, width, height)
    const rgb = new Uint8Array(width * height * 3)
    for (let i = 0, j = 0; i < data.length; i += 4, j += 3) {
      rgb[j] = data[i]!
      rgb[j + 1] = data[i + 1]!
      rgb[j + 2] = data[i + 2]!
    }
    return assemblePng(width, height, await deflate(pngScanlines(width, height, rgb, 3)), 2)
  }

  async function renderPlatform(spec: PlatformIcon): Promise<{ path: string, data: Uint8Array }> {
    const canvas = renderSize(spec.size, { opaque: spec.opaque, safeZone: spec.safeZone })
    if (spec.opaque)
      return { path: spec.path, data: await toOpaquePng(canvas) }
    return { path: spec.path, data: new Uint8Array(await (await toPng(canvas)).arrayBuffer()) }
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

  async function downloadPack() {
    if (!ready.value)
      return
    packing.value = true
    const text = (s: string) => new TextEncoder().encode(s)
    try {
      const entries = [
        { name: 'web/favicon.ico', data: icoBytes() },
        ...icons.value.map(icon => ({ name: `web/${icon.file}`, data: icon.bytes })),
        { name: 'web/site.webmanifest', data: text(manifestJson({ name: siteName.value })) },
        { name: 'web/head.html', data: text(`${htmlSnippet()}\n`) },
      ]

      if (includeMaskable.value) {
        const maskable = await renderPlatform(MASKABLE_ICON)
        entries.push({ name: maskable.path, data: maskable.data })
      }

      if (includeIos.value) {
        for (const spec of IOS_ICONS) {
          const rendered = await renderPlatform(spec)
          entries.push({ name: rendered.path, data: rendered.data })
        }
        entries.push({ name: 'ios/AppIcon.appiconset/Contents.json', data: text(appleContentsJson()) })
      }

      if (includeAndroid.value) {
        for (const spec of ANDROID_ICONS) {
          const rendered = await renderPlatform(spec)
          entries.push({ name: rendered.path, data: rendered.data })
        }
        entries.push({ name: 'android/mipmap-anydpi-v26/ic_launcher.xml', data: text(adaptiveIconXml()) })
      }

      downloadZip(entries)
    }
    finally {
      packing.value = false
    }
  }

  function downloadZip(entries: { name: string, data: Uint8Array }[]) {
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
    includeIos,
    includeAndroid,
    includeMaskable,
    packing,
    load,
    downloadPack,
    icoUrl,
    formatBytes,
  }
}
