<script setup lang="ts">
import { rangePosition } from '../../core'

/**
 * Where the drawn values fall between the two ends of the range. A picture of
 * the result, not a control: hidden from assistive tech, which hears the
 * values themselves. A single value gets its own tag above the mark.
 */
const props = defineProps<{
  min: number
  max: number
  values: readonly number[]
  minLabel?: string
  maxLabel?: string
  /** Shown above a single mark; omitted for several. */
  valueLabel?: string
}>()

/** Enough marks to show the spread; past that they only overlap. */
const MARKS = 200

const marks = computed(() => props.values.slice(0, MARKS).map(value => rangePosition(value, props.min, props.max) * 100))
</script>

<template>
  <div class="w-full select-none" aria-hidden="true">
    <div class="relative h-9">
      <div class="absolute inset-x-0 bottom-2 h-1.5 rounded-full bg-border" />
      <span
        v-for="(left, index) in marks"
        :key="index"
        class="rng-mark absolute bottom-2.75 size-3 -translate-x-1/2 translate-y-1/2 rounded-full bg-primary ring-2 ring-card"
        :style="{ left: `${left}%`, animationDelay: `${Math.min(index, 30) * 25}ms` }"
      />
      <span
        v-if="marks.length === 1 && valueLabel"
        class="absolute top-0 max-w-[50%] -translate-x-1/2 truncate rounded-md bg-primary px-1.5 py-0.5 font-mono text-[11px] leading-none font-semibold text-primary-foreground"
        :style="{ left: `clamp(1.5rem, ${marks[0]}%, calc(100% - 1.5rem))` }"
      >{{ valueLabel }}</span>
    </div>
    <div class="mt-1 flex justify-between gap-4 font-mono text-xs text-muted-foreground tabular-nums">
      <span class="truncate">{{ minLabel ?? min }}</span>
      <span class="truncate">{{ maxLabel ?? max }}</span>
    </div>
  </div>
</template>

<style scoped>
.rng-mark {
  animation: rng-mark-in 280ms ease-out both;
}

@media (prefers-reduced-motion: reduce) {
  .rng-mark {
    animation-delay: 0ms !important;
  }
}

@keyframes rng-mark-in {
  from {
    opacity: 0;
    scale: 0.2;
  }
  to {
    opacity: 1;
    scale: 1;
  }
}
</style>
