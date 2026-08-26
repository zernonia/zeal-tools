import type { H3Event } from 'h3'
import { audit, readMeta, resolveCard } from '../../../../core'
import { fetchHead } from '../../../../core/fetch'

/**
 * GET /api/v1/meta?url=https://example.com
 *
 * The one endpoint here that fetches somebody else's page, so it is also the
 * one with a guard in front of it — see `core/url-guard.ts`. It returns the
 * parsed result and never the page's own HTML, which is what keeps it from
 * being usable as a general-purpose proxy.
 */
/**
 * A fetch that serves this site's own pages from inside the Worker.
 *
 * A Worker cannot fetch its own zone: the subrequest goes back out to the
 * edge, is routed to this same Worker, and Cloudflare gives up and answers
 * 522. Checking your own site is the first thing anyone tries here, so it
 * failing with a bare number is not acceptable — and it does not need the
 * network anyway, because every page is a prerendered asset the Worker can
 * read straight from its ASSETS binding.
 *
 * Any other host goes out to the internet as normal.
 */
function sameZoneAware(event: H3Event): typeof fetch {
  const assets = (event.context.cloudflare?.env as { ASSETS?: { fetch: (request: Request) => Promise<Response> } } | undefined)?.ASSETS
  const ownHosts = new Set<string>()
  const configured = useRuntimeConfig(event).public.siteUrl
  if (configured) {
    try {
      ownHosts.add(new URL(configured).host)
    }
    catch { /* a malformed siteUrl should not break the endpoint */ }
  }
  const host = getRequestHost(event)
  if (host)
    ownHosts.add(host)

  if (!assets)
    return fetch

  return (async (input: string | URL | Request, init?: RequestInit) => {
    const href = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
    const target = new URL(href)
    if (!ownHosts.has(target.host))
      return fetch(input as string, init)
    // The binding wants a Request and answers from disk, so no headers, no
    // redirect handling and no timeout are involved.
    return assets.fetch(new Request(target.href))
  }) as typeof fetch
}

export default defineEventHandler(async (event) => {
  enforceRateLimit(event)
  const query = getQuery(event)
  const url = typeof query.url === 'string' ? query.url : ''
  if (!url.trim())
    badRequest('url is required, e.g. /api/v1/meta?url=https://example.com')

  const result = await fetchHead(url, sameZoneAware(event))
  if (!result.ok)
    badRequest(result.error ?? 'That page could not be checked.')

  const meta = readMeta(result.html ?? '')
  const findings = audit(meta)

  return {
    url,
    finalUrl: result.finalUrl,
    status: result.status,
    truncated: result.truncated ?? false,
    meta,
    findings,
    cards: {
      google: resolveCard(meta, 'google'),
      x: resolveCard(meta, 'x'),
      facebook: resolveCard(meta, 'facebook'),
      linkedin: resolveCard(meta, 'linkedin'),
      slack: resolveCard(meta, 'slack'),
    },
    counts: {
      errors: findings.filter(f => f.severity === 'error').length,
      warnings: findings.filter(f => f.severity === 'warning').length,
    },
    note: 'Fetched from our server, since a browser cannot read another site. Nothing is stored or logged.',
  }
})
