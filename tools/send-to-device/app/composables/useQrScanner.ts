/**
 * Reading a QR back off a camera, using only what the browser already has.
 *
 * Our own QR core encodes; it does not decode — those are different problems.
 * Decoding means binarizing a camera frame, locating the finder patterns,
 * un-warping the perspective and running Reed–Solomon *correction* over the
 * result, none of which the encoder contains. Rather than take on a decoder
 * library for one direction of one handshake, this leans on `BarcodeDetector`,
 * which ships in the browser. Where it is missing (Safari and Firefox today)
 * the tool falls back to pasting the code, so no browser is left without a way
 * through.
 */

interface DetectedBarcode { rawValue: string }
interface BarcodeDetectorLike { detect: (source: CanvasImageSource) => Promise<DetectedBarcode[]> }
interface BarcodeDetectorCtor {
  new (options?: { formats?: string[] }): BarcodeDetectorLike
  getSupportedFormats: () => Promise<string[]>
}

function detectorCtor(): BarcodeDetectorCtor | null {
  const ctor = (globalThis as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector
  return typeof ctor === 'function' ? ctor : null
}

/** Whether this browser can scan at all — decided before we offer the button. */
export function canScan() {
  return detectorCtor() !== null
}

/** How often to look at a frame. Faster than this is wasted work on a still QR. */
const SCAN_INTERVAL = 250

export function useQrScanner(onFound: (value: string) => void) {
  const scanning = ref(false)
  const error = ref('')
  const video = ref<HTMLVideoElement | null>(null)

  let stream: MediaStream | null = null
  let timer: ReturnType<typeof setInterval> | null = null

  async function start() {
    const Ctor = detectorCtor()
    if (!Ctor)
      return void (error.value = 'This browser cannot use the camera to read codes. Paste the code instead.')

    try {
      error.value = ''
      const formats = await Ctor.getSupportedFormats()
      if (!formats.includes('qr_code'))
        return void (error.value = 'This browser cannot read QR codes. Paste the code instead.')

      // The rear camera on a phone; on a laptop this is simply the only one.
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      })

      scanning.value = true
      await nextTick()

      const el = video.value
      if (!el)
        throw new Error('The camera preview is missing.')
      el.srcObject = stream
      await el.play()

      const detector = new Ctor({ formats: ['qr_code'] })
      timer = setInterval(async () => {
        // A frame with no dimensions yet decodes to nothing and logs noise.
        if (!video.value || video.value.readyState < 2)
          return
        try {
          const found = await detector.detect(video.value)
          if (found.length > 0 && found[0]!.rawValue) {
            const value = found[0]!.rawValue
            stop()
            onFound(value)
          }
        }
        catch {
          // A single unreadable frame is normal while focusing — keep looking.
        }
      }, SCAN_INTERVAL)
    }
    catch (cause) {
      stop()
      error.value = cause instanceof DOMException && cause.name === 'NotAllowedError'
        ? 'Camera access was blocked. Allow it, or paste the code instead.'
        : 'The camera could not be opened. Paste the code instead.'
    }
  }

  function stop() {
    if (timer)
      clearInterval(timer)
    timer = null
    stream?.getTracks().forEach(track => track.stop())
    stream = null
    if (video.value)
      video.value.srcObject = null
    scanning.value = false
  }

  onScopeDispose(stop)

  return { scanning, error, video, start, stop }
}
