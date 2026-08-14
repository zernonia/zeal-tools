import type { ToolMeta } from '../../shared/registry/types'

const meta: ToolMeta = {
  slug: 'qr-code-generator',
  name: 'QR Code Generator',
  tagline: 'Free QR codes — no sign-up, no watermark, no expiry.',
  description:
    'Generate QR codes for URLs, WiFi, vCards, email, phone and SMS. Download as PNG or SVG. '
    + '100% client-side, open source, and free forever — also available as a REST API and MCP tool.',
  category: 'Generators',
  keywords: ['qr', 'qrcode', 'qr code', 'barcode', 'wifi qr', 'vcard', 'contact', 'link', 'url', 'scan', '2d code'],
  addedAt: '2026-08-14',
  api: true,
  mcp: true,
  variants: ['wifi', 'vcard', 'email'],
  shareCopy: 'Free QR code generator — no sign-up, no watermark, works offline. Open source, with a free API + MCP server.',
  icon: '▦',
}

export default meta
