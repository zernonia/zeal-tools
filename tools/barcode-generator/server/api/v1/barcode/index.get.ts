import { BarcodeError, generateBarcode, parseSymbology, SYMBOLOGIES } from '../../../../core'

/**
 * GET variant for direct <img src> usage:
 *   /api/v1/barcode?type=ean13&data=400638133393
 *   /api/v1/barcode?type=code128&data=ZEAL-42&w=3&h=120&text=false
 *
 * SVG only. The human-readable line is text, and a PNG drawn on the server
 * would need a font shipped in the Worker; the page rasterises the same SVG
 * in the browser instead.
 */
export default defineEventHandler((event) => {
  enforceRateLimit(event)
  const query = getQuery(event)
  const str = (key: string) => (typeof query[key] === 'string' ? query[key] as string : undefined)
  const num = (key: string) => (str(key) !== undefined && Number.isFinite(Number(str(key))) ? Number(str(key)) : undefined)
  const flag = (key: string) => (str(key) === undefined ? undefined : str(key) !== 'false' && str(key) !== '0')

  const symbology = parseSymbology(str('type') ?? 'code128')
  if (!symbology)
    badRequest(`Unknown type. Use one of: ${SYMBOLOGIES.map(s => s.id).join(', ')}.`)
  const data = str('data')
  if (!data)
    badRequest('Provide ?data=… — e.g. /api/v1/barcode?type=ean13&data=400638133393')

  try {
    const { svg, barcode } = generateBarcode(symbology, data, {
      checkChar: flag('check') ?? false,
      bearers: flag('bearers') ?? true,
      moduleWidth: num('w'),
      height: num('h'),
      margin: num('margin'),
      showText: flag('text') ?? true,
      fg: str('fg'),
      bg: str('bg'),
    })
    if (query.format === 'json')
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
