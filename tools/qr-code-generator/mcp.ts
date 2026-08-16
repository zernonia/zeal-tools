import type { McpTool } from '../../shared/registry/mcp-types'
import type { EcLevel, QrInput } from './core'
import { generateQr } from './core'
import { renderPng } from './core/render-png'
import meta from './meta'

function toBase64(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i += 0x8000)
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(binary)
}

const tool: McpTool = {
  name: 'generate_qr',
  title: meta.name,
  description: `${meta.description} Returns the QR code as an SVG string, or a PNG image when format is "png".`,
  inputSchema: {
    type: 'object',
    properties: {
      data: { type: 'string', description: 'Raw payload to encode (URL, text, etc.). Use this OR the typed fields below.' },
      type: { type: 'string', enum: ['url', 'text', 'wifi', 'email', 'phone', 'sms', 'vcard'], description: 'Payload type when using typed fields.' },
      url: { type: 'string' },
      text: { type: 'string' },
      ssid: { type: 'string', description: 'WiFi network name (type: wifi)' },
      password: { type: 'string', description: 'WiFi password (type: wifi)' },
      security: { type: 'string', enum: ['WPA', 'WEP', 'nopass'] },
      to: { type: 'string', description: 'Email address (type: email)' },
      subject: { type: 'string' },
      body: { type: 'string' },
      phone: { type: 'string', description: 'Phone number (type: phone or sms)' },
      message: { type: 'string', description: 'SMS body (type: sms)' },
      ecLevel: { type: 'string', enum: ['L', 'M', 'Q', 'H'], description: 'Error correction level (default M)' },
      format: { type: 'string', enum: ['svg', 'png'], description: 'Output: svg text (default) or png image' },
      size: { type: 'number', description: 'PNG size in pixels (default 512, max 4096)' },
    },
  },
  run(args) {
    try {
      const input = (typeof args.type === 'string' ? args : String(args.data ?? '')) as QrInput | string
      if (typeof input === 'string' && !input)
        return { isError: true, content: [{ type: 'text', text: 'Provide `data` or `type` + fields.' }] }

      const ecLevel = (typeof args.ecLevel === 'string' ? args.ecLevel : 'M') as EcLevel
      const result = generateQr(input, { ecLevel })

      if (args.format === 'png') {
        const size = typeof args.size === 'number' ? args.size : 512
        const png = renderPng(result.matrix, { size })
        return {
          content: [
            { type: 'image', data: toBase64(png), mimeType: 'image/png' },
            { type: 'text', text: `QR code generated (version ${result.version}, EC ${result.ecLevel}, payload: ${result.payload.slice(0, 200)})` },
          ],
        }
      }
      return {
        content: [{ type: 'text', text: result.svg }],
        structuredContent: { version: result.version, ecLevel: result.ecLevel, modules: result.size },
      }
    }
    catch (error) {
      return { isError: true, content: [{ type: 'text', text: error instanceof Error ? error.message : 'Failed to generate QR code' }] }
    }
  },
}

export default tool
