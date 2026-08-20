import type { StoreDefinition } from '../../core/storage'
import { deserialize, serialize } from '../../core/storage'

/**
 * Keep a tool's settings on the device between visits.
 *
 * Two constraints shape this. Pages here are **prerendered**, so the stored
 * value cannot exist at render time — reading it during setup would render
 * one thing on the server and another in the browser, and Vue would complain.
 * So the first render always shows the defaults and the stored value arrives
 * on mount. `ready` is exposed for anything that must not act until then.
 *
 * And writing is deliberately gated on having read first. Without that gate
 * the watcher fires on the initial defaults and overwrites a perfectly good
 * saved value with an empty one before the read has landed.
 */
export function useToolStorage<T extends object>(definition: StoreDefinition<T>) {
  const state = ref<T>({ ...definition.defaults }) as Ref<T>
  const ready = ref(false)
  /** False when the browser refuses storage — private mode, or a blocked origin. */
  const available = ref(true)

  function read(): T {
    try {
      return deserialize(localStorage.getItem(definition.key), definition)
    }
    catch {
      // Access itself can throw when storage is disabled, not just be empty.
      available.value = false
      return { ...definition.defaults }
    }
  }

  onMounted(() => {
    state.value = read()
    ready.value = true
  })

  watch(state, (value) => {
    if (!ready.value || !available.value)
      return
    try {
      localStorage.setItem(definition.key, serialize(value, definition))
    }
    catch {
      // Quota, or storage turned off mid-session. The tool keeps working; it
      // simply stops remembering, which is the honest degradation.
      available.value = false
    }
  }, { deep: true })

  /** Forget everything and start from defaults. */
  function clear() {
    try {
      localStorage.removeItem(definition.key)
    }
    catch {
      available.value = false
    }
    state.value = { ...definition.defaults }
  }

  /** Whether anything is actually stored, for a "saved on this device" hint. */
  const stored = computed(() => ready.value && JSON.stringify(state.value) !== JSON.stringify(definition.defaults))

  return { state, ready, available, stored, clear }
}
