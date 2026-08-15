/**
 * Typed analytics events — the ONLY tracking path in the codebase.
 * PostHog is cookieless, autocapture off, lazy-loaded post-hydration, and
 * silently disabled when no key is configured. We count events, not people.
 */
type ZealEvent
  = | { name: 'tool_viewed', props: { tool: string } }
    | { name: 'tool_completed', props: { tool: string, format: string } }
    | { name: 'share_clicked', props: { tool: string, channel: string } }
    | { name: 'search_performed', props: { query_length: number } }
    | { name: 'search_zero_results', props: { query: string } }

let posthogPromise: Promise<typeof import('posthog-js')['default'] | null> | null = null

function loadPosthog(key: string, host: string) {
  posthogPromise ??= import('posthog-js').then(({ default: posthog }) => {
    posthog.init(key, {
      api_host: host,
      autocapture: false,
      capture_pageview: true,
      capture_pageleave: false,
      disable_session_recording: true,
      persistence: 'localStorage',
      person_profiles: 'never',
    })
    return posthog
  }).catch(() => null)
  return posthogPromise
}

export function useAnalytics() {
  const { public: { posthogKey, posthogHost } } = useRuntimeConfig()

  function track<E extends ZealEvent>(name: E['name'], props: E['props']) {
    if (!import.meta.client || !posthogKey)
      return
    loadPosthog(posthogKey, posthogHost).then(posthog => posthog?.capture(name, props))
  }

  return { track }
}
