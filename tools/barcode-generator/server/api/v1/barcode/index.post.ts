import type { EncodeOptions, SvgOptions } from '../../../../core'
import { BarcodeError, generateBarcode, parseSymbology, SYMBOLOGIES } from '../../../../core'

interface BarcodeRequestBody {
  /** ean13 | ean8 | upca | upce | code128 | code39 | itf14 (common spellings accepted). */
  type?: string
  data?: string
  options?: EncodeOptions & SvgOptions
  /** 'svg' (default) returns image/svg+xml; 'json' returns the SVG plus what was encoded. */
  format?: 'svg' | 'json'
}

export default defineEventHandler(async (event) => {
  enforceRateLimit(event)
  const body = await readBody<BarcodeRequestBody>(event).catch(() => badRequest('Body must be JSON'))
  if (!body || typeof body !== 'object')
    badRequest('Body must be JSON — e.g. {"type": "ean13", "data": "400638133393"}')

  const symbology = parseSymbology(body.type ?? 'code128')
  if (!symbology)
    badRequest(`Unknown type. Use one of: ${SYMBOLOGIES.map(s => s.id).join(', ')}.`)
  if (typeof body.data !== 'string' || !body.data)
    badRequest('Provide `data` (string) — e.g. {"type": "ean13", "data": "400638133393"}')

  // Only known option keys travel on, and every colour is sanitised in the renderer.
  const o = body.options ?? {}
  const n = (value: unknown) => (typeof value === 'number' ? value : undefined)
  try {
    const { svg, barcode } = generateBarcode(symbology, body.data, {
      checkChar: o.checkChar === true,
      bearers: o.bearers !== false,
      moduleWidth: n(o.moduleWidth),
      height: n(o.height),
      margin: n(o.margin),
      fontSize: n(o.fontSize),
      showText: o.showText !== false,
      fg: typeof o.fg === 'string' ? o.fg : undefined,
      bg: typeof o.bg === 'string' ? o.bg : undefined,
    })
    if (body.format === 'json')
      return { svg, data: barcode.data, checkDigit: barcode.checkDigit ?? null, checkDigitAdded: barcode.checkAdded ?? false, modules: barcode.modules }
    setResponseHeader(event, 'content-type', 'image/svg+xml')
    setResponseHeader(event, 'cache-control', 'public, max-age=86400')
    return svg
  }
  catch (error) {
    if (error instanceof BarcodeError)
      badRequest(error.message)
    throw error
  }
})
