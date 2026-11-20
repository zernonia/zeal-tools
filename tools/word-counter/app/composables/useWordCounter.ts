import type { StoreDefinition } from '../../../../shared/core/storage'
import type { Analysis, CaseId, Composition } from '../../core'
import { safeBoolean } from '../../../../shared/core/storage'
import { analyse, CASES, composition, convertCase } from '../../core'

/**
 * Never `useToolState`: the text is the one thing on this page that must not
 * end up in a URL, where it would sit in history, in referrers and in any link
 * someone shares. It may be kept on this device, and only if the visitor
 * leaves "Remember" on.
 */
interface Stored {
  text: string
  remember: boolean
}

/** Something to measure on the first visit, so the tool explains itself. */
export const SAMPLE = `Paste or type your text here, and everything around it updates as you go: words, characters, sentences and reading time.

Try the case buttons to turn a heading into Title Case, or a list of field names into snake_case. Nothing you type is uploaded — it’s counted right here, in your browser.`

/** Bounded, because stored data is input like any other. */
const MAX_STORED = 200_000

const store: StoreDefinition<Stored> = {
  key: 'zeal:word-counter',
  version: 1,
  defaults: { text: SAMPLE, remember: true },
  revive: (raw, base) => ({
    text: typeof raw.text === 'string' ? raw.text.slice(0, MAX_STORED) : base.text,
    remember: safeBoolean(raw.remember, base.remember),
  }),
}

/** Above this, analysis waits for a pause in typing rather than every key. */
const LIVE_LIMIT = 20_000

export function useWordCounter() {
  const { state, ready, available } = useToolStorage(store)

  const text = ref(SAMPLE)
  const analysis = shallowRef<Analysis>(analyse(SAMPLE))
  /** Display-only, so it stays out of `analyse` and the API's response. */
  const parts = shallowRef<Composition>(composition(SAMPLE))
  function measure(value: string) {
    analysis.value = analyse(value)
    parts.value = composition(value)
  }

  /** Previous texts, newest last, for undoing a conversion or a clear. */
  const history = ref<{ text: string, action: string }[]>([])
  const lastAction = computed(() => history.value.at(-1)?.action ?? '')

  watch(ready, (isReady) => {
    if (isReady && state.value.remember && state.value.text !== text.value)
      text.value = state.value.text
  })

  let analyseTimer: ReturnType<typeof setTimeout> | undefined
  watch(text, (value) => {
    clearTimeout(analyseTimer)
    if (value.length <= LIVE_LIMIT)
      measure(value)
    else
      analyseTimer = setTimeout(measure, 250, value)

    if (ready.value && state.value.remember)
      state.value.text = value.slice(0, MAX_STORED)
  })

  const remember = computed({
    get: () => state.value.remember,
    // `'indeterminate'` is part of the checkbox's model type; it never sends it here.
    set: (value: boolean | 'indeterminate') => {
      const on = value === true
      // Turning it off forgets what was kept, not just what comes next.
      state.value = { remember: on, text: on ? text.value.slice(0, MAX_STORED) : '' }
    },
  })

  function replace(next: string, action: string) {
    if (next === text.value)
      return
    history.value.push({ text: text.value, action })
    if (history.value.length > 20)
      history.value.shift()
    text.value = next
  }

  function undo() {
    const previous = history.value.pop()
    if (previous)
      text.value = previous.text
  }

  function clear() {
    replace('', 'Cleared')
  }

  function convert(id: CaseId) {
    const label = CASES.find(option => option.id === id)?.label ?? id
    replace(convertCase(text.value, id), `Converted to ${label}`)
  }

  onBeforeUnmount(() => clearTimeout(analyseTimer))

  return { text, analysis, parts, ready, available, remember, history, lastAction, replace, undo, clear, convert }
}
