<script setup lang="ts">
/**
 * A circular gauge for a length limit. The arc fills to the limit and turns
 * destructive past it; the centre always prints the number, so nothing
 * depends on reading the colour.
 */
const props = defineProps<{
  used: number
  max: number
  /** Printed in the middle — usually what is left, or how far over. */
  label: string
}>()

const R = 26
const C = 2 * Math.PI * R
const over = computed(() => props.used > props.max)
const fraction = computed(() => (props.max ? Math.min(1, props.used / props.max) : 0))
</script>

<template>
  <div class="relative grid size-16 shrink-0 place-items-center" aria-hidden="true">
    <svg viewBox="0 0 64 64" class="absolute inset-0 size-full -rotate-90">
      <circle cx="32" cy="32" :r="R" fill="none" stroke-width="6" class="stroke-muted" />
      <circle
        cx="32"
        cy="32"
        :r="R"
        fill="none"
        stroke-width="6"
        stroke-linecap="round"
        :stroke-dasharray="C"
        :stroke-dashoffset="C * (1 - fraction)"
        class="motion-safe:transition-[stroke-dashoffset] motion-safe:duration-300"
        :class="over ? 'stroke-destructive' : 'stroke-primary'"
      />
    </svg>
    <span class="relative font-mono text-sm font-semibold tabular-nums" :class="over ? 'text-destructive' : ''">
      {{ label }}
    </span>
  </div>
</template>
