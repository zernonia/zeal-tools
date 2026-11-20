import type { CfProperties } from './index'
import { describe, expect, it } from 'vitest'
import {
  classifyIp,
  countryName,
  describeResult,
  expandIpv6,
  formatAsn,
  formatConnection,
  formatCoordinates,
  formatIpv6,
  formatLocalTime,
  formatLocation,
  formatUtcOffset,
  ipVersion,
  isLandAt,
  kindLabel,
  parseIp,
  parseIpv4,
  parseIpv6,
  shapeIpInfo,
  WORLD_HEIGHT,
  WORLD_WIDTH,
  worldDotsPath,
  worldPoint,
} from './index'

/*
 * The `cf` fixtures follow the field names and value formats Cloudflare
 * documents for `IncomingRequestCfProperties` (coordinates as strings, ASN as
 * a number, TLS as "TLSv1.3"). They are assembled, not captured, and use
 * documentation address ranges — no real visitor's data.
 */
const LONDON: CfProperties = {
  country: 'GB',
  region: 'England',
  regionCode: 'ENG',
  city: 'London',
  postalCode: 'EC1A',
  timezone: 'Europe/London',
  latitude: '51.50740',
  longitude: '-0.12780',
  continent: 'EU',
  asn: 2856,
  asOrganization: 'British Telecommunications PLC',
  colo: 'LHR',
  httpProtocol: 'HTTP/2',
  tlsVersion: 'TLSv1.3',
}

describe('parseIpv4', () => {
  it('reads a dotted quad', () => {
    expect(parseIpv4('203.0.113.7')).toEqual([203, 0, 113, 7])
    expect(parseIpv4('0.0.0.0')).toEqual([0, 0, 0, 0])
    expect(parseIpv4('255.255.255.255')).toEqual([255, 255, 255, 255])
  })

  it('rejects anything that is not exactly four octets', () => {
    for (const bad of ['', '1.2.3', '1.2.3.4.5', '256.1.1.1', '1.2.3.-4', '1..2.3', 'a.b.c.d', '1.2.3.4 '])
      expect(parseIpv4(bad), bad).toBeNull()
  })

  it('rejects leading zeros, which some parsers read as octal', () => {
    expect(parseIpv4('010.0.0.1')).toBeNull()
    expect(parseIpv4('1.2.3.04')).toBeNull()
  })
})

describe('parseIpv6', () => {
  it('reads the full form', () => {
    expect(parseIpv6('2001:0db8:0000:0000:0000:ff00:0042:8329')).toEqual([0x2001, 0xDB8, 0, 0, 0, 0xFF00, 0x42, 0x8329])
  })

  it('expands :: in every position', () => {
    expect(parseIpv6('::')).toEqual([0, 0, 0, 0, 0, 0, 0, 0])
    expect(parseIpv6('::1')).toEqual([0, 0, 0, 0, 0, 0, 0, 1])
    expect(parseIpv6('fe80::')).toEqual([0xFE80, 0, 0, 0, 0, 0, 0, 0])
    expect(parseIpv6('2001:db8::ff00:42:8329')).toEqual([0x2001, 0xDB8, 0, 0, 0, 0xFF00, 0x42, 0x8329])
  })

  it('reads a trailing dotted IPv4', () => {
    expect(parseIpv6('::ffff:192.0.2.1')).toEqual([0, 0, 0, 0, 0, 0xFFFF, 0xC000, 0x0201])
    expect(parseIpv6('64:ff9b::198.51.100.1')).toEqual([0x64, 0xFF9B, 0, 0, 0, 0, 0xC633, 0x6401])
  })

  it('strips brackets and a zone index', () => {
    expect(parseIpv6('[::1]')).toEqual([0, 0, 0, 0, 0, 0, 0, 1])
    expect(parseIpv6('fe80::1%en0')).toEqual([0xFE80, 0, 0, 0, 0, 0, 0, 1])
  })

  it('rejects malformed addresses', () => {
    for (const bad of [
      '',
      ':',
      '1::2::3',
      '12345::',
      '1:2:3:4:5:6:7',
      '1:2:3:4:5:6:7:8:9',
      '1:2:3:4::5:6:7:8', // :: must replace at least one group
      'g::1',
      '::1.2.3',
      '1.2.3.4::',
      '<script>',
    ])
      expect(parseIpv6(bad), bad).toBeNull()
  })
})

describe('formatIpv6 (RFC 5952)', () => {
  it('compresses the longest zero run and lowercases', () => {
    expect(formatIpv6([0x2001, 0xDB8, 0, 0, 0, 0xFF00, 0x42, 0x8329])).toBe('2001:db8::ff00:42:8329')
  })

  it('compresses the first of two equally long runs', () => {
    expect(formatIpv6([0x2001, 0xDB8, 0, 0, 1, 0, 0, 1])).toBe('2001:db8::1:0:0:1')
  })

  it('does not compress a single zero group', () => {
    expect(formatIpv6([0x2001, 0xDB8, 0, 1, 1, 1, 1, 1])).toBe('2001:db8:0:1:1:1:1:1')
  })

  it('handles runs at either end', () => {
    expect(formatIpv6([0, 0, 0, 0, 0, 0, 0, 1])).toBe('::1')
    expect(formatIpv6([0xFE80, 0, 0, 0, 0, 0, 0, 0])).toBe('fe80::')
    expect(formatIpv6([0, 0, 0, 0, 0, 0, 0, 0])).toBe('::')
  })

  it('round-trips through parse for every spelling of the same address', () => {
    const spellings = [
      '2001:DB8:0:0:0:0:0:1',
      '2001:0db8:0000:0000:0000:0000:0000:0001',
      '2001:db8::0:1',
      '2001:db8:0::1',
      '2001:db8::1',
    ]
    for (const s of spellings)
      expect(formatIpv6(parseIpv6(s)!), s).toBe('2001:db8::1')
  })
})

describe('expandIpv6', () => {
  it('writes every group in full', () => {
    expect(expandIpv6('2001:db8::1')).toBe('2001:0db8:0000:0000:0000:0000:0000:0001')
    expect(expandIpv6('nope')).toBeNull()
  })
})

describe('parseIp', () => {
  it('normalises IPv4 and IPv6', () => {
    expect(parseIp(' 198.51.100.23 ')).toEqual({ ip: '198.51.100.23', version: 4 })
    expect(parseIp('2001:0DB8:0000::0001')).toEqual({ ip: '2001:db8::1', version: 6 })
  })

  it('reports an IPv4-mapped address as the IPv4 it contains, in both spellings', () => {
    expect(parseIp('::ffff:203.0.113.9')).toEqual({ ip: '203.0.113.9', version: 4 })
    // `URL` and some sockets write the same thing in hex.
    expect(parseIp('::ffff:cb00:7109')).toEqual({ ip: '203.0.113.9', version: 4 })
    expect(parseIp('::ffff:127.0.0.1')).toEqual({ ip: '127.0.0.1', version: 4 })
  })

  it('keeps a NAT64 address as IPv6 — the connection really is IPv6', () => {
    expect(parseIp('64:ff9b::198.51.100.1')).toEqual({ ip: '64:ff9b::c633:6401', version: 6 })
  })

  it('returns null for anything that is not an address', () => {
    for (const bad of [null, undefined, '', 'unknown', 'localhost', '1.2.3.4, 5.6.7.8', 'x'.repeat(100)])
      expect(parseIp(bad as string), String(bad)).toBeNull()
  })

  it('ipVersion agrees', () => {
    expect(ipVersion('192.0.2.1')).toBe(4)
    expect(ipVersion('2001:db8::1')).toBe(6)
    expect(ipVersion('::ffff:192.0.2.1')).toBe(4)
    expect(ipVersion('nope')).toBeNull()
  })
})

describe('classifyIp', () => {
  const cases: [string, ReturnType<typeof classifyIp>][] = [
    ['8.8.8.8', 'public'],
    ['1.1.1.1', 'public'],
    ['172.15.0.1', 'public'],
    ['172.32.0.1', 'public'],
    ['100.63.255.255', 'public'],
    ['100.128.0.0', 'public'],
    ['10.0.0.1', 'private'],
    ['172.16.0.1', 'private'],
    ['172.31.255.255', 'private'],
    ['192.168.1.1', 'private'],
    ['127.0.0.1', 'loopback'],
    ['127.8.8.8', 'loopback'],
    ['169.254.169.254', 'link-local'],
    ['100.64.0.1', 'cgnat'],
    ['100.127.255.255', 'cgnat'],
    ['192.0.2.10', 'documentation'],
    ['198.51.100.10', 'documentation'],
    ['203.0.113.10', 'documentation'],
    ['224.0.0.1', 'multicast'],
    ['239.255.255.250', 'multicast'],
    ['240.0.0.1', 'reserved'],
    ['255.255.255.255', 'reserved'],
    ['198.18.0.1', 'reserved'],
    ['0.0.0.0', 'unspecified'],
    ['0.1.2.3', 'reserved'],
    ['2606:4700:4700::1111', 'public'],
    ['2a00:1450:4009:81f::200e', 'public'],
    ['::1', 'loopback'],
    ['::', 'unspecified'],
    ['fc00::1', 'private'],
    ['fd12:3456:789a::1', 'private'],
    ['fe80::1', 'link-local'],
    ['febf::1', 'link-local'],
    ['fec0::1', 'reserved'],
    ['ff02::1', 'multicast'],
    ['2001:db8::1', 'documentation'],
    ['4000::1', 'reserved'],
    ['::ffff:10.0.0.1', 'private'],
    ['::ffff:a9fe:a9fe', 'link-local'],
  ]
  for (const [ip, kind] of cases) {
    it(`${ip} is ${kind}`, () => {
      expect(classifyIp(ip)).toBe(kind)
    })
  }

  it('returns null for a non-address and labels every kind', () => {
    expect(classifyIp('nope')).toBeNull()
    for (const [, kind] of cases)
      expect(kindLabel(kind!)).toMatch(/^[A-Z]/)
  })
})

describe('countryName', () => {
  it('names a country in British English', () => {
    expect(countryName('GB')).toBe('United Kingdom')
    expect(countryName('my')).toBe('Malaysia')
  })

  it('names Cloudflare\'s Tor pseudo-country and falls back to the code otherwise', () => {
    expect(countryName('T1')).toBe('Tor network')
    expect(countryName(null)).toBeNull()
    expect(countryName('ZZZ')).toBe('ZZZ')
  })
})

describe('shapeIpInfo', () => {
  it('shapes a full Cloudflare request', () => {
    const info = shapeIpInfo({ connectingIp: '203.0.113.7', cf: LONDON })
    expect(info).toEqual({
      ip: '203.0.113.7',
      version: 4,
      kind: 'documentation',
      country: 'GB',
      countryName: 'United Kingdom',
      region: 'England',
      regionCode: 'ENG',
      city: 'London',
      postalCode: 'EC1A',
      timezone: 'Europe/London',
      latitude: 51.5074,
      longitude: -0.1278,
      continent: 'Europe',
      isEu: false,
      asn: 2856,
      organisation: 'British Telecommunications PLC',
      colo: 'LHR',
      httpProtocol: 'HTTP/2',
      tlsVersion: 'TLSv1.3',
      fromCloudflare: true,
    })
  })

  it('reads isEUCountry', () => {
    expect(shapeIpInfo({ connectingIp: '192.0.2.1', cf: { country: 'FR', isEUCountry: '1' } }).isEu).toBe(true)
    expect(shapeIpInfo({ connectingIp: '192.0.2.1', cf: {} }).isEu).toBeNull()
  })

  it('normalises an IPv6 connecting address', () => {
    const info = shapeIpInfo({ connectingIp: '2001:0DB8:0000:0000:0000:0000:0000:0042' })
    expect(info.ip).toBe('2001:db8::42')
    expect(info.version).toBe(6)
  })

  it('prefers CF-Connecting-IP over X-Forwarded-For over the socket', () => {
    expect(shapeIpInfo({ connectingIp: '192.0.2.1', forwardedFor: '198.51.100.1', remoteAddress: '::1' }).ip).toBe('192.0.2.1')
    const forwarded = shapeIpInfo({ forwardedFor: '198.51.100.1, 10.0.0.1', remoteAddress: '::1' })
    expect(forwarded.ip).toBe('198.51.100.1')
    expect(forwarded.fromCloudflare).toBe(false)
    expect(shapeIpInfo({ remoteAddress: '::ffff:127.0.0.1' })).toMatchObject({ ip: '127.0.0.1', kind: 'loopback' })
  })

  it('falls through a header that is not an address', () => {
    expect(shapeIpInfo({ connectingIp: 'garbage', forwardedFor: '198.51.100.1' }).ip).toBe('198.51.100.1')
  })

  it('turns every missing field into null — what wrangler dev often sends', () => {
    const info = shapeIpInfo({})
    for (const [key, value] of Object.entries(info)) {
      if (key !== 'fromCloudflare')
        expect(value, key).toBeNull()
    }
    expect(info.fromCloudflare).toBe(false)
  })

  it('treats empty strings, XX and out-of-range values as missing', () => {
    const info = shapeIpInfo({
      connectingIp: '192.0.2.1',
      cf: { country: 'XX', city: '   ', region: '', latitude: '200', longitude: 'abc', asn: 0, colo: '', tlsVersion: null },
    })
    expect(info.country).toBeNull()
    expect(info.countryName).toBeNull()
    expect(info.city).toBeNull()
    expect(info.region).toBeNull()
    expect(info.latitude).toBeNull()
    expect(info.longitude).toBeNull()
    expect(info.asn).toBeNull()
    expect(info.colo).toBeNull()
    expect(info.tlsVersion).toBeNull()
  })

  it('accepts numeric coordinates and a string ASN', () => {
    const info = shapeIpInfo({ connectingIp: '192.0.2.1', cf: { latitude: 3.139, longitude: 101.6869, asn: '4788' } })
    expect(info.latitude).toBe(3.139)
    expect(info.longitude).toBe(101.6869)
    expect(info.asn).toBe(4788)
  })

  it('names Tor exits rather than pretending they are a country', () => {
    const info = shapeIpInfo({ connectingIp: '192.0.2.1', cf: { country: 'T1' } })
    expect(info.country).toBe('T1')
    expect(info.countryName).toBe('Tor network')
  })

  it('strips control characters and bounds length', () => {
    const info = shapeIpInfo({ connectingIp: '192.0.2.1', cf: { city: 'Lon\u0000don\n', asOrganization: 'A'.repeat(500) } })
    expect(info.city).toBe('London')
    expect(info.organisation).toHaveLength(120)
  })
})

describe('formatting', () => {
  it('formatLocation joins what exists and drops repeats', () => {
    expect(formatLocation({ city: 'London', region: 'England', countryName: 'United Kingdom' })).toBe('London, England, United Kingdom')
    expect(formatLocation({ city: 'Singapore', region: 'Singapore', countryName: 'Singapore' })).toBe('Singapore')
    expect(formatLocation({ city: null, region: null, countryName: 'Malaysia' })).toBe('Malaysia')
    expect(formatLocation({ city: null, region: null, countryName: null })).toBeNull()
  })

  it('formatCoordinates uses hemispheres and two decimals', () => {
    expect(formatCoordinates(51.5074, -0.1278)).toBe('51.51° N, 0.13° W')
    expect(formatCoordinates(-33.8688, 151.2093)).toBe('33.87° S, 151.21° E')
    expect(formatCoordinates(0, 0)).toBe('0.00° N, 0.00° E')
    expect(formatCoordinates(null, 1)).toBeNull()
  })

  it('formatAsn', () => {
    expect(formatAsn(13335)).toBe('AS13335')
    expect(formatAsn(null)).toBeNull()
  })

  it('formatConnection reads Cloudflare\'s spellings', () => {
    expect(formatConnection('HTTP/3', 'TLSv1.3')).toBe('HTTP/3 over TLS 1.3')
    expect(formatConnection('HTTP/1.1', null)).toBe('HTTP/1.1')
    expect(formatConnection(null, 'TLSv1.2')).toBe('TLS 1.2')
    expect(formatConnection(null, null)).toBeNull()
  })

  it('formatLocalTime reads the zone and survives a bad one', () => {
    const noonUtc = new Date('2026-01-15T12:00:00Z')
    expect(formatLocalTime('Europe/London', noonUtc)).toBe('12:00')
    expect(formatLocalTime('Asia/Kuala_Lumpur', noonUtc)).toBe('20:00')
    expect(formatLocalTime('Not/AZone', noonUtc)).toBeNull()
    expect(formatLocalTime(null)).toBeNull()
  })

  it('describeResult reads as a sentence', () => {
    expect(describeResult({ ip: '192.0.2.1', version: 4, city: 'London', region: 'England', countryName: 'United Kingdom' }))
      .toBe('Your IP address is 192.0.2.1 (IPv4), located roughly in London, England, United Kingdom.')
    expect(describeResult({ ip: '2001:db8::1', version: 6, city: null, region: null, countryName: null }))
      .toBe('Your IP address is 2001:db8::1 (IPv6).')
    expect(describeResult({ ip: null, version: null, city: null, region: null, countryName: null }))
      .toMatch(/could not be read/)
  })
})

describe('formatUtcOffset', () => {
  const winter = new Date('2026-01-15T12:00:00Z')
  const summer = new Date('2026-07-15T12:00:00Z')

  it('writes the offset in effect on the day', () => {
    expect(formatUtcOffset('Asia/Kuala_Lumpur', winter)).toBe('UTC+8')
    expect(formatUtcOffset('Europe/London', winter)).toBe('UTC')
    expect(formatUtcOffset('Europe/London', summer)).toBe('UTC+1')
    expect(formatUtcOffset('America/St_Johns', winter)).toBe('UTC−3:30')
    expect(formatUtcOffset('Asia/Kolkata', winter)).toBe('UTC+5:30')
  })

  it('is null for a missing or unknown zone', () => {
    expect(formatUtcOffset(null)).toBeNull()
    expect(formatUtcOffset('Not/AZone')).toBeNull()
  })
})

describe('world map', () => {
  it('puts known places on land and the open ocean in the sea', () => {
    for (const [lat, lon] of [[51.5, -0.1], [3.1, 101.7], [40.7, -74], [-33.9, 151.2], [-23.5, -46.6], [30, 31.2], [55.8, 37.6]] as const)
      expect(isLandAt(lat, lon), `${lat}, ${lon}`).toBe(true)
    for (const [lat, lon] of [[0, -30], [30, -150], [-40, 80], [20, 60]] as const)
      expect(isLandAt(lat, lon), `${lat}, ${lon}`).toBe(false)
  })

  it('clamps points beyond the map to its edges', () => {
    expect(worldPoint(90, 0).y).toBeGreaterThanOrEqual(0)
    expect(worldPoint(-90, 0).y).toBeLessThanOrEqual(WORLD_HEIGHT)
    expect(worldPoint(0, 540).x).toBeCloseTo(worldPoint(0, 180).x === WORLD_WIDTH ? 0 : worldPoint(0, -180).x)
    expect(worldPoint(0, -180).x).toBe(0)
  })

  it('draws every land dot in one compact path', () => {
    const path = worldDotsPath()
    expect(path.startsWith('M')).toBe(true)
    expect(path.length).toBeLessThan(6000)
  })
})
