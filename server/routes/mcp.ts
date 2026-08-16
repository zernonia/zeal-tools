import { findMcpTool, mcpTools } from '../../shared/registry/mcp'

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

function listTools() {
  return mcpTools.map(tool => ({
    name: tool.name,
    title: tool.title,
    description: tool.description,
    inputSchema: tool.inputSchema,
  }))
}

function callTool(name: string, args: Record<string, unknown>) {
  const tool = findMcpTool(name)
  if (!tool)
    return { isError: true, content: [{ type: 'text', text: `Unknown tool: ${name}` }] }
  try {
    return tool.run(args)
  }
  catch (error) {
    return { isError: true, content: [{ type: 'text', text: error instanceof Error ? error.message : `Failed to run ${name}` }] }
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
        instructions: `Free, open-source tools from zeal.tools. No auth required. Available tools: ${mcpTools.map(t => t.name).join(', ')}.`,
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
