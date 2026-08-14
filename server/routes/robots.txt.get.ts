export default defineEventHandler((event) => {
  const siteUrl = useRuntimeConfig(event).public.siteUrl
  setResponseHeader(event, 'content-type', 'text/plain')
  return `User-agent: *\nAllow: /\n\nSitemap: ${siteUrl}/sitemap.xml\n`
})
