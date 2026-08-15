import { registry } from '../../../../shared/registry'

/**
 * MCP Server Card (SEP-1649) — lets agents discover the MCP endpoint without
 * first speaking JSON-RPC. Kept in sync with `server/routes/mcp.ts`: same
 * protocol version, same capabilities, tool names from the same registry.
 */
export default defineEventHandler((event) => {
  const siteUrl = useRuntimeConfig(event).public.siteUrl

  setResponseHeader(event, 'content-type', 'application/json')
  setResponseHeader(event, 'cache-control', 'public, max-age=3600')

  return {
    serverInfo: {
      name: 'zeal-tools',
      title: 'zeal.tools',
      version: '1.0.0',
      websiteUrl: siteUrl,
    },
    description: 'Free, open-source utility tools. No API keys, no sign-up. Generate QR codes for URLs, WiFi, contacts and more.',
    protocolVersion: '2025-06-18',
    transport: {
      type: 'streamable-http',
      endpoint: `${siteUrl}/mcp`,
    },
    capabilities: {
      tools: { listChanged: false },
    },
    // No auth of any kind — that is a product invariant, not an omission.
    authentication: { type: 'none' },
    tools: registry.filter(tool => tool.mcp).map(tool => ({
      name: 'generate_qr',
      title: tool.name,
      description: tool.description,
    })),
    documentation: `${siteUrl}/llms.txt`,
  }
})
