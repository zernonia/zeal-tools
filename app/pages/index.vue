<script setup lang="ts">
import { registry } from '#registry'

const { show } = useSearchPalette()
const { public: { siteUrl } } = useRuntimeConfig()

useSeoMeta({
  title: null,
  description: 'The best free, open-source tool hub on the web. No sign-ups, no watermarks, no nonsense. Every tool usable three ways: UI, REST API, and MCP.',
  ogTitle: 'zeal.tools — Free tools, made with zeal.',
  ogDescription: 'Free, open-source tools that actually work. No sign-ups, no watermarks. UI · REST API · MCP.',
  ogImage: `${siteUrl}/og.png`,
  ogUrl: siteUrl,
  twitterCard: 'summary_large_image',
})

useHead({
  script: [{
    type: 'application/ld+json',
    innerHTML: JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      'name': 'zeal.tools',
      'url': siteUrl,
      'description': 'Free, open-source tools. No sign-ups, no watermarks. Every tool usable via UI, REST API, and MCP.',
    }),
  }],
})
</script>

<template>
  <div class="container-page">
    <!-- Hero -->
    <section class="py-16 text-center sm:py-24">
      <p class="mx-auto mb-4 inline-flex items-center gap-1.5 rounded-full border border-flame-200 bg-flame-50 px-3 py-1 text-xs font-medium text-flame-700 dark:border-flame-900/60 dark:bg-flame-950/30 dark:text-flame-300">
        <span class="size-1.5 rounded-full bg-flame-500" aria-hidden="true" /> Open source · MIT · zero-dependency tool cores
      </p>
      <h1 class="mx-auto max-w-2xl text-4xl font-bold tracking-tight sm:text-5xl">
        Free tools, made with <span class="text-flame-500">zeal</span>.
      </h1>
      <p class="mx-auto mt-4 max-w-xl text-lg text-neutral-600 dark:text-neutral-400">
        No sign-ups, no watermarks, no nonsense. Every tool usable three ways: UI · REST API · MCP.
      </p>
      <button
        type="button"
        class="mx-auto mt-8 flex h-12 w-full max-w-md items-center gap-3 rounded-xl border border-neutral-200 bg-white px-4 text-left text-neutral-400 shadow-sm transition-colors hover:border-neutral-300 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-700"
        @click="show()"
      >
        <svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
        <span class="flex-1 text-sm">Search tools… try “qr” or “wifi”</span>
        <kbd class="rounded border border-neutral-200 bg-neutral-50 px-1.5 py-0.5 font-mono text-[10px] text-neutral-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400">⌘K</kbd>
      </button>
    </section>

    <!-- Tool grid (crawlable — never hidden behind the palette) -->
    <section aria-labelledby="tools-heading" class="pb-16">
      <h2 id="tools-heading" class="sr-only">All tools</h2>
      <ul class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <li v-for="tool in registry" :key="tool.slug">
          <NuxtLink
            :to="`/tools/${tool.slug}`"
            class="group flex h-full flex-col rounded-2xl border border-neutral-200 p-5 transition-all hover:-translate-y-0.5 hover:border-flame-300 hover:shadow-lg hover:shadow-flame-500/5 dark:border-neutral-800 dark:hover:border-flame-800"
          >
            <span class="grid size-10 place-items-center rounded-xl bg-flame-50 text-lg text-flame-600 dark:bg-flame-950/40" aria-hidden="true">{{ tool.icon ?? '⚙' }}</span>
            <span class="mt-3 font-semibold group-hover:text-flame-600">{{ tool.name }}</span>
            <span class="mt-1 text-sm text-neutral-600 dark:text-neutral-400">{{ tool.tagline }}</span>
            <span class="mt-3 flex gap-1.5 text-[10px] font-medium uppercase tracking-wide text-neutral-400">
              <span class="rounded bg-neutral-100 px-1.5 py-0.5 dark:bg-neutral-800">UI</span>
              <span v-if="tool.api" class="rounded bg-neutral-100 px-1.5 py-0.5 dark:bg-neutral-800">API</span>
              <span v-if="tool.mcp" class="rounded bg-neutral-100 px-1.5 py-0.5 dark:bg-neutral-800">MCP</span>
            </span>
          </NuxtLink>
        </li>
        <li>
          <a
            href="https://github.com/zernonia/zeal-tools/issues/new"
            target="_blank"
            rel="noopener"
            class="flex h-full flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-300 p-5 text-center text-sm text-neutral-500 transition-colors hover:border-flame-400 hover:text-flame-600 dark:border-neutral-700"
          >
            <span class="text-2xl" aria-hidden="true">+</span>
            <span class="mt-1 font-medium">Request a tool</span>
            <span class="mt-1 text-xs">Your requests write our roadmap</span>
          </a>
        </li>
      </ul>
    </section>

    <!-- Promise -->
    <div class="pb-16">
      <ZealPromise />
    </div>

    <!-- Programmatic access -->
    <section id="mcp" class="grid gap-4 pb-20 sm:grid-cols-2">
      <div class="rounded-2xl border border-neutral-200 p-6 dark:border-neutral-800">
        <h2 class="font-semibold">Free REST API — no keys</h2>
        <p class="mt-1 text-sm text-neutral-600 dark:text-neutral-400">Every tool is a pure function, so every tool is an endpoint. No API key, no sign-up.</p>
        <pre class="mt-4 overflow-x-auto rounded-lg bg-neutral-950 p-4 text-xs leading-relaxed text-neutral-200"><code>curl -X POST https://zeal.tools/api/v1/qr \
  -H 'content-type: application/json' \
  -d '{"data": "https://zeal.tools"}'</code></pre>
        <NuxtLink to="/api/v1" class="mt-3 inline-block text-sm font-medium text-flame-600 hover:underline">Browse the API index →</NuxtLink>
      </div>
      <div class="rounded-2xl border border-neutral-200 p-6 dark:border-neutral-800">
        <h2 class="font-semibold">MCP server</h2>
        <p class="mt-1 text-sm text-neutral-600 dark:text-neutral-400">Point any MCP client — Claude, IDEs, agents — at our endpoint and use every tool from your AI workflow.</p>
        <pre class="mt-4 overflow-x-auto rounded-lg bg-neutral-950 p-4 text-xs leading-relaxed text-neutral-200"><code>{
  "mcpServers": {
    "zeal-tools": { "url": "https://zeal.tools/mcp" }
  }
}</code></pre>
      </div>
    </section>
  </div>
</template>
