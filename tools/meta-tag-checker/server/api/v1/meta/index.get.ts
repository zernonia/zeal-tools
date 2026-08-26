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
export default defineEventHandler(async (event) => {
  enforceRateLimit(event)
  const query = getQuery(event)
  const url = typeof query.url === 'string' ? query.url : ''
  if (!url.trim())
    badRequest('url is required, e.g. /api/v1/meta?url=https://example.com')

  const result = await fetchHead(url)
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
