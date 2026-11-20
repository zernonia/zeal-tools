import type { IpInfo } from '../../core'

/**
 * Asks our own API what address this browser arrived from.
 *
 * The page is prerendered, so the server that built it never saw the visitor;
 * the only way to know the address is to ask once the page is open. Runs on
 * mount, and again when the visitor presses "Check again" — the usual reason
 * being that they have just switched a VPN on or off.
 */
export function useMyIp() {
  const info = ref<IpInfo | null>(null)
  const loading = ref(true)
  const error = ref<string | null>(null)

  async function load() {
    loading.value = true
    error.value = null
    try {
      // A query that changes every time makes sure no cache in between answers
      // with an old address after a VPN switch.
      info.value = await $fetch<IpInfo>('/api/v1/ip', {
        query: { t: Date.now() },
        cache: 'no-store',
      })
    }
    catch (cause) {
      const status = (cause as { statusCode?: number })?.statusCode
      error.value = status === 429
        ? 'Too many checks in a minute. Wait a moment and try again.'
        : 'Could not reach zeal.tools to read your address. Check your connection and try again.'
    }
    finally {
      loading.value = false
    }
  }

  onMounted(load)

  return { info, loading, error, load }
}
