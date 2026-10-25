<script setup lang="ts">
import type { BeatLevel } from '../../core'
import { Minus, Play, Plus, Square } from 'lucide-vue-next'
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
  toggle,
  tap,
  cycleBeat,
  nudge,
} = useMetronome()

const { track } = useAnalytics()

watch(playing, (now) => {
  if (now)
    track('tool_completed', { tool: 'metronome', format: 'audio' })
})

const BEAT_OPTIONS = Array.from({ length: MAX_BEATS }, (_, i) => i + 1)

const LEVEL_LABEL: Record<BeatLevel, string> = {
  accent: 'accented',
  normal: 'normal',
  mute: 'muted',
}

/** Height of each beat's bar: tall for an accent, short for normal, a stub for muted. */
const LEVEL_HEIGHT: Record<BeatLevel, string> = {
  accent: 'h-16',
  normal: 'h-10',
  mute: 'h-3',
}

// Announced on change of state, never per beat — a screen reader reading
// "beat two" four times a second would drown everything else out.
const announcement = computed(() =>
  playing.value
    ? `Metronome playing at ${bpm.value} beats per minute, ${beats.value} beats per bar.`
    : 'Metronome stopped.',
)

const bpmInput = ref(String(bpm.value))
watch(bpm, value => bpmInput.value = String(value))
function commitBpm() {
  const value = Number(bpmInput.value)
  if (Number.isFinite(value) && bpmInput.value.trim() !== '')
    bpm.value = value
  bpmInput.value = String(bpm.value)
}
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

    <!-- ── Tempo ──────────────────────────────────────────────────────── -->
    <section class="flex flex-col items-center gap-5 rounded-2xl border border-border p-5 sm:p-8" aria-label="Tempo">
      <div class="flex items-center gap-3 sm:gap-6">
        <Button variant="outline" size="icon" class="size-12 rounded-full" aria-label="Slower by one beat per minute" @click="nudge(-1)">
          <Minus class="size-5" />
        </Button>
        <div class="text-center">
          <Label for="metronome-bpm" class="sr-only">Beats per minute</Label>
          <input
            id="metronome-bpm"
            v-model="bpmInput"
            type="text"
            inputmode="numeric"
            class="w-40 rounded-xl bg-transparent text-center font-mono text-7xl font-semibold tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-48 sm:text-8xl"
            @blur="commitBpm"
            @keydown.enter="commitBpm"
          >
          <p class="text-sm text-muted-foreground">
            BPM · <span class="italic">{{ marking }}</span>
          </p>
        </div>
        <Button variant="outline" size="icon" class="size-12 rounded-full" aria-label="Faster by one beat per minute" @click="nudge(1)">
          <Plus class="size-5" />
        </Button>
      </div>

      <Slider
        class="max-w-lg"
        :model-value="[bpm]"
        :min="MIN_BPM"
        :max="MAX_BPM"
        :step="1"
        aria-label="Tempo in beats per minute"
        @update:model-value="value => bpm = value?.[0] ?? 120"
      />

      <!-- Beat lights. Each is also the control for that beat's accent. -->
      <div class="flex w-full max-w-lg flex-wrap items-end justify-center gap-2" role="group" aria-label="Beats in the bar">
        <button
          v-for="(level, index) in levels"
          :key="index"
          type="button"
          class="flex min-h-20 min-w-11 flex-1 basis-11 flex-col items-center justify-end gap-1.5 rounded-xl px-1 pb-1.5 pt-2 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          :aria-label="`Beat ${index + 1}, ${LEVEL_LABEL[level]}. Press to change.`"
          @click="cycleBeat(index)"
        >
          <span
            class="w-full max-w-10 rounded-md border transition-colors duration-75"
            :class="[
              LEVEL_HEIGHT[level],
              currentBeat === index
                ? (level === 'mute' ? 'border-muted-foreground bg-muted-foreground/40' : 'border-primary bg-primary')
                : (level === 'accent' ? 'border-primary/60 bg-primary/15' : 'border-border bg-muted'),
            ]"
            aria-hidden="true"
          />
          <span class="text-xs tabular-nums" :class="currentBeat === index ? 'font-semibold text-foreground' : 'text-muted-foreground'">
            {{ index + 1 }}
          </span>
        </button>
      </div>
      <p class="-mt-2 text-xs text-muted-foreground">
        Press a beat to cycle it between accented, normal and muted.
      </p>

      <div class="flex flex-wrap justify-center gap-3">
        <Button size="lg" class="min-w-36" :aria-pressed="playing" @click="toggle">
          <component :is="playing ? Square : Play" class="size-4" />
          {{ playing ? 'Stop' : 'Start' }}
        </Button>
        <Button size="lg" variant="outline" class="min-w-36" aria-keyshortcuts="T" @click="tap">
          Tap tempo
        </Button>
      </div>
    </section>

    <!-- ── Bar ────────────────────────────────────────────────────────── -->
    <section class="grid gap-5 rounded-2xl border bg-background p-5 dark:bg-input/30 sm:grid-cols-[auto_1fr_minmax(0,14rem)]" aria-label="Bar and sound">
      <div class="flex flex-col gap-2">
        <Label for="metronome-beats" class="mb-0 text-sm text-foreground">Beats per bar</Label>
        <Select :model-value="String(beats)" @update:model-value="value => beats = Number(value)">
          <SelectTrigger id="metronome-beats" class="w-full sm:w-28">
            {{ beats }}
          </SelectTrigger>
          <SelectContent>
            <SelectItem v-for="option in BEAT_OPTIONS" :key="option" :value="String(option)">
              {{ option }}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div class="flex flex-col gap-2">
        <span id="metronome-sub" class="text-sm font-medium">Subdivision</span>
        <div class="flex flex-wrap gap-1.5" role="group" aria-labelledby="metronome-sub">
          <Button
            v-for="option in SUBDIVISIONS"
            :key="option.value"
            :variant="subdivision === option.value ? 'default' : 'outline'"
            :aria-pressed="subdivision === option.value"
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
