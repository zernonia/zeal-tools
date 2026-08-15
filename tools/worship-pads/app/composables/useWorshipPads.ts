import { clampFade, padForShortcut, padKeys } from '../../core'

/**
 * Web Audio pad engine. Each key gets its own gain node; switching keys
 * crossfades the old one out while the new one comes up, so there is never a
 * gap — which is the entire point of a pad.
 *
 * Nothing is fetched: the sound is six detuned oscillator pairs through a
 * lowpass filter, generated on the fly. No files means no buffering and no
 * bandwidth at a venue with bad wifi.
 */
export function useWorshipPads() {
  const major = ref(true)
  const activeKey = ref<string | null>(null)
  const fadeSeconds = ref(4)
  const volume = ref(0.6)
  const supported = ref(true)

  const keys = computed(() => padKeys(major.value))

  let context: AudioContext | null = null
  let master: GainNode | null = null
  /** Voices currently sounding, keyed by pad key so we can fade the right one. */
  const voices = new Map<string, { gain: GainNode, stop: () => void }>()

  function ensureContext(): AudioContext | null {
    if (context)
      return context
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) {
      supported.value = false
      return null
    }
    context = new Ctor()
    master = context.createGain()
    master.gain.value = volume.value
    master.connect(context.destination)
    return context
  }

  /** Build one sustained voice: detuned pairs per pitch, filtered and slow-attacked. */
  function createVoice(ctx: AudioContext, frequencies: number[]) {
    const gain = ctx.createGain()
    gain.gain.value = 0

    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = 1200
    filter.Q.value = 0.6
    filter.connect(gain)
    gain.connect(master!)

    const oscillators: OscillatorNode[] = []
    for (const [index, frequency] of frequencies.entries()) {
      // A pair a few cents apart gives the slow beating that makes a pad
      // sound wide rather than like a single organ tone.
      for (const detune of [-6, 6]) {
        const osc = ctx.createOscillator()
        osc.type = index < 2 ? 'sine' : 'triangle'
        osc.frequency.value = frequency
        osc.detune.value = detune

        const voiceGain = ctx.createGain()
        // Roll off the upper voices so the pad sits under the band.
        voiceGain.gain.value = 0.5 / (index + 1.5)
        osc.connect(voiceGain)
        voiceGain.connect(filter)
        osc.start()
        oscillators.push(osc)
      }
    }

    return {
      gain,
      stop: () => {
        for (const osc of oscillators) {
          try {
            osc.stop()
          }
          catch {
            // already stopped
          }
        }
      },
    }
  }

  function fadeOut(key: string, ctx: AudioContext, seconds: number) {
    const voice = voices.get(key)
    if (!voice)
      return
    voices.delete(key)
    const now = ctx.currentTime
    voice.gain.gain.cancelScheduledValues(now)
    voice.gain.gain.setValueAtTime(voice.gain.gain.value, now)
    voice.gain.gain.linearRampToValueAtTime(0, now + seconds)
    setTimeout(() => voice.stop(), seconds * 1000 + 200)
  }

  function play(key: string) {
    const ctx = ensureContext()
    if (!ctx)
      return
    if (ctx.state === 'suspended')
      void ctx.resume()

    const seconds = clampFade(fadeSeconds.value)

    if (activeKey.value === key) {
      stop()
      return
    }

    for (const existing of [...voices.keys()])
      fadeOut(existing, ctx, seconds)

    const pad = keys.value.find(candidate => candidate.key === key)
    if (!pad)
      return

    const voice = createVoice(ctx, pad.voicing)
    voices.set(key, voice)
    const now = ctx.currentTime
    voice.gain.gain.setValueAtTime(0, now)
    voice.gain.gain.linearRampToValueAtTime(1, now + seconds)
    activeKey.value = key
  }

  function stop() {
    const ctx = context
    if (!ctx)
      return
    const seconds = clampFade(fadeSeconds.value)
    for (const key of [...voices.keys()])
      fadeOut(key, ctx, seconds)
    activeKey.value = null
  }

  watch(volume, (value) => {
    if (master && context)
      master.gain.setTargetAtTime(value, context.currentTime, 0.05)
  })

  // Switching major/minor while sounding should follow the change, not stop.
  watch(major, () => {
    if (activeKey.value) {
      const current = activeKey.value
      activeKey.value = null
      play(current)
    }
  })

  function onKeydown(event: KeyboardEvent) {
    const target = event.target as HTMLElement | null
    if (target && (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable))
      return

    if (event.key === 'Escape' || event.key === ' ') {
      event.preventDefault()
      stop()
      return
    }
    const pad = padForShortcut(event.key, major.value)
    if (pad) {
      event.preventDefault()
      play(pad.key)
    }
  }

  onMounted(() => window.addEventListener('keydown', onKeydown))
  onUnmounted(() => {
    window.removeEventListener('keydown', onKeydown)
    for (const voice of voices.values())
      voice.stop()
    voices.clear()
    void context?.close()
    context = null
  })

  return { keys, activeKey, major, fadeSeconds, volume, supported, play, stop }
}
