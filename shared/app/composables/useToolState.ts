import { reactive, watch } from 'vue'
import { decodePresentState, defaultState, encodeState, type StateOf, type StateSchema } from '../../core/url-state'

/**
 * Shareable tool state: initialized from the URL query, written back with a
 * debounced replaceState. Fields marked `secret` in the schema are excluded
 * from serialization by construction.
 */
export function useToolState<S extends StateSchema>(schema: S) {
  const state = reactive(defaultState(schema)) as StateOf<S>
  // The router's parsed query survives the trailing-slash/history
  // normalization that happens around hydration — window.location does not.
  const route = useRoute()

  onMounted(() => {
    const params = new URLSearchParams()
    for (const [key, value] of Object.entries(route.query)) {
      const first = Array.isArray(value) ? value[0] : value
      if (typeof first === 'string') params.set(key, first)
    }
    // Only params actually present apply — programmatic presets (like a
    // long-tail page's default tab) survive hydration.
    Object.assign(state, decodePresentState(schema, params))
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
