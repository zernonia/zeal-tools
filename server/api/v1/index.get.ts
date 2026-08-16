import { registry } from '../../../shared/registry'

/** Auto-generated API index: every tool with api: true, straight from the registry. */
export default defineEventHandler((event) => {
  const siteUrl = useRuntimeConfig(event).public.siteUrl
  return {
    name: 'zeal.tools API',
    version: 'v1',
    promise: 'No API keys, no sign-up, no watermarks. Light per-IP rate limiting to survive abuse.',
    docs: `${siteUrl}/#mcp`,
    mcp: `${siteUrl}/mcp`,
    source: 'https://github.com/zernonia/zeal-tools',
    tools: registry.filter(tool => tool.api).map(tool => ({
      slug: tool.slug,
      name: tool.name,
      description: tool.description,
      endpoint: `${siteUrl}/api/v1/${tool.apiPath ?? tool.slug}`,
      methods: ['GET', 'POST'],
      docs: `${siteUrl}/tools/${tool.slug}#api`,
    })),
  }
})
