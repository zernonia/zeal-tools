import { guardUrl } from '../../../../../../shared/core/url-guard'
import { lookupDns, lookupDomain } from '../../../../core'

/**
 * GET /api/v1/whois?domain=example.com
 *
 * The web page never calls this — it asks the registries itself, because they
 * all allow it. This exists for scripts and agents, and for the one case a
 * browser cannot handle: a registry that sends no CORS header, such as .de's.
 *
 * Every URL it requests comes from IANA's bootstrap file or from the
 * registry's own response, and the second is a third party's data, so each
 * one goes through the same guard as the meta tag checker before it is
 * fetched.
 */
const safe = (url: string) => url.startsWith('https://') && guardUrl(url).ok

export default defineEventHandler(async (event) => {
  enforceRateLimit(event)
  const query = getQuery(event)
  const domain = typeof query.domain === 'string' ? query.domain : ''
  if (!domain.trim())
    badRequest('domain is required, e.g. /api/v1/whois?domain=example.com')

  const result = await lookupDomain(domain, { guard: safe })
  if (!result.ok)
    badRequest(result.message)

  const includeDns = query.dns !== 'false' && query.dns !== '0'
  const dns = includeDns && result.registered ? await lookupDns(result.domain) : undefined
  const includeRaw = query.raw === 'true' || query.raw === '1'

  return {
    domain: result.domain,
    host: result.host,
    registered: result.registered,
    record: result.record,
    dns,
    sources: result.sources,
    registrarError: result.registrarError,
    ...(includeRaw ? { raw: result.raw } : {}),
    note: 'Read live over RDAP from the registry and registrar. Nothing is stored or logged.',
  }
})
