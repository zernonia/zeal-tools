import type { ToolMeta } from '../../shared/registry/types'

const meta: ToolMeta = {
  slug: 'whois-lookup',
  name: 'WHOIS Lookup',
  tagline: 'Who owns a domain, who it is registered with, and when it expires.',
  description:
    'Look up any domain\'s owner, registrar, registration and expiry dates, status locks, nameservers and '
    + 'live DNS records — read straight from the registry over RDAP, the modern WHOIS. Your browser asks the '
    + 'registry itself, so the lookup never passes through us. Free, no sign-up.',
  category: 'Web',
  keywords: [
    'whois lookup',
    'whois',
    'domain lookup',
    'domain owner lookup',
    'who owns this domain',
    'rdap lookup',
    'domain age checker',
    'domain expiry date',
    'domain availability',
    'registrar lookup',
    'dns lookup',
    'nameserver lookup',
    'mx lookup',
  ],
  addedAt: '2026-11-10',
  api: true,
  apiPath: 'whois',
  mcp: true,
  variants: ['domain-age', 'domain-availability'],
  shareCopy:
    'Free WHOIS lookup — owner, registrar, expiry and DNS for any domain, read straight from the registry. '
    + 'No sign-up, nothing routed through a middleman.',
  icon: '🌐',
}

export default meta
