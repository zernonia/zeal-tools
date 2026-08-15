import type { EmitFn, Ref } from 'vue'
import { computed, customRef, onMounted, onScopeDispose, ref, toValue, watchEffect } from 'vue'

/**
 * Small stand-ins for the four @vueuse/core helpers the ported shadcn-vue
 * components use. Writing ~60 lines here rather than taking the dependency
 * keeps `package.json` auditable in an afternoon, which is the whole point of
 * the zero-dependency stance — and these are the only four we need.
 *
 * They live in `utils/` so Nuxt auto-imports them and the ported components
 * work with their `@vueuse/core` import line simply deleted.
 */

/** `document` on the client, undefined during SSR. */
export const defaultDocument = import.meta.client ? document : undefined

/**
 * Reactive copy of an object without some keys. Returns a computed rather
 * than a reactive proxy, matching how the rest of `ui/` already strips
 * `class` before forwarding props.
 */
export function reactiveOmit<T extends object, K extends keyof T>(source: T, ...keys: (K | K[])[]) {
  const omitted = keys.flat() as (string | number | symbol)[]
  return computed(() => {
    const out = { ...toValue(source) } as Record<string | number | symbol, unknown>
    for (const key of omitted)
      delete out[key]
    return out as Omit<T, K>
  })
}

/**
 * Tracks a media query. Always false during SSR *and* on the first client
 * render, only adopting the real value after mount — the sidebar swaps its
 * whole markup between desktop and a mobile sheet, so reading matchMedia
 * synchronously would make a phone hydrate different DOM than the server sent
 * and log a hydration mismatch.
 */
export function useMediaQuery(query: string): Ref<boolean> {
  const matches = ref(false)
  if (!import.meta.client)
    return matches

  const media = window.matchMedia(query)
  const onChange = (event: MediaQueryListEvent) => matches.value = event.matches
  onMounted(() => {
    matches.value = media.matches
    media.addEventListener('change', onChange)
  })
  onScopeDispose(() => media.removeEventListener('change', onChange))
  return matches
}

type Listenable = EventTarget | null | undefined

/**
 * Adds a listener and removes it when the scope is disposed. Supports both
 * `(event, handler)` against `window` and an explicit target.
 */
export function useEventListener(...args: unknown[]): () => void {
  const [target, event, handler] = typeof args[0] === 'string'
    ? [import.meta.client ? window : undefined, args[0] as string, args[1] as EventListener]
    : [args[0] as Listenable, args[1] as string, args[2] as EventListener]

  let cleanup = () => {}
  if (import.meta.client) {
    const stop = watchEffect((onInvalidate) => {
      const element = toValue(target) as Listenable
      if (!element)
        return
      element.addEventListener(event, handler)
      onInvalidate(() => element.removeEventListener(event, handler))
    })
    cleanup = () => stop()
    onScopeDispose(cleanup)
  }
  return cleanup
}

interface VModelOptions<T> {
  defaultValue?: T
  /** When true the composable keeps its own copy for the uncontrolled case. */
  passive?: boolean
}

/**
 * Two-way binding over a prop + `update:` emit, with a local fallback when the
 * parent does not control the value.
 */
export function useVModel<P extends object, K extends keyof P>(
  props: P,
  key: K,
  emit: EmitFn,
  options: VModelOptions<P[K]> = {},
): Ref<P[K]> {
  const local = ref(options.defaultValue ?? props[key]) as Ref<P[K]>

  return customRef<P[K]>((track, trigger) => ({
    get() {
      track()
      const fromProps = props[key]
      return options.passive && fromProps === undefined ? local.value : (fromProps ?? local.value)
    },
    set(value) {
      local.value = value
      emit(`update:${String(key)}`, value)
      trigger()
    },
  }))
}
