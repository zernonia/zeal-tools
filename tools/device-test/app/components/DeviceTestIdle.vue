<script setup lang="ts">
import type { Component } from 'vue'

/**
 * The resting state shared by the microphone and webcam tests: what the test
 * does, said once, and the button that starts it. The rings are drawn in the
 * theme's own border colour, so they sit quietly in both themes.
 */
defineProps<{
  icon: Component
  title: string
  text: string
}>()
</script>

<template>
  <div class="flex flex-col items-center gap-5 py-8 text-center sm:py-10">
    <span class="relative grid size-28 place-items-center" aria-hidden="true">
      <span class="absolute inset-0 rounded-full border border-dashed border-border" />
      <span class="absolute inset-3 rounded-full border border-border bg-muted/40" />
      <span class="relative grid size-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-sm">
        <component :is="icon" class="size-6" />
      </span>
    </span>
    <div>
      <p class="text-lg font-semibold">
        {{ title }}
      </p>
      <p class="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
        {{ text }}
      </p>
    </div>
    <slot />
  </div>
</template>
