<script setup lang="ts">
/**
 * A percentage as a ring, with the number printed inside so the colour and
 * the arc are never the only way to read it.
 */
const props = defineProps<{
  /** 0–100, or null for "not enough to say". */
  value: number | null
  label: string
}>()

const R = 42
const C = 2 * Math.PI * R
const fraction = computed(() => (props.value === null ? 0 : Math.max(0, Math.min(100, props.value)) / 100))
</script>

<template>
  <div class="flex flex-col items-center gap-2">
    <div class="relative grid size-28 place-items-center">
      <svg viewBox="0 0 100 100" class="absolute inset-0 size-full -rotate-90" aria-hidden="true">
        <circle cx="50" cy="50" :r="R" fill="none" stroke-width="9" class="stroke-muted" />
        <circle
          v-if="value !== null"
          cx="50"
          cy="50"
          :r="R"
          fill="none"
          stroke-width="9"
          stroke-linecap="round"
          :stroke-dasharray="C"
          :stroke-dashoffset="C * (1 - fraction)"
          class="stroke-primary motion-safe:transition-[stroke-dashoffset] motion-safe:duration-700"
        />
      </svg>
      <span class="relative font-mono text-2xl font-semibold tabular-nums">
        {{ value === null ? '—' : `${Math.round(value)}%` }}
      </span>
    </div>
    <span class="text-sm font-medium text-muted-foreground">{{ label }}</span>
  </div>
</template>
