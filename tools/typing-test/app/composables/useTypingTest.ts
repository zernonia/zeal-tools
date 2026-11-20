import type { StoreDefinition } from '../../../../shared/core/storage'
import type { Input, PersonalBest, TestResult, TestSettings, TestState } from '../../core'
import {
  applyInput,
  buildConfig,
  createTest,
  deadline,
  diffInputs,
  displayWpm,
  elapsedSeconds,
  isNewBest,
  modeKey,
  normaliseSettings,
  reviveBests,
  scoreTest,
  tick,
} from '../../core'

interface Stored {
  bests: Record<string, PersonalBest>
}

/**
 * Only the records are kept on the device. The words typed never are — not
 * in storage, not in the address bar, not anywhere beyond this tab.
 */
const store: StoreDefinition<Stored> = {
  key: 'zeal:typing-test',
  version: 1,
  defaults: { bests: {} },
  revive: raw => ({ bests: reviveBests(raw.bests) }),
}

/**
 * The words on first render. Fixed, so the server and the browser agree on
 * the prerendered text; the first fresh draw happens on mount, behind a box
 * of fixed height, so the swap moves nothing on the page.
 */
const FIRST_SEED = 20261120

function freshSeed(): number {
  const bytes = new Uint32Array(1)
  crypto.getRandomValues(bytes)
  return bytes[0]!
}

export function useTypingTest() {
  // The mode is in the address, so a link to "the 60-second test with
  // punctuation" opens exactly that. What was typed is not, by construction:
  // it is not part of the schema.
  const query = useToolState({
    mode: { type: 'string', default: 'time' },
    time: { type: 'number', default: 30 },
    words: { type: 'number', default: 50 },
    punctuation: { type: 'boolean', default: false },
    numbers: { type: 'boolean', default: false },
  } as const)

  const settings = computed<TestSettings>(() => normaliseSettings({
    mode: query.mode,
    duration: query.time,
    words: query.words,
    punctuation: query.punctuation,
    numbers: query.numbers,
  }))

  const { state: saved, available, stored, clear } = useToolStorage(store)
  const { track } = useAnalytics()

  const test = shallowRef<TestState>(createTest(buildConfig(settings.value, FIRST_SEED)))
  const now = ref(0)
  const result = shallowRef<TestResult | null>(null)
  const newBest = ref(false)
  /** The record that stood before this result, for "beat 64 by 3". */
  const previousBest = ref<PersonalBest | null>(null)

  const started = computed(() => test.value.startedAt !== null)
  const finished = computed(() => test.value.finishedAt !== null)
  const running = computed(() => started.value && !finished.value)

  const best = computed<PersonalBest | undefined>(() => saved.value.bests[modeKey(settings.value)])

  /** Seconds left in a timed test, or seconds so far in a word test. */
  const clock = computed(() => {
    const state = test.value
    if (state.config.mode === 'time') {
      const end = deadline(state)
      if (end === null)
        return state.config.duration
      return Math.max(0, Math.ceil((end - (state.finishedAt ?? now.value)) / 1000))
    }
    return Math.floor(elapsedSeconds(state, now.value))
  })

  /**
   * Speed and accuracy while the test runs, scored once a second rather than
   * every frame — a number changing sixty times a second cannot be read.
   */
  const live = shallowRef<{ wpm: number, accuracy: number } | null>(null)
  watch(clock, () => {
    if (!running.value || now.value === 0) {
      live.value = null
      return
    }
    const score = scoreTest(test.value, now.value)
    live.value = { wpm: score.wpm, accuracy: score.accuracy }
  })

  /** 0–1 through the test: time used, or words done. */
  const fraction = computed(() => {
    const state = test.value
    if (state.config.mode === 'time')
      return 1 - clock.value / state.config.duration
    return state.config.words.length ? state.index / state.config.words.length : 0
  })

  let frame = 0
  function loop() {
    now.value = performance.now()
    commit(tick(test.value, now.value))
    if (running.value)
      frame = requestAnimationFrame(loop)
  }

  function commit(next: TestState) {
    if (next === test.value)
      return
    const wasRunning = test.value.startedAt !== null && test.value.finishedAt === null
    test.value = next
    if (next.startedAt !== null && next.finishedAt === null && !frame)
      frame = requestAnimationFrame(loop)
    if (wasRunning && next.finishedAt !== null)
      complete()
  }

  function complete() {
    cancelAnimationFrame(frame)
    frame = 0
    const score = scoreTest(test.value)
    const key = modeKey(settings.value)
    previousBest.value = saved.value.bests[key] ?? null
    newBest.value = isNewBest(score, saved.value.bests[key])
    if (newBest.value) {
      saved.value = {
        bests: {
          ...saved.value.bests,
          [key]: {
            wpm: score.wpm,
            accuracy: score.accuracy,
            raw: score.raw,
            date: new Date().toISOString().slice(0, 10),
          },
        },
      }
    }
    result.value = score
    track('tool_completed', { tool: 'typing-test', format: key })
  }

  function input(event: Input) {
    commit(applyInput(test.value, event, performance.now()))
  }

  /** Feed the change in a text field's value through the state machine. */
  function inputValue(before: string, after: string) {
    for (const event of diffInputs(before, after))
      input(event)
  }

  function restart() {
    cancelAnimationFrame(frame)
    frame = 0
    result.value = null
    newBest.value = false
    previousBest.value = null
    live.value = null
    now.value = 0
    test.value = createTest(buildConfig(settings.value, freshSeed()))
  }

  function update(change: Partial<TestSettings>) {
    const next = { ...settings.value, ...change }
    query.mode = next.mode
    query.time = next.duration
    query.words = next.words
    query.punctuation = next.punctuation
    query.numbers = next.numbers
  }

  // Any change of mode is a new test — including one arriving from the
  // address bar on mount, which is also when the first random draw happens.
  watch(() => modeKey(settings.value), restart)
  onMounted(restart)
  onBeforeUnmount(() => cancelAnimationFrame(frame))

  const summary = computed(() => {
    if (!result.value)
      return ''
    const r = result.value
    const parts = [
      `Test complete: ${displayWpm(r.wpm)} words per minute`,
      `${Math.round(r.accuracy)}% accuracy`,
      `raw speed ${displayWpm(r.raw)}`,
    ]
    return `${parts.join(', ')}.${newBest.value ? ' New personal best.' : ''}`
  })

  return {
    settings,
    test,
    result,
    best,
    newBest,
    previousBest,
    started,
    finished,
    running,
    clock,
    live,
    fraction,
    summary,
    storageAvailable: available,
    hasBests: stored,
    clearBests: clear,
    input,
    inputValue,
    restart,
    update,
  }
}
