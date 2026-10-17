<script setup lang="ts">
const props = withDefaults(defineProps<{
  /** Tool slugs whose icons make up the cover. */
  tools: string[]
  /** `lg` heads an article; `sm` sits beside a card on the index. */
  size?: 'sm' | 'lg'
}>(), { size: 'lg' })

/**
 * A cover drawn from the post's own tools rather than a stock photo: it says
 * what the post is about, costs no request, and follows the theme because it
 * is built from the same tokens as everything else.
 *
 * Alternate tiles sit a little higher, so a row of icons reads as a scattered
 * set instead of a toolbar.
 */
const icons = computed(() => props.tools.slice(0, props.size === 'lg' ? 6 : 3))
</script>

<template>
  <div
    aria-hidden="true"
    class="relative flex items-center justify-center overflow-hidden rounded-2xl border bg-muted/50 bg-[radial-gradient(var(--border)_1px,transparent_1px)] [background-size:16px_16px]"
    :class="size === 'lg' ? 'aspect-[21/9] gap-2 sm:gap-4' : 'aspect-[21/9] gap-2 sm:aspect-[4/3]'"
  >
    <span
      v-for="(slug, index) in icons"
      :key="slug"
      class="grid shrink-0 place-items-center border bg-card text-foreground shadow-sm"
      :class="[
        size === 'lg' ? 'size-10 rounded-xl sm:size-20 sm:rounded-3xl' : 'size-10 rounded-xl',
        index % 2 ? (size === 'lg' ? '-translate-y-2 sm:-translate-y-5' : '-translate-y-2') : '',
      ]"
    >
      <SiteToolIcon :slug="slug" :class="size === 'lg' ? 'size-5 sm:size-9' : 'size-5'" />
    </span>
  </div>
</template>
