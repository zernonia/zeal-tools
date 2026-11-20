import type { IpKind, IpVersion } from './address'
import { classifyIp, parseIp } from './address'

/**
 * Turning what Cloudflare knows about a request into the answer we return.
 *
 * Cloudflare attaches a `cf` object to every request a Worker receives: the
 * visitor's approximate location from its IP geolocation database, the
 * network (ASN and the organisation that holds it), which data centre took
 * the request and how the connection was negotiated. Nothing here is looked
 * up from a third party — it is all already on the request.
 *
 * The shaping is pure so it can be tested with fixture objects, and so a
 * missing field — `wrangler dev` fills in only some of them — always comes
 * out as null rather than `undefined`, an empty string or a stray "XX".
 */

/** The subset of Cloudflare's `IncomingRequestCfProperties` we read. Every field may be absent. */
export interface CfProperties {
  country?: string | null
  region?: string | null
  regionCode?: string | null
  city?: string | null
  postalCode?: string | null
  timezone?: string | null
  latitude?: string | number | null
  longitude?: string | number | null
  continent?: string | null
  isEUCountry?: string | null
  asn?: number | string | null
  asOrganization?: string | null
  colo?: string | null
  httpProtocol?: string | null
  tlsVersion?: string | null
}

export interface IpInfo {
  ip: string | null
  version: IpVersion | null
  /** Public, private, loopback… — anything but public means a proxy or a local server is in the way. */
  kind: IpKind | null
  /** ISO 3166-1 alpha-2, upper case. */
  country: string | null
  countryName: string | null
  region: string | null
  regionCode: string | null
  city: string | null
  postalCode: string | null
  /** IANA time zone, e.g. Europe/London. */
  timezone: string | null
  /** City-level approximation from IP geolocation — never a street address. */
  latitude: number | null
  longitude: number | null
  continent: string | null
  isEu: boolean | null
  asn: number | null
  organisation: string | null
  /** The Cloudflare data centre that answered, as an IATA airport code. */
  colo: string | null
  httpProtocol: string | null
  tlsVersion: string | null
  /** True when the address came through Cloudflare's own header rather than a fallback. */
  fromCloudflare: boolean
}

export interface ShapeInput {
  /** The `CF-Connecting-IP` header. */
  connectingIp?: string | null
  /** The raw `X-Forwarded-For` header; its first entry is the original client. */
  forwardedFor?: string | null
  /** The socket's own peer address — only meaningful in local development. */
  remoteAddress?: string | null
  cf?: CfProperties | null
}

const CONTINENTS: Record<string, string> = {
  AF: 'Africa',
  AN: 'Antarctica',
  AS: 'Asia',
  EU: 'Europe',
  NA: 'North America',
  OC: 'Oceania',
  SA: 'South America',
}

/** A trimmed, bounded, non-empty string, or null. Header values are attacker-controlled. */
function text(value: unknown, max = 120): string | null {
  if (typeof value !== 'string' && typeof value !== 'number')
    return null
  // eslint-disable-next-line no-control-regex
  const cleaned = String(value).replace(/[\u0000-\u001F\u007F]/g, '').trim()
  if (!cleaned)
    return null
  return cleaned.length > max ? cleaned.slice(0, max) : cleaned
}

function coordinate(value: unknown, limit: number): number | null {
  const raw = text(value, 32)
  if (raw === null)
    return null
  const number = Number(raw)
  return Number.isFinite(number) && Math.abs(number) <= limit ? number : null
}

/**
 * Country code, with Cloudflare's two special values handled: `XX` means
 * unknown and `T1` means the request came out of the Tor network, which is not
 * a country and has no name `Intl` would recognise.
 */
function countryCode(value: unknown): string | null {
  const raw = text(value, 8)?.toUpperCase() ?? null
  if (!raw || raw === 'XX' || !/^[A-Z][A-Z0-9]$/.test(raw))
    return null
  return raw
}

/** "GB" → "United Kingdom". Falls back to the code where the runtime has no name for it. */
export function countryName(code: string | null | undefined): string | null {
  if (!code)
    return null
  const upper = code.toUpperCase()
  if (upper === 'T1')
    return 'Tor network'
  if (!/^[A-Z]{2}$/.test(upper))
    return upper
  try {
    const name = new Intl.DisplayNames(['en-GB'], { type: 'region' }).of(upper)
    return name && name !== upper ? name : upper
  }
  catch {
    return upper
  }
}

/** First valid address in a comma-separated `X-Forwarded-For`. */
function firstForwarded(header: string | null | undefined): string | null {
  if (!header)
    return null
  const first = header.split(',')[0]?.trim()
  return first || null
}

export function shapeIpInfo(input: ShapeInput): IpInfo {
  const cf = input.cf ?? {}
  const fromHeader = parseIp(input.connectingIp)
  const parsed = fromHeader ?? parseIp(firstForwarded(input.forwardedFor)) ?? parseIp(input.remoteAddress)

  const country = countryCode(cf.country)
  const asnRaw = text(cf.asn, 12)
  const asn = asnRaw !== null && /^\d+$/.test(asnRaw) ? Number(asnRaw) : null
  const continentCode = text(cf.continent, 4)?.toUpperCase() ?? null
  const eu = text(cf.isEUCountry, 4)

  return {
    ip: parsed?.ip ?? null,
    version: parsed?.version ?? null,
    kind: parsed ? classifyIp(parsed.ip) : null,
    country,
    countryName: countryName(country),
    region: text(cf.region),
    regionCode: text(cf.regionCode, 12),
    city: text(cf.city),
    postalCode: text(cf.postalCode, 16),
    timezone: text(cf.timezone, 64),
    latitude: coordinate(cf.latitude, 90),
    longitude: coordinate(cf.longitude, 180),
    continent: continentCode ? (CONTINENTS[continentCode] ?? null) : null,
    // Cloudflare sends "1" for EU countries and omits the field otherwise, so absence means "no" only when a country is known.
    isEu: eu === '1' ? true : country ? false : null,
    asn: asn !== null && asn > 0 ? asn : null,
    organisation: text(cf.asOrganization),
    colo: text(cf.colo, 8)?.toUpperCase() ?? null,
    httpProtocol: text(cf.httpProtocol, 16),
    tlsVersion: text(cf.tlsVersion, 16),
    fromCloudflare: !!fromHeader,
  }
}
