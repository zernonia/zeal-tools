import { registry } from '../../shared/registry'
import { posts } from '../../shared/registry/posts'

export default defineEventHandler((event) => {
  const siteUrl = useRuntimeConfig(event).public.siteUrl
  // A tool's page changes when it ships and when it is redesigned, never on
  // a routine deploy — an accurate lastmod is one Google keeps trusting.
  const toolDate = (tool: (typeof registry)[number]) => tool.updatedAt ?? tool.addedAt
  // The homepage lists every tool, so it changes whenever any of them does.
  const urls: { loc: string, lastmod?: string }[] = [{ loc: `${siteUrl}/`, lastmod: registry.map(toolDate).sort().at(-1) }]
  for (const tool of registry) {
    urls.push({ loc: `${siteUrl}/tools/${tool.slug}`, lastmod: toolDate(tool) })
    for (const variant of tool.variants ?? [])
      urls.push({ loc: `${siteUrl}/tools/${tool.slug}/${variant}`, lastmod: toolDate(tool) })
  }
  urls.push({ loc: `${siteUrl}/blog`, lastmod: posts.map(post => post.updatedAt ?? post.publishedAt).sort().at(-1) })
  for (const post of posts)
    urls.push({ loc: `${siteUrl}/blog/${post.slug}`, lastmod: post.updatedAt ?? post.publishedAt })
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(url => `  <url><loc>${url.loc}</loc>${url.lastmod ? `<lastmod>${url.lastmod}</lastmod>` : ''}</url>`).join('\n')}
</urlset>`
  setResponseHeader(event, 'content-type', 'application/xml')
  setResponseHeader(event, 'cache-control', 'public, max-age=3600')
  return body
})
