<script setup lang="ts">
const promises = [
  'No sign-up — ever',
  'No watermarks on any output',
  'No ads near the download button',
  'Works fully on mobile',
  'Privacy-first: processing stays in your browser',
  'Open source (MIT) — audit it, contribute, self-host',
  'Zero runtime dependencies in tool logic',
]
</script>

<template>
  <section id="promise" class="rounded-2xl border border-flame-200/60 bg-flame-50/60 p-6 sm:p-8 dark:border-flame-900/40 dark:bg-flame-950/20">
    <h2 class="text-lg font-semibold">The Zeal Promise</h2>
    <p class="mt-1 text-sm text-neutral-600 dark:text-neutral-400">Non-negotiable, on every tool we ship.</p>
    <ul class="mt-4 grid gap-2 sm:grid-cols-2">
      <li v-for="promise in promises" :key="promise" class="flex items-start gap-2 text-sm">
        <svg class="mt-0.5 size-4 shrink-0 text-flame-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 13 4 4L19 7" /></svg>
        <span>{{ promise }}</span>
      </li>
    </ul>
  </section>
</template>
