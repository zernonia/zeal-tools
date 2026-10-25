<script setup lang="ts">
import { Play, Square } from 'lucide-vue-next'
import { MAX_BEATS, MAX_BPM, MIN_BPM, SUBDIVISIONS } from '../../core'
import { useMetronome } from '../composables/useMetronome'

/**
 * Nothing here needs a browser at setup: the audio context is created on the
 * first press of Start, so the tool renders on the server and is crawlable,
 * with no ClientOnly fallback to shift the layout on hydration.
 */
const {
  bpm,
  beats,
  subdivision,
  levels,
  marking,
  playing,
  supported,
  volume,
  currentBeat,
  currentSub,
  tapCount,
  toggle,
  tap,
  cycleBeat,
} = useMetronome()

const { track } = useAnalytics()

watch(playing, (now) => {
  if (now)
    track('tool_completed', { tool: 'metronome', format: 'audio' })
})

// Announced on change of state, never per beat — a screen reader reading
// "beat two" four times a second would drown everything else out.
const announcement = computed(() =>
  playing.value
    ? `Metronome playing at ${bpm.value} beats per minute, ${beats.value} beats per bar.`
    : 'Metronome stopped.',
)

/** No thousands separator: "1,000" is not a tempo, and 300 is the ceiling anyway. */
const NUMBER_FORMAT = { useGrouping: false } as const
</script>

<template>
  <div class="tool-frame flex flex-col gap-5">
    <p class="sr-only" aria-live="polite">
      {{ announcement }}
    </p>

    <p v-if="!supported" class="rounded-2xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive" role="alert">
      This browser does not support the Web Audio API, so the metronome cannot sound here. Any current version
      of Chrome, Firefox, Safari or Edge will work.
    </p>

    <section class="flex flex-col gap-6 rounded-2xl border border-border p-5 sm:p-8" aria-label="Tempo">
      <div class="flex flex-col items-center gap-3">
        <!--
            reka's NumberField: typing commits on Enter or blur and is clamped
            to the range, ArrowUp/Down step by one, PageUp/Down by ten, and
            Home/End jump to the ends.
          -->
        <NumberField
          id="metronome-bpm"
          :model-value="bpm"
          :min="MIN_BPM"
          :max="MAX_BPM"
          :step="1"
          :large-step="10"
          :format-options="NUMBER_FORMAT"
          class="w-full max-w-80"
          @update:model-value="value => bpm = value ?? bpm"
        >
          <Label for="metronome-bpm" class="sr-only">Beats per minute</Label>
          <NumberFieldContent>
            <NumberFieldDecrement class="size-12 rounded-full border border-border bg-background hover:bg-muted dark:bg-input/30" />
            <NumberFieldInput class="h-24 border-0 bg-transparent font-mono text-7xl font-semibold dark:bg-transparent sm:text-8xl" />
            <NumberFieldIncrement class="size-12 rounded-full border border-border bg-background hover:bg-muted dark:bg-input/30" />
          </NumberFieldContent>
        </NumberField>
        <p class="-mt-2 text-sm text-muted-foreground">
          BPM · <span class="font-medium italic text-foreground">{{ marking }}</span>
        </p>

        <TempoSlider v-model="bpm" class="max-w-lg" />
      </div>

      <div class="flex flex-col items-center gap-2">
        <MetronomeBar
          :levels="levels"
          :subdivision="subdivision"
          :current-beat="currentBeat"
          :current-sub="currentSub"
          @cycle="cycleBeat"
        />
        <p class="text-xs text-muted-foreground">
          Press a beat to cycle it between accented (&gt;), normal and muted (a rest).
        </p>
      </div>

      <div class="flex flex-wrap justify-center gap-3">
        <Button size="lg" class="min-w-36" :aria-pressed="playing" @click="toggle">
          <component :is="playing ? Square : Play" class="size-4" />
          {{ playing ? 'Stop' : 'Start' }}
        </Button>
        <!--
          Pressing gives way under the finger, and every tap — click or T key —
          sends a ring out from the button, so a run of taps reads as a pulse.
          The ring is keyed on the tap count: a new key remounts it, which is
          what restarts the animation.
        -->
        <Button size="lg" variant="outline" class="relative min-w-36 transition-[scale,background-color] duration-75 active:scale-95 active:bg-muted" aria-keyshortcuts="T" @click="tap">
          <span v-if="tapCount" :key="tapCount" class="tap-ring pointer-events-none absolute inset-0 rounded-lg" aria-hidden="true" />
          <span :key="`label${tapCount}`" :class="tapCount ? 'tap-label' : ''">Tap tempo</span>
        </Button>
      </div>
    </section>

    <section class="grid gap-5 rounded-2xl border bg-background p-5 dark:bg-input/30 sm:grid-cols-[auto_1fr_minmax(0,14rem)]" aria-label="Bar and sound">
      <NumberField
        id="metronome-beats"
        :model-value="beats"
        :min="1"
        :max="MAX_BEATS"
        :step="1"
        :format-options="NUMBER_FORMAT"
        class="sm:w-36"
        @update:model-value="value => beats = value ?? beats"
      >
        <Label for="metronome-beats" class="mb-0 text-sm text-foreground">Beats per bar</Label>
        <NumberFieldContent>
          <NumberFieldDecrement />
          <NumberFieldInput />
          <NumberFieldIncrement />
        </NumberFieldContent>
      </NumberField>

      <div class="flex flex-col gap-1.5">
        <span id="metronome-sub" class="text-sm font-medium">Subdivision</span>
        <div class="flex flex-wrap gap-1.5" role="group" aria-labelledby="metronome-sub">
          <Button
            v-for="option in SUBDIVISIONS"
            :key="option.value"
            :variant="subdivision === option.value ? 'default' : 'outline'"
            :aria-pressed="subdivision === option.value"
            class="h-11"
            @click="subdivision = option.value"
          >
            {{ option.label }}
          </Button>
        </div>
      </div>

      <div class="flex flex-col gap-2">
        <div class="flex items-center justify-between">
          <span class="text-sm font-medium">Volume</span>
          <span class="text-sm tabular-nums text-muted-foreground">{{ Math.round(volume * 100) }}%</span>
        </div>
        <Slider
          :model-value="[volume]"
          :min="0"
          :max="1"
          :step="0.05"
          aria-label="Volume"
          @update:model-value="value => volume = value?.[0] ?? 0.8"
        />
      </div>
    </section>

    <p class="hidden text-center text-xs text-muted-foreground sm:block">
      <kbd>Space</kbd> start/stop · <kbd>T</kbd> tap · <kbd>+</kbd> <kbd>−</kbd> tempo
    </p>
  </div>
</template>

<style scoped>
/*
 * Tailwind v4's `scale` utilities set the standalone `scale` property, which
 * is why the transition above names `scale` rather than `transform`.
 * The global reduced-motion rule in main.css shortens both animations to
 * nothing, so they degrade to a plain state change.
 */
.tap-ring {
  animation: tap-ring 450ms ease-out forwards;
}

.tap-label {
  animation: tap-label 180ms ease-out;
}

@keyframes tap-ring {
  from {
    box-shadow: 0 0 0 0 color-mix(in oklab, var(--primary) 45%, transparent);
  }
  to {
    box-shadow: 0 0 0 14px color-mix(in oklab, var(--primary) 0%, transparent);
  }
}

@keyframes tap-label {
  50% {
    color: var(--primary);
  }
}
</style>
