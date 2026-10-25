import type { Anchor, ClickKind, ScheduledClick, Subdivision } from '../../core'
import {
  asSubdivision,
  clampBeats,
  clampBpm,
  CLICK_SOUND,
  formatPattern,
  nextLevel,
  parsePattern,
  reanchor,
  scheduleClicks,
  TAP_RESET_MS,
  tapTempo,
  tempoMarking,
} from '../../core'

/** How far ahead clicks are handed to the audio clock, in seconds. */
const LOOKAHEAD = 0.12
/** How often the scheduler wakes, in milliseconds. */
const WAKE_MS = 25

/**
 * The scheduler's wake-up timer runs in a worker.
 *
 * A background tab throttles its own timers to once a second, which would
 * starve a 120 ms lookahead and leave gaps — exactly when someone has
 * switched to their sheet music. Worker timers are not throttled that way.
 * Inline as a blob because it is three lines; a bundled worker file would be
 * a build-config change for no gain.
 */
const TICKER_SOURCE = `let id;onmessage=e=>{clearInterval(id);if(e.data==='start')id=setInterval(()=>postMessage(0),${WAKE_MS})}`

export function useMetronome() {
  const state = useToolState({
    bpm: { type: 'number', default: 120 },
    beats: { type: 'number', default: 4 },
    sub: { type: 'number', default: 1 },
    pattern: { type: 'string', default: '' },
  } as const)

  const bpm = computed({
    get: () => clampBpm(state.bpm),
    set: (value: number) => state.bpm = clampBpm(value),
  })
  const beats = computed({
    get: () => clampBeats(state.beats),
    set: (value: number) => state.beats = clampBeats(value),
  })
  const subdivision = computed({
    get: () => asSubdivision(state.sub),
    set: (value: Subdivision) => state.sub = value,
  })
  const levels = computed(() => parsePattern(state.pattern, beats.value))
  const marking = computed(() => tempoMarking(bpm.value))

  const playing = ref(false)
  const supported = ref(true)
  const volume = ref(0.8)
  /** Beat currently sounding, for the lights; -1 when stopped. */
  const currentBeat = ref(-1)
  const currentKind = ref<ClickKind | null>(null)
  /** Which note inside the beat is sounding — 0 is the beat itself. */
  const currentSub = ref(-1)

  let context: AudioContext | null = null
  let master: GainNode | null = null
  let ticker: Worker | null = null
  let fallback: ReturnType<typeof setInterval> | undefined
  let frame = 0
  let anchor: Anchor = { tick: 0, time: 0 }
  let nextTick = 0
  /** Clicks handed to the audio clock but not yet heard, for the lights. */
  let queue: ScheduledClick[] = []
  let taps: number[] = []
  /** Bumped on every tap, from the button or the T key, to replay its animation. */
  const tapCount = ref(0)

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

  /**
   * One click: a sine blip with a 1 ms attack and a fast exponential decay.
   * Synthesised, not sampled — nothing to download, and the pitch alone tells
   * an accent from a beat from a subdivision.
   */
  function sound(ctx: AudioContext, time: number, kind: ClickKind) {
    if (kind === 'mute')
      return
    const { frequency, gain: level } = CLICK_SOUND[kind]
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.frequency.value = frequency
    gain.gain.setValueAtTime(0, time)
    gain.gain.linearRampToValueAtTime(level, time + 0.001)
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.05)
    osc.connect(gain)
    gain.connect(master!)
    osc.start(time)
    osc.stop(time + 0.06)
  }

  function schedule() {
    const ctx = context
    if (!ctx || !playing.value)
      return
    const clicks = scheduleClicks(anchor, nextTick, ctx.currentTime + LOOKAHEAD, bpm.value, levels.value, subdivision.value)
    for (const click of clicks)
      sound(ctx, click.time, click.kind)
    const last = clicks.at(-1)
    if (last) {
      nextTick = last.tick + 1
      queue.push(...clicks)
    }
  }

  /** Lights follow the audio clock, not the timer, so they match what you hear. */
  function draw() {
    const ctx = context
    if (!ctx || !playing.value)
      return
    while (queue.length && queue[0]!.time <= ctx.currentTime) {
      const click = queue.shift()!
      currentBeat.value = click.beat
      currentKind.value = click.kind
      currentSub.value = click.tick % subdivision.value
    }
    frame = requestAnimationFrame(draw)
  }

  function startTicker() {
    try {
      if (!ticker) {
        const url = URL.createObjectURL(new Blob([TICKER_SOURCE], { type: 'text/javascript' }))
        ticker = new Worker(url)
        URL.revokeObjectURL(url)
      }
      ticker.onmessage = schedule
      ticker.postMessage('start')
    }
    catch {
      fallback = setInterval(schedule, WAKE_MS)
    }
  }

  function stopTicker() {
    ticker?.postMessage('stop')
    clearInterval(fallback)
  }

  function start() {
    const ctx = ensureContext()
    if (!ctx)
      return
    if (ctx.state === 'suspended')
      void ctx.resume()
    // A short lead-in, so the first click is not already late by the time
    // a resumed context starts running.
    anchor = { tick: 0, time: ctx.currentTime + 0.05 }
    nextTick = 0
    queue = []
    playing.value = true
    schedule()
    startTicker()
    frame = requestAnimationFrame(draw)
  }

  function stop() {
    playing.value = false
    stopTicker()
    cancelAnimationFrame(frame)
    queue = []
    currentBeat.value = -1
    currentKind.value = null
    currentSub.value = -1
  }

  function toggle() {
    if (playing.value)
      stop()
    else
      start()
  }

  // Mid-play changes land on the next beat; see `reanchor`.
  watch([bpm, subdivision], ([, sub], [oldBpm, oldSub]) => {
    if (!playing.value)
      return
    anchor = reanchor(anchor, nextTick, { bpm: oldBpm, subdivision: oldSub }, sub)
    nextTick = anchor.tick
  })

  watch(volume, (value) => {
    if (master && context)
      master.gain.setTargetAtTime(value, context.currentTime, 0.02)
  })

  function tap() {
    tapCount.value++
    const now = performance.now()
    if (taps.length && now - taps.at(-1)! > TAP_RESET_MS)
      taps = []
    taps = [...taps.slice(-15), now]
    const tempo = tapTempo(taps)
    if (tempo !== null)
      bpm.value = tempo
  }

  function cycleBeat(index: number) {
    const next = [...levels.value]
    next[index] = nextLevel(next[index]!)
    state.pattern = formatPattern(next)
  }

  function nudge(delta: number) {
    bpm.value = bpm.value + delta
  }

  function onKeydown(event: KeyboardEvent) {
    const target = event.target as HTMLElement | null
    if (event.metaKey || event.ctrlKey || event.altKey)
      return
    if (target?.closest('input, textarea, select, [role="slider"], [contenteditable="true"]'))
      return
    if (event.key === ' ') {
      // Space on a focused button already presses that button.
      if (target?.closest('button, a'))
        return
      event.preventDefault()
      toggle()
    }
    else if (event.key.toLowerCase() === 't') {
      tap()
    }
    // Not the arrow keys: those scroll the page, and most of this page is
    // reading below the tool.
    else if (event.key === '+' || event.key === '=') {
      nudge(1)
    }
    else if (event.key === '-' || event.key === '_') {
      nudge(-1)
    }
  }

  onMounted(() => window.addEventListener('keydown', onKeydown))
  onUnmounted(() => {
    window.removeEventListener('keydown', onKeydown)
    stop()
    ticker?.terminate()
    ticker = null
    void context?.close()
    context = null
  })

  return {
    bpm,
    beats,
    subdivision,
    levels,
    marking,
    playing,
    supported,
    volume,
    currentBeat,
    currentKind,
    currentSub,
    tapCount,
    start,
    stop,
    toggle,
    tap,
    cycleBeat,
    nudge,
  }
}
