import { BLOCK_SELECTOR, MASK_TEXT_SELECTOR, maskAttribute, PRIVATE_SELECTOR } from '../../core/replay-privacy'

/**
 * Typed analytics events — the ONLY tracking path in the codebase.
 * PostHog is cookieless, autocapture off, lazy-loaded post-hydration, and
 * silently disabled when no key is configured. We count events, not people.
 *
 * Error tracking and session replay ride on the same client. Replay never
 * sees what goes into a tool: see `core/replay-privacy.ts`.
 */
type ZealEvent
  = | { name: 'tool_viewed', props: { tool: string, variant?: string } }
    | { name: 'tool_completed', props: { tool: string, format: string } }
    | { name: 'share_clicked', props: { tool: string, channel: string } }
    | { name: 'search_performed', props: { query_length: number } }
    | { name: 'search_zero_results', props: { query: string } }

let posthogPromise: Promise<typeof import('posthog-js')['default'] | null> | null = null

export function loadPosthog(key: string, host: string) {
  posthogPromise ??= import('posthog-js').then(({ default: posthog }) => {
    posthog.init(key, {
      api_host: host,
      autocapture: false,
      capture_pageview: true,
      capture_pageleave: false,
      // We never run surveys; without this PostHog fetches a ~26 KiB
      // surveys bundle that Lighthouse reports as entirely unused.
      disable_surveys: true,
      persistence: 'localStorage',
      person_profiles: 'never',
      // Unhandled errors and promise rejections. Vue's own render errors
      // never reach window.onerror, so the analytics plugin forwards those.
      // Off in development, where every half-typed edit throws.
      capture_exceptions: !import.meta.dev,
      disable_session_recording: import.meta.dev,
      // Console output can echo a tool's data back; replays go without it.
      enable_recording_console_log: false,
      session_recording: {
        maskAllInputs: true,
        maskTextSelector: MASK_TEXT_SELECTOR,
        blockSelector: BLOCK_SELECTOR,
        maskAttributeFn: (name, value, element) => maskAttribute(name, value, !!element?.closest(PRIVATE_SELECTOR)),
      },
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

  /** Report an error PostHog's own handlers cannot see, such as one Vue caught. */
  function captureError(error: unknown) {
    if (!import.meta.client || !posthogKey || import.meta.dev)
      return
    loadPosthog(posthogKey, posthogHost).then(posthog => posthog?.captureException(error))
  }

  return { track, captureError }
}
