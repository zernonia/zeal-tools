import { generateQr, type EcLevel, type DotStyle, type QrInput } from '../../../../core'
import { renderPng } from '../../../../core/render-png'

interface QrRequestBody {
  /** Shorthand: raw payload string (equivalent to type: 'text'). */
  data?: string
  type?: QrInput['type']
  // type-specific fields (url, ssid, password, to, phone, …) live at the top level
  [key: string]: unknown
  options?: {
    ecLevel?: EcLevel
    margin?: number
    size?: number
    fg?: string
    bg?: string
    dotStyle?: DotStyle
  }
  /** 'svg' (default) returns image/svg+xml; 'png' returns image/png; 'json' returns metadata + svg. */
  format?: 'svg' | 'png' | 'json'
}

export default defineEventHandler(async (event) => {
  enforceRateLimit(event)
  const body = await readBody<QrRequestBody>(event).catch(() => badRequest('Body must be JSON'))

  const input: QrInput | string = body.type
    ? ({ ...body, type: body.type } as unknown as QrInput)
    : (typeof body.data === 'string' && body.data.length > 0 ? body.data : badRequest('Provide `data` (string) or `type` + fields — e.g. {"data": "https://zeal.tools"}'))

  const options = body.options ?? {}
  const format = body.format ?? 'svg'

  try {
    const result = generateQr(input, {
      ecLevel: options.ecLevel,
      margin: options.margin,
      fg: options.fg,
      bg: options.bg,
      dotStyle: options.dotStyle,
      size: options.size,
    })

    if (format === 'png') {
      setResponseHeader(event, 'content-type', 'image/png')
      setResponseHeader(event, 'cache-control', 'public, max-age=86400')
      return renderPng(result.matrix, { size: options.size, margin: options.margin, fg: options.fg, bg: options.bg })
    }
    if (format === 'json') {
      return { svg: result.svg, size: result.size, version: result.version, ecLevel: result.ecLevel, payload: result.payload }
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
