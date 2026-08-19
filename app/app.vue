<script setup lang="ts">
// Vite hashes and emits the file, and gives us the final URL — so the preload
// below can never drift from what the stylesheet actually requests.
import pixelFont from '@fontsource/geist-pixel/files/geist-pixel-latin-400-normal.woff2?url'

const route = useRoute()
const { public: { siteUrl } } = useRuntimeConfig()

/**
 * One canonical per page, declared once here rather than per page — nine of
 * thirteen pages had none, which invites duplicate-content splits between the
 * trailing-slash and slashless forms of the same URL. Trailing slash stripped
 * so it matches the form the sitemap advertises.
 */
const canonical = computed(() => `${siteUrl}${route.path.replace(/\/$/, '')}` || siteUrl)

useSeoMeta({
  ogType: 'website',
  ogSiteName: 'zeal.tools',
})

useHead({
  titleTemplate: title => (title ? `${title} · zeal.tools` : 'zeal.tools — Free tools, made with zeal.'),
  link: [{ rel: 'canonical', href: canonical }, {
    /**
     * The display face is used above the fold on every page — the wordmark in
     * the sidebar, the h1 on each tool page, the headline on the homepage.
     * Without this it arrives after first paint and the swap from the fallback
     * shoves the page around: measured CLS 0.081 on desktop, against a project
     * baseline of 0.028, and worse the larger the headline gets.
     *
     * `crossorigin` is required even for a same-origin font — fonts are always
     * fetched in CORS mode, and omitting it makes the browser fetch the file
     * twice and preload nothing.
     */
    rel: 'preload',
    as: 'font',
    type: 'font/woff2',
    href: pixelFont,
    crossorigin: 'anonymous',
  }],
})
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
