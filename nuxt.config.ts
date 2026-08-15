import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  compatibilityDate: '2026-08-01',

  // Domain slices: every tool is a self-contained Nuxt layer, composed here.
  extends: ['./shared', './tools/qr-code-generator'],

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
    '/': { prerender: true },
    '/tools/**': { prerender: true },
    '/api/**': { cors: true },
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
