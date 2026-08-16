<script setup lang="ts">
import type { TimerReading } from '../../core'

const props = defineProps<{
  reading: TimerReading
  message?: string
  /** Stage view is the huge one shown on the screen. */
  stage?: boolean
}>()

/**
 * A dial rather than a bar. A ring emptying anticlockwise reads as "time
 * left" from across a room in a way a horizontal bar never does — and it puts
 * the number in the middle where the eye already is.
 */
const RADIUS = 46
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

const dashOffset = computed(() => CIRCUMFERENCE * props.reading.progress)

const stroke = computed(() => ({
  normal: 'var(--primary)',
  warn: 'var(--color-amber-500)',
  over: 'var(--destructive)',
}[props.reading.phase]))

const textClass = {
  normal: 'text-foreground',
  warn: 'text-amber-500',
  over: 'text-destructive',
} as const
</script>

<template>
  <div class="flex flex-col items-center justify-center gap-5" :class="stage ? 'min-h-[72vh]' : 'py-4'">
    <div class="relative aspect-square w-full" :class="stage ? 'max-w-[min(78vh,52rem)]' : 'max-w-xs'">
      <svg class="size-full -rotate-90" viewBox="0 0 100 100" aria-hidden="true">
        <circle
          cx="50" cy="50" :r="RADIUS"
          fill="none"
          stroke="var(--muted)"
          :stroke-width="stage ? 3 : 4"
        />
        <circle
          cx="50" cy="50" :r="RADIUS"
          fill="none"
          :stroke="stroke"
          :stroke-width="stage ? 3 : 4"
          stroke-linecap="round"
          :stroke-dasharray="CIRCUMFERENCE"
          :stroke-dashoffset="dashOffset"
          class="transition-[stroke-dashoffset,stroke] duration-200 ease-linear"
        />
      </svg>

      <div class="absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 text-center">
        <p
          class="font-mono font-semibold leading-none tabular-nums transition-colors"
          :class="[textClass[reading.phase], stage ? 'text-[13vw] sm:text-[11vw]' : 'text-5xl']"
        >
          {{ reading.clock }}
        </p>
        <p v-if="message" class="font-medium text-balance" :class="stage ? 'text-2xl sm:text-3xl' : 'text-sm'">
          {{ message }}
        </p>
        <p
          v-if="reading.over"
          class="font-medium uppercase tracking-widest text-destructive"
          :class="stage ? 'text-lg' : 'text-[10px]'"
        >
          over
        </p>
      </div>
    </div>

    <p class="sr-only" aria-live="polite">
      {{ reading.over ? 'Time is up' : `${reading.clock} remaining` }}
    </p>
  </div>
</template>
