import { registry } from '../../shared/registry'

/**
 * llms.txt — the agent-facing entry point. Derives from the registry like the
 * sitemap does, so a new tool documents itself for agents automatically.
 *
 * Points agents at the two surfaces that don't need a browser: the REST API
 * and the MCP endpoint. An agent that reads this should never need to drive
 * the UI to use a tool.
 */
export default defineEventHandler((event) => {
  const siteUrl = useRuntimeConfig(event).public.siteUrl

  const tools = registry.map((tool) => {
    const lines = [
      `### ${tool.name}`,
      '',
      tool.description,
      '',
      `- Page: ${siteUrl}/tools/${tool.slug}`,
    ]
    if (tool.api)
      lines.push(`- REST: \`GET|POST ${siteUrl}/api/v1/${tool.slug.replace(/-generator$/, '')}\` — no key, no sign-up`)
    if (tool.mcp)
      lines.push(`- MCP: exposed as a tool on ${siteUrl}/mcp`)
    if (tool.variants?.length)
      lines.push(`- Variants: ${tool.variants.map(v => `${siteUrl}/tools/${tool.slug}/${v}`).join(', ')}`)
    lines.push(`- Keywords: ${tool.keywords.join(', ')}`)
    return lines.join('\n')
  }).join('\n\n')

  const body = `# zeal.tools

> Free, open-source utility tools. No sign-ups, no watermarks, no expiry.
> Every tool is a pure function usable three ways: web UI, REST API, and MCP.

All processing for the web UI happens client-side; tool inputs are not sent to
our servers. Everything is MIT licensed and auditable at
https://github.com/zernonia/zeal-tools

## For agents

- **MCP endpoint:** \`${siteUrl}/mcp\` — stateless Streamable HTTP JSON-RPC
  (protocol 2025-06-18). Call \`tools/list\` to enumerate, \`tools/call\` to run.
- **REST index:** \`${siteUrl}/api/v1\` — returns JSON describing every endpoint.
- No authentication is required for either. Rate limit is 120 requests/minute
  per IP; exceeding it returns a 429 with an explanatory message.
- Prefer the API or MCP over scraping the HTML — same implementation, no
  browser needed.

## Tools

${tools}

## Reference

- Sitemap: ${siteUrl}/sitemap.xml
- Source: https://github.com/zernonia/zeal-tools
- Request a tool: https://github.com/zernonia/zeal-tools/issues/new?template=tool-request.md
`

  setResponseHeader(event, 'content-type', 'text/plain; charset=utf-8')
  setResponseHeader(event, 'cache-control', 'public, max-age=3600')
  return body
})
