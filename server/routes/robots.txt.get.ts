export default defineEventHandler((event) => {
  const siteUrl = useRuntimeConfig(event).public.siteUrl
  setResponseHeader(event, 'content-type', 'text/plain')
  // Everything here is free and meant to be used programmatically, so the
  // allow-all is deliberate — including for AI crawlers. The llms.txt pointer
  // is a comment: only Sitemap/User-agent/Allow/Disallow are standard
  // directives, and anything else makes Lighthouse fail `robots-txt`.
  return `User-agent: *\nAllow: /\n\n# Agent guide: ${siteUrl}/llms.txt\n\nSitemap: ${siteUrl}/sitemap.xml\n`
})
