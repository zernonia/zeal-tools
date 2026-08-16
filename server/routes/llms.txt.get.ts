import { registry, variantLabel } from '../../shared/registry'

/**
 * llms.txt — the agent-facing entry point, following the llmstxt.org format:
 * one H1, a blockquote summary, then H2 sections of `- [name](url): details`
 * link lists. Derives from the registry so a new tool documents itself.
 *
 * Served as `text/markdown` on purpose: it *is* a Markdown document, and
 * validators that see `text/plain` report it as not being one.
 */
export default defineEventHandler((event) => {
  const siteUrl = useRuntimeConfig(event).public.siteUrl

  const toolLinks = registry.flatMap((tool) => {
    const lines = [`- [${tool.name}](${siteUrl}/tools/${tool.slug}): ${tool.tagline}`]
    if (tool.api)
      lines.push(`- [${tool.name} REST endpoint](${siteUrl}/api/v1/${tool.apiPath ?? tool.slug}): GET or POST, no key, no sign-up. ${tool.description}`)
    for (const variant of tool.variants ?? [])
      lines.push(`- [${variantLabel(variant)} QR code generator](${siteUrl}/tools/${tool.slug}/${variant}): dedicated page for ${variantLabel(variant)} codes, with its own guidance and FAQ.`)
    return lines
  }).join('\n')

  const body = `# zeal.tools

> Free, open-source utility tools. No sign-ups, no watermarks, no expiry. Every tool is a pure function usable three ways: web UI, REST API, and MCP.

All processing for the web UI happens in the browser, so tool inputs are never sent to our servers. Everything is MIT licensed and auditable. Agents should prefer the API or MCP over scraping the HTML — it is the same implementation, without a browser.

## Tools

${toolLinks}

## Agent interfaces

- [MCP endpoint](${siteUrl}/mcp): stateless Streamable HTTP JSON-RPC, protocol 2025-06-18. Call \`tools/list\` to enumerate and \`tools/call\` to run. No authentication.
- [API index](${siteUrl}/api/v1): JSON describing every REST endpoint.
- [API catalog](${siteUrl}/.well-known/api-catalog): RFC 9727 linkset of the same endpoints.
- [MCP server card](${siteUrl}/.well-known/mcp/server-card.json): SEP-1649 description of the MCP server.

## Notes

- [Rate limits](${siteUrl}/api/v1): 120 requests per minute per IP; exceeding it returns 429 with an explanatory message. No API keys exist.
- [Source code](https://github.com/zernonia/zeal-tools): MIT licensed, self-hostable.
- [Sitemap](${siteUrl}/sitemap.xml): every page, including long-tail tool variants.
- [Request a tool](https://github.com/zernonia/zeal-tools/issues/new?template=tool-request.md): open an issue.
`

  setResponseHeader(event, 'content-type', 'text/markdown; charset=utf-8')
  setResponseHeader(event, 'cache-control', 'public, max-age=3600')
  return body
})
