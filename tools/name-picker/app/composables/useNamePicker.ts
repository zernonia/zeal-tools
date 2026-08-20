import type { StoreDefinition } from '../../../../shared/core/storage'
import type { Entry } from '../../core'
import { createRandomInt, shuffle } from '../../../../shared/core/random'
import { safeBoolean, safeText } from '../../../../shared/core/storage'
import { formatEntries, MAX_ENTRIES, parseEntries, pickIndex, rotationFor, without } from '../../core'

export interface Stored {
  names: string
  removeWinner: boolean
}

/** Something on the wheel on the first visit, so the tool explains itself. */
const SAMPLE = ['Ada', 'Grace', 'Linus', 'Katherine', 'Alan', 'Radia', 'Hedy', 'Tim'].join('\n')

const store: StoreDefinition<Stored> = {
  key: 'zeal:name-picker',
  version: 1,
  defaults: { names: SAMPLE, removeWinner: false },
  revive: (raw, base) => ({
    // Newlines are the record separator here, so they survive; `safeText`
    // would strip them along with the control characters it exists to remove.
    names: typeof raw.names === 'string'
      ? raw.names.split('\n').map(line => safeText(line, '', 80)).slice(0, MAX_ENTRIES).join('\n')
      : base.names,
    removeWinner: safeBoolean(raw.removeWinner, base.removeWinner),
  }),
}

/**
 * How long the wheel turns, and how far.
 *
 * Long enough to feel like a draw rather than a jump cut, short enough that
 * nobody drumming their fingers waits through it twice. The turns are what
 * make the landing unreadable in advance — with one turn you can watch the
 * slice come round and know the answer before it stops.
 */
const SPIN_MS = 5200
const TURNS = 6

export function useNamePicker() {
  const { state, ready, available, stored, clear } = useToolStorage(store)
  const { track } = useAnalytics()

  const entries = computed<Entry[]>(() => parseEntries(state.value.names))

  const rotation = ref(0)
  const duration = ref(SPIN_MS)
  const spinning = ref(false)
  const winner = ref<Entry | null>(null)
  const history = ref<string[]>([])

  const randomInt = createRandomInt(bytes => crypto.getRandomValues(bytes))
  let timer: ReturnType<typeof setTimeout> | null = null

  const canSpin = computed(() => ready.value && entries.value.length > 0 && !spinning.value)

  function spin() {
    if (!canSpin.value)
      return

    // The winner is decided HERE, by the same unbiased draw the password
    // generator uses — before a single frame is rendered. The animation is
    // then aimed at that answer. Reading a name off wherever the wheel
    // happened to stop would make fairness a property of an easing curve.
    const index = pickIndex(entries.value, randomInt)
    if (index < 0)
      return

    const chosen = entries.value[index]!
    winner.value = null

    // A whole number of turns added to where it already is, so the wheel only
    // ever moves forwards and never rewinds between draws.
    const base = Math.ceil(rotation.value / 360) * 360
    const position = randomInt(1000) / 1000

    // The system-wide reduced-motion rule already zeroes the transition in
    // CSS; matching it here keeps the announcement in step, because a
    // transition of no duration fires no transitionend to wait for.
    const reduced = import.meta.client && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    duration.value = reduced ? 0 : SPIN_MS

    spinning.value = true
    rotation.value = base + rotationFor(index, entries.value, TURNS, position)

    if (timer)
      clearTimeout(timer)
    timer = setTimeout(settle, duration.value, chosen, index)
  }

  function settle(chosen: Entry, index: number) {
    spinning.value = false
    winner.value = chosen
    history.value = [chosen.label, ...history.value].slice(0, 50)
    track('tool_completed', { tool: 'name-picker', format: 'spin' })

    if (!state.value.removeWinner)
      return

    // Taking the name out changes every slice's position, so the wheel would
    // now be pointing at somebody else. Snapping back to the start — with no
    // transition, so it reads as a reset rather than a second spin — keeps the
    // picture honest while the banner still names the winner.
    state.value.names = formatEntries(without(entries.value, index))
    duration.value = 0
    rotation.value = 0
  }

  // ------------------------------------------------------------- list edits

  function apply(next: Entry[]) {
    state.value.names = formatEntries(next)
    duration.value = 0
    rotation.value = 0
    winner.value = null
  }

  const shuffleNames = () => apply(shuffle(entries.value, randomInt))
  const sortNames = () => apply([...entries.value].sort((a, b) => a.label.localeCompare(b.label)))

  function dedupe() {
    const seen = new Set<string>()
    apply(entries.value.filter((entry) => {
      const key = entry.label.toLowerCase()
      if (seen.has(key))
        return false
      seen.add(key)
      return true
    }))
  }

  function removeAt(index: number) {
    apply(without(entries.value, index))
  }

  function reset() {
    history.value = []
    winner.value = null
    duration.value = 0
    rotation.value = 0
  }

  onBeforeUnmount(() => {
    if (timer)
      clearTimeout(timer)
  })

  return {
    state,
    ready,
    available,
    stored,
    clear,
    entries,
    rotation,
    duration,
    spinning,
    winner,
    history,
    canSpin,
    spin,
    shuffleNames,
    sortNames,
    dedupe,
    removeAt,
    reset,
  }
}
