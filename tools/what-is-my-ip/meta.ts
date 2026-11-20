import type { ToolMeta } from '../../shared/registry/types'

const meta: ToolMeta = {
  slug: 'what-is-my-ip',
  name: 'What Is My IP',
  tagline: 'Your public IP address, and what it tells every site you visit.',
  description:
    'See your public IP address, whether it is IPv4 or IPv6, and what any website can work out from it: '
    + 'approximate city and country, time zone, your internet provider and its network number. '
    + 'Shown back to you and never stored. Free, no sign-up.',
  category: 'Web',
  keywords: [
    'what is my ip',
    'what is my ip address',
    'my ip',
    'my ip address',
    'ip address lookup',
    'check my ip',
    'public ip address',
    'ipv4 address',
    'ipv6 address',
    'ip location',
    'what is my isp',
    'asn lookup',
  ],
  addedAt: '2026-11-20',
  api: true,
  apiPath: 'ip',
  // An MCP call is made by the MCP client's server, not by the person using
  // it, so it would report that machine's address and location as theirs — a
  // confident wrong answer. The REST endpoint is honest because whoever calls
  // it is the one whose address comes back.
  mcp: false,
  shareCopy:
    'Free "what is my IP" — your public address, IPv4 or IPv6, and what every site can see from it. '
    + 'Nothing stored, no sign-up.',
  icon: '📍',
}

export default meta
