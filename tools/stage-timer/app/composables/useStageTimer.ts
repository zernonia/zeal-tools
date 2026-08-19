import type { TimerState } from '../../core'
import { adjustTimer, pauseTimer, readTimer, resetTimer, setCountUp, startTimer } from '../../core'

const CHANNEL = 'zeal-stage-timer'

interface Broadcast {
  kind: 'state' | 'hello'
  state?: TimerState
  message?: string
}

/**
 * Stage timer state, shared between the presenter window and the stage window.
 *
 * Sync is a BroadcastChannel — same-origin, same browser, no server and no
 * account. The presenter owns the state; the stage view is a pure reader that
 * asks for the current state when it opens, because a channel only delivers
 * live messages and the stage screen is usually opened second.
 */
export function useStageTimer(role: 'presenter' | 'stage') {
  const state = reactive<TimerState>({
    durationSeconds: 300,
    warnSeconds: 60,
    startedAt: null,
    elapsedBefore: 0,
    running: false,
    countUp: false,
  })

  /** Optional line shown under the clock, e.g. "wrap up" or a speaker's name. */
  const message = ref('')
  const now = ref(Date.now())

  const reading = computed(() => readTimer(state, now.value))

  let channel: BroadcastChannel | null = null
  let ticker: ReturnType<typeof setInterval> | undefined

  function publish() {
    channel?.postMessage({ kind: 'state', state: { ...state }, message: message.value } satisfies Broadcast)
  }

  function apply(next: TimerState, nextMessage: string) {
    Object.assign(state, next)
    message.value = nextMessage
  }

  /** Presenter actions. Each one mutates then publishes, so the stage follows. */
  function start() {
    apply(startTimer({ ...state }, Date.now()), message.value)
    publish()
  }
  function pause() {
    apply(pauseTimer({ ...state }, Date.now()), message.value)
    publish()
  }
  function reset() {
    apply(resetTimer({ ...state }), message.value)
    publish()
  }
  function adjust(deltaSeconds: number) {
    apply(adjustTimer({ ...state }, deltaSeconds), message.value)
    publish()
  }
  function setDuration(seconds: number) {
    state.durationSeconds = Math.max(0, Math.round(seconds))
    publish()
  }
  function setWarn(seconds: number) {
    state.warnSeconds = Math.max(0, Math.round(seconds))
    publish()
  }
  /**
   * Direction lives in the shared state, so flipping it here reaches the stage
   * screen through the same publish the other controls use — no second channel
   * and no chance of the two windows disagreeing.
   */
  function setDirection(countUp: boolean) {
    apply(setCountUp({ ...state }, countUp), message.value)
    publish()
  }

  function setMessage(text: string) {
    message.value = text
    publish()
  }

  onMounted(() => {
    ticker = setInterval(() => now.value = Date.now(), 200)

    if (typeof BroadcastChannel === 'undefined')
      return

    channel = new BroadcastChannel(CHANNEL)
    channel.onmessage = (event: MessageEvent<Broadcast>) => {
      const data = event.data
      // A stage window that just opened asks for the current state.
      if (data.kind === 'hello') {
        if (role === 'presenter')
          publish()
        return
      }
      if (data.kind === 'state' && data.state && role === 'stage')
        apply(data.state, data.message ?? '')
    }

    if (role === 'stage')
      channel.postMessage({ kind: 'hello' } satisfies Broadcast)
  })

  onUnmounted(() => {
    clearInterval(ticker)
    channel?.close()
    channel = null
  })

  return { state, message, reading, start, pause, reset, adjust, setDuration, setWarn, setDirection, setMessage }
}
