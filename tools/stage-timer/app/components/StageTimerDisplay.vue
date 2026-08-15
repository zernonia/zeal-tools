<script setup lang="ts">
import type { TimerReading } from '../../core'

defineProps<{
  reading: TimerReading
  message?: string
  /** Stage view is the huge one shown on the screen. */
  stage?: boolean
}>()

const phaseClass = {
  normal: 'text-foreground',
  warn: 'text-amber-500',
  over: 'text-destructive',
} as const
</script>

<template>
  <div class="flex flex-col items-center justify-center gap-4" :class="stage ? 'min-h-[70vh]' : 'py-6'">
    <p
      class="font-mono font-semibold tabular-nums leading-none transition-colors"
      :class="[phaseClass[reading.phase], stage ? 'text-[18vw] sm:text-[16vw]' : 'text-6xl']"
    >
      {{ reading.clock }}
    </p>
    <p v-if="message" class="text-center font-medium" :class="stage ? 'text-3xl' : 'text-base'">
      {{ message }}
    </p>
    <div class="h-2 w-full max-w-3xl overflow-hidden rounded-full bg-muted" role="presentation">
      <div
        class="h-full transition-[width] duration-200"
        :class="reading.phase === 'over' ? 'bg-destructive' : reading.phase === 'warn' ? 'bg-amber-500' : 'bg-primary'"
        :style="{ width: `${reading.progress * 100}%` }"
      />
    </div>
    <p class="sr-only" aria-live="polite">
      {{ reading.over ? 'Time is up' : `${reading.clock} remaining` }}
    </p>
  </div>
</template>
