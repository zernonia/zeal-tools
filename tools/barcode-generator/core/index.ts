/**
 * Public surface of the barcode core. The UI, the REST API and the MCP tool
 * all go through `encodeBarcode` / `generateBarcode`; everything else in this
 * folder is an implementation detail.
 */
import type { SvgOptions } from './render-svg'
import type { Barcode, Symbology, TextSpan } from './types'
import { encodeCode39 } from './code39'
import { encodeCode128 } from './code128'
import { encodeEan8, encodeEan13, encodeUpcA, encodeUpcE, NAMES } from './ean'
import { encodeItf14 } from './itf'
import { renderSvg } from './render-svg'

export type { Barcode, SvgOptions, Symbology, TextSpan }
export { DEFAULT_SVG_OPTIONS, layoutBarcode, MIN_PCS, renderSvg, sanitizeColor, scanContrast } from './render-svg'
export { BarcodeError } from './types'
export { NAMES }

export interface SymbologyInfo {
  id: Symbology
  name: string
  /** Shown, and encoded, when the input is empty — the zero-click example. */
  sample: string
  /** What the input field expects, in a few words. */
  accepts: string
  /** Typical X-dimension (module width) in mm at 100% size, where one is defined. */
  nominalModuleMm?: number
}

export const SYMBOLOGIES: SymbologyInfo[] = [
  { id: 'ean13', name: 'EAN-13', sample: '400638133393', accepts: '12 digits (13 with check digit)', nominalModuleMm: 0.33 },
  { id: 'upca', name: 'UPC-A', sample: '03600029145', accepts: '11 digits (12 with check digit)', nominalModuleMm: 0.33 },
  { id: 'ean8', name: 'EAN-8', sample: '9638507', accepts: '7 digits (8 with check digit)', nominalModuleMm: 0.33 },
  { id: 'upce', name: 'UPC-E', sample: '0123456', accepts: '6–8 digits, or a UPC-A to shorten', nominalModuleMm: 0.33 },
  { id: 'code128', name: 'Code 128', sample: 'ZEAL-2026-00042', accepts: 'Any ASCII text, up to 80 characters' },
  { id: 'code39', name: 'Code 39', sample: 'ZEAL TOOLS', accepts: '0–9, A–Z, space and - . $ / + %' },
  { id: 'itf14', name: 'ITF-14', sample: '1540014128876', accepts: '13 digits (14 with check digit)', nominalModuleMm: 1.016 },
]

const ALIASES: Record<string, Symbology> = {
  ean13: 'ean13',
  ean: 'ean13',
  jan: 'ean13',
  ean8: 'ean8',
  upca: 'upca',
  upc: 'upca',
  upce: 'upce',
  code128: 'code128',
  c128: 'code128',
  code39: 'code39',
  c39: 'code39',
  itf14: 'itf14',
  itf: 'itf14',
}

/** 'EAN-13', 'ean13', 'upc' … → a symbology id, or null. */
export function parseSymbology(value: unknown): Symbology | null {
  if (typeof value !== 'string')
    return null
  return ALIASES[value.toLowerCase().replace(/[^a-z0-9]/g, '')] ?? null
}

export interface EncodeOptions {
  /** Code 39: append the optional mod-43 check character. */
  checkChar?: boolean
  /** ITF-14: draw bearer bars (default true). */
  bearers?: boolean
}

export function encodeBarcode(symbology: Symbology, data: string, options: EncodeOptions = {}): Barcode {
  switch (symbology) {
    case 'ean13': return encodeEan13(data)
    case 'ean8': return encodeEan8(data)
    case 'upca': return encodeUpcA(data)
    case 'upce': return encodeUpcE(data)
    case 'code128': return encodeCode128(data)
    case 'code39': return encodeCode39(data, { checkChar: options.checkChar })
    case 'itf14': return encodeItf14(data, { bearers: options.bearers })
  }
}

export interface GenerateResult {
  svg: string
  barcode: Barcode
}

export function generateBarcode(symbology: Symbology, data: string, options: EncodeOptions & SvgOptions = {}): GenerateResult {
  const barcode = encodeBarcode(symbology, data, options)
  return { barcode, svg: renderSvg(barcode, options) }
}
