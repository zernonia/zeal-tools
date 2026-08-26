/**
 * What the URL tab is allowed to fetch.
 *
 * This is the only endpoint on the site that takes a URL from a stranger and
 * makes a request to it, which is a well-known way to be turned into someone
 * else's port scanner or a route to a cloud metadata service. The check is
 * pure and lives here rather than in the route so it can be tested properly,
 * because a security boundary nobody exercises is a security boundary nobody
 * knows is broken.
 *
 * One honest limitation, stated rather than papered over: this validates the
 * URL as written. A hostname that *resolves* to a private address still gets
 * through, and DNS rebinding cannot be closed from here. What closes it is
 * where this runs — a Cloudflare Worker egresses to the public internet and
 * has no private network to reach in the first place. The literal checks stop
 * the obvious attempts and keep the endpoint honest if it is ever self-hosted
 * somewhere with a LAN behind it, where this file's guarantees are all you have.
 */

export type GuardFailure
  = | 'empty'
    | 'unparseable'
    | 'scheme'
    | 'port'
    | 'private'
    | 'too-long'

export interface GuardResult {
  ok: boolean
  url?: URL
  reason?: GuardFailure
  message?: string
}

const MAX_URL_LENGTH = 2048

/** Only the ports a web page is actually served from. */
const ALLOWED_PORTS = new Set(['', '80', '443'])

/** Suffixes that only ever mean "inside someone's network". */
const PRIVATE_SUFFIXES = ['.local', '.internal', '.localhost', '.home.arpa', '.lan']

function isPrivateIpv4(host: string): boolean {
  const parts = host.split('.')
  if (parts.length !== 4)
    return false
  const nums = parts.map(p => (/^\d{1,3}$/.test(p) ? Number(p) : Number.NaN))
  if (nums.some(n => !Number.isInteger(n) || n < 0 || n > 255))
    return false
  const [a, b] = nums as [number, number, number, number]
  if (a === 0 || a === 127)
    return true // this host, loopback
  if (a === 10)
    return true // private
  if (a === 172 && b >= 16 && b <= 31)
    return true // private
  if (a === 192 && b === 168)
    return true // private
  if (a === 169 && b === 254)
    return true // link-local, and cloud metadata
  if (a === 100 && b >= 64 && b <= 127)
    return true // carrier-grade NAT
  if (a >= 224)
    return true // multicast and reserved
  return false
}

function isPrivateIpv6(host: string): boolean {
  // URL keeps IPv6 literals in brackets; strip any zone index too.
  const raw = host.replace(/^\[|\]$/g, '').split('%')[0]!.toLowerCase()
  if (raw === '::1' || raw === '::' || raw === '0:0:0:0:0:0:0:1')
    return true
  // Unique-local (fc00::/7) and link-local (fe80::/10).
  if (/^f[cd]/.test(raw) || /^fe[89ab]/.test(raw))
    return true
  // IPv4-mapped addresses are the same addresses in disguise. `URL` normalises
  // `::ffff:169.254.169.254` to `::ffff:a9fe:a9fe`, so the hex form is the one
  // that actually arrives here — checking only the dotted spelling would let
  // the metadata service straight through.
  const dotted = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(raw)
  if (dotted)
    return isPrivateIpv4(dotted[1]!)

  const hex = /^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/.exec(raw)
  if (hex) {
    const high = Number.parseInt(hex[1]!, 16)
    const low = Number.parseInt(hex[2]!, 16)
    return isPrivateIpv4(`${high >> 8}.${high & 0xFF}.${low >> 8}.${low & 0xFF}`)
  }
  return false
}

export function guardUrl(input: string): GuardResult {
  const text = String(input ?? '').trim()
  if (!text)
    return { ok: false, reason: 'empty', message: 'Enter a URL to check.' }
  if (text.length > MAX_URL_LENGTH)
    return { ok: false, reason: 'too-long', message: 'That URL is longer than any real page URL.' }

  // A bare domain is what people paste, so give it a scheme rather than an error.
  const candidate = /^[a-z][\w+.-]*:/i.test(text) ? text : `https://${text}`

  let url: URL
  try {
    url = new URL(candidate)
  }
  catch {
    return { ok: false, reason: 'unparseable', message: 'That does not look like a URL.' }
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:')
    return { ok: false, reason: 'scheme', message: 'Only http and https pages can be checked.' }

  if (!ALLOWED_PORTS.has(url.port))
    return { ok: false, reason: 'port', message: 'Only the standard web ports are allowed.' }

  const host = url.hostname.toLowerCase()
  const privateHost
    = host === 'localhost'
      || PRIVATE_SUFFIXES.some(suffix => host.endsWith(suffix))
      || isPrivateIpv4(host)
      || isPrivateIpv6(host)

  if (privateHost)
    return { ok: false, reason: 'private', message: 'That address is on a private network, so there is nothing there to check from here.' }

  return { ok: true, url }
}
