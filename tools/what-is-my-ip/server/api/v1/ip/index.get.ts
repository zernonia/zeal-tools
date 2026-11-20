import type { CfProperties } from '../../../../core'
import { shapeIpInfo } from '../../../../core'

/**
 * GET /api/v1/ip            → JSON: address, version, location, network, connection
 * GET /api/v1/ip?format=text → just the address and a newline, for `curl` in a script
 *
 * The page calls this too: it is prerendered, so the address can only be
 * known once a browser asks. Everything returned is already on the request —
 * the connecting address from Cloudflare's header and the rest from the `cf`
 * object Cloudflare attaches — so nothing is looked up elsewhere, and nothing
 * is stored or logged. `no-store` keeps any cache between here and the caller
 * from handing one person's address to another.
 *
 * `cf` arrives two ways: Nitro's Cloudflare handler copies it to
 * `event.context.cf` and also exposes the raw request at
 * `event.context.cloudflare.request`; the dev plugin sets only the first.
 */
export default defineEventHandler((event) => {
  enforceRateLimit(event)
  setResponseHeader(event, 'cache-control', 'no-store')

  const context = event.context as {
    cf?: CfProperties
    cloudflare?: { request?: { cf?: CfProperties } }
  }
  const cf = context.cf ?? context.cloudflare?.request?.cf ?? null

  const info = shapeIpInfo({
    connectingIp: getRequestHeader(event, 'cf-connecting-ip'),
    forwardedFor: getRequestHeader(event, 'x-forwarded-for'),
    remoteAddress: getRequestIP(event),
    cf,
  })

  const format = getQuery(event).format
  if (format === 'text') {
    setResponseHeader(event, 'content-type', 'text/plain; charset=utf-8')
    return `${info.ip ?? 'unknown'}\n`
  }

  return {
    ...info,
    note: 'Read from this request as it arrived. The location is a city-level estimate from IP geolocation. Nothing is stored or logged.',
  }
})
