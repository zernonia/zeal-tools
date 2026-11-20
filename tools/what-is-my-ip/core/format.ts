import type { IpInfo } from './connection'

/**
 * Display helpers. Each one returns null rather than a half-filled string, so
 * the page can say "not available" instead of printing ", , United Kingdom".
 */

/** "London, England, United Kingdom" — dropping parts that repeat (Singapore, Singapore). */
export function formatLocation(info: Pick<IpInfo, 'city' | 'region' | 'countryName'>): string | null {
  const parts: string[] = []
  for (const part of [info.city, info.region, info.countryName]) {
    if (part && !parts.some(p => p.toLowerCase() === part.toLowerCase()))
      parts.push(part)
  }
  return parts.length ? parts.join(', ') : null
}

/**
 * "51.51° N, 0.13° W". Two decimal places is about a kilometre, which is
 * already finer than IP geolocation can honestly claim.
 */
export function formatCoordinates(latitude: number | null, longitude: number | null): string | null {
  if (latitude === null || longitude === null)
    return null
  const lat = `${Math.abs(latitude).toFixed(2)}° ${latitude >= 0 ? 'N' : 'S'}`
  const lon = `${Math.abs(longitude).toFixed(2)}° ${longitude >= 0 ? 'E' : 'W'}`
  return `${lat}, ${lon}`
}

export function formatAsn(asn: number | null): string | null {
  return asn === null ? null : `AS${asn}`
}

/** "HTTP/3 over TLS 1.3". Cloudflare spells them "HTTP/3" and "TLSv1.3". */
export function formatConnection(httpProtocol: string | null, tlsVersion: string | null): string | null {
  const tls = tlsVersion ? tlsVersion.replace(/^TLSv/i, 'TLS ') : null
  if (httpProtocol && tls)
    return `${httpProtocol} over ${tls}`
  return httpProtocol ?? tls
}

/** The current time in a zone, e.g. "14:05". Null for a zone the runtime does not know. */
export function formatLocalTime(timezone: string | null, now: Date = new Date()): string | null {
  if (!timezone)
    return null
  try {
    return new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: timezone }).format(now)
  }
  catch {
    return null
  }
}

/** One sentence for the live region. */
export function describeResult(info: Pick<IpInfo, 'ip' | 'version' | 'city' | 'region' | 'countryName'>): string {
  if (!info.ip)
    return 'Your IP address could not be read from this connection.'
  const location = formatLocation(info)
  const version = info.version ? ` (IPv${info.version})` : ''
  return location
    ? `Your IP address is ${info.ip}${version}, located roughly in ${location}.`
    : `Your IP address is ${info.ip}${version}.`
}

/** The zone's offset from UTC right now, e.g. "UTC+8" or "UTC−3:30"; null when the zone is unknown. */
export function formatUtcOffset(timezone: string | null, now: Date = new Date()): string | null {
  if (!timezone)
    return null
  try {
    const part = new Intl.DateTimeFormat('en-GB', { timeZone: timezone, timeZoneName: 'longOffset' })
      .formatToParts(now)
      .find(p => p.type === 'timeZoneName')
      ?.value
    if (!part)
      return null
    // "GMT", "GMT+08:00", "GMT-03:30"
    const match = /^GMT(?:([+-])(\d{2}):(\d{2}))?$/.exec(part)
    if (!match)
      return null
    if (!match[1])
      return 'UTC'
    const hours = Number(match[2])
    const minutes = match[3] === '00' ? '' : `:${match[3]}`
    return `UTC${match[1] === '-' ? '−' : '+'}${hours}${minutes}`
  }
  catch {
    return null
  }
}
