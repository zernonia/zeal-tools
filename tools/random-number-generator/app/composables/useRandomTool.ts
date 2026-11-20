import type { InjectionKey } from 'vue'
import type { RandomBelow } from '../../core'
import { createRandomBelow } from '../../core'

export type RandomMode = 'numbers' | 'coin' | 'dice'

export const RANDOM_TOOL = 'random-number-generator'

/**
 * Shareable settings. A variant page presets its mode as the schema default
 * rather than assigning it after mount, so `/flip-a-coin` opens on the coin
 * without `?mode=coin` appearing in every link copied from it.
 *
 * Results are deliberately not in the URL: a shared link should reproduce
 * the settings, not let anyone pass off a chosen number as a fresh draw.
 */
export function randomStateSchema(mode: RandomMode) {
  return {
    mode: { type: 'string' as const, default: mode },
    min: { type: 'number' as const, default: 1 },
    max: { type: 'number' as const, default: 100 },
    count: { type: 'number' as const, default: 1 },
    unique: { type: 'boolean' as const, default: false },
    sort: { type: 'string' as const, default: 'none' },
    decimals: { type: 'number' as const, default: 0 },
    flips: { type: 'number' as const, default: 1 },
    dice: { type: 'string' as const, default: '2d6' },
  }
}

export type RandomState = ReturnType<typeof useRandomState>

export function useRandomState(mode: RandomMode) {
  return useToolState(randomStateSchema(mode))
}

/**
 * One state for the whole tool, handed to each panel. Each panel calling
 * `useToolState` itself would give three copies racing to write the URL.
 */
export const RANDOM_STATE: InjectionKey<RandomState> = Symbol('random-state')

export function injectRandomState(): RandomState {
  const state = inject(RANDOM_STATE)
  if (!state)
    throw new Error('Random panels must sit inside RandomNumberGeneratorTool.')
  return state
}

/**
 * The OS random source. Created lazily because `crypto` is only reached from
 * a click handler or `onMounted` — never during server rendering, where a
 * number drawn would be baked into the prerendered page for everyone.
 */
let source: RandomBelow | undefined
export function drawBelow(n: number): number {
  source ??= createRandomBelow(bytes => crypto.getRandomValues(bytes))
  return source(n)
}

/** True when the reader has asked the system for less motion. */
export function randomReducedMotion(): boolean {
  return import.meta.client && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * `tool_completed` once per mode per visit, on a press — not on the example
 * drawn at load, and not for every one of fifty rolls in a session.
 */
const reported = new Set<string>()
export function useRandomCompletion() {
  const { track } = useAnalytics()
  return (format: string) => {
    if (reported.has(format))
      return
    reported.add(format)
    track('tool_completed', { tool: RANDOM_TOOL, format })
  }
}

/** Copy with a short-lived "Copied" state, reported as the clipboard format. */
export function useRandomCopy() {
  const { track } = useAnalytics()
  const copied = ref(false)
  let timer: ReturnType<typeof setTimeout> | undefined
  async function copy(text: string) {
    if (!text)
      return
    await navigator.clipboard.writeText(text)
    copied.value = true
    clearTimeout(timer)
    timer = setTimeout(() => copied.value = false, 1600)
    track('tool_completed', { tool: RANDOM_TOOL, format: 'clipboard' })
  }
  return { copied, copy }
}
