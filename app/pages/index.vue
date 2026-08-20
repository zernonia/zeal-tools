<script setup lang="ts">
import { registry } from '#registry'

const { show } = useSearchPalette()
const { public: { siteUrl } } = useRuntimeConfig()

useSeoMeta({
  title: null,
  description: 'The best free, open-source tool hub on the web. No sign-ups, no watermarks, no nonsense. Every tool usable three ways: UI, REST API, and MCP.',
  ogTitle: 'zeal.tools — Free tools, made with zeal.',
  ogDescription: 'Free, open-source tools that actually work. No sign-ups, no watermarks. UI · REST API · MCP.',
  ogUrl: siteUrl,
  twitterCard: 'summary_large_image',
})

defineOgImage('Default', {
  title: 'Free tools, made with zeal.',
  description: 'Free, open-source tools that actually work. No sign-ups, no watermarks. UI · REST API · MCP.',
})

const curlSnippet = `curl -X POST https://zeal.tools/api/v1/qr \\
  -H 'content-type: application/json' \\
  -d '{"data": "https://zeal.tools"}'`

const mcpSnippet = `{
  "mcpServers": {
    "zeal-tools": { "url": "https://zeal.tools/mcp" }
  }
}`

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
      <p class="mx-auto mb-4 inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
        <span class="size-1.5 rounded-full bg-primary" aria-hidden="true" /> Open source · MIT · zero-dependency tool cores
      </p>
      <h1 class="mx-auto max-w-4xl font-heading text-4xl text-balance sm:text-5xl md:text-6xl lg:text-7xl">
        Free tools, made with <span class="text-primary">zeal</span>.
      </h1>
      <p class="mx-auto mt-4 max-w-xl text-lg text-neutral-600 dark:text-neutral-400">
        No sign-ups, no watermarks, no nonsense. Every tool usable three ways: UI · REST API · MCP.
      </p>
      <button
        type="button"
        class="mx-auto mt-8 flex h-12 w-full max-w-md items-center gap-3 rounded-xl border border-neutral-200 bg-transparent px-4 text-left text-neutral-400 shadow-sm transition-colors hover:border-neutral-300 dark:border-neutral-800 dark:bg-input/30 dark:hover:border-neutral-700"
        @click="show()"
      >
        <svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
        <span class="flex-1 text-sm">Search tools… try “qr” or “wifi”</span>
        <kbd class="rounded border border-neutral-200 bg-neutral-50 px-1.5 py-0.5 font-mono text-[10px] text-neutral-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400">⌘K</kbd>
      </button>
    </section>

    <!-- Tool grid (crawlable — never hidden behind the palette) -->
    <section aria-labelledby="tools-heading" class="pb-16">
      <h2 id="tools-heading" class="sr-only">
        All tools
      </h2>
      <ul class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <li v-for="tool in registry" :key="tool.slug">
          <NuxtLink
            :to="`/tools/${tool.slug}`"
            class="group flex h-full flex-col rounded-2xl bg-muted border border-neutral-200 p-5 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 dark:border-neutral-800"
          >
            <span class="grid size-10 place-items-center rounded-xl bg-primary/5 text-primary" aria-hidden="true">
              <SiteToolIcon :slug="tool.slug" class="size-5" />
            </span>
            <span class="mt-3 font-semibold group-hover:text-primary">{{ tool.name }}</span>
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
            href="https://github.com/zernonia/zeal-tools/issues/new?template=tool-request.md"
            target="_blank"
            rel="noopener"
            class="flex h-full flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-300 p-5 text-center text-sm text-neutral-500 transition-colors hover:border-primary/40 hover:text-primary dark:border-neutral-700"
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

    <!--
      Programmatic access.

      `min-w-0` on both cards is load-bearing. A grid item defaults to
      `min-width: auto`, which refuses to shrink below the intrinsic width of
      its content — and a curl command has no wrap opportunity, so the card
      grew to 466px inside a 390px phone and scrolled the whole shell
      sideways. The CodeBlock already scrolls internally; it just never got
      the chance.
    -->
    <section id="mcp" class="grid gap-4 pb-20 sm:grid-cols-2">
      <div id="api" class="min-w-0 scroll-mt-6 rounded-2xl border border-neutral-200 p-6 dark:border-neutral-800">
        <h2 class="font-semibold">
          Free REST API — no keys
        </h2>
        <p class="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
          Every tool is a pure function, so every tool is an endpoint. No API key, no sign-up.
        </p>
        <CodeBlock :code="curlSnippet" lang="bash" />
        <a href="/api/v1" class="mt-3 inline-block text-sm font-medium text-primary hover:underline">
          Browse the API index →
        </a>
      </div>
      <div class="min-w-0 rounded-2xl border border-neutral-200 p-6 dark:border-neutral-800">
        <h2 class="font-semibold">
          MCP server
        </h2>
        <p class="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
          Point any MCP client — Claude, IDEs, agents — at our endpoint and use every tool from your AI workflow.
        </p>
        <CodeBlock :code="mcpSnippet" lang="json" />
      </div>
    </section>

    <!--
      Who made this and why. Last thing on the page on purpose: the tools come
      first, and this is context for anyone who scrolled far enough to wonder.
    -->
    <section id="maker" class="scroll-mt-6 pb-20" aria-labelledby="maker-heading">
      <div class="rounded-2xl border border-neutral-200 p-6 dark:border-neutral-800 sm:p-8">
        <h2 id="maker-heading" class="font-heading text-xl">
          Why this exists
        </h2>
        <div class="mt-4 max-w-2xl space-y-4 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
          <p>
            I got tired of it. You search for a tool that should take ten seconds, and you land on a page
            that wants an account before it will do anything. You make the account, and now the result has
            a watermark. You close three ad overlays to find the download button, and it is next to two
            more that are not download buttons.
          </p>
          <p>
            So these are the tools I wanted to exist — built for myself, and used daily. That is the whole
            filter: if I would not reach for it in the middle of my own work, it does not get built. It
            also explains what is missing. No sign-up, because I never wanted one. No watermark, because I
            would not accept one. No ads near the download, because that is the exact moment every other
            site chose to get in my way.
          </p>
          <p>
            Everything runs in your browser wherever it possibly can, and it is all MIT licensed — so if I
            ever stop maintaining this, you can take it and run it yourself.
          </p>
        </div>

        <div class="mt-6 flex flex-wrap items-center gap-3 border-t border-neutral-200 pt-6 dark:border-neutral-800">
          <img
            src="/zernonia.jpg"
            alt=""
            width="40"
            height="40"
            loading="lazy"
            decoding="async"
            class="size-10 shrink-0 rounded-full object-cover"
          >
          <div class="min-w-0">
            <p class="text-sm font-medium text-neutral-900 dark:text-neutral-100">
              Built by zernonia
            </p>
            <a
              href="https://github.com/zernonia"
              target="_blank"
              rel="noopener noreferrer"
              class="text-sm text-primary hover:underline"
            >
              github.com/zernonia →
            </a>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
