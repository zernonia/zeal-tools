import type { NoteReading, Tuning, TuningString } from '../../core'
import {
  DEFAULT_A4,
  detectPitch,
  isInTune,
  midiToFrequency,
  nearestString,
  readNote,
  rms,
  TUNINGS,
} from '../../core'

export type MicState = 'idle' | 'starting' | 'listening' | 'denied' | 'failed'

/**
 * Enough samples to hold several periods of the lowest note we care about.
 *
 * A 5-string bass low B is 30.9 Hz — a period of about 1,400 samples at 44.1
 * kHz — and the detector needs at least two of them inside the window. 8,192
 * samples is roughly 186ms, which is also about as long as a reading can lag
 * before turning a peg stops feeling connected to the display.
 */
const FFT_SIZE = 8192

/** Keep showing the last note briefly after a string decays below the gate. */
const HOLD_MS = 700

export function useTuner() {
  const state = ref<MicState>('idle')
  const error = ref('')
  const tuningId = ref('guitar-standard')
  const a4 = ref(DEFAULT_A4)
  const chromatic = ref(false)

  const frequency = ref(0)
  const reading = ref<NoteReading | null>(null)
  const clarity = ref(0)
  const level = ref(0)

  let audio: AudioContext | null = null
  let stream: MediaStream | null = null
  let analyser: AnalyserNode | null = null
  let buffer: Float32Array | null = null
  let frame = 0
  let lastHeard = 0

  const tuning = computed<Tuning>(() => TUNINGS.find(t => t.id === tuningId.value) ?? TUNINGS[0]!)
  const instruments = computed(() => [...new Set(TUNINGS.map(t => t.instrument))])

  /** The string being aimed at, or null in chromatic mode and when nothing is near. */
  const target = computed<TuningString | null>(() => {
    if (chromatic.value || !frequency.value)
      return null
    return nearestString(frequency.value, tuning.value, a4.value)
  })

  /**
   * How far off, in cents.
   *
   * Measured against the chosen STRING when there is one, not against the
   * nearest chromatic note. Those differ exactly when it matters: a low E
   * tuned a semitone sharp is 100 cents off its string but 0 cents off F, and
   * a tuner that says "in tune" there is worse than useless.
   */
  const cents = computed(() => {
    if (!reading.value)
      return 0
    if (!target.value)
      return reading.value.cents
    const goal = midiToFrequency(target.value.midi, a4.value)
    return Math.round(1200 * Math.log2(frequency.value / goal))
  })

  const inTune = computed(() => !!reading.value && isInTune(cents.value))
  const noteLabel = computed(() => (reading.value ? `${reading.value.note}${reading.value.octave}` : '—'))

  function tick() {
    frame = requestAnimationFrame(tick)
    if (!analyser || !buffer || !audio)
      return

    analyser.getFloatTimeDomainData(buffer as Float32Array<ArrayBuffer>)
    level.value = Math.min(1, rms(buffer) * 6)

    const found = detectPitch(buffer, audio.sampleRate)
    if (found) {
      frequency.value = found.frequency
      clarity.value = found.clarity
      reading.value = readNote(found.frequency, a4.value)
      lastHeard = performance.now()
      return
    }

    // Hold the last note briefly. A plucked string fades below the gate long
    // before the player has finished turning the peg, and blanking the display
    // mid-adjustment is what makes a tuner feel twitchy.
    if (performance.now() - lastHeard > HOLD_MS) {
      reading.value = null
      frequency.value = 0
      clarity.value = 0
    }
  }

  async function start() {
    if (state.value === 'listening' || state.value === 'starting')
      return
    state.value = 'starting'
    error.value = ''
    try {
      // Every one of these is off on purpose. Echo cancellation, noise
      // suppression and automatic gain are tuned for speech: they gate quiet
      // sustained tones, reshape harmonics and pump the level — all of which
      // a pitch detector reads as the note moving.
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      })

      audio = new AudioContext()
      await audio.resume()
      analyser = audio.createAnalyser()
      analyser.fftSize = FFT_SIZE
      // Time-domain data only; smoothing is for the frequency bins and would
      // do nothing here but is set for clarity about what we are reading.
      analyser.smoothingTimeConstant = 0
      audio.createMediaStreamSource(stream).connect(analyser)
      buffer = new Float32Array(analyser.fftSize)

      state.value = 'listening'
      frame = requestAnimationFrame(tick)
    }
    catch (cause) {
      stop()
      if (cause instanceof DOMException && (cause.name === 'NotAllowedError' || cause.name === 'SecurityError')) {
        state.value = 'denied'
        error.value = 'Microphone access was blocked. Allow it in your browser to tune.'
      }
      else {
        state.value = 'failed'
        error.value = 'No microphone was available.'
      }
    }
  }

  function stop() {
    cancelAnimationFrame(frame)
    frame = 0
    stream?.getTracks().forEach(track => track.stop())
    void audio?.close()
    stream = null
    audio = null
    analyser = null
    buffer = null
    reading.value = null
    frequency.value = 0
    level.value = 0
    clarity.value = 0
    if (state.value === 'listening' || state.value === 'starting')
      state.value = 'idle'
  }

  onScopeDispose(stop)

  return {
    state,
    error,
    tuningId,
    tuning,
    instruments,
    a4,
    chromatic,
    frequency,
    reading,
    noteLabel,
    cents,
    inTune,
    clarity,
    level,
    target,
    start,
    stop,
    tunings: TUNINGS,
    midiToFrequency,
  }
}
