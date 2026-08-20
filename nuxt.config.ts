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
      link: [{ rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }],
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        // sRGB of the preset's light --primary, oklch(0.216 0.006 56.043).
        { name: 'theme-color', content: '#1c1917' },
      ],
      script: [{
        // Runs before first paint so a dark-mode visitor never sees a white
        // flash on these prerendered pages. Key must match useColorMode's
        // COLOR_MODE_STORAGE_KEY. Wrapped in try/catch because localStorage
        // throws outright when cookies are blocked.
        innerHTML: `(()=>{try{const m=localStorage.getItem('zeal-theme')||'system';`
          + `const d=m==='dark'||(m==='system'&&matchMedia('(prefers-color-scheme: dark)').matches);`
          + `document.documentElement.classList.toggle('dark',d);`
          + `document.documentElement.style.colorScheme=d?'dark':'light'}catch{}})()`,
        tagPosition: 'head',
      }],
    },
  },

  runtimeConfig: {
    public: {
      siteUrl: 'https://zeal.tools',
      // PostHog project API key — public/write-only by design, safe to commit.
      // Override with NUXT_PUBLIC_POSTHOG_KEY ('' disables analytics entirely).
      posthogKey: 'phc_sZafF9LxE4ad5bLLFhYMW3oJGu8NxuTg4xHB6q8X3BW4',
      posthogHost: 'https://us.i.posthog.com',
    },
  },
})
