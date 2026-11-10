import type { DnsRecord, DohResponse, RecordType } from './dns'
import type { ParsedDomain } from './domain'
import type { DomainRecord, RdapDomain } from './rdap'
import { DOH_ENDPOINT, parseDoh, QUERIED } from './dns'
import { candidates, parseDomain } from './domain'
import { mergeRecords, readDomain } from './rdap'

/**
 * The network half: which server to ask, and in what order.
 *
 * The same code runs in the browser and in the Worker, which is why `fetch`
 * is a parameter. In the browser nothing here touches zeal.tools — IANA, the
 * registries, the registrars and Cloudflare's resolver all send
 * `access-control-allow-origin: *`, so the page asks them itself. That was
 * measured before it was relied on, and it is the reason this tool can keep
 * the input off our server where the meta tag checker cannot.
 */

export const BOOTSTRAP_URL = 'https://data.iana.org/rdap/dns.json'
export const TIMEOUT_MS = 8000
const BOOTSTRAP_TTL_MS = 6 * 60 * 60 * 1000

export interface RdapServer {
  base: string
  /**
   * False when the server sends no CORS headers, so a browser cannot read it.
   * Only the API can reach these.
   */
  cors: boolean
}

/**
 * Registries that run RDAP but are not in IANA's bootstrap file, which only
 * lists what registries have formally submitted. Each was checked by hand:
 * a real lookup answered, and the CORS header was or was not present.
 */
export const UNLISTED: Record<string, RdapServer> = {
  io: { base: 'https://rdap.identitydigital.services/rdap/', cors: true },
  sh: { base: 'https://rdap.identitydigital.services/rdap/', cors: true },
  ac: { base: 'https://rdap.identitydigital.services/rdap/', cors: true },
  me: { base: 'https://rdap.identitydigital.services/rdap/', cors: true },
  de: { base: 'https://rdap.denic.de/', cors: false },
}

export interface Bootstrap {
  services: [string[], string[]][]
}

export function serverFor(bootstrap: Bootstrap, tld: string): RdapServer | null {
  const key = tld.toLowerCase()
  for (const [tlds, urls] of bootstrap.services ?? []) {
    if (!tlds.includes(key))
      continue
    const base = urls.find(url => url.startsWith('https://')) ?? urls[0]
    if (base)
      return { base: base.endsWith('/') ? base : `${base}/`, cors: true }
  }
  return UNLISTED[key] ?? null
}

export type LookupFailure
  = | 'input'
    | 'no-rdap'
    | 'no-cors'
    | 'blocked'
    | 'rate-limited'
    | 'unreachable'
    | 'registry-error'

export interface LookupSuccess {
  ok: true
  domain: string
  /** What was typed, when it was trimmed down to the registered name. */
  host?: string
  registered: boolean
  record: DomainRecord | null
  /** The RDAP URLs actually read, registry first. */
  sources: string[]
  /** Set when the registrar's record was linked but could not be read. */
  registrarError?: string
  raw: { registry?: unknown, registrar?: unknown }
}

export interface LookupError {
  ok: false
  reason: LookupFailure
  message: string
  domain?: string
}

export type LookupResult = LookupSuccess | LookupError

export interface LookupOptions {
  fetch?: typeof fetch
  /** Server side: refuse URLs that are not safe to request. */
  guard?: (url: string) => boolean
  /** Browser side: skip servers that cannot answer a page. */
  requireCors?: boolean
  followRegistrar?: boolean
}

let bootstrapCache: { at: number, value: Promise<Bootstrap> } | null = null

/** IANA's file is 70 KB and changes a few times a month. */
export function loadBootstrap(fetchImpl: typeof fetch = fetch): Promise<Bootstrap> {
  const now = Date.now()
  if (bootstrapCache && now - bootstrapCache.at < BOOTSTRAP_TTL_MS)
    return bootstrapCache.value
  const value = getJson<Bootstrap>(fetchImpl, BOOTSTRAP_URL, 'application/json').then((res) => {
    if (!res.ok || !res.body)
      throw new Error('bootstrap')
    return res.body
  })
  bootstrapCache = { at: now, value }
  value.catch(() => {
    if (bootstrapCache?.value === value)
      bootstrapCache = null
  })
  return value
}

/** Tests only. */
export function resetBootstrapCache() {
  bootstrapCache = null
}

interface JsonResponse<T> {
  ok: boolean
  status: number
  body?: T
}

async function getJson<T>(fetchImpl: typeof fetch, url: string, accept: string): Promise<JsonResponse<T>> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const response = await fetchImpl(url, { headers: { accept }, signal: controller.signal })
    if (!response.ok)
      return { ok: false, status: response.status }
    return { ok: true, status: response.status, body: await response.json() as T }
  }
  finally {
    clearTimeout(timer)
  }
}

function rdapUrl(server: RdapServer, domain: string) {
  return `${server.base}domain/${encodeURIComponent(domain)}`
}

const RDAP_ACCEPT = 'application/rdap+json, application/json;q=0.9'

export async function lookupDomain(input: string, options: LookupOptions = {}): Promise<LookupResult> {
  const fetchImpl = options.fetch ?? fetch
  const parsed: ParsedDomain = parseDomain(input)
  if (!parsed.ok || !parsed.domain || !parsed.tld)
    return { ok: false, reason: 'input', message: parsed.message ?? 'That does not look like a domain name.' }

  const { domain, host, tld } = parsed

  let bootstrap: Bootstrap
  try {
    bootstrap = await loadBootstrap(fetchImpl)
  }
  catch {
    return { ok: false, reason: 'unreachable', domain, message: 'Could not reach IANA to find the registry for this domain. Check your connection and try again.' }
  }

  const server = serverFor(bootstrap, tld)
  if (!server) {
    return {
      ok: false,
      reason: 'no-rdap',
      domain,
      message: `The .${tld} registry does not publish RDAP, the modern WHOIS. Its old port-43 WHOIS service speaks raw TCP, which no web page can open — the registry's own website is the place to look.`,
    }
  }
  if (options.requireCors && !server.cors) {
    return {
      ok: false,
      reason: 'no-cors',
      domain,
      message: `The .${tld} registry runs RDAP, but does not let web pages read it, so your browser cannot ask it directly.`,
    }
  }

  // Ask for the registered name; believe a 404 only once there is nothing
  // deeper worth trying (see `candidates`).
  let found: { name: string, url: string, body: RdapDomain } | null = null
  for (const name of candidates(parsed)) {
    const url = rdapUrl(server, name)
    if (options.guard && !options.guard(url))
      return { ok: false, reason: 'registry-error', domain, message: 'The registry address for this domain could not be used.' }
    let res: JsonResponse<RdapDomain>
    try {
      res = await getJson<RdapDomain>(fetchImpl, url, RDAP_ACCEPT)
    }
    catch (cause) {
      if (cause instanceof Error && cause.name === 'AbortError')
        return { ok: false, reason: 'unreachable', domain, message: `The .${tld} registry did not answer in time. Try again in a moment.` }
      // In a browser a refused CORS read and a dead server are the same
      // TypeError — the page is deliberately not told which. Say both.
      return {
        ok: false,
        reason: options.requireCors ? 'blocked' : 'unreachable',
        domain,
        message: `The .${tld} registry could not be reached from here. It may be down, or it may not let web pages read it.`,
      }
    }
    if (res.ok && res.body) {
      found = { name, url, body: res.body }
      break
    }
    if (res.status === 429)
      return { ok: false, reason: 'rate-limited', domain, message: `The .${tld} registry is rate-limiting lookups right now. Wait a minute and try again.` }
    if (res.status !== 404)
      return { ok: false, reason: 'registry-error', domain, message: `The .${tld} registry answered ${res.status} instead of a record. Try again in a moment.` }
  }

  if (!found) {
    return {
      ok: true,
      domain,
      host,
      registered: false,
      record: null,
      sources: [rdapUrl(server, domain)],
      raw: {},
    }
  }

  let record = readDomain(found.body)
  const sources = [found.url]
  const raw: LookupSuccess['raw'] = { registry: found.body }
  let registrarError: string | undefined

  // Thin registries hold no contacts; the registrar's own RDAP server does.
  if (options.followRegistrar !== false && record.related && record.related !== found.url) {
    const related = record.related
    if (!options.guard || options.guard(related)) {
      try {
        const res = await getJson<RdapDomain>(fetchImpl, related, RDAP_ACCEPT)
        if (res.ok && res.body) {
          record = mergeRecords(record, readDomain(res.body))
          sources.push(related)
          raw.registrar = res.body
        }
        else {
          registrarError = `The registrar's server answered ${res.status}, so only the registry's record is shown.`
        }
      }
      catch {
        registrarError = 'The registrar\'s server could not be read from here, so only the registry\'s record is shown.'
      }
    }
  }

  return {
    ok: true,
    domain: found.name,
    host: host === found.name ? undefined : host,
    registered: true,
    record: { ...record, domain: record.domain || found.name },
    sources,
    registrarError,
    raw,
  }
}

// ───────────────────────────────────────────────────────────────────── DNS

export type DnsResult = Partial<Record<RecordType, DnsRecord[]>> & { error?: string }

export async function lookupDns(domain: string, fetchImpl: typeof fetch = fetch, types: RecordType[] = QUERIED): Promise<DnsResult> {
  const out: DnsResult = {}
  const results = await Promise.allSettled(types.map(async (type) => {
    const url = `${DOH_ENDPOINT}?name=${encodeURIComponent(domain)}&type=${type}`
    const res = await getJson<DohResponse>(fetchImpl, url, 'application/dns-json')
    if (!res.ok || !res.body)
      throw new Error(String(res.status))
    return [type, parseDoh(res.body, type)] as const
  }))
  for (const result of results) {
    if (result.status === 'fulfilled')
      out[result.value[0]] = result.value[1]
  }
  if (results.every(r => r.status === 'rejected'))
    out.error = 'The DNS resolver could not be reached.'
  return out
}
