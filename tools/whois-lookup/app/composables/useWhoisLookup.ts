import type { StateSchema } from '../../../../shared/core/url-state'
import type { DnsResult, DomainRecord, LookupFailure } from '../../core'
import { lookupDns, lookupDomain, parseDomain } from '../../core'

const schema = {
  domain: { type: 'string', default: '' },
} satisfies StateSchema

export interface WhoisResult {
  domain: string
  host?: string
  registered: boolean
  record: DomainRecord | null
  dns?: DnsResult
  sources: string[]
  registrarError?: string
  /** True when it went through our API, which the page only does when asked. */
  viaServer: boolean
  raw?: unknown
}

export function useWhoisLookup() {
  const state = useToolState(schema)
  const { track } = useAnalytics()

  const loading = ref(false)
  const error = ref('')
  const failure = ref<LookupFailure | null>(null)
  const result = ref<WhoisResult | null>(null)

  let generation = 0

  /**
   * Straight from the browser to the registry, never through us. The one
   * exception is `viaServer`, offered only after a registry refuses to talk
   * to web pages, and only when someone presses the button that says so.
   */
  async function lookup(viaServer = false) {
    const input = state.domain.trim()
    if (!input)
      return
    const run = ++generation
    loading.value = true
    error.value = ''
    failure.value = null

    try {
      const next = viaServer ? await fromServer(input) : await fromBrowser(input)
      if (run !== generation)
        return
      result.value = next
      track('tool_completed', { tool: 'whois-lookup', format: next.registered ? 'registered' : 'available' })
    }
    catch (cause: unknown) {
      if (run !== generation)
        return
      result.value = null
      const known = cause as { reason?: LookupFailure, message?: string, data?: { message?: string } }
      failure.value = known.reason ?? null
      error.value = known.data?.message ?? known.message ?? 'That domain could not be looked up.'
    }
    finally {
      if (run === generation)
        loading.value = false
    }
  }

  // A shared link carries the domain; looking it up is why it was shared.
  onMounted(() => nextTick(() => {
    if (state.domain.trim())
      lookup()
  }))

  return { state, loading, error, failure, result, lookup }
}

async function fromBrowser(input: string): Promise<WhoisResult> {
  // DNS is asked in parallel and thrown away if the name turns out to be
  // unregistered; waiting for RDAP first would add a round trip to every
  // lookup to save one on the rare miss.
  const guess = parseDomain(input).domain
  const [found, early] = await Promise.all([
    lookupDomain(input, { requireCors: true }),
    guess ? lookupDns(guess).catch(() => undefined) : undefined,
  ])
  if (!found.ok)
    throw found
  // The registry may have answered for a deeper name than the first guess.
  const dns = found.registered && found.domain !== guess
    ? await lookupDns(found.domain).catch(() => undefined)
    : early
  return {
    domain: found.domain,
    host: found.host,
    registered: found.registered,
    record: found.record,
    dns: found.registered ? dns : undefined,
    sources: found.sources,
    registrarError: found.registrarError,
    viaServer: false,
    raw: found.raw,
  }
}

async function fromServer(input: string): Promise<WhoisResult> {
  const response = await $fetch<Omit<WhoisResult, 'viaServer'>>('/api/v1/whois', { query: { domain: input, raw: 1 } })
  return { ...response, viaServer: true }
}
