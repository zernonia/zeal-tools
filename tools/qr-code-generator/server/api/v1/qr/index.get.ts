import type { DotStyle, EcLevel } from '../../../../core'
import { generateQr } from '../../../../core'
import { renderPng } from '../../../../core/render-png'

/**
 * GET variant for direct <img src> usage:
 *   /api/v1/qr?data=https://zeal.tools&format=png&size=512&ec=M
 */
export default defineEventHandler((event) => {
  enforceRateLimit(event)
  const query = getQuery(event)
  const data = typeof query.data === 'string' ? query.data : ''
  if (!data)
    badRequest('Provide ?data=… — e.g. /api/v1/qr?data=https://zeal.tools')

  const ecLevel = (typeof query.ec === 'string' && ['L', 'M', 'Q', 'H'].includes(query.ec) ? query.ec : 'M') as EcLevel
  const size = query.size ? Number(query.size) : undefined
  const margin = query.margin ? Number(query.margin) : undefined
  const str = (key: string) => (typeof query[key] === 'string' ? query[key] as string : undefined)
  const fg = str('fg')
  const bg = str('bg')
  const dotStyle = str('style') as DotStyle | undefined
  const eyeFrameStyle = str('eyeFrame') as never
  const eyeBallStyle = str('eyeBall') as never
  const gradientTo = str('gradientTo')

  try {
    const result = generateQr(data, {
      ecLevel,
      margin,
      fg,
      bg,
      dotStyle,
      size,
      eyeFrameStyle,
      eyeBallStyle,
      eyeFrameColor: str('eyeColor'),
      eyeBallColor: str('ballColor'),
      // ?gradientTo=%237c3aed&gradientType=radial&gradientAngle=45 (fg is the start color)
      gradient: gradientTo
        ? { type: str('gradientType') === 'radial' ? 'radial' : 'linear', from: fg ?? '#111111', to: gradientTo, rotation: query.gradientAngle ? Number(query.gradientAngle) : 45 }
        : undefined,
    })
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
    if (error && typeof error === 'object' && 'statusCode' in error)
      throw error
    badRequest(error instanceof Error ? error.message : 'Failed to generate QR code')
  }
})
