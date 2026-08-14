<script setup lang="ts">
const { show } = useSearchPalette()
</script>

<template>
  <header class="sticky top-0 z-40 border-b border-neutral-200/70 bg-white/85 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/85">
    <div class="container-page flex h-14 items-center justify-between gap-4">
      <NuxtLink to="/" class="flex items-center gap-2 font-semibold tracking-tight">
        <span class="grid size-7 place-items-center rounded-lg bg-flame-500 text-sm font-bold text-white">z</span>
        <span>zeal<span class="text-flame-500">.tools</span></span>
      </NuxtLink>
      <div class="flex items-center gap-2">
        <button
          type="button"
          class="flex h-9 min-w-9 items-center gap-2 rounded-lg border border-neutral-200 px-2 text-sm text-neutral-500 transition-colors hover:border-neutral-300 hover:text-neutral-800 sm:px-3 dark:border-neutral-800 dark:text-neutral-400 dark:hover:border-neutral-700 dark:hover:text-neutral-200"
          @click="show()"
        >
          <svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
          <span class="hidden sm:inline">Search tools…</span>
          <kbd class="hidden rounded border border-neutral-200 bg-neutral-50 px-1.5 py-0.5 font-mono text-[10px] text-neutral-500 sm:inline dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-400">⌘K</kbd>
          <span class="sr-only">Search tools</span>
        </button>
        <a
          href="https://github.com/zernonia/zeal-tools"
          target="_blank"
          rel="noopener"
          class="grid size-9 place-items-center rounded-lg border border-neutral-200 text-neutral-500 transition-colors hover:border-neutral-300 hover:text-neutral-800 dark:border-neutral-800 dark:text-neutral-400 dark:hover:border-neutral-700 dark:hover:text-neutral-200"
          aria-label="zeal.tools on GitHub"
        >
          <svg class="size-4" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" /></svg>
        </a>
      </div>
    </div>
  </header>
</template>
