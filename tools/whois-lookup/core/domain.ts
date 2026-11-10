/**
 * Turning whatever was pasted into the one name a registry will answer for.
 *
 * People paste URLs, subdomains, names with a trailing dot and names in their
 * own script. A registry only knows the *registered* domain, so a lookup of
 * `blog.example.com` has to become `example.com` — and getting that wrong is
 * worse than an error, because the registry answers 404 and the tool would
 * report a taken domain as available.
 */

/**
 * Second-level suffixes that are themselves sold under, so the registered
 * name is three labels deep (`bbc.co.uk`, not `co.uk`).
 *
 * The full Public Suffix List is about 300 KB and mostly private suffixes
 * (`github.io`, `blogspot.com`) that registries do not know about anyway. This
 * covers the public second levels of the ccTLDs people actually look up. A
 * miss here means the suffix itself gets looked up first, so the lookup tries
 * one label deeper before it believes a 404 — see `candidates`.
 */
export const SECOND_LEVEL = new Set([
  // United Kingdom
  'co.uk',
  'org.uk',
  'me.uk',
  'ltd.uk',
  'plc.uk',
  'net.uk',
  'sch.uk',
  'ac.uk',
  'gov.uk',
  // Australia and New Zealand
  'com.au',
  'net.au',
  'org.au',
  'edu.au',
  'gov.au',
  'asn.au',
  'id.au',
  'co.nz',
  'org.nz',
  'net.nz',
  'ac.nz',
  'govt.nz',
  // Asia
  'com.sg',
  'net.sg',
  'org.sg',
  'edu.sg',
  'gov.sg',
  'com.my',
  'net.my',
  'org.my',
  'edu.my',
  'gov.my',
  'co.jp',
  'ne.jp',
  'or.jp',
  'ac.jp',
  'go.jp',
  'co.kr',
  'or.kr',
  'com.cn',
  'net.cn',
  'org.cn',
  'com.hk',
  'org.hk',
  'com.tw',
  'org.tw',
  'co.in',
  'net.in',
  'org.in',
  'firm.in',
  'gen.in',
  'ind.in',
  'co.id',
  'or.id',
  'web.id',
  'com.ph',
  'co.th',
  'in.th',
  'com.vn',
  // Elsewhere
  'co.za',
  'org.za',
  'com.br',
  'net.br',
  'org.br',
  'com.mx',
  'com.ar',
  'com.co',
  'com.tr',
  'co.il',
  'com.ng',
  'co.ke',
])

export type DomainFailure = 'empty' | 'ip' | 'invalid' | 'single-label'

export interface ParsedDomain {
  ok: boolean
  /** The registered domain, ASCII (punycode) and lowercase. */
  domain?: string
  /** The full host that was entered, when it differs from `domain`. */
  host?: string
  /** Top-level domain, ASCII. */
  tld?: string
  reason?: DomainFailure
  message?: string
}

const LABEL = /^(?!-)[a-z0-9-]{1,63}(?<!-)$/

/** `URL` would accept these as hosts and they are not domains. */
function isIpLiteral(host: string): boolean {
  return host.startsWith('[') || /^\d{1,3}(?:\.\d{1,3}){3}$/.test(host)
}

export function registeredName(labels: string[]): string[] {
  if (labels.length >= 3 && SECOND_LEVEL.has(labels.slice(-2).join('.')))
    return labels.slice(-3)
  return labels.slice(-2)
}

export function parseDomain(input: string): ParsedDomain {
  const text = String(input ?? '').trim()
  if (!text)
    return { ok: false, reason: 'empty', message: 'Enter a domain to look up.' }

  // Hand the hostname rules to `URL`: it strips schemes, paths, ports and
  // credentials, lowercases, and converts international names to punycode the
  // way the registry stores them. `bücher.de` must become `xn--bcher-kva.de`.
  let host: string
  try {
    const candidate = /^[a-z][\w+.-]*:\/\//i.test(text) ? text : `http://${text}`
    host = new URL(candidate).hostname
  }
  catch {
    return { ok: false, reason: 'invalid', message: 'That does not look like a domain name.' }
  }

  host = host.replace(/\.$/, '')
  if (isIpLiteral(host))
    return { ok: false, reason: 'ip', message: 'That is an IP address, not a domain. This looks up domain names.' }

  const labels = host.split('.')
  if (host.length > 253 || labels.some(label => !LABEL.test(label)))
    return { ok: false, reason: 'invalid', message: 'That does not look like a domain name.' }
  if (labels.length < 2)
    return { ok: false, reason: 'single-label', message: `Add the ending — "${host}.com", for example.` }

  const domain = registeredName(labels).join('.')
  return {
    ok: true,
    domain,
    host: host === domain ? undefined : host,
    tld: labels.at(-1)!,
  }
}

/**
 * The names worth asking the registry about, best guess first.
 *
 * A 404 for the best guess is only believed when there is nothing deeper to
 * try: `shop.example.com.pk` guesses `com.pk` (the suffix is not in the list
 * above), is told no, and then asks for `example.com.pk`.
 */
export function candidates(parsed: ParsedDomain): string[] {
  if (!parsed.ok || !parsed.domain)
    return []
  const out = [parsed.domain]
  if (parsed.host) {
    const labels = parsed.host.split('.')
    const depth = parsed.domain.split('.').length
    out.push(labels.slice(-(depth + 1)).join('.'))
  }
  return out
}
