import type { ToolMeta } from '../../shared/registry/types'

const meta: ToolMeta = {
  slug: 'qr-code-scanner',
  name: 'QR Code Scanner',
  tagline: 'Scan a QR code with your camera or from an image — and see where it really goes first.',
  description:
    'Scan QR codes and barcodes with your camera, from a screenshot or photo, or by pasting an image. '
    + 'Links are never opened automatically: you see the real domain first, with warnings for lookalike, '
    + 'shortened and unencrypted addresses. WiFi, contacts, events, email and phone codes are read into '
    + 'something useful. Everything runs on your device; nothing is uploaded. Free, no sign-up, no app.',
  category: 'Generators',
  keywords: [
    'qr code scanner',
    'qr scanner',
    'scan qr code',
    'scan qr code from image',
    'scan qr code from screenshot',
    'qr code reader',
    'barcode scanner',
    'qr code checker',
    'read qr code online',
    'quishing',
  ],
  addedAt: '2026-11-20',
  // Scanning needs a camera or an image. The only way to offer it headlessly
  // would be to accept uploaded images on our server, which is exactly what
  // the tool promises never to do — so there is no API and no MCP tool.
  api: false,
  mcp: false,
  shareCopy:
    'Free QR code scanner that shows you where a link really goes before you open it — camera, screenshot '
    + 'or paste, all on your device. No sign-up, no app, open source.',
  icon: '📷',
}

export default meta
