import type { EcLevel, QrInput } from '../../tools/qr-code-generator/core'
import { registry } from '../../shared/registry'
import { generateQr } from '../../tools/qr-code-generator/core'
import { renderPng } from '../../tools/qr-code-generator/core/render-png'

/**
 * MCP endpoint (Streamable HTTP, stateless) — the protocol handshake is small
 * and stable, so in keeping with the zero-dependency policy we implement it
 * ourselves: JSON-RPC 2.0 over POST.
 *
 * v1 exposes read/generate-style tools only. Each MCP tool maps 1:1 to a
 * tool core; the list derives from registry entries with mcp: true.
 */

const PROTOCOL_VERSION = '2025-06-18'

interface JsonRpcRequest {
  jsonrpc: '2.0'
  id?: number | string | null
  method: string
  params?: Record<string, unknown>
}

const GENERATE_QR_SCHEMA = {
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
} as const

function listTools() {
  return registry.filter(tool => tool.mcp).map(tool => ({
    name: 'generate_qr',
    title: tool.name,
    description: `${tool.description} Returns the QR code as an SVG string, or a PNG image when format is "png".`,
    inputSchema: GENERATE_QR_SCHEMA,
  }))
}

function toBase64(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i += 0x8000)
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(binary)
}

function callTool(name: string, args: Record<string, unknown>) {
  if (name !== 'generate_qr') {
    return { isError: true, content: [{ type: 'text', text: `Unknown tool: ${name}` }] }
  }
  try {
    const input = (typeof args.type === 'string' ? args : String(args.data ?? '')) as QrInput | string
    if (typeof input === 'string' && !input) {
      return { isError: true, content: [{ type: 'text', text: 'Provide `data` or `type` + fields.' }] }
    }
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
}

/** Carries a JSON-RPC error code so the batch handler can echo it verbatim. */
class JsonRpcError extends Error {
  constructor(readonly code: number, message: string) {
    super(message)
  }
}

function handleRequest(request: JsonRpcRequest) {
  switch (request.method) {
    case 'initialize':
      return {
        protocolVersion: PROTOCOL_VERSION,
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: 'zeal-tools', title: 'zeal.tools', version: '1.0.0' },
        instructions: 'Free, open-source tools from zeal.tools. No auth required. Use generate_qr to create QR codes for URLs, WiFi, contacts and more.',
      }
    case 'ping':
      return {}
    case 'tools/list':
      return { tools: listTools() }
    case 'tools/call': {
      const params = request.params ?? {}
      return callTool(String(params.name ?? ''), (params.arguments ?? {}) as Record<string, unknown>)
    }
    default:
      throw new JsonRpcError(-32601, `Method not found: ${request.method}`)
  }
}

export default defineEventHandler(async (event) => {
  setResponseHeader(event, 'access-control-allow-origin', '*')
  setResponseHeader(event, 'access-control-allow-methods', 'POST, GET, OPTIONS')
  setResponseHeader(event, 'access-control-allow-headers', 'content-type, mcp-session-id, mcp-protocol-version')

  if (event.method === 'OPTIONS') {
    setResponseStatus(event, 204)
    return null
  }
  if (event.method === 'GET') {
    // Stateless server: no SSE stream to offer
    setResponseStatus(event, 405)
    return { error: 'This MCP server is stateless — send JSON-RPC via POST.' }
  }
  if (event.method !== 'POST') {
    setResponseStatus(event, 405)
    return null
  }

  enforceRateLimit(event)

  const body = await readBody<JsonRpcRequest | JsonRpcRequest[]>(event).catch(() => null)
  if (!body) {
    setResponseStatus(event, 400)
    return { jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } }
  }

  // Notifications (no id) get 202 Accepted with no body
  const requests = Array.isArray(body) ? body : [body]
  const responses = requests
    .filter(request => request.id !== undefined && request.id !== null)
    .map((request) => {
      try {
        return { jsonrpc: '2.0' as const, id: request.id!, result: handleRequest(request) }
      }
      catch (error) {
        // Rebuild as a plain object: Error#message is non-enumerable and would
        // be dropped when the response is serialized.
        const rpcError = (error instanceof JsonRpcError)
          ? { code: error.code, message: error.message }
          : { code: -32603, message: 'Internal error' }
        return { jsonrpc: '2.0' as const, id: request.id!, error: rpcError }
      }
    })

  if (responses.length === 0) {
    setResponseStatus(event, 202)
    return null
  }
  setResponseHeader(event, 'content-type', 'application/json')
  return Array.isArray(body) ? responses : responses[0]
})
