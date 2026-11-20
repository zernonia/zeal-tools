import type { LevelVerdict, PeakHold } from '../../core'
import type { MediaState } from './useMediaDevices'
import {
  clampRecordingSeconds,
  DB_FLOOR,
  levelVerdict,
  peak,
  pickMimeType,
  RECORDING_TYPES,
  rms,
  toDbfs,
  updatePeakHold,
} from '../../core'
import { describeMediaError, mediaUnavailableReason, useDeviceList } from './useMediaDevices'

export interface MicSettings {
  label: string
  sampleRate?: number
  channelCount?: number
  echoCancellation?: boolean
  noiseSuppression?: boolean
  autoGainControl?: boolean
  contextRate: number
}

/**
 * Microphone test: one stream, one analyser, read every animation frame.
 *
 * Echo cancellation, noise suppression and auto gain start ON, the browser
 * default, because that is what a video call will use and so what someone
 * checking their mic before a call needs to hear. Each can be switched off to
 * hear the raw input; changing one reopens the stream, because not every
 * browser applies them to a live track.
 */
export function useMicrophoneTest() {
  const state = ref<MediaState>('idle')
  const error = ref('')
  const notice = ref('')
  const deviceId = ref('')
  const echoCancellation = ref(true)
  const noiseSuppression = ref(true)
  const autoGainControl = ref(true)

  const rmsDb = ref(DB_FLOOR)
  const peakDb = ref(DB_FLOOR)
  const hold = ref<PeakHold>({ db: DB_FLOOR, at: 0 })
  const verdict = ref<LevelVerdict>('silent')
  const settings = ref<MicSettings | null>(null)

  const recording = ref(false)
  const recordSeconds = ref(5)
  const recordLeft = ref(0)
  const recordingUrl = ref('')
  const recordingType = ref('')

  const { devices, refresh, label } = useDeviceList('audioinput')

  let stream: MediaStream | null = null
  let audio: AudioContext | null = null
  let analyser: AnalyserNode | null = null
  let timeData: Float32Array<ArrayBuffer> | null = null
  let freqData: Uint8Array<ArrayBuffer> | null = null
  let frame = 0
  let recorder: MediaRecorder | null = null
  let recordTimer = 0
  let countdown = 0
  let onFrame: ((freq: Uint8Array, time: Float32Array) => void) | null = null

  /** The component draws the bars; it registers here to get each frame's data. */
  function onAnalyse(callback: typeof onFrame) {
    onFrame = callback
  }

  function tick() {
    frame = requestAnimationFrame(tick)
    if (!analyser || !timeData || !freqData)
      return
    analyser.getFloatTimeDomainData(timeData)
    analyser.getByteFrequencyData(freqData)
    const level = toDbfs(rms(timeData))
    const top = toDbfs(peak(timeData))
    rmsDb.value = level
    peakDb.value = top
    hold.value = updatePeakHold(hold.value, top, performance.now())
    verdict.value = levelVerdict(level, hold.value.db)
    onFrame?.(freqData, timeData)
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
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: deviceId.value ? { exact: deviceId.value } : undefined,
          echoCancellation: echoCancellation.value,
          noiseSuppression: noiseSuppression.value,
          autoGainControl: autoGainControl.value,
        },
      })
      audio = new AudioContext()
      await audio.resume()
      analyser = audio.createAnalyser()
      analyser.fftSize = 2048
      analyser.smoothingTimeConstant = 0.6
      // Analysed only, never connected to the speakers: hearing yourself
      // live through a laptop's speakers is instant feedback howl.
      audio.createMediaStreamSource(stream).connect(analyser)
      timeData = new Float32Array(analyser.fftSize)
      freqData = new Uint8Array(analyser.frequencyBinCount)

      const track = stream.getAudioTracks()[0]
      const s = track?.getSettings() ?? {}
      settings.value = {
        label: track?.label || 'Microphone',
        sampleRate: s.sampleRate,
        channelCount: s.channelCount,
        echoCancellation: s.echoCancellation,
        noiseSuppression: s.noiseSuppression,
        autoGainControl: s.autoGainControl,
        contextRate: audio.sampleRate,
      }
      if (s.deviceId)
        deviceId.value = s.deviceId
      track?.addEventListener('ended', () => {
        stop()
        notice.value = 'The microphone was disconnected or taken by another app.'
      })

      await refresh()
      state.value = 'live'
      frame = requestAnimationFrame(tick)
    }
    catch (cause) {
      release()
      state.value = 'error'
      error.value = describeMediaError(cause, 'microphone')
    }
  }

  /** Tear down the stream and audio graph, leaving any recording playable. */
  function release() {
    cancelAnimationFrame(frame)
    frame = 0
    stopRecording()
    stream?.getTracks().forEach(t => t.stop())
    void audio?.close()
    stream = null
    audio = null
    analyser = null
    timeData = null
    freqData = null
    rmsDb.value = DB_FLOOR
    peakDb.value = DB_FLOOR
    hold.value = { db: DB_FLOOR, at: 0 }
    verdict.value = 'silent'
  }

  function stop() {
    release()
    settings.value = null
    if (state.value !== 'error')
      state.value = 'idle'
  }

  function record() {
    if (!stream || recording.value || typeof MediaRecorder === 'undefined') {
      if (typeof MediaRecorder === 'undefined')
        notice.value = 'This browser cannot record audio from a web page.'
      return
    }
    const type = pickMimeType(RECORDING_TYPES, t => MediaRecorder.isTypeSupported(t))
    const chunks: Blob[] = []
    recorder = new MediaRecorder(stream, type ? { mimeType: type } : undefined)
    recordingType.value = recorder.mimeType || type
    recorder.addEventListener('dataavailable', (event) => {
      if (event.data.size)
        chunks.push(event.data)
    })
    recorder.addEventListener('stop', () => {
      recording.value = false
      clearInterval(countdown)
      if (!chunks.length)
        return
      // Held in memory as a blob URL. It is never uploaded, and it is revoked
      // when replaced or when the page goes.
      if (recordingUrl.value)
        URL.revokeObjectURL(recordingUrl.value)
      recordingUrl.value = URL.createObjectURL(new Blob(chunks, { type: recordingType.value || 'audio/webm' }))
      notice.value = 'Recording ready. Press play to hear it back.'
    })
    const seconds = clampRecordingSeconds(recordSeconds.value)
    recordLeft.value = seconds
    recorder.start()
    recording.value = true
    notice.value = `Recording for ${seconds} seconds.`
    countdown = window.setInterval(() => {
      recordLeft.value = Math.max(0, recordLeft.value - 1)
    }, 1000)
    recordTimer = window.setTimeout(stopRecording, seconds * 1000)
  }

  function stopRecording() {
    clearTimeout(recordTimer)
    clearInterval(countdown)
    if (recorder && recorder.state !== 'inactive')
      recorder.stop()
    recorder = null
  }

  // Changing a constraint or the device reopens the stream with it.
  watch([deviceId, echoCancellation, noiseSuppression, autoGainControl], (now, before) => {
    if (state.value !== 'live')
      return
    const sameConstraints = now.slice(1).every((v, i) => v === before[i + 1])
    // Filling in the id of the device we already have open is not a change.
    if (sameConstraints && stream?.getAudioTracks()[0]?.getSettings().deviceId === now[0])
      return
    void start()
  })

  // A hidden tab keeps the microphone light on for no reason. Stop, and say so.
  function onVisibility() {
    if (document.hidden && state.value === 'live') {
      stop()
      notice.value = 'The microphone was turned off while this tab was hidden. Press Start to test again.'
    }
  }
  onMounted(() => document.addEventListener('visibilitychange', onVisibility))

  // Guarded: prerendering runs this setup on the server, where there is no
  // stream, no animation frame and no document to tidy up.
  onScopeDispose(() => {
    if (import.meta.client) {
      stop()
      document.removeEventListener('visibilitychange', onVisibility)
      if (recordingUrl.value)
        URL.revokeObjectURL(recordingUrl.value)
    }
  })

  return {
    state,
    error,
    notice,
    devices,
    label,
    deviceId,
    echoCancellation,
    noiseSuppression,
    autoGainControl,
    rmsDb,
    peakDb,
    hold,
    verdict,
    settings,
    recording,
    recordSeconds,
    recordLeft,
    recordingUrl,
    recordingType,
    start,
    stop,
    record,
    stopRecording,
    onAnalyse,
  }
}
