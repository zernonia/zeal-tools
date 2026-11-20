import type { ToolMeta } from '../../shared/registry/types'

const meta: ToolMeta = {
  slug: 'barcode-generator',
  name: 'Barcode Generator',
  tagline: 'EAN, UPC, Code 128, Code 39 and ITF-14 — check digits done for you.',
  description:
    'Generate EAN-13, EAN-8, UPC-A, UPC-E, Code 128, Code 39 and ITF-14 barcodes with check digits calculated and verified. '
    + 'Download as SVG or PNG at print resolution. Made in your browser by our own open-source encoder — also a REST API and MCP tool.',
  category: 'Generators',
  keywords: ['barcode', 'bar code', 'ean', 'ean-13', 'ean-8', 'upc', 'upc-a', 'upc-e', 'code 128', 'code 39', 'itf-14', 'gtin', 'sku', 'product barcode', 'label', 'check digit'],
  addedAt: '2026-11-20',
  api: true,
  apiPath: 'barcode',
  apiMethods: ['GET', 'POST'],
  mcp: true,
  shareCopy: 'Free barcode generator — EAN, UPC, Code 128, Code 39, ITF-14. Check digits done for you, SVG + PNG, no sign-up. Open source, with a free API + MCP server.',
  icon: '▥',
}

export default meta
