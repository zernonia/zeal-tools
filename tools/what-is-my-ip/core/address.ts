/**
 * Reading, normalising and classifying an IP address.
 *
 * The server hands us whatever Cloudflare put in `CF-Connecting-IP`, and in
 * development whatever the socket reports, which may be `::1`, an
 * IPv4-mapped `::ffff:127.0.0.1` or an address with a zone index. Everything
 * is parsed into numbers first and printed back out, so the address shown is
 * always one canonical spelling — RFC 5952 for IPv6 — and a malformed header
 * can never be echoed onto the page as if it were an address.
 *
 * `shared/core/url-guard.ts` makes a similar private/public decision, but for
 * a different job: it refuses hosts in a URL and answers yes or no. This
 * module names *which* kind of address it is so the page can explain it.
 */

export type IpVersion = 4 | 6

export interface ParsedIp {
  /** Canonical spelling: dotted quad, or RFC 5952 compressed IPv6. */
  ip: string
  version: IpVersion
}

export type IpKind
  = | 'public'
    | 'private'
    | 'loopback'
    | 'link-local'
    | 'cgnat'
    | 'multicast'
    | 'unspecified'
    | 'documentation'
    | 'reserved'

/** Four octets, or null. Rejects leading zeros, which some parsers read as octal. */
export function parseIpv4(input: string): [number, number, number, number] | null {
  const parts = input.split('.')
  if (parts.length !== 4)
    return null
  const octets: number[] = []
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part) || (part.length > 1 && part.startsWith('0')))
      return null
    const value = Number(part)
    if (value > 255)
      return null
    octets.push(value)
  }
  return octets as [number, number, number, number]
}

/** Eight 16-bit groups, or null. Accepts `::` compression and a trailing dotted IPv4. */
export function parseIpv6(input: string): number[] | null {
  let text = input.trim().toLowerCase()
  if (text.startsWith('[') && text.endsWith(']'))
    text = text.slice(1, -1)
  // A zone index (`fe80::1%en0`) names an interface on this machine, not part of the address.
  text = text.split('%')[0]!
  if (!text || !/^[0-9a-f:.]+$/.test(text))
    return null

  const halves = text.split('::')
  if (halves.length > 2)
    return null

  const readGroups = (part: string, allowIpv4: boolean): number[] | null => {
    if (part === '')
      return []
    const pieces = part.split(':')
    const groups: number[] = []
    for (let i = 0; i < pieces.length; i++) {
      const piece = pieces[i]!
      if (allowIpv4 && i === pieces.length - 1 && piece.includes('.')) {
        const v4 = parseIpv4(piece)
        if (!v4)
          return null
        groups.push((v4[0] << 8) | v4[1], (v4[2] << 8) | v4[3])
        continue
      }
      if (!/^[0-9a-f]{1,4}$/.test(piece))
        return null
      groups.push(Number.parseInt(piece, 16))
    }
    return groups
  }

  if (halves.length === 1) {
    const groups = readGroups(halves[0]!, true)
    return groups && groups.length === 8 ? groups : null
  }

  const head = readGroups(halves[0]!, false)
  const tail = readGroups(halves[1]!, true)
  if (!head || !tail)
    return null
  // `::` must stand for at least one group of zeros.
  const missing = 8 - head.length - tail.length
  if (missing < 1)
    return null
  return [...head, ...Array.from<number>({ length: missing }).fill(0), ...tail]
}

/** RFC 5952: lowercase, no leading zeros, the longest run of two or more zero groups as `::`. */
export function formatIpv6(groups: readonly number[]): string {
  let bestStart = -1
  let bestLength = 0
  for (let i = 0; i < groups.length;) {
    if (groups[i] !== 0) {
      i++
      continue
    }
    let j = i
    while (j < groups.length && groups[j] === 0)
      j++
    if (j - i > bestLength) {
      bestStart = i
      bestLength = j - i
    }
    i = j
  }
  const hex = groups.map(g => g.toString(16))
  if (bestLength < 2)
    return hex.join(':')
  const head = hex.slice(0, bestStart).join(':')
  const tail = hex.slice(bestStart + bestLength).join(':')
  return `${head}::${tail}`
}

/** Every group written out in full — useful for reading an address digit by digit. */
export function expandIpv6(input: string): string | null {
  const groups = parseIpv6(input)
  return groups ? groups.map(g => g.toString(16).padStart(4, '0')).join(':') : null
}

/**
 * Parse any spelling into one canonical address.
 *
 * An IPv4-mapped IPv6 address (`::ffff:203.0.113.7`) is a dual-stack server's
 * way of writing an IPv4 connection, so it is reported as the IPv4 address it
 * contains: that is the address the visitor actually has.
 */
export function parseIp(input: string | null | undefined): ParsedIp | null {
  const text = String(input ?? '').trim()
  if (!text || text.length > 64)
    return null

  const v4 = parseIpv4(text)
  if (v4)
    return { ip: v4.join('.'), version: 4 }

  const v6 = parseIpv6(text)
  if (!v6)
    return null
  const mapped = v6.slice(0, 5).every(g => g === 0) && v6[5] === 0xFFFF
  if (mapped) {
    const high = v6[6]!
    const low = v6[7]!
    return { ip: [high >> 8, high & 0xFF, low >> 8, low & 0xFF].join('.'), version: 4 }
  }
  return { ip: formatIpv6(v6), version: 6 }
}

export function ipVersion(input: string | null | undefined): IpVersion | null {
  return parseIp(input)?.version ?? null
}

function classifyIpv4([a, b, c, d]: [number, number, number, number]): IpKind {
  if (a === 0)
    return b === 0 && c === 0 && d === 0 ? 'unspecified' : 'reserved' // 0.0.0.0/8 is "this network"
  if (a === 127)
    return 'loopback'
  if (a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168))
    return 'private'
  if (a === 169 && b === 254)
    return 'link-local'
  if (a === 100 && b >= 64 && b <= 127)
    return 'cgnat'
  if ((a === 192 && b === 0 && c === 2) || (a === 198 && b === 51 && c === 100) || (a === 203 && b === 0 && c === 113))
    return 'documentation'
  if (a >= 224 && a <= 239)
    return 'multicast'
  if (a >= 240 || (a === 198 && (b === 18 || b === 19)) || (a === 192 && b === 0 && c === 0))
    return 'reserved'
  return 'public'
}

function classifyIpv6(groups: number[]): IpKind {
  const [first] = groups as [number]
  if (groups.every(g => g === 0))
    return 'unspecified'
  if (groups.slice(0, 7).every(g => g === 0) && groups[7] === 1)
    return 'loopback'
  if ((first & 0xFE00) === 0xFC00)
    return 'private' // unique local, fc00::/7
  if ((first & 0xFFC0) === 0xFE80)
    return 'link-local' // fe80::/10
  if ((first & 0xFF00) === 0xFF00)
    return 'multicast'
  if (first === 0x2001 && groups[1] === 0x0DB8)
    return 'documentation'
  // Global unicast is 2000::/3; anything else is unassigned or special-purpose.
  if ((first & 0xE000) !== 0x2000)
    return 'reserved'
  return 'public'
}

/** What sort of address this is. Null when it is not an address at all. */
export function classifyIp(input: string | null | undefined): IpKind | null {
  const parsed = parseIp(input)
  if (!parsed)
    return null
  if (parsed.version === 4)
    return classifyIpv4(parseIpv4(parsed.ip)!)
  return classifyIpv6(parseIpv6(parsed.ip)!)
}

const KIND_LABEL: Record<IpKind, string> = {
  'public': 'Public',
  'private': 'Private network',
  'loopback': 'Loopback',
  'link-local': 'Link-local',
  'cgnat': 'Carrier-grade NAT',
  'multicast': 'Multicast',
  'unspecified': 'Unspecified',
  'documentation': 'Documentation range',
  'reserved': 'Reserved',
}

export function kindLabel(kind: IpKind): string {
  return KIND_LABEL[kind]
}
