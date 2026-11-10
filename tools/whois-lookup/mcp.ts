import type { McpTool } from '../../shared/registry/mcp-types'
import { guardUrl } from '../../shared/core/url-guard'
import { describeAge, describeStatus, dnsProvider, lookupDns, lookupDomain, mailProvider } from './core'
import meta from './meta'

const tool: McpTool = {
  name: 'whois_lookup',
  title: meta.name,
  description:
    'Look up a domain over RDAP, the modern WHOIS: whether it is registered, the registrar, registration and '
    + 'expiry dates, status codes with plain-English meanings, nameservers, DNSSEC, the owner where the registry '
    + 'publishes one, and the registrar\'s abuse contact. Accepts a bare domain, a subdomain or a full URL and '
    + 'looks up the registered name. Set `dns` to also read live A, AAAA, MX, NS, TXT and CAA records. '
    + 'Identity Digital\'s registries (.io, .ai, .me, .tools and many more) currently refuse lookups from our '
    + 'server; for those, use https://zeal.tools/tools/whois-lookup in a browser.',
  inputSchema: {
    type: 'object',
    properties: {
      domain: { type: 'string', description: 'Domain, subdomain or URL, e.g. example.com or https://blog.example.co.uk/post' },
      dns: { type: 'boolean', description: 'Also read live DNS records (default false).' },
    },
    required: ['domain'],
  },
  async run(args) {
    const input = typeof args.domain === 'string' ? args.domain : ''
    const result = await lookupDomain(input, { guard: url => url.startsWith('https://') && guardUrl(url).ok })
    if (!result.ok)
      return { isError: true, content: [{ type: 'text', text: result.message }] }

    if (!result.registered) {
      return {
        content: [{ type: 'text', text: `${result.domain} is not registered — the registry has no record of it.` }],
        structuredContent: { domain: result.domain, registered: false, sources: result.sources },
      }
    }

    const record = result.record!
    const dns = args.dns === true ? await lookupDns(result.domain) : undefined
    const owner = record.registrant?.organization ?? record.registrant?.name
    const lines = [
      `${result.domain} is registered${record.registrar?.name ? ` with ${record.registrar.name.replace(/\.$/, '')}` : ''}.`,
      record.registered ? `Registered ${record.registered.slice(0, 10)} (${describeAge(record.registered)} ago).` : null,
      record.expires ? `Expires ${record.expires.slice(0, 10)}.` : null,
      owner
        ? `Registrant: ${owner}${record.registrant?.country ? `, ${record.registrant.country}` : ''}${record.privacyService ? ' (a privacy service)' : ''}.`
        : record.redacted ? 'Registrant details are withheld for privacy.' : null,
      record.status.length ? `Status: ${record.status.map(s => describeStatus(s).label).join(', ')}.` : null,
      record.nameservers.length ? `Nameservers: ${record.nameservers.join(', ')}${dnsProvider(record.nameservers) ? ` (${dnsProvider(record.nameservers)})` : ''}.` : null,
      dns?.MX?.length && mailProvider(dns.MX.map(r => r.value)) ? `Mail: ${mailProvider(dns.MX.map(r => r.value))}.` : null,
    ].filter(Boolean)

    return {
      content: [{ type: 'text', text: lines.join('\n') }],
      structuredContent: {
        domain: result.domain,
        registered: true,
        record,
        statusMeanings: record.status.map(describeStatus),
        ...(dns ? { dns } : {}),
        sources: result.sources,
      },
    }
  },
}

export default tool
