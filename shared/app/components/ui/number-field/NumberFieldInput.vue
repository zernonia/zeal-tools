<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { NumberFieldInput } from 'reka-ui'

const props = defineProps<{ class?: HTMLAttributes['class'] }>()
</script>

<template>
  <NumberFieldInput
    data-slot="input"
    :class="cn(
      'h-11 w-full min-w-0 rounded-lg border border-input bg-transparent px-3 text-center text-sm tabular-nums transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 dark:bg-input/30 dark:disabled:bg-input/80',
      props.class,
    )"
  />
</template>
