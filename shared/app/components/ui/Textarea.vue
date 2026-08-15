<script setup lang="ts">
import type { HTMLAttributes } from 'vue'

const props = defineProps<{ class?: HTMLAttributes['class'] }>()
const modelValue = defineModel<string>()
</script>

<template>
  <textarea
    v-model="modelValue"
    :class="cn(
      'flex min-h-20 w-full rounded-lg border border-input bg-transparent dark:bg-input/30 px-3 py-2 text-sm transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none disabled:bg-input/50 dark:disabled:bg-input/80 disabled:cursor-not-allowed disabled:opacity-50',
      props.class,
    )"
  />
</template>
