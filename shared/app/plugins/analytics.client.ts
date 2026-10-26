/**
 * Start PostHog on every page, not just on the first tracked event.
 *
 * Events alone used to load it lazily, which was enough when events were all
 * it did — but an error on a page that never tracks anything, or the first
 * minute of a session before any tool is used, would otherwise go unseen.
 * `onNuxtReady` waits for hydration and an idle moment, so this still never
 * competes with the page's first paint.
 */
export default defineNuxtPlugin((nuxtApp) => {
  const { public: { posthogKey, posthogHost } } = useRuntimeConfig()
  if (!posthogKey)
    return

  const { captureError } = useAnalytics()

  // Errors Vue catches in a component or a lifecycle hook stop there and
  // never reach window.onerror, so PostHog's own handler cannot see them.
  nuxtApp.hook('vue:error', error => captureError(error))
  nuxtApp.hook('app:error', error => captureError(error))

  onNuxtReady(() => void loadPosthog(posthogKey, posthogHost))
})
