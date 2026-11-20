/**
 * What the camera and microphone tests share: the device list, and turning a
 * getUserMedia failure into something a person can act on.
 *
 * Labels are empty until permission has been granted once — that is the
 * browser protecting against fingerprinting — so the list is read after the
 * first successful start, and again whenever a device is plugged in.
 */

export type MediaState = 'idle' | 'starting' | 'live' | 'error'

export function useDeviceList(kind: MediaDeviceKind) {
  const devices = ref<MediaDeviceInfo[]>([])

  async function refresh() {
    if (!navigator.mediaDevices?.enumerateDevices)
      return
    const all = await navigator.mediaDevices.enumerateDevices()
    devices.value = all.filter(d => d.kind === kind && d.deviceId)
  }

  function label(device: MediaDeviceInfo, index: number) {
    const noun = kind === 'videoinput' ? 'Camera' : 'Microphone'
    return device.label || `${noun} ${index + 1}`
  }

  const onChange = () => void refresh()
  onMounted(() => navigator.mediaDevices?.addEventListener?.('devicechange', onChange))
  onScopeDispose(() => {
    if (import.meta.client)
      navigator.mediaDevices?.removeEventListener?.('devicechange', onChange)
  })

  return { devices, refresh, label }
}

/** Why the browser cannot open the device yet, before even asking. */
export function mediaUnavailableReason(): string {
  if (!window.isSecureContext)
    return 'Camera and microphone access only works on a secure (https) page. Open this page over https and try again.'
  if (!navigator.mediaDevices?.getUserMedia)
    return 'This browser does not offer camera or microphone access to web pages. Try a current version of Chrome, Edge, Firefox or Safari.'
  return ''
}

/** A getUserMedia rejection as plain, actionable words. */
export function describeMediaError(cause: unknown, noun: 'camera' | 'microphone'): string {
  const name = cause instanceof DOMException || cause instanceof Error ? cause.name : ''
  switch (name) {
    case 'NotAllowedError':
    case 'SecurityError':
      return `Access to the ${noun} was blocked. Click the ${noun} or lock icon in the address bar, allow it for this site, then press Start again. On a Mac, also check System Settings → Privacy & Security → ${noun === 'camera' ? 'Camera' : 'Microphone'}.`
    case 'NotFoundError':
    case 'OverconstrainedError':
      return `No ${noun} was found. Check it is plugged in and switched on, or pick another device.`
    case 'NotReadableError':
    case 'AbortError':
      return `The ${noun} is there but could not be opened. Another app — a video call, OBS, the system camera app — may be using it. Close that app and press Start again.`
    default:
      return `The ${noun} could not be started${name ? ` (${name})` : ''}.`
  }
}
