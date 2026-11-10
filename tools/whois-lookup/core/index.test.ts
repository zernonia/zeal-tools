import type { RdapDomain } from './rdap'
import { beforeEach, describe, expect, it } from 'vitest'
import afnic from './fixtures/afnic-nic.fr.json'
import bootstrap from './fixtures/iana-bootstrap.json'
import identityGithub from './fixtures/identitydigital-github.io.json'
import identityZeal from './fixtures/identitydigital-zeal.tools.json'
import markmonitor from './fixtures/markmonitor-google.com.json'
import nominet from './fixtures/nominet-bbc.co.uk.json'
import verisign from './fixtures/verisign-google.com.json'
import {
  BOOTSTRAP_URL,
  candidates,
  daysUntil,
  describeAge,
  describeStatus,
  dnsProvider,
  expiryState,
  joinTxt,
  lookupDns,
  lookupDomain,
  mailProvider,
  mergeRecords,
  parseDoh,
  parseDomain,
  readDomain,
  resetBootstrapCache,
  serverFor,
} from './index'

/*
 * Every fixture is a real response, captured from the registry or registrar
 * named in its filename. They differ in exactly the ways that make RDAP
 * awkward, which is the point of testing against them rather than against a
 * response written to match the parser.
 */

describe('parseDomain', () => {
  it('reduces URLs and subdomains to the registered name', () => {
    expect(parseDomain('https://blog.example.com/post?x=1')).toMatchObject({ ok: true, domain: 'example.com', host: 'blog.example.com', tld: 'com' })
    expect(parseDomain('Example.COM.')).toMatchObject({ ok: true, domain: 'example.com', host: undefined })
    expect(parseDomain('user:pw@example.org:8080')).toMatchObject({ ok: true, domain: 'example.org' })
  })

  it('keeps three labels under a public second level', () => {
    expect(parseDomain('www.bbc.co.uk').domain).toBe('bbc.co.uk')
    expect(parseDomain('shop.example.com.au').domain).toBe('example.com.au')
    expect(parseDomain('example.co.jp').domain).toBe('example.co.jp')
  })

  it('converts international names to the punycode the registry stores', () => {
    expect(parseDomain('bücher.de').domain).toBe('xn--bcher-kva.de')
  })

  it('refuses what is not a domain, with a reason', () => {
    expect(parseDomain('').reason).toBe('empty')
    expect(parseDomain('192.168.1.1').reason).toBe('ip')
    expect(parseDomain('[2001:db8::1]').reason).toBe('ip')
    expect(parseDomain('localhost').reason).toBe('single-label')
    expect(parseDomain('exa_mple.com').reason).toBe('invalid')
    expect(parseDomain('-bad.com').reason).toBe('invalid')
  })

  it('tries one label deeper when the suffix list does not know the second level', () => {
    expect(candidates(parseDomain('shop.example.com.pk'))).toEqual(['com.pk', 'example.com.pk'])
    expect(candidates(parseDomain('example.com'))).toEqual(['example.com'])
  })
})

describe('serverFor', () => {
  it('reads IANA\'s bootstrap file', () => {
    expect(serverFor(bootstrap as never, 'com')).toEqual({ base: 'https://rdap.verisign.com/com/v1/', cors: true })
    expect(serverFor(bootstrap as never, 'TOOLS')?.base).toBe('https://rdap.identitydigital.services/rdap/')
  })

  it('knows the registries IANA does not list, and which of them a browser can read', () => {
    expect(serverFor(bootstrap as never, 'io')).toMatchObject({ cors: true })
    expect(serverFor(bootstrap as never, 'de')).toMatchObject({ cors: false })
    expect(serverFor(bootstrap as never, 'zz')).toBeNull()
  })
})

describe('readDomain', () => {
  it('reads a thin registry record and finds the registrar\'s link', () => {
    const record = readDomain(verisign as RdapDomain)
    expect(record.domain).toBe('google.com')
    expect(record.registered).toBe('1997-09-15T04:00:00Z')
    expect(record.expires).toBe('2028-09-14T04:00:00Z')
    expect(record.registrar).toMatchObject({ name: 'MarkMonitor Inc.', ianaId: '292' })
    expect(record.abuse).toMatchObject({ email: 'abusecomplaints@markmonitor.com', phone: '+1.2086851750' })
    expect(record.registrant).toBeNull()
    expect(record.related).toBe('https://rdap.markmonitor.com/rdap/domain/GOOGLE.COM')
    expect(record.nameservers).toEqual(['ns1.google.com', 'ns2.google.com', 'ns3.google.com', 'ns4.google.com'])
    expect(record.dnssec).toBe(false)
  })

  it('drops redaction placeholders but keeps what was actually published', () => {
    const record = readDomain(markmonitor as RdapDomain)
    // "REDACTED REGISTRANT", "REDACTED FOR PRIVACY": present, and not data.
    expect(record.registrant?.name).toBeNull()
    expect(record.registrant?.organization).toBeNull()
    expect(record.registrant?.email).toBeNull()
    expect(record.registrant?.country).toBe('US')
    expect(record.registrant?.contactUrl).toBe('https://domains.markmonitor.com/whois/contact/google.com')
    expect(record.redacted).toBe(true)
  })

  it('reads an organisation a registry chose to publish', () => {
    const record = readDomain(identityGithub as RdapDomain)
    expect(record.registrant).toMatchObject({ organization: 'GitHub, Inc.', country: 'US' })
    expect(record.registrant?.address).toBe('CA')
    // The record declares the name and street redacted even though the org is shown.
    expect(record.redacted).toBe(true)
    expect(record.privacyService).toBe(false)
  })

  it('treats a placeholder email address as no address', () => {
    const record = readDomain(nominet as RdapDomain)
    expect(record.registrant).toBeNull()
    expect(record.redacted).toBe(true)
    expect(record.nameservers).toContain('dns0.bbc.co.uk')
    expect(record.nameservers.every(ns => !ns.endsWith('.'))).toBe(true)
  })

  it('reads a ccTLD record with full contacts and DNSSEC', () => {
    const record = readDomain(afnic as RdapDomain)
    expect(record.registrant).toMatchObject({ name: 'AFNIC', country: 'FR', email: 'juridique@afnic.fr' })
    expect(record.registrant?.address).toContain('Guyancourt')
    expect(record.registrant?.phone).toBe('+33.139308300')
    expect(record.redacted).toBe(false)
    expect(record.dnssec).toBe(true)
  })

  it('lowercases statuses and keeps every one', () => {
    expect(readDomain(identityZeal as RdapDomain).status).toEqual(['client transfer prohibited'])
  })

  it('prefers the registry\'s expiry over the registrar\'s', () => {
    expect(readDomain(markmonitor as RdapDomain).expires).toBe('2028-09-13T07:00:00.000+00:00')
  })

  it('labels a privacy service rather than presenting it as the owner', () => {
    const record = readDomain({
      ldhName: 'example.com',
      entities: [{ roles: ['registrant'], vcardArray: ['vcard', [['fn', {}, 'text', 'Domains By Proxy, LLC']]] }],
    })
    expect(record.registrant?.name).toBe('Domains By Proxy, LLC')
    expect(record.privacyService).toBe(true)
  })
})

describe('mergeRecords', () => {
  it('keeps the registry authoritative and fills gaps from the registrar', () => {
    const merged = mergeRecords(readDomain(verisign as RdapDomain), readDomain(markmonitor as RdapDomain))
    expect(merged.expires).toBe('2028-09-14T04:00:00Z')
    expect(merged.registrant?.country).toBe('US')
    expect(merged.registrar?.name).toBe('MarkMonitor Inc.')
    expect(merged.registrar?.address).toContain('Meridian')
    expect(merged.redacted).toBe(true)
  })
})

describe('describeStatus', () => {
  it('explains the common locks as protection, not faults', () => {
    expect(describeStatus('client transfer prohibited')).toMatchObject({ label: 'Transfer lock', tone: 'lock' })
    expect(describeStatus('clientTransferProhibited').code).toBe('client transfer prohibited')
    expect(describeStatus('redemption period').tone).toBe('warn')
  })

  it('passes an unknown status through rather than hiding it', () => {
    expect(describeStatus('frobnicated')).toMatchObject({ code: 'frobnicated', label: 'Frobnicated', tone: 'info' })
  })
})

describe('dates', () => {
  const now = new Date('2026-11-10T00:00:00Z')

  it('counts calendar months, not averaged milliseconds', () => {
    expect(describeAge('1997-09-15T04:00:00Z', now)).toBe('29 years, 1 month')
    expect(describeAge('2025-11-10T00:00:00Z', now)).toBe('1 year')
    expect(describeAge('2025-11-11T00:00:00Z', now)).toBe('11 months')
    expect(describeAge('2026-11-03T00:00:00Z', now)).toBe('7 days')
    expect(describeAge('2030-01-01T00:00:00Z', now)).toBeNull()
  })

  it('reads days to expiry and flags the last month', () => {
    expect(daysUntil('2026-11-20T00:00:00Z', now)).toBe(10)
    expect(expiryState('2026-11-20T00:00:00Z', now)).toBe('soon')
    expect(expiryState('2026-11-01T00:00:00Z', now)).toBe('expired')
    expect(expiryState('2028-01-01T00:00:00Z', now)).toBe('ok')
    expect(expiryState(null, now)).toBe('unknown')
  })
})

describe('dns', () => {
  it('filters a CNAME chain out of an A answer', () => {
    const records = parseDoh({ Status: 0, Answer: [
      { name: 'www.github.com', type: 5, TTL: 369, data: 'github.com.' },
      { name: 'github.com', type: 1, TTL: 30, data: '20.27.177.113' },
    ] }, 'A')
    expect(records).toEqual([{ type: 'A', value: '20.27.177.113', ttl: 30 }])
  })

  it('splits MX priority and sorts by it', () => {
    const records = parseDoh({ Answer: [
      { type: 15, TTL: 1, data: '10 alt1.aspmx.l.google.com.' },
      { type: 15, TTL: 1, data: '1 aspmx.l.google.com.' },
    ] }, 'MX')
    expect(records.map(r => [r.priority, r.value])).toEqual([[1, 'aspmx.l.google.com'], [10, 'alt1.aspmx.l.google.com']])
  })

  it('joins TXT strings split at 255 bytes', () => {
    expect(joinTxt('"v=spf1 include:_spf.google.com" " ~all"')).toBe('v=spf1 include:_spf.google.com ~all')
    expect(joinTxt('"say \\"hi\\""')).toBe('say "hi"')
  })

  it('recognises providers only from unambiguous hostnames', () => {
    expect(dnsProvider(['edward.ns.cloudflare.com', 'meera.ns.cloudflare.com'])).toBe('Cloudflare')
    expect(dnsProvider(['ns-692.awsdns-22.net', 'dns1.p05.nsone.net'])).toBe('Amazon Route 53 + NS1')
    expect(dnsProvider(['ns1.example.com'])).toBeNull()
    expect(mailProvider(['github-com.mail.protection.outlook.com'])).toBe('Microsoft 365')
    expect(mailProvider(['aspmx.l.google.com'])).toBe('Google Workspace')
  })
})

// ──────────────────────────────────────────────────────────────── network

function fakeFetch(routes: Record<string, unknown | number>) {
  const calls: string[] = []
  const impl = (async (input: string | URL | Request) => {
    const url = String(input)
    calls.push(url)
    const route = routes[url]
    if (route === undefined)
      return new Response('not found', { status: 404 })
    if (typeof route === 'number')
      return new Response('', { status: route })
    return new Response(JSON.stringify(route), { status: 200, headers: { 'content-type': 'application/rdap+json' } })
  }) as typeof fetch
  return { impl, calls }
}

describe('lookupDomain', () => {
  beforeEach(() => resetBootstrapCache())

  it('reads the registry, then follows the registrar for the contacts', async () => {
    const { impl, calls } = fakeFetch({
      [BOOTSTRAP_URL]: bootstrap,
      'https://rdap.verisign.com/com/v1/domain/google.com': verisign,
      'https://rdap.markmonitor.com/rdap/domain/GOOGLE.COM': markmonitor,
    })
    const result = await lookupDomain('https://www.google.com/search', { fetch: impl })
    expect(result.ok).toBe(true)
    if (!result.ok)
      return
    expect(result).toMatchObject({ domain: 'google.com', host: 'www.google.com', registered: true })
    expect(result.record?.registrant?.country).toBe('US')
    expect(result.sources).toHaveLength(2)
    expect(calls).toHaveLength(3)
  })

  it('reports an unregistered domain from the registry\'s 404', async () => {
    const { impl } = fakeFetch({ [BOOTSTRAP_URL]: bootstrap })
    const result = await lookupDomain('surely-nobody-has-this-one.com', { fetch: impl })
    expect(result).toMatchObject({ ok: true, registered: false, record: null, domain: 'surely-nobody-has-this-one.com' })
  })

  it('does not call a domain available because the registry was down', async () => {
    const { impl } = fakeFetch({ [BOOTSTRAP_URL]: bootstrap, 'https://rdap.verisign.com/com/v1/domain/example.com': 503 })
    expect(await lookupDomain('example.com', { fetch: impl })).toMatchObject({ ok: false, reason: 'registry-error' })
  })

  it('says so when a registry is rate-limiting', async () => {
    const { impl } = fakeFetch({ [BOOTSTRAP_URL]: bootstrap, 'https://rdap.verisign.com/com/v1/domain/example.com': 429 })
    expect(await lookupDomain('example.com', { fetch: impl, requireCors: true })).toMatchObject({ ok: false, reason: 'rate-limited', message: expect.stringContaining('Wait a minute') })
  })

  it('points a throttled server lookup at the browser page instead of telling it to wait', async () => {
    const { impl } = fakeFetch({ [BOOTSTRAP_URL]: bootstrap, 'https://rdap.verisign.com/com/v1/domain/example.com': 429 })
    const result = await lookupDomain('example.com', { fetch: impl })
    expect(result).toMatchObject({ ok: false, reason: 'rate-limited' })
    expect(!result.ok && result.message).toContain('zeal.tools/tools/whois-lookup')
    expect(!result.ok && result.message).not.toContain('Wait a minute')
  })

  it('keeps the registry record when the registrar cannot be read', async () => {
    const { impl } = fakeFetch({
      [BOOTSTRAP_URL]: bootstrap,
      'https://rdap.verisign.com/com/v1/domain/google.com': verisign,
      'https://rdap.markmonitor.com/rdap/domain/GOOGLE.COM': 500,
    })
    const result = await lookupDomain('google.com', { fetch: impl })
    expect(result).toMatchObject({ ok: true, registered: true })
    expect(result.ok && result.registrarError).toContain('500')
  })

  it('does not follow a registrar link the guard refuses', async () => {
    const { impl, calls } = fakeFetch({
      [BOOTSTRAP_URL]: bootstrap,
      'https://rdap.verisign.com/com/v1/domain/google.com': verisign,
    })
    await lookupDomain('google.com', { fetch: impl, guard: url => !url.includes('markmonitor') })
    expect(calls.some(url => url.includes('markmonitor'))).toBe(false)
  })

  it('refuses a registry a browser cannot read only when asked to', async () => {
    const { impl } = fakeFetch({ [BOOTSTRAP_URL]: bootstrap })
    expect(await lookupDomain('denic.de', { fetch: impl, requireCors: true })).toMatchObject({ ok: false, reason: 'no-cors' })
    expect(await lookupDomain('denic.de', { fetch: impl })).toMatchObject({ ok: true, registered: false })
  })

  it('explains a TLD with no RDAP at all', async () => {
    const { impl } = fakeFetch({ [BOOTSTRAP_URL]: bootstrap })
    const result = await lookupDomain('example.zz', { fetch: impl })
    expect(result).toMatchObject({ ok: false, reason: 'no-rdap' })
  })

  it('asks for IANA\'s file once, not on every lookup', async () => {
    const { impl, calls } = fakeFetch({ [BOOTSTRAP_URL]: bootstrap })
    await lookupDomain('a-one.com', { fetch: impl })
    await lookupDomain('a-two.com', { fetch: impl })
    expect(calls.filter(url => url === BOOTSTRAP_URL)).toHaveLength(1)
  })
})

describe('lookupDns', () => {
  it('collects each type and survives one failing', async () => {
    const impl = (async (input: string | URL | Request) => {
      const type = new URL(String(input)).searchParams.get('type')
      if (type === 'CAA')
        return new Response('', { status: 500 })
      if (type === 'A')
        return new Response(JSON.stringify({ Answer: [{ type: 1, TTL: 60, data: '1.2.3.4' }] }))
      return new Response(JSON.stringify({ Status: 0 }))
    }) as typeof fetch
    const result = await lookupDns('example.com', impl)
    expect(result.A).toEqual([{ type: 'A', value: '1.2.3.4', ttl: 60 }])
    expect(result.MX).toEqual([])
    expect(result.CAA).toBeUndefined()
    expect(result.error).toBeUndefined()
  })
})
