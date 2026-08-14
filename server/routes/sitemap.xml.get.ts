import { registry } from '../../shared/registry'

export default defineEventHandler((event) => {
  const siteUrl = useRuntimeConfig(event).public.siteUrl
  const urls: { loc: string, lastmod?: string }[] = [{ loc: `${siteUrl}/` }]
  for (const tool of registry) {
    urls.push({ loc: `${siteUrl}/tools/${tool.slug}`, lastmod: tool.addedAt })
    for (const variant of tool.variants ?? [])
      urls.push({ loc: `${siteUrl}/tools/${tool.slug}/${variant}`, lastmod: tool.addedAt })
  }
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(url => `  <url><loc>${url.loc}</loc>${url.lastmod ? `<lastmod>${url.lastmod}</lastmod>` : ''}</url>`).join('\n')}
</urlset>`
  setResponseHeader(event, 'content-type', 'application/xml')
  setResponseHeader(event, 'cache-control', 'public, max-age=3600')
  return body
})
