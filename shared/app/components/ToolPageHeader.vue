<script setup lang="ts">
import { Bug } from 'lucide-vue-next'

const props = defineProps<{ title: string, description: string }>()

const route = useRoute()
const { public: { siteUrl } } = useRuntimeConfig()

/**
 * A prefilled issue rather than a bare link to the tracker.
 *
 * Which tool and which page someone was on is the first thing we would ask
 * and the easiest thing for them to forget, and every page here is
 * prerendered, so the URL is baked in per page — variants included — at no
 * runtime cost.
 */
const issueUrl = computed(() => {
  const params = new URLSearchParams({
    title: `[${props.title}] `,
    body: [
      `**Tool:** ${props.title}`,
      `**Page:** ${siteUrl}${route.path}`,
      '',
      '**Is this a bug, or an idea?**',
      '',
      '',
      '**What happened, or what would you like it to do?**',
      '',
      '',
      '**Anything else** — browser, screenshot, the image or text you used:',
      '',
    ].join('\n'),
  })
  return `https://github.com/zernonia/zeal-tools/issues/new?${params}`
})
</script>

<template>
  <header class="mb-8 flex items-start justify-between gap-4">
    <div class="max-w-2xl">
      <h1 class="font-heading text-3xl sm:text-4xl">
        {{ title }}
      </h1>
      <p class="mt-2 text-lg text-muted-foreground">
        {{ description }}
      </p>
    </div>

    <!--
      A plain external link, so it keeps middle-click and open-in-new-tab.
      The label collapses on narrow screens, hence the always-present
      accessible name.
    -->
    <Button
      as="a"
      variant="outline"
      size="sm"
      class="mt-1 size-11 shrink-0 text-muted-foreground sm:h-9 sm:w-auto sm:min-w-0"
      :href="issueUrl"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Report an issue or request a feature on GitHub"
    >
      <Bug class="size-3.5" />
      <span class="hidden sm:inline">Report an issue</span>
    </Button>
  </header>
</template>
