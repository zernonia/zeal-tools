import process from 'node:process'
import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'

/**
 * RFC 8288 Link header advertising the machine-readable surfaces. Relation
 * types are the IANA-registered ones (`api-catalog` from RFC 9727,
 * `service-desc`/`service-doc` from RFC 8631) so generic agents understand it.
 */
const AGENT_LINK_HEADER = [
  '</.well-known/api-catalog>; rel="api-catalog"; type="application/linkset+json"',
  '</api/v1>; rel="service-desc"; type="application/json"',
  '</llms.txt>; rel="service-doc"; type="text/plain"',
].join(', ')

/**
 * Content Signals as a response header, mirroring the robots.txt directive.
 * Agents and scanners check the header independently of robots.txt, and
 * Cloudflare emits it the same way. Policy: everything here is MIT-licensed
 * and meant to be consumed programmatically.
 */
const CONTENT_SIGNAL = 'ai-train=yes, search=yes, ai-input=yes'

/**
 * One origin, used twice on purpose.
 *
 * `runtimeConfig.public.siteUrl` is ours — canonicals, og:url, JSON-LD @id.
 * `site.url` is the key nuxt-site-config reads, and nuxt-og-image asks it for
 * the origin when it writes `og:image`. Without it that tag shipped as a
 * relative* path on every page, which the OG spec and both Facebook's and X's
 * docs forbid: a crawler fetches the image with no page for context, so a
 * relative URL resolves to nothing and the card renders blank. Found by our
 * own meta tag checker, pointed at our own QR page.
 */
const SITE_URL = 'https://zeal.tools'

const AGENT_HEADERS = {
  'link': AGENT_LINK_HEADER,
  'content-signal': CONTENT_SIGNAL,
}

export default defineNuxtConfig({
  compatibilityDate: '2026-08-01',

  // Domain slices: every tool is a self-contained Nuxt layer, composed here.
  modules: ['nuxt-og-image'],

  /**
   * Social cards are rendered at build time and written out as static PNGs —
   * `zeroRuntime` strips the renderer from the Worker entirely, which matters
   * because satori and resvg would otherwise dwarf a bundle already noted as
   * tight. Every page that gets a card is prerendered anyway.
   *
   * The display face is committed under public/fonts because satori cannot
   * read woff2 and does not resolve node_modules; it is 9 KB, unlike the model
   * binaries that earned their fetch script.
   */
  site: { url: SITE_URL },

  ogImage: {
    zeroRuntime: true,
    /**
     * The default 15s render budget started failing builds intermittently as
     * the number of routes grew — every page renders its own card, and one
     * slow satori pass takes the whole build down with a 408. These render at
     * build time only (`zeroRuntime`), so a longer ceiling costs nothing at
     * runtime and buys a build that does not need retrying.
     */
    security: { renderTimeout: 60_000 },
    /**
     * The card sets Geist rather than the site's pixel display face. v6 has no
     * option to hand satori a font file: families come from @nuxt/fonts or a
     * Google Fonts lookup, and passing the buffer through satoriOptions fails
     * because binary does not survive the trip into the prerender runtime.
     * Geist resolves from Google Fonts at build time and is the body face
     * anyway; adding @nuxt/fonts would rewrite how every font on the site
     * loads, which is not worth it for a social card.
     */
    defaults: { component: 'Default', width: 1200, height: 630 },
  },

  extends: [
    './shared',
    './tools/qr-code-generator',
    './tools/chord-transposer',
    './tools/worship-pads',
    './tools/stage-timer',
    './tools/countdown-timer',
    './tools/background-remover',
    './tools/password-generator',
    './tools/send-to-device',
    './tools/image-compressor',
    './tools/exif-viewer',
    './tools/favicon-generator',
    './tools/tuner',
    './tools/invoice-maker',
    './tools/name-picker',
    './tools/meta-tag-checker',
  ],

  css: ['~/assets/css/main.css'],

  // Our ./shared folder is a full Nuxt LAYER (components/composables/server),
  // not Nuxt 4's framework-free "shared" convention dir — point that elsewhere
  // so its import protection doesn't apply to the layer.
  dir: { shared: '.shared-convention-unused' },

  vite: {
    plugins: [tailwindcss()],
  },

  alias: {
    '#registry': fileURLToPath(new URL('./shared/registry', import.meta.url)),
    '#zeal': fileURLToPath(new URL('./shared/core', import.meta.url)),
  },

  nitro: {
    /**
     * `cloudflare_durable`, not `cloudflare_module`, because Send to Device
     * needs a WebSocket to introduce two devices to each other. A plain Worker
     * cannot hold one — only a Durable Object can. Nitro's preset exports that
     * object and routes crossws through it; the object is used purely as an
     * in-memory switchboard and never touches its storage.
     */
    preset: 'cloudflare_durable',
    experimental: { websocket: true },
    cloudflare: { deployConfig: false },
    prerender: { crawlLinks: false },
  },

  routeRules: {
    // RFC 8288 Link headers so agents can discover the machine-readable
    // surfaces without parsing HTML. Registered relation types only.
    '/': { prerender: true, headers: AGENT_HEADERS },
    '/tools/**': { prerender: true, headers: AGENT_HEADERS },
    '/api/**': { cors: true, headers: AGENT_HEADERS },
  },

  app: {
    head: {
      htmlAttrs: { lang: 'en' },
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        { rel: 'manifest', href: '/manifest.webmanifest' },
        // iOS ignores the manifest's icons for the home screen and reads this.
        { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
      ],
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        // sRGB of the preset's light --primary, oklch(0.216 0.006 56.043).
        { name: 'theme-color', content: '#1c1917' },
        // The standard spelling. `apple-mobile-web-app-capable` is the older
        // one and Chrome logs a deprecation for it; iOS honours both.
        { name: 'mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-title', content: 'zeal.tools' },
      ],
      script: [
        // Dev only, and inline so it runs even when the app cannot boot.
        // A worker registered on a dev origin serves Vite's mutable module
        // URLs cache-first and breaks the page; the plugin that would remove
        // it never gets to run, because the module graph is what failed.
        ...(process.env.NODE_ENV === 'production'
          ? []
          : [{
              // Caches are cleared only after the worker is gone: delete them
              // while it is still controlling the page and it simply fills
              // them again on the next asset it handles.
              innerHTML: `(()=>{try{if(!('serviceWorker'in navigator))return;`
                + `navigator.serviceWorker.getRegistrations()`
                + `.then(rs=>Promise.all(rs.map(r=>r.unregister())))`
                + `.then(()=>window.caches&&caches.keys())`
                + `.then(ks=>Promise.all((ks||[]).filter(k=>k.startsWith('zeal-')).map(k=>caches.delete(k))))`
                + `.catch(()=>{})}catch{}})()`,
              tagPosition: 'head' as const,
            }]),
        {
        // Runs before first paint so a dark-mode visitor never sees a white
        // flash on these prerendered pages. Key must match useColorMode's
        // COLOR_MODE_STORAGE_KEY. Wrapped in try/catch because localStorage
        // throws outright when cookies are blocked.
          innerHTML: `(()=>{try{const m=localStorage.getItem('zeal-theme')||'system';`
            + `const d=m==='dark'||(m==='system'&&matchMedia('(prefers-color-scheme: dark)').matches);`
            + `document.documentElement.classList.toggle('dark',d);`
            + `document.documentElement.style.colorScheme=d?'dark':'light'}catch{}})()`,
          tagPosition: 'head',
        },
      ],
    },
  },

  runtimeConfig: {
    public: {
      siteUrl: SITE_URL,
      // PostHog project API key — public/write-only by design, safe to commit.
      // Override with NUXT_PUBLIC_POSTHOG_KEY ('' disables analytics entirely).
      posthogKey: 'phc_sZafF9LxE4ad5bLLFhYMW3oJGu8NxuTg4xHB6q8X3BW4',
      posthogHost: 'https://us.i.posthog.com',
    },
  },
})
