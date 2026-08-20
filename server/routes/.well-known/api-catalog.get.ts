import { registry } from '../../../shared/registry'

/**
 * RFC 9727 API catalog — a linkset (RFC 9264) describing every REST endpoint,
 * derived from the registry so a new tool advertises itself automatically.
 */
export default defineEventHandler((event) => {
  const siteUrl = useRuntimeConfig(event).public.siteUrl

  const linkset = registry.filter(tool => tool.api).map(tool => ({
    'anchor': `${siteUrl}/api/v1/${tool.apiPath ?? tool.slug}`,
    'service-doc': [{ href: `${siteUrl}/tools/${tool.slug}#api`, type: 'text/html', title: `${tool.name} — API documentation` }],
    'service-meta': [{ href: `${siteUrl}/api/v1`, type: 'application/json', title: 'zeal.tools API index' }],
    'describedby': [{ href: `${siteUrl}/llms.txt`, type: 'text/markdown', title: 'Agent guide' }],
  }))

  // The API index itself is an entry so agents can start from one document.
  linkset.unshift({
    'anchor': `${siteUrl}/api/v1`,
    'service-doc': [{ href: `${siteUrl}/llms.txt`, type: 'text/markdown', title: 'zeal.tools agent guide' }],
    'service-meta': [{ href: `${siteUrl}/api/v1`, type: 'application/json', title: 'Machine-readable API index' }],
    'describedby': [{ href: `${siteUrl}/.well-known/mcp/server-card.json`, type: 'application/json', title: 'MCP server card' }],
  })

  setResponseHeader(event, 'content-type', 'application/linkset+json')
  setResponseHeader(event, 'cache-control', 'public, max-age=3600')
  return { linkset }
})
