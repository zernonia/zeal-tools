import type { Ref } from 'vue'
import type { ScanResult } from '../../core'
import {
  fitWithin,
  halvingSteps,
  isRepeat,
  KIND_LABELS,
  LIVE_FRAME_EDGE,
  LIVE_INTERVAL_MS,
  parseScan,
  scanSizes,
  summarise,
} from '../../core'

export type CameraState = 'idle' | 'starting' | 'scanning' | 'denied' | 'no-camera' | 'busy' | 'insecure' | 'unsupported' | 'failed'
export type ScanSource = 'camera' | 'image' | 'paste'

export interface HistoryEntry {
  id: number
  at: Date
  source: ScanSource
  result: ScanResult
}

interface Detection { rawValue: string, format: string }

type Frame = HTMLVideoElement | HTMLCanvasElement | ImageBitmap

/**
 * One way of reading codes out of pixels. `thorough` is set for still images,
 * where there is time to try inverted (light-on-dark) codes too.
 */
interface Engine {
  kind: 'native' | 'jsqr'
  formats: string[]
  detect: (frame: Frame, thorough: boolean) => Promise<Detection[]>
}

/** The Shape Detection API's BarcodeDetector, which TypeScript's DOM types do not include yet. */
interface BarcodeDetectorLike { detect: (source: Frame) => Promise<Detection[]> }
interface BarcodeDetectorClass {
  new (options?: { formats: string[] }): BarcodeDetectorLike
  getSupportedFormats: () => Promise<string[]>
}

/** Formats asked of the native detector, when it supports them. QR first. */
const WANTED_FORMATS = ['qr_code', 'aztec', 'data_matrix', 'pdf417', 'ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'code_93', 'codabar', 'itf']

const HISTORY_LIMIT = 25

function frameSize(frame: Frame): { width: number, height: number } {
  if (frame instanceof HTMLVideoElement)
    return { width: frame.videoWidth, height: frame.videoHeight }
  return { width: frame.width, height: frame.height }
}

/**
 * Draw `frame` at `target` size, halving on the way down so a big photo is
 * averaged rather than sampled (see `halvingSteps`). Two canvases ping-pong.
 */
function drawScaled(frame: Frame, target: { width: number, height: number }, canvas: HTMLCanvasElement, spare: HTMLCanvasElement): HTMLCanvasElement {
  const { width, height } = frameSize(frame)
  const steps = halvingSteps(width, height, target)
  let source: Frame = frame
  steps.forEach((step, i) => {
    // Alternate between the two so the last step lands on `canvas` and no
    // step ever draws a canvas onto itself (resizing one clears it).
    const into = (steps.length - 1 - i) % 2 === 0 ? canvas : spare
    into.width = step.width
    into.height = step.height
    const ctx = into.getContext('2d', { willReadFrequently: true })!
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(source, 0, 0, step.width, step.height)
    source = into
  })
  return canvas
}

/**
 * The browser's own BarcodeDetector when it can read QR codes, otherwise
 * jsQR.
 *
 * Native first because it is faster, reads a dozen symbologies rather than
 * one, and costs no download. It exists on Android, ChromeOS and macOS Chrome
 * but not in Firefox, desktop Safari or Chrome on Windows — and on some
 * platforms the constructor exists while `getSupportedFormats()` returns
 * nothing, which is why support is decided by what it reports, not by its
 * presence. jsQR is imported here and nowhere else, so it lands in this
 * tool's lazy chunk and only browsers without a native detector fetch it.
 */
async function createEngine(): Promise<Engine> {
  const Native = (globalThis as { BarcodeDetector?: BarcodeDetectorClass }).BarcodeDetector
  if (Native) {
    try {
      const supported = await Native.getSupportedFormats()
      if (supported.includes('qr_code')) {
        const formats = WANTED_FORMATS.filter(f => supported.includes(f))
        const detector = new Native({ formats })
        return { kind: 'native', formats, detect: frame => detector.detect(frame) }
      }
    }
    catch {
      // Fall through to jsQR.
    }
  }

  const { default: jsQR } = await import('jsqr')
  const canvas = document.createElement('canvas')
  const spare = document.createElement('canvas')
  return {
    kind: 'jsqr',
    formats: ['qr_code'],
    async detect(frame, thorough) {
      let target = canvas
      if (frame instanceof HTMLCanvasElement) {
        target = frame
      }
      else {
        const { width, height } = frameSize(frame)
        drawScaled(frame, fitWithin(width, height, LIVE_FRAME_EDGE), canvas, spare)
      }
      const ctx = target.getContext('2d', { willReadFrequently: true })!
      const { data, width, height } = ctx.getImageData(0, 0, target.width, target.height)
      const found = jsQR(data, width, height, { inversionAttempts: thorough ? 'attemptBoth' : 'dontInvert' })
      return found ? [{ rawValue: found.data, format: 'qr_code' }] : []
    },
  }
}

/** Decode a file into something drawable. `<img>` is the fallback for formats createImageBitmap refuses. */
async function decodeImage(blob: Blob): Promise<ImageBitmap | HTMLCanvasElement> {
  try {
    return await createImageBitmap(blob)
  }
  catch {
    const url = URL.createObjectURL(blob)
    try {
      const img = new Image()
      img.src = url
      await img.decode()
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth || 1024
      canvas.height = img.naturalHeight || 1024
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
      return canvas
    }
    finally {
      URL.revokeObjectURL(url)
    }
  }
}

export function useQrScanner(video: Ref<HTMLVideoElement | null>) {
  const { track } = useAnalytics()

  const cameraState = ref<CameraState>('idle')
  const cameraError = ref('')
  const cameras = ref<{ deviceId: string, label: string }[]>([])
  const cameraId = ref('')
  const torchSupported = ref(false)
  const torchOn = ref(false)

  const current = ref<ScanResult | null>(null)
  const currentSource = ref<ScanSource | null>(null)
  const history = ref<HistoryEntry[]>([])
  const announcement = ref('')
  const imageBusy = ref(false)
  const imageMessage = ref('')
  const engineKind = ref<Engine['kind'] | null>(null)
  const engineFormats = ref<string[]>([])
  const canReadClipboard = ref(false)

  let enginePromise: Promise<Engine> | null = null
  let stream: MediaStream | null = null
  let loop = 0
  let lastDetect = 0
  let busy = false
  let last: { raw: string, at: number } | null = null
  let nextId = 1
  let resumeOnVisible = false

  function engine(): Promise<Engine> {
    enginePromise ??= createEngine().then((e) => {
      engineKind.value = e.kind
      engineFormats.value = e.formats
      return e
    })
    return enginePromise
  }

  function accept(found: Detection[], source: ScanSource) {
    const now = performance.now()
    const primary = found[0]!
    if (source === 'camera' && isRepeat(last, primary.rawValue, now)) {
      // Still in view: keep the window open, so a code held up for a minute
      // counts once, and counts again only after it has left the frame.
      last!.at = now
      return
    }
    last = { raw: primary.rawValue, at: now }

    const results = found.map(d => parseScan(d.rawValue, d.format))
    current.value = results[0]!
    currentSource.value = source
    for (const result of [...results].reverse()) {
      if (history.value[0]?.result.raw === result.raw)
        continue
      history.value.unshift({ id: nextId++, at: new Date(), source, result })
    }
    history.value.splice(HISTORY_LIMIT)

    const first = results[0]!
    const more = results.length > 1 ? ` ${results.length} codes found; the others are in the history.` : ''
    announcement.value = `${KIND_LABELS[first.kind]} found: ${summarise(first)}.${more}`
    track('tool_completed', { tool: 'qr-code-scanner', format: source })
  }

  // ── Camera ────────────────────────────────────────────────────────────────

  function schedule(id: number) {
    const el = video.value
    if (!el || id !== loop || cameraState.value !== 'scanning')
      return
    const next = () => void onFrame(id)
    if ('requestVideoFrameCallback' in el)
      el.requestVideoFrameCallback(next)
    else
      requestAnimationFrame(next)
  }

  /**
   * Called for every new camera frame, decoding at most every
   * LIVE_INTERVAL_MS and never two at once. A phone camera delivers 30
   * frames a second; reading all of them would heat the phone and drain the
   * battery for no gain, since a code held up takes longer than 100 ms to
   * steady anyway.
   */
  async function onFrame(id: number) {
    const el = video.value
    if (!el || id !== loop || cameraState.value !== 'scanning')
      return
    const now = performance.now()
    if (!busy && now - lastDetect >= LIVE_INTERVAL_MS && el.readyState >= 2 && el.videoWidth) {
      busy = true
      lastDetect = now
      try {
        const reader = await engine()
        const found = await reader.detect(el, false)
        if (found.length && id === loop)
          accept(found, 'camera')
      }
      catch {
        // A single bad frame is not worth reporting; the next one will do.
      }
      finally {
        busy = false
      }
    }
    schedule(id)
  }

  function releaseStream() {
    stream?.getTracks().forEach(t => t.stop())
    stream = null
    if (video.value)
      video.value.srcObject = null
    torchSupported.value = false
    torchOn.value = false
  }

  function fail(cause: unknown) {
    releaseStream()
    const name = cause instanceof DOMException ? cause.name : ''
    if (name === 'NotAllowedError' || name === 'SecurityError') {
      cameraState.value = 'denied'
      cameraError.value = 'Camera access was blocked. Allow it for this site in your browser’s settings, or scan a screenshot or photo below instead.'
    }
    else if (name === 'NotFoundError' || name === 'OverconstrainedError') {
      cameraState.value = 'no-camera'
      cameraError.value = 'No camera was found on this device. You can still scan a screenshot or photo below.'
    }
    else if (name === 'NotReadableError' || name === 'AbortError') {
      cameraState.value = 'busy'
      cameraError.value = 'The camera is in use by another app, or the system would not hand it over. Close the other app and try again.'
    }
    else {
      cameraState.value = 'failed'
      cameraError.value = 'The camera could not be started. You can still scan a screenshot or photo below.'
    }
  }

  async function startCamera(deviceId?: string) {
    if (cameraState.value === 'starting')
      return
    if (!window.isSecureContext) {
      cameraState.value = 'insecure'
      cameraError.value = 'Browsers only allow the camera on secure (https) pages. Open this page over https to scan with the camera.'
      return
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      cameraState.value = 'unsupported'
      cameraError.value = 'This browser cannot use a camera from a web page. You can still scan a screenshot or photo below.'
      return
    }

    loop++
    releaseStream()
    cameraState.value = 'starting'
    cameraError.value = ''
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        // The rear camera on a phone. `ideal`, not `exact`: a laptop has only
        // a front camera, and `exact` would refuse it outright.
        video: deviceId
          ? { deviceId: { exact: deviceId }, width: { ideal: 1280 }, height: { ideal: 720 } }
          : { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
      })
      const el = video.value
      if (!el)
        throw new Error('No video element')
      el.srcObject = stream
      await el.play()

      const videoTrack = stream.getVideoTracks()[0]
      cameraId.value = videoTrack?.getSettings().deviceId ?? ''
      const capabilities = (videoTrack?.getCapabilities?.() ?? {}) as MediaTrackCapabilities & { torch?: boolean }
      torchSupported.value = !!capabilities.torch

      // Labels are only filled in once permission has been granted.
      const devices = await navigator.mediaDevices.enumerateDevices()
      cameras.value = devices
        .filter(d => d.kind === 'videoinput')
        .map((d, i) => ({ deviceId: d.deviceId, label: d.label || `Camera ${i + 1}` }))

      // Start loading the decoder while the camera warms up.
      void engine()
      cameraState.value = 'scanning'
      schedule(loop)
    }
    catch (cause) {
      fail(cause)
    }
  }

  function stopCamera() {
    loop++
    releaseStream()
    if (cameraState.value === 'scanning' || cameraState.value === 'starting')
      cameraState.value = 'idle'
  }

  /** Step to the next camera. Phones list front, back and sometimes several back lenses. */
  async function switchCamera() {
    if (cameras.value.length < 2)
      return
    const index = cameras.value.findIndex(c => c.deviceId === cameraId.value)
    const next = cameras.value[(index + 1) % cameras.value.length]!
    await startCamera(next.deviceId)
  }

  const cameraLabel = computed(() => cameras.value.find(c => c.deviceId === cameraId.value)?.label ?? '')

  async function toggleTorch() {
    const videoTrack = stream?.getVideoTracks()[0]
    if (!videoTrack)
      return
    const on = !torchOn.value
    try {
      await videoTrack.applyConstraints({ advanced: [{ torch: on } as MediaTrackConstraintSet] })
      torchOn.value = on
    }
    catch {
      torchSupported.value = false
    }
  }

  // ── Images ────────────────────────────────────────────────────────────────

  async function scanImage(blob: Blob | null | undefined, source: ScanSource, name = '') {
    if (!blob)
      return
    imageMessage.value = ''
    if (blob.type && !blob.type.startsWith('image/')) {
      imageMessage.value = 'That file is not an image. Choose a screenshot or photo of the code.'
      return
    }
    imageBusy.value = true
    try {
      let picture: ImageBitmap | HTMLCanvasElement
      try {
        picture = await decodeImage(blob)
      }
      catch {
        imageMessage.value = 'This browser could not open that image. iPhone HEIC photos only open in Safari; a screenshot (PNG) or JPEG works everywhere.'
        return
      }

      const reader = await engine()
      const found = await findInImage(reader, picture)
      if ('close' in picture)
        picture.close()

      if (found.length) {
        accept(found, source)
      }
      else {
        const what = name ? `in ${name}` : 'in that image'
        imageMessage.value = `No code found ${what}. Try a sharper picture, crop closer to the code, or avoid glare across it.`
        announcement.value = imageMessage.value
      }
    }
    finally {
      imageBusy.value = false
    }
  }

  /**
   * Try an image at a few sizes, largest first (`scanSizes`). The native
   * detector gets the untouched original first, since it copes with large
   * images itself.
   */
  async function findInImage(reader: Engine, picture: ImageBitmap | HTMLCanvasElement): Promise<Detection[]> {
    if (reader.kind === 'native') {
      const found = await reader.detect(picture, true).catch(() => [])
      if (found.length)
        return found
    }
    const canvas = document.createElement('canvas')
    const spare = document.createElement('canvas')
    for (const edge of scanSizes(picture.width, picture.height)) {
      drawScaled(picture, fitWithin(picture.width, picture.height, edge), canvas, spare)
      const found = await reader.detect(canvas, true).catch(() => [])
      if (found.length)
        return found
    }
    return []
  }

  /**
   * Ctrl/Cmd+V anywhere on the page. Only an image on the clipboard is taken,
   * so pasting text into a field elsewhere on the page still works normally.
   */
  function onPaste(event: ClipboardEvent) {
    const items = [...(event.clipboardData?.items ?? [])]
    const file = items.find(item => item.kind === 'file' && item.type.startsWith('image/'))?.getAsFile()
    if (!file)
      return
    event.preventDefault()
    void scanImage(file, 'paste')
  }

  /** The Paste button, for browsers with the async clipboard API. */
  async function pasteFromClipboard() {
    imageMessage.value = ''
    try {
      const items = await navigator.clipboard.read()
      for (const item of items) {
        const type = item.types.find(t => t.startsWith('image/'))
        if (type) {
          await scanImage(await item.getType(type), 'paste')
          return
        }
      }
      imageMessage.value = 'There is no image on the clipboard. Take or copy a screenshot of the code first.'
    }
    catch {
      imageMessage.value = 'The browser would not let the page read the clipboard. Press Ctrl+V (⌘V on a Mac) instead.'
    }
  }

  // ── History ───────────────────────────────────────────────────────────────

  function show(entry: HistoryEntry) {
    current.value = entry.result
    currentSource.value = entry.source
  }

  function clearHistory() {
    history.value = []
    current.value = null
    currentSource.value = null
    last = null
    announcement.value = 'History cleared.'
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  /**
   * A hidden tab has no business holding the camera: the light stays on and
   * the battery drains for a page nobody is looking at. Stop it, and pick up
   * where it was when the tab comes back.
   */
  function onVisibility() {
    if (document.hidden) {
      if (cameraState.value === 'scanning') {
        resumeOnVisible = true
        stopCamera()
      }
    }
    else if (resumeOnVisible) {
      resumeOnVisible = false
      void startCamera(cameraId.value || undefined)
    }
  }

  onMounted(() => {
    canReadClipboard.value = typeof navigator.clipboard?.read === 'function'
    document.addEventListener('paste', onPaste)
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pagehide', stopCamera)
  })

  onBeforeUnmount(() => {
    document.removeEventListener('paste', onPaste)
    document.removeEventListener('visibilitychange', onVisibility)
    window.removeEventListener('pagehide', stopCamera)
    stopCamera()
  })

  return {
    cameraState,
    cameraError,
    cameras,
    cameraLabel,
    torchSupported,
    torchOn,
    current,
    currentSource,
    history,
    announcement,
    imageBusy,
    imageMessage,
    engineKind,
    engineFormats,
    canReadClipboard,
    startCamera,
    stopCamera,
    switchCamera,
    toggleTorch,
    scanImage,
    pasteFromClipboard,
    show,
    clearHistory,
  }
}
