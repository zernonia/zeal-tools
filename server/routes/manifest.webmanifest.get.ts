import { getTool } from '../../shared/registry'

/**
 * Web app manifest — what makes the site installable.
 *
 * A server route rather than a file in `public/` for the same reason the
 * sitemap and llms.txt are: the shortcuts below are resolved through the
 * registry, so a slug that gets renamed or removed fails the build instead of
 * quietly shipping a jump-list entry that 404s.
 *
 * `theme_color` matches the existing `theme-color` meta. `background_color` is
 * the light `--background` in sRGB — it paints the splash screen before any of
 * our CSS runs, and the pre-paint script only adds `.dark` when it has to, so
 * light is the state a cold start actually begins in.
 */

/**
 * Jump-list entries. Chosen editorially — "most reached for" is not something
 * the registry knows — but looked up through it so the choice cannot drift
 * away from the tools that exist.
 */
const SHORTCUTS = ['qr-code-generator', 'background-remover', 'password-generator', 'image-compressor']

export default defineEventHandler((event) => {
  setHeader(event, 'content-type', 'application/manifest+json; charset=utf-8')
  setHeader(event, 'cache-control', 'public, max-age=3600')

  return {
    id: '/',
    name: 'zeal.tools — Free tools, made with zeal.',
    short_name: 'zeal.tools',
    description:
      'Free, open-source browser tools. No sign-ups, no watermarks, no expiry. '
      + 'Everything runs on your own device, so tool inputs never reach a server.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'any',
    background_color: '#f5f5f5',
    theme_color: '#1c1917',
    categories: ['utilities', 'productivity', 'graphics'],
    lang: 'en',
    dir: 'ltr',
    icons: [
      // `any` keeps the mark's own rounded square; `maskable` runs the ink full
      // bleed with the mark inside the safe zone, because a launcher will crop
      // it to whatever shape it likes.
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      { src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
    ],
    shortcuts: SHORTCUTS.flatMap((slug) => {
      const tool = getTool(slug)
      if (!tool)
        throw new Error(`manifest shortcut points at an unknown tool: ${slug}`)
      return [{
        name: tool.name,
        short_name: tool.name,
        description: tool.tagline,
        url: `/tools/${tool.slug}`,
        icons: [{ src: '/icon-192.png', sizes: '192x192', type: 'image/png' }],
      }]
    }),
    // Stated explicitly: there is no native app, and a browser that offers to
    // send people to a store listing instead of installing this is wrong.
    prefer_related_applications: false,
    related_applications: [],
    // No `screenshots`. The install dialog is richer with them, but the only
    // 1200x630 images here are nuxt-og-image's, whose filenames encode the
    // title and description of the page they belong to — so a hard-coded path
    // stops resolving the first time the homepage copy is edited. A missing
    // optional field beats an advertised URL that rots.
  }
})
