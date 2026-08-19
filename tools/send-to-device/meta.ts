import type { ToolMeta } from '../../shared/registry/types'

const meta: ToolMeta = {
  slug: 'send-to-device',
  name: 'Send to Device',
  tagline: 'Move a file between your own devices, straight across your WiFi.',
  description:
    'Send a file from your phone to your laptop, or the other way, without a cable, an account or an upload. '
    + 'Point one device\'s camera at the other\'s screen and the file travels directly over your own network — '
    + 'it is never uploaded, so there is no size limit imposed by us and nothing to expire.',
  category: 'Utilities',
  keywords: [
    'send file to device',
    'transfer file phone to laptop',
    'send file over wifi',
    'local file transfer',
    'airdrop alternative',
    'share file between devices',
    'file transfer without cable',
    'peer to peer file transfer browser',
  ],
  addedAt: '2026-08-20',
  // Peer-to-peer by definition: a REST endpoint would have to hold the file,
  // and an MCP tool has no second device to reach. Advertising either would
  // put a dead URL in the catalog.
  api: false,
  mcp: false,
  shareCopy:
    'Free file transfer between your own devices over WiFi — direct, never uploaded, no sign-up. Open source.',
  icon: '⇄',
}

export default meta
