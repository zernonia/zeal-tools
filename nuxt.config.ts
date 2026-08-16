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
  extends: [
    './shared',
    './tools/qr-code-generator',
    './tools/chord-transposer',
    './tools/worship-pads',
    './tools/stage-timer',
    './tools/countdown-timer',
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
    preset: 'cloudflare_module',
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
