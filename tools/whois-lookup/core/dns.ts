/**
 * The domain's live DNS, through DNS-over-HTTPS.
 *
 * RDAP says who registered a name and where its nameservers are; DNS says
 * what it actually points at. A browser cannot send a DNS query itself, but
 * Cloudflare's resolver answers JSON over HTTPS (`application/dns-json`) with
 * `access-control-allow-origin: *`, so the page can ask it directly.
 */

export const DOH_ENDPOINT = 'https://cloudflare-dns.com/dns-query'

/** RR type numbers from the IANA registry, for the types worth showing. */
export const RECORD_TYPES = { A: 1, NS: 2, CNAME: 5, MX: 15, TXT: 16, AAAA: 28, CAA: 257 } as const
export type RecordType = keyof typeof RECORD_TYPES

/** What is asked, in display order. CNAME is never valid at the apex, so it is not. */
export const QUERIED: RecordType[] = ['A', 'AAAA', 'MX', 'NS', 'TXT', 'CAA']

export interface DnsRecord {
  type: RecordType
  value: string
  ttl: number
  /** MX only. */
  priority?: number
}

interface DohAnswer {
  name?: string
  type?: number
  TTL?: number
  data?: string
}

export interface DohResponse {
  Status?: number
  Answer?: DohAnswer[]
}

/**
 * One DoH answer, filtered to the type asked for.
 *
 * Answers for an aliased name include the CNAME chain before the records, so
 * a query for `A` can return a type-5 row first. TXT data arrives quoted and,
 * past 255 bytes, split into several quoted strings that belong together —
 * an SPF record or DKIM key is unreadable until they are joined.
 */
export function parseDoh(response: DohResponse, type: RecordType): DnsRecord[] {
  const wanted = RECORD_TYPES[type]
  return (response.Answer ?? [])
    .filter(answer => answer.type === wanted && typeof answer.data === 'string')
    .map((answer) => {
      const data = answer.data!.trim()
      const ttl = answer.TTL ?? 0
      if (type === 'MX') {
        const [priority, ...host] = data.split(/\s+/)
        return { type, value: host.join(' ').replace(/\.$/, ''), ttl, priority: Number(priority) }
      }
      if (type === 'TXT')
        return { type, value: joinTxt(data), ttl }
      if (type === 'NS' || type === 'CNAME')
        return { type, value: data.replace(/\.$/, '').toLowerCase(), ttl }
      return { type, value: data, ttl }
    })
    .sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0) || a.value.localeCompare(b.value))
}

export function joinTxt(data: string): string {
  const pieces = [...data.matchAll(/"((?:[^"\\]|\\.)*)"/g)].map(m => m[1]!.replace(/\\(.)/g, '$1'))
  return pieces.length ? pieces.join('') : data
}

// ─────────────────────────────────────────────────────────────── providers

/**
 * Who runs the DNS and the mail, recognised from the hostnames. Only
 * providers whose hostnames are unambiguous are listed — a guess presented as
 * a finding is worse than saying nothing.
 */
const PROVIDERS: { pattern: RegExp, name: string }[] = [
  { pattern: /\.ns\.cloudflare\.com$/, name: 'Cloudflare' },
  { pattern: /\.awsdns-\d+\./, name: 'Amazon Route 53' },
  { pattern: /\.googledomains\.com$|\.zdns\.google$/, name: 'Google Cloud DNS' },
  { pattern: /\.azure-dns\.(?:com|net|org|info)$/, name: 'Azure DNS' },
  { pattern: /\.nsone\.net$/, name: 'NS1' },
  { pattern: /\.domaincontrol\.com$/, name: 'GoDaddy' },
  { pattern: /\.registrar-servers\.com$/, name: 'Namecheap' },
  { pattern: /\.vercel-dns\.com$/, name: 'Vercel' },
  { pattern: /\.dnsimple\.com$/, name: 'DNSimple' },
  { pattern: /\.digitalocean\.com$/, name: 'DigitalOcean' },
  { pattern: /\.hetzner\.com$|\.your-server\.de$/, name: 'Hetzner' },
  { pattern: /\.squarespacedns\.com$/, name: 'Squarespace' },
  { pattern: /\.wixdns\.net$/, name: 'Wix' },
  { pattern: /\.akam\.net$/, name: 'Akamai' },
  { pattern: /\.ultradns\.\w+$/, name: 'UltraDNS' },
  { pattern: /\.dynect\.net$/, name: 'Oracle Dyn' },
]

const MAIL_PROVIDERS: { pattern: RegExp, name: string }[] = [
  { pattern: /(?:^|\.)(?:aspmx\.l\.google\.com|googlemail\.com|smtp\.google\.com)$/, name: 'Google Workspace' },
  { pattern: /\.mail\.protection\.outlook\.com$/, name: 'Microsoft 365' },
  { pattern: /\.zoho\.(?:com|eu|in)$/, name: 'Zoho Mail' },
  { pattern: /\.protonmail\.ch$/, name: 'Proton Mail' },
  { pattern: /\.messagingengine\.com$/, name: 'Fastmail' },
  { pattern: /\.mx\.cloudflare\.net$/, name: 'Cloudflare Email Routing' },
  { pattern: /\.icloud\.com$/, name: 'iCloud Mail' },
  { pattern: /\.improvmx\.com$/, name: 'ImprovMX' },
  { pattern: /\.mimecast\.com$/, name: 'Mimecast' },
  { pattern: /\.pphosted\.com$/, name: 'Proofpoint' },
  { pattern: /\.secureserver\.net$/, name: 'GoDaddy' },
  { pattern: /\.yandex\.(?:net|ru)$/, name: 'Yandex Mail' },
]

function recognise(hosts: string[], table: typeof PROVIDERS): string | null {
  const names = new Set<string>()
  for (const host of hosts) {
    const match = table.find(p => p.pattern.test(host.toLowerCase()))
    if (match)
      names.add(match.name)
  }
  return names.size ? [...names].join(' + ') : null
}

export function dnsProvider(nameservers: string[]): string | null {
  return recognise(nameservers, PROVIDERS)
}

export function mailProvider(mx: string[]): string | null {
  return recognise(mx, MAIL_PROVIDERS)
}
