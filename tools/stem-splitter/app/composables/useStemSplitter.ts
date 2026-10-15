import type { Stem, StereoBuffer } from '../../core'
import type { Backend, SeparateRequest, WorkerMessage } from '../workers/protocol'
import { createZip } from '#zeal/zip'
import { encodeWav, energy, MAX_SECONDS, mixStems, MODEL, STEMS, toStereo, waveformPeaks } from '../../core'

export type Status = 'idle' | 'decoding' | 'downloading' | 'starting' | 'separating' | 'ready' | 'error'

export interface MixPreset {
  id: string
  label: string
  /** Which stems are on, in `STEMS` order. */
  on: Record<Stem, boolean>
  /** The file-name part for a mix made from this preset. */
  part: string
}

export const PRESETS: MixPreset[] = [
  { id: 'all', label: 'Everything', on: { vocals: true, drums: true, bass: true, other: true }, part: 'mix' },
  { id: 'karaoke', label: 'No vocals', on: { vocals: false, drums: true, bass: true, other: true }, part: 'instrumental' },
  { id: 'acapella', label: 'Vocals only', on: { vocals: true, drums: false, bass: false, other: false }, part: 'acapella' },
  { id: 'drumless', label: 'No drums', on: { vocals: true, drums: false, bass: true, other: true }, part: 'no-drums' },
]

/** Bars in each stem's waveform. Enough to see a chorus, few enough to draw. */
const WAVEFORM_BARS = 160

/**
 * Below this share of the mix's energy a stem is reported as near-silent —
 * an a cappella has no drums to find, and an empty lane should say so rather
 * than look broken.
 */
const SILENT_SHARE = 1e-4

export function useStemSplitter(options: { preset?: string } = {}) {
  const status = ref<Status>('idle')
  const error = ref('')
  const fileName = ref('')
  const duration = ref(0)
  /** 0–1 while the model downloads. */
  const downloadProgress = ref(0)
  const progress = ref({ done: 0, total: 0 })
  const backend = ref<Backend | null>(null)
  const fellBack = ref(false)
  /** Seconds left, once a window has been timed; null until then. */
  const remaining = ref<number | null>(null)

  /**
   * The stems live in AudioBuffers, and these are views onto their channel
   * data — one copy of the audio serves playback and export alike. At ten
   * minutes a second copy would be another 850 MB.
   */
  const stems = shallowRef<StereoBuffer[] | null>(null)
  const peaks = shallowRef<Float32Array[]>([])
  const silent = ref<Record<Stem, boolean>>({ vocals: false, drums: false, bass: false, other: false })
  let buffers: AudioBuffer[] = []

  // Mixer state. Every change here is a gain change, never a re-run.
  const initial = PRESETS.find(p => p.id === options.preset) ?? PRESETS[0]!
  const on = ref<Record<Stem, boolean>>({ ...initial.on })
  const volume = ref<Record<Stem, number>>({ vocals: 1, drums: 1, bass: 1, other: 1 })
  const solo = ref<Stem | null>(null)

  const playing = ref(false)
  const position = ref(0)

  const hasResult = computed(() => status.value === 'ready' && !!stems.value)
  const busy = computed(() => ['decoding', 'downloading', 'starting', 'separating'].includes(status.value))

  /** What each stem actually contributes, after mute, solo and volume. */
  function gainOf(stem: Stem): number {
    const audible = solo.value ? solo.value === stem : on.value[stem]
    return audible ? volume.value[stem] : 0
  }

  const activePreset = computed(() => {
    if (solo.value)
      return null
    return PRESETS.find(p => STEMS.every(s => p.on[s] === on.value[s] && volume.value[s] === 1)) ?? null
  })

  // ── Separation ────────────────────────────────────────────────────────

  let worker: Worker | null = null
  /** Rejects the separation in flight, so cancelling settles its promise. */
  let abort: ((cause: Error) => void) | null = null
  let startedAt = 0
  let firstWindowAt = 0

  function getWorker(): Worker {
    // Kept alive between songs: the sessions inside it are the expensive
    // part, and a second song should start in milliseconds, not seconds.
    worker ??= new Worker(new URL('../workers/separate.worker.ts', import.meta.url), { type: 'module' })
    return worker
  }

  /**
   * Decoded at 44.1 kHz whatever the file was, because that is the only rate
   * the model knows. Letting the browser resample here means no resampler of
   * our own — and decodeAudioData's is a good one.
   */
  async function decode(file: File): Promise<StereoBuffer> {
    const bytes = await file.arrayBuffer()
    const context = new OfflineAudioContext(2, 1, MODEL.sampleRate)
    let audio: AudioBuffer
    try {
      audio = await context.decodeAudioData(bytes)
    }
    catch {
      throw new Error('This browser could not read that file as audio. MP3, WAV, M4A, FLAC and OGG usually work.')
    }
    if (audio.duration > MAX_SECONDS)
      throw new Error(`That track is ${Math.round(audio.duration / 60)} minutes long. Up to ${MAX_SECONDS / 60} minutes fits in a browser tab's memory.`)
    if (!audio.length)
      throw new Error('That file decoded to silence of zero length.')

    duration.value = audio.duration
    const channels = Array.from({ length: audio.numberOfChannels }, (_, c) => audio.getChannelData(c))
    const stereo = toStereo(channels)
    // Copies, because they are about to be transferred to the worker and
    // the decoded buffer's own storage must not be detached under it.
    return { left: stereo.left.slice(), right: stereo.right.slice() }
  }

  function separate(source: StereoBuffer): Promise<StereoBuffer[]> {
    return new Promise((resolve, reject) => {
      abort = reject
      const w = getWorker()
      w.onmessage = ({ data }: MessageEvent<WorkerMessage>) => {
        switch (data.type) {
          case 'downloading':
            status.value = 'downloading'
            downloadProgress.value = data.progress
            break
          case 'starting':
            status.value = 'starting'
            backend.value = data.backend
            break
          case 'fallback':
            fellBack.value = true
            console.warn('[stem-splitter] WebGPU failed, falling back to wasm:', data.reason)
            break
          case 'progress': {
            status.value = 'separating'
            backend.value = data.backend
            progress.value = { done: data.done, total: data.total }
            const now = performance.now()
            if (data.done === 0) {
              startedAt = now
            }
            else if (data.done === 1) {
              firstWindowAt = now
              remaining.value = ((now - startedAt) / 1000) * (data.total - 1)
            }
            else {
              // Time from the second window on: the first pays for warm-up.
              const each = (now - firstWindowAt) / 1000 / (data.done - 1)
              remaining.value = each * (data.total - data.done)
            }
            break
          }
          case 'done':
            resolve(data.stems)
            break
          case 'error':
            reject(new Error(data.message))
            break
        }
      }
      w.onerror = (event) => {
        event.preventDefault()
        reject(new Error(event.message || 'The separation worker stopped unexpectedly.'))
      }
      const request: SeparateRequest = { type: 'separate', left: source.left, right: source.right }
      w.postMessage(request, [source.left.buffer, source.right.buffer])
    })
  }

  async function process(file: File) {
    reset()
    fileName.value = file.name
    try {
      status.value = 'decoding'
      const source = await decode(file)
      progress.value = { done: 0, total: 0 }
      const result = await separate(source)
      adopt(result)
      status.value = 'ready'
    }
    catch (cause) {
      if (status.value === 'idle')
        return // cancelled
      status.value = 'error'
      error.value = cause instanceof Error ? cause.message : 'Something went wrong splitting that track.'
    }
  }

  function adopt(result: StereoBuffer[]) {
    const length = result[0]!.left.length
    buffers = result.map((stem) => {
      const buffer = new AudioBuffer({ length, numberOfChannels: 2, sampleRate: MODEL.sampleRate })
      buffer.copyToChannel(stem.left, 0)
      buffer.copyToChannel(stem.right, 1)
      return buffer
    })
    const views = buffers.map(b => ({ left: b.getChannelData(0), right: b.getChannelData(1) }))
    stems.value = views
    peaks.value = views.map(v => waveformPeaks(v, WAVEFORM_BARS))

    const energies = views.map(energy)
    const total = energies.reduce((a, b) => a + b, 0) || 1
    silent.value = Object.fromEntries(STEMS.map((s, k) => [s, energies[k]! / total < SILENT_SHARE])) as Record<Stem, boolean>
  }

  /** Stop mid-separation. Terminating is the only interrupt a worker has. */
  function cancel() {
    worker?.terminate()
    worker = null
    status.value = 'idle'
    abort?.(new Error('cancelled'))
    abort = null
    progress.value = { done: 0, total: 0 }
    remaining.value = null
  }

  // ── Playback ──────────────────────────────────────────────────────────

  let context: AudioContext | null = null
  let gains: GainNode[] = []
  let sources: AudioBufferSourceNode[] = []
  let playStartedAt = 0
  let playFrom = 0
  let frame = 0

  function ensureContext(): AudioContext {
    if (!context) {
      context = new AudioContext({ sampleRate: MODEL.sampleRate })
      gains = STEMS.map(() => {
        const gain = context!.createGain()
        gain.connect(context!.destination)
        return gain
      })
      applyGains(true)
    }
    return context
  }

  function applyGains(immediate = false) {
    if (!context)
      return
    STEMS.forEach((stem, k) => {
      const target = gainOf(stem)
      // A short ramp, so toggling a stem mid-song does not click.
      if (immediate)
        gains[k]!.gain.value = target
      else
        gains[k]!.gain.setTargetAtTime(target, context!.currentTime, 0.015)
    })
  }

  watch([on, volume, solo], () => applyGains(), { deep: true })

  function stopSources() {
    for (const source of sources) {
      source.onended = null
      try {
        source.stop()
      }
      catch {}
      source.disconnect()
    }
    sources = []
    cancelAnimationFrame(frame)
  }

  /**
   * Playback is scheduled slightly ahead, so for the first few milliseconds
   * the clock reads before the point it started from.
   */
  function clampTime(seconds: number): number {
    return Math.max(0, Math.min(duration.value, seconds))
  }

  function tick() {
    if (!context || !playing.value)
      return
    position.value = clampTime(playFrom + context.currentTime - playStartedAt)
    frame = requestAnimationFrame(tick)
  }

  async function play() {
    if (!buffers.length)
      return
    const ctx = ensureContext()
    await ctx.resume()
    stopSources()
    if (position.value >= duration.value - 0.05)
      position.value = 0

    playFrom = position.value
    // Every stem starts on the same scheduled instant, slightly ahead, so
    // they stay sample-aligned however long the loop below takes.
    const at = ctx.currentTime + 0.05
    playStartedAt = at
    sources = buffers.map((buffer, k) => {
      const source = ctx.createBufferSource()
      source.buffer = buffer
      source.connect(gains[k]!)
      source.start(at, playFrom)
      return source
    })
    sources[0]!.onended = () => {
      playing.value = false
      position.value = 0
      stopSources()
    }
    playing.value = true
    frame = requestAnimationFrame(tick)
  }

  function pause() {
    if (context && playing.value)
      position.value = clampTime(playFrom + context.currentTime - playStartedAt)
    playing.value = false
    stopSources()
  }

  function toggle() {
    if (playing.value)
      pause()
    else
      void play()
  }

  function seek(seconds: number) {
    position.value = clampTime(seconds)
    if (playing.value)
      void play()
  }

  function applyPreset(preset: MixPreset) {
    solo.value = null
    on.value = { ...preset.on }
    volume.value = { vocals: 1, drums: 1, bass: 1, other: 1 }
  }

  // ── Export ────────────────────────────────────────────────────────────

  function wavBlob(buffer: StereoBuffer): Blob {
    return new Blob([encodeWav(buffer, MODEL.sampleRate) as BlobPart], { type: 'audio/wav' })
  }

  function stemBlob(stem: Stem): Blob | null {
    const index = STEMS.indexOf(stem)
    const buffer = stems.value?.[index]
    return buffer ? wavBlob(buffer) : null
  }

  /** The mix exactly as it is being heard: mutes, solo and volumes applied. */
  function mixBlob(): Blob | null {
    if (!stems.value)
      return null
    return wavBlob(mixStems(stems.value, STEMS.map(gainOf)))
  }

  /** The file-name part for the current mix. */
  const mixPart = computed(() => {
    if (solo.value)
      return solo.value
    return activePreset.value?.part ?? 'custom-mix'
  })

  function zipBlob(name: (stem: Stem) => string): Blob | null {
    if (!stems.value)
      return null
    const entries = STEMS.map((stem, k) => ({ name: name(stem), data: encodeWav(stems.value![k]!, MODEL.sampleRate) }))
    return new Blob([createZip(entries) as BlobPart], { type: 'application/zip' })
  }

  function reset() {
    pause()
    position.value = 0
    status.value = 'idle'
    error.value = ''
    fileName.value = ''
    duration.value = 0
    downloadProgress.value = 0
    progress.value = { done: 0, total: 0 }
    remaining.value = null
    stems.value = null
    peaks.value = []
    buffers = []
    solo.value = null
  }

  onScopeDispose(() => {
    stopSources()
    worker?.terminate()
    void context?.close()
  })

  return {
    status,
    error,
    fileName,
    duration,
    downloadProgress,
    progress,
    backend,
    fellBack,
    remaining,
    hasResult,
    busy,
    peaks,
    silent,
    on,
    volume,
    solo,
    activePreset,
    playing,
    position,
    mixPart,
    process,
    cancel,
    toggle,
    seek,
    applyPreset,
    gainOf,
    stemBlob,
    mixBlob,
    zipBlob,
    reset,
  }
}
