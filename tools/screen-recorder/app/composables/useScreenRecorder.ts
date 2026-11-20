import type { StoreDefinition } from '../../../../shared/core/storage'
import type { Container, QualityId, RecordingClock, RecordingFormat, Support } from '../../core'
import { safeBoolean, safeText } from '../../../../shared/core/storage'
import {
  AUDIO_BITS_PER_SECOND,
  clockElapsed,
  clockPause,
  clockStart,
  containerOf,
  DEFAULT_QUALITY,
  detectSupport,
  explainCaptureError,
  memoryLevel,
  newClock,
  patchWebmDuration,
  pickFormat,
  presetById,
  projectedBytesPerHour,
  QUALITY_PRESETS,
  recordingFileName,
  WEBM_HEAD_BYTES,
} from '../../core'

export type RecorderState = 'idle' | 'picking' | 'countdown' | 'recording' | 'paused' | 'finishing' | 'done'

export interface Recording {
  url: string
  blob: Blob
  size: number
  durationMs: number
  container: Container
  fileName: string
  /** False for a WebM whose duration could not be written: it plays, but may not seek. */
  seekable: boolean
}

interface Settings {
  quality: QualityId
  microphone: boolean
  systemAudio: boolean
  countdown: boolean
}

/** The choices someone makes once and expects to find again. Nothing recorded is ever stored. */
const store: StoreDefinition<Settings> = {
  key: 'zeal:screen-recorder',
  version: 1,
  defaults: { quality: DEFAULT_QUALITY, microphone: false, systemAudio: true, countdown: true },
  revive: (raw, base) => ({
    quality: presetById(safeText(raw.quality, base.quality, 20)).id,
    microphone: safeBoolean(raw.microphone, base.microphone),
    systemAudio: safeBoolean(raw.systemAudio, base.systemAudio),
    countdown: safeBoolean(raw.countdown, base.countdown),
  }),
}

const COUNTDOWN_FROM = 3
/**
 * Chunks are handed over every second rather than once at the end. One
 * final `dataavailable` for an hour of video is a single multi-gigabyte
 * event that can fail outright; small chunks also give a live size reading.
 */
const TIMESLICE_MS = 1000

/**
 * Screen capture with MediaRecorder, start to download.
 *
 * Everything happens on the device: the stream comes from the browser's own
 * picker, the encoder is the browser's, and the result is a Blob that only
 * ever leaves the page as a download. Nothing here makes a network request.
 */
export function useScreenRecorder() {
  const { state: settings } = useToolStorage(store)

  const support = ref<Support | 'unknown'>('unknown')
  const state = ref<RecorderState>('idle')
  const error = ref('')
  /** True when the error is only a closed picker: worth saying, not worth alarming anyone. */
  const errorIsCancel = ref(false)
  /** Non-fatal things worth knowing about this recording, such as "no audio was shared". */
  const notes = ref<string[]>([])
  const countdown = ref(0)
  const elapsed = ref(0)
  const bytes = ref(0)
  const hasAudio = ref(false)
  const preview = shallowRef<MediaStream | null>(null)
  const result = shallowRef<Recording | null>(null)
  const downloaded = ref(false)

  let display: MediaStream | null = null
  let microphone: MediaStream | null = null
  let mixer: AudioContext | null = null
  let recorder: MediaRecorder | null = null
  let format: RecordingFormat = { mimeType: '', container: 'webm' }
  let chunks: Blob[] = []
  let clock: RecordingClock = newClock()
  let ticker: ReturnType<typeof setInterval> | undefined
  let counter: ReturnType<typeof setInterval> | undefined
  let startedAt = new Date()

  const preset = computed(() => presetById(settings.value.quality))
  const quality = computed({
    get: () => settings.value.quality,
    set: (value: QualityId) => { settings.value.quality = value },
  })
  const memory = computed(() => memoryLevel(bytes.value))
  const perHour = computed(() => projectedBytesPerHour(bytes.value, elapsed.value, preset.value, hasAudio.value))
  const capturing = computed(() => state.value === 'recording' || state.value === 'paused')
  const busy = computed(() => state.value !== 'idle' && state.value !== 'done')

  onMounted(() => {
    support.value = detectSupport({
      isSecureContext: window.isSecureContext,
      hasDisplayMedia: typeof navigator.mediaDevices?.getDisplayMedia === 'function',
      hasMediaRecorder: typeof MediaRecorder !== 'undefined',
      userAgent: navigator.userAgent,
      maxTouchPoints: navigator.maxTouchPoints ?? 0,
    })
  })

  /** Ask before closing the tab on a recording that exists nowhere else. */
  function guard(event: BeforeUnloadEvent) {
    event.preventDefault()
    event.returnValue = ''
  }
  const unsaved = computed(() => busy.value || (state.value === 'done' && !downloaded.value))
  watch(unsaved, (on: boolean) => {
    if (!import.meta.client)
      return
    if (on)
      window.addEventListener('beforeunload', guard)
    else
      window.removeEventListener('beforeunload', guard)
  })

  function tick() {
    elapsed.value = clockElapsed(clock, performance.now())
  }

  /** Stop every track this page opened and let go of the audio graph. */
  function releaseCapture() {
    clearInterval(ticker)
    clearInterval(counter)
    ticker = undefined
    counter = undefined
    for (const stream of [display, microphone])
      stream?.getTracks().forEach(track => track.stop())
    recorder?.stream.getTracks().forEach(track => track.stop())
    void mixer?.close().catch(() => {})
    display = null
    microphone = null
    mixer = null
    preview.value = null
  }

  function clearResult() {
    if (result.value)
      URL.revokeObjectURL(result.value.url)
    result.value = null
    downloaded.value = false
  }

  /**
   * Put the display's audio and the microphone onto one track.
   *
   * MediaRecorder records one audio track — given two, Chrome silently keeps
   * the first. So when both exist they are mixed through Web Audio into a
   * MediaStreamAudioDestinationNode, whose single track is what gets recorded.
   */
  function audioTracks(): MediaStreamTrack[] {
    const fromDisplay = display?.getAudioTracks() ?? []
    const fromMic = microphone?.getAudioTracks() ?? []
    if (fromDisplay.length && fromMic.length && mixer) {
      const destination = mixer.createMediaStreamDestination()
      mixer.createMediaStreamSource(new MediaStream(fromDisplay)).connect(destination)
      mixer.createMediaStreamSource(new MediaStream(fromMic)).connect(destination)
      return destination.stream.getAudioTracks()
    }
    return [...fromDisplay, ...fromMic].slice(0, 1)
  }

  function createRecorder(stream: MediaStream): MediaRecorder {
    format = pickFormat(type => MediaRecorder.isTypeSupported(type))
    const options: MediaRecorderOptions = {
      videoBitsPerSecond: preset.value.videoBitsPerSecond,
      audioBitsPerSecond: AUDIO_BITS_PER_SECOND,
    }
    try {
      return new MediaRecorder(stream, format.mimeType ? { ...options, mimeType: format.mimeType } : options)
    }
    catch {
      // A type the browser said it supports and then refused, which happens
      // with some codec strings: let it choose its own.
      format = { mimeType: '', container: 'webm' }
      return new MediaRecorder(stream, options)
    }
  }

  async function start() {
    if (busy.value)
      return
    if (support.value !== 'ok' && support.value !== 'unknown')
      return
    clearResult()
    error.value = ''
    errorIsCancel.value = false
    notes.value = []
    bytes.value = 0
    elapsed.value = 0
    state.value = 'picking'

    // The mixer has to be made now, inside the click. The picker can stay
    // open for longer than the browser's user-activation window, and an
    // AudioContext created after that starts suspended — and a suspended
    // context passes no sound to the recording at all.
    if (settings.value.microphone && settings.value.systemAudio) {
      mixer = new AudioContext()
      void mixer.resume().catch(() => {})
    }

    try {
      // The last three are hints only Chromium reads; other engines ignore
      // members they do not know. They allow switching what is shared
      // mid-recording and offer whole-system audio where the OS can give it.
      display = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: { ideal: 30 } },
        audio: settings.value.systemAudio,
        surfaceSwitching: 'include',
        systemAudio: 'include',
        monitorTypeSurfaces: 'include',
      } as DisplayMediaStreamOptions)
    }
    catch (cause) {
      releaseCapture()
      state.value = 'idle'
      const explained = explainCaptureError(cause instanceof Error ? cause.name : '', cause instanceof Error ? cause.message : '')
      error.value = explained.message
      errorIsCancel.value = explained.kind === 'cancelled'
      return
    }

    if (settings.value.systemAudio && !display.getAudioTracks().length) {
      notes.value.push('No sound came with the share. To record it, tick “Share tab audio” (or “Share system audio” on Windows) in the picker — on a Mac, only a Chrome or Edge tab can share its sound.')
    }

    if (settings.value.microphone) {
      try {
        microphone = await navigator.mediaDevices.getUserMedia({
          // Speech settings on purpose, unlike the tuner: this is a voice-over.
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        })
      }
      catch {
        notes.value.push('The microphone was blocked or unavailable, so this recording has no voice-over.')
      }
    }

    const video = display.getVideoTracks()
    const audio = audioTracks()
    hasAudio.value = audio.length > 0
    preview.value = new MediaStream(video)

    // Ending the share from the browser's own "Stop sharing" bar ends the
    // video track. Treat that as Stop, so the recording is kept.
    video[0]?.addEventListener('ended', () => finish(), { once: true })

    let created: MediaRecorder
    try {
      created = createRecorder(new MediaStream([...video, ...audio]))
    }
    catch {
      releaseCapture()
      state.value = 'idle'
      error.value = 'This browser could not start a recorder for the captured screen.'
      return
    }
    recorder = created

    // Every handler checks it still belongs to the current recorder, so a
    // cancelled one that fires late cannot write into the next recording.
    created.addEventListener('dataavailable', (event) => {
      if (created === recorder && event.data.size) {
        chunks.push(event.data)
        bytes.value += event.data.size
      }
    })
    created.addEventListener('stop', () => {
      if (created === recorder)
        void assemble()
    })
    created.addEventListener('error', () => {
      if (created === recorder)
        error.value = 'The browser stopped the recording unexpectedly. Whatever was recorded up to that point has been kept.'
    })

    startedAt = new Date()
    if (settings.value.countdown) {
      state.value = 'countdown'
      countdown.value = COUNTDOWN_FROM
      counter = setInterval(() => {
        countdown.value--
        if (countdown.value <= 0)
          begin()
      }, 1000)
    }
    else {
      begin()
    }
  }

  /** Start recording now. Also what "Skip" on the countdown does. */
  function begin() {
    clearInterval(counter)
    counter = undefined
    countdown.value = 0
    if (!recorder || recorder.state !== 'inactive')
      return
    chunks = []
    startedAt = new Date()
    recorder.start(TIMESLICE_MS)
    clock = clockStart(newClock(), performance.now())
    state.value = 'recording'
    ticker = setInterval(tick, 250)
  }

  function pause() {
    if (recorder?.state !== 'recording')
      return
    recorder.pause()
    clock = clockPause(clock, performance.now())
    tick()
    state.value = 'paused'
  }

  function resume() {
    if (recorder?.state !== 'paused')
      return
    recorder.resume()
    clock = clockStart(clock, performance.now())
    state.value = 'recording'
  }

  /** Stop and keep the recording. Before recording has begun, it cancels. */
  function finish() {
    if (state.value === 'countdown' || state.value === 'picking') {
      cancel()
      return
    }
    if (!recorder || recorder.state === 'inactive')
      return
    clock = clockPause(clock, performance.now())
    tick()
    state.value = 'finishing'
    // The last chunk arrives as a final dataavailable just before `stop`.
    recorder.stop()
  }

  /** Abandon the capture without a recording. */
  function cancel() {
    const old = recorder
    recorder = null
    if (old && old.state !== 'inactive')
      old.stop()
    chunks = []
    releaseCapture()
    state.value = 'idle'
    elapsed.value = 0
    bytes.value = 0
  }

  async function assemble() {
    if (!recorder)
      return
    const type = recorder.mimeType || format.mimeType || 'video/webm'
    const container = containerOf(type, format.container)
    const durationMs = clockElapsed(clock, performance.now())
    recorder = null
    releaseCapture()

    let blob = new Blob(chunks, { type })
    chunks = []
    let seekable = true

    // WebM from MediaRecorder has no duration in its header, so players
    // cannot seek in it. Write one in; only the first few hundred bytes are
    // read and replaced, never the whole file.
    if (container === 'webm') {
      seekable = false
      try {
        const head = new Uint8Array(await blob.slice(0, WEBM_HEAD_BYTES).arrayBuffer())
        const patch = patchWebmDuration(head, durationMs)
        if (patch) {
          blob = new Blob([patch.bytes as Uint8Array<ArrayBuffer>, blob.slice(patch.consumed)], { type })
          seekable = true
        }
      }
      catch {}
    }

    if (!blob.size) {
      state.value = 'idle'
      error.value = 'The recording came out empty. Try again, and if it keeps happening, try the Standard quality preset.'
      return
    }

    result.value = {
      url: URL.createObjectURL(blob),
      blob,
      size: blob.size,
      durationMs,
      container,
      fileName: recordingFileName(startedAt, container),
      seekable,
    }
    downloaded.value = false
    state.value = 'done'
  }

  /** Throw the result away and go back to the start. */
  function discard() {
    clearResult()
    error.value = ''
    notes.value = []
    elapsed.value = 0
    bytes.value = 0
    state.value = 'idle'
  }

  onScopeDispose(() => {
    cancel()
    clearResult()
    if (import.meta.client)
      window.removeEventListener('beforeunload', guard)
  })

  return {
    settings,
    support,
    state,
    error,
    errorIsCancel,
    notes,
    countdown,
    elapsed,
    bytes,
    hasAudio,
    preview,
    result,
    downloaded,
    preset,
    quality,
    presets: QUALITY_PRESETS,
    memory,
    perHour,
    capturing,
    busy,
    start,
    begin,
    pause,
    resume,
    finish,
    cancel,
    discard,
  }
}
