export default defineEventHandler((event) => {
  const siteUrl = useRuntimeConfig(event).public.siteUrl
  setResponseHeader(event, 'content-type', 'text/plain')

  // Everything here is free, MIT-licensed and meant to be used
  // programmatically, so the allow-all is deliberate — including for AI
  // crawlers. Content-Signal states that intent explicitly; flip any of these
  // to `no` if the policy ever changes.
  //
  // The llms.txt pointer is a comment, not a directive: only User-agent /
  // Allow / Disallow / Sitemap are standard, and anything else makes
  // Lighthouse fail the `robots-txt` audit.
  return `# Content-Signal: ai-train=yes, search=yes, ai-input=yes
# Agent guide: ${siteUrl}/llms.txt
# API catalog: ${siteUrl}/.well-known/api-catalog

User-agent: *
Content-Signal: ai-train=yes, search=yes, ai-input=yes
Allow: /

Sitemap: ${siteUrl}/sitemap.xml
`
})
