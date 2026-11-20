import type { Ref } from 'vue'
import type { ResolutionRequest } from '../../core'
import type { MediaState } from './useMediaDevices'
import {
  capabilityLabel,
  formatCapability,
  HIDDEN_CAPABILITIES,
  measuredFps,
  RESOLUTION_REQUESTS,
  snapshotFilename,
  trimTimestamps,
} from '../../core'
import { describeMediaError, mediaUnavailableReason, useDeviceList } from './useMediaDevices'

export interface CameraSettings {
  label: string
  width: number
  height: number
  frameRate?: number
  facingMode?: string
  resizeMode?: string
}

type VideoWithFrames = HTMLVideoElement & {
  requestVideoFrameCallback?: (callback: (now: number) => void) => number
  cancelVideoFrameCallback?: (handle: number) => void
}

/**
 * Webcam test. Reports what the browser actually delivered — the track's own
 * settings and the size of the decoded frames — rather than what was asked
 * for, because the gap between those two is usually the question.
 */
export function useWebcamTest(video: Ref<HTMLVideoElement | null>) {
  const state = ref<MediaState>('idle')
  const error = ref('')
  const notice = ref('')
  const deviceId = ref('')
  const resolution = ref<ResolutionRequest>('default')
  const mirror = ref(true)

  const settings = ref<CameraSettings | null>(null)
  const capabilities = ref<{ name: string, value: string }[]>([])
  const fps = ref(0)
  const fpsMeasurable = ref(true)

  const { devices, refresh, label } = useDeviceList('videoinput')

  let stream: MediaStream | null = null
  let frameHandle = 0
  let frames: number[] = []
  let fpsTimer = 0

  function readSettings() {
    const track = stream?.getVideoTracks()[0]
    if (!track)
      return
    const s = track.getSettings()
    const el = video.value
    settings.value = {
      label: track.label || 'Camera',
      // The decoded frame is the ground truth; settings can lag a resize.
      width: el?.videoWidth || s.width || 0,
      height: el?.videoHeight || s.height || 0,
      frameRate: s.frameRate,
      facingMode: s.facingMode,
      resizeMode: (s as { resizeMode?: string }).resizeMode,
    }
    const caps = typeof track.getCapabilities === 'function' ? track.getCapabilities() as Record<string, unknown> : {}
    capabilities.value = Object.entries(caps)
      .filter(([name]) => !HIDDEN_CAPABILITIES.has(name))
      .map(([name, value]) => ({ name: capabilityLabel(name), value: formatCapability(value) }))
  }

  function countFrames() {
    const el = video.value as VideoWithFrames | null
    if (!el?.requestVideoFrameCallback) {
      fpsMeasurable.value = false
      return
    }
    fpsMeasurable.value = true
    const onFrame = (now: number) => {
      frames.push(now)
      frames = trimTimestamps(frames)
      frameHandle = el.requestVideoFrameCallback!(onFrame)
    }
    frameHandle = el.requestVideoFrameCallback(onFrame)
    fpsTimer = window.setInterval(() => {
      fps.value = measuredFps(frames)
    }, 500)
  }

  async function start() {
    if (state.value === 'starting')
      return
    const reason = mediaUnavailableReason()
    if (reason) {
      state.value = 'error'
      error.value = reason
      return
    }
    release()
    state.value = 'starting'
    error.value = ''
    notice.value = ''
    const size = RESOLUTION_REQUESTS.find(r => r.id === resolution.value)
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          deviceId: deviceId.value ? { exact: deviceId.value } : undefined,
          // `ideal`, so a camera that cannot do it still opens at its best.
          width: size?.width ? { ideal: size.width } : undefined,
          height: size?.height ? { ideal: size.height } : undefined,
        },
      })
      const track = stream.getVideoTracks()[0]
      track?.addEventListener('ended', () => {
        stop()
        notice.value = 'The camera was disconnected or taken by another app.'
      })
      const s = track?.getSettings()
      if (s?.deviceId)
        deviceId.value = s.deviceId
      // A rear camera is not a mirror; a selfie camera conventionally is.
      mirror.value = s?.facingMode !== 'environment'
      state.value = 'live'
      await nextTick()
      const el = video.value
      if (el) {
        el.srcObject = stream
        el.addEventListener('resize', readSettings)
        await el.play().catch(() => {})
      }
      readSettings()
      countFrames()
      await refresh()
    }
    catch (cause) {
      release()
      state.value = 'error'
      error.value = describeMediaError(cause, 'camera')
    }
  }

  function release() {
    const el = video.value as VideoWithFrames | null
    if (frameHandle && el?.cancelVideoFrameCallback)
      el.cancelVideoFrameCallback(frameHandle)
    frameHandle = 0
    clearInterval(fpsTimer)
    frames = []
    fps.value = 0
    stream?.getTracks().forEach(t => t.stop())
    stream = null
    if (el) {
      el.removeEventListener('resize', readSettings)
      el.srcObject = null
    }
  }

  function stop() {
    release()
    settings.value = null
    capabilities.value = []
    if (state.value !== 'error')
      state.value = 'idle'
  }

  /**
   * Saves the frame as the camera sees it, not mirrored: mirroring is a
   * courtesy of the preview, and text in a mirrored snapshot reads backwards.
   */
  async function snapshot(): Promise<boolean> {
    const el = video.value
    if (!el || !el.videoWidth)
      return false
    const canvas = document.createElement('canvas')
    canvas.width = el.videoWidth
    canvas.height = el.videoHeight
    canvas.getContext('2d')?.drawImage(el, 0, 0)
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'))
    if (!blob)
      return false
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = snapshotFilename(canvas.width, canvas.height, new Date())
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    return true
  }

  let lastResolution = resolution.value
  watch([deviceId, resolution], (now) => {
    if (state.value !== 'live')
      return
    const current = stream?.getVideoTracks()[0]?.getSettings().deviceId
    if (now[0] === current && resolution.value === lastResolution)
      return
    lastResolution = resolution.value
    void start()
  })

  function onVisibility() {
    if (document.hidden && state.value === 'live') {
      stop()
      notice.value = 'The camera was turned off while this tab was hidden. Press Start to test again.'
    }
  }
  onMounted(() => document.addEventListener('visibilitychange', onVisibility))

  onScopeDispose(() => {
    if (import.meta.client) {
      stop()
      document.removeEventListener('visibilitychange', onVisibility)
    }
  })

  return {
    state,
    error,
    notice,
    devices,
    label,
    deviceId,
    resolution,
    mirror,
    settings,
    capabilities,
    fps,
    fpsMeasurable,
    start,
    stop,
    snapshot,
  }
}
