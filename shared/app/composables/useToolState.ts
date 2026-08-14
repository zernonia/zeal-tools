import { reactive, watch } from 'vue'
import { decodeState, defaultState, encodeState, type StateOf, type StateSchema } from '../../core/url-state'

/**
 * Shareable tool state: initialized from the URL query, written back with a
 * debounced replaceState. Fields marked `secret` in the schema are excluded
 * from serialization by construction.
 */
export function useToolState<S extends StateSchema>(schema: S) {
  const state = reactive(defaultState(schema)) as StateOf<S>

  onMounted(() => {
    Object.assign(state, decodeState(schema, new URLSearchParams(window.location.search)))
  })

  let timer: ReturnType<typeof setTimeout> | undefined
  watch(state, () => {
    if (!import.meta.client) return
    clearTimeout(timer)
    timer = setTimeout(() => {
      const qs = encodeState(schema, state)
      const url = qs ? `${window.location.pathname}?${qs}` : window.location.pathname
      window.history.replaceState(window.history.state, '', url)
    }, 300)
  }, { deep: true })

  return state
}
