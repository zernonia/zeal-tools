import type { ToolMeta } from '../../shared/registry/types'

const meta: ToolMeta = {
  slug: 'invoice-maker',
  name: 'Invoice Maker',
  tagline: 'Write an invoice, print it as a PDF, and keep your details for the next one.',
  description:
    'Make a clean, professional invoice in your browser and save it as a PDF through your own print '
    + 'dialog. Your business details, logo and clients are remembered on your device so the next invoice '
    + 'takes a minute — and nothing is ever uploaded, so no account and no per-invoice fee.',
  category: 'Business',
  keywords: [
    'invoice maker',
    'free invoice generator',
    'create invoice pdf',
    'invoice template online',
    'freelance invoice',
    'invoice with vat',
    'simple invoice generator no sign up',
    'billing document maker',
  ],
  addedAt: '2026-08-20',
  // The invoice is your business and your client's details. Sending it to a
  // server to be rendered is the one thing this tool exists to avoid.
  api: false,
  mcp: false,
  shareCopy:
    'Free invoice maker that never uploads anything — your details stay in your browser and the PDF comes '
    + 'from your own print dialog. No sign-up, no per-invoice fee, open source.',
  icon: '🧾',
}

export default meta
