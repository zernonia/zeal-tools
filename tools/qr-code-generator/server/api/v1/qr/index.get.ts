import { generateQr, type EcLevel, type DotStyle } from '../../../../core'
import { renderPng } from '../../../../core/render-png'

/**
 * GET variant for direct <img src> usage:
 *   /api/v1/qr?data=https://zeal.tools&format=png&size=512&ec=M
 */
export default defineEventHandler((event) => {
  enforceRateLimit(event)
  const query = getQuery(event)
  const data = typeof query.data === 'string' ? query.data : ''
  if (!data) badRequest('Provide ?data=… — e.g. /api/v1/qr?data=https://zeal.tools')

  const ecLevel = (typeof query.ec === 'string' && ['L', 'M', 'Q', 'H'].includes(query.ec) ? query.ec : 'M') as EcLevel
  const size = query.size ? Number(query.size) : undefined
  const margin = query.margin ? Number(query.margin) : undefined
  const fg = typeof query.fg === 'string' ? query.fg : undefined
  const bg = typeof query.bg === 'string' ? query.bg : undefined
  const dotStyle = (typeof query.style === 'string' ? query.style : undefined) as DotStyle | undefined

  try {
    const result = generateQr(data, { ecLevel, margin, fg, bg, dotStyle, size })
    if (query.format === 'png') {
      setResponseHeader(event, 'content-type', 'image/png')
      setResponseHeader(event, 'cache-control', 'public, max-age=86400')
      return renderPng(result.matrix, { size, margin, fg, bg })
    }
    setResponseHeader(event, 'content-type', 'image/svg+xml')
    setResponseHeader(event, 'cache-control', 'public, max-age=86400')
    return result.svg
  }
  catch (error) {
    if (error && typeof error === 'object' && 'statusCode' in error) throw error
    badRequest(error instanceof Error ? error.message : 'Failed to generate QR code')
  }
})
