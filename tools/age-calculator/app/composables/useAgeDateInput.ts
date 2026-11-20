import type { Ref } from 'vue'

/**
 * Bind a date field to a URL-state string that is empty while it means "the
 * default" — today, usually. The field always shows a real date; the URL only
 * records one the visitor chose, so an old link keeps meaning "today" on the
 * day it is opened.
 *
 * While the field holds no valid date it reads '' and the state keeps its
 * last good value. When the default itself moves (the prerendered "today"
 * giving way to the visitor's own on mount), a field still showing the old
 * default follows it.
 */
export function useAgeDateInput(get: () => string, set: (value: string) => void, fallback: Ref<string>) {
  const input = ref(get() || fallback.value)
  watch(input, (value) => {
    if (value)
      set(value === fallback.value ? '' : value)
  })
  // A date arriving from the URL on mount.
  watch(get, (value) => {
    if (value && value !== input.value)
      input.value = value
  })
  watch(fallback, (now, before) => {
    if (!get() && input.value === before)
      input.value = now
  })
  return input
}

/**
 * Today in the visitor's time zone, as `YYYY-MM-DD`. The page is prerendered,
 * so the server's idea of today travels in the payload and the first client
 * render matches the HTML exactly; the real local date replaces it on mount.
 */
export function useAgeToday(localIso: () => string) {
  const today = useState('age-calculator-today', localIso)
  onMounted(() => today.value = localIso())
  return today
}
