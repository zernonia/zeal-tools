<script setup lang="ts">
import type { TestMode } from '../../core'
import { Gauge, RotateCcw, Target, Timer, Trophy } from 'lucide-vue-next'
import { displayWpm, DURATIONS, modeLabel, WORD_COUNTS } from '../../core'
import { useTypingTest } from '../composables/useTypingTest'

/**
 * Nothing here needs a browser at setup: the words for the first render come
 * from a fixed seed, the clock starts on the first keystroke and records are
 * read on mount. So the tool renders on the server with no ClientOnly
 * fallback to shift the page when it hydrates.
 */
const {
  settings,
  test,
  result,
  best,
  newBest,
  previousBest,
  started,
  clock,
  live,
  fraction,
  summary,
  storageAvailable,
  hasBests,
  clearBests,
  input,
  inputValue,
  restart,
  update,
} = useTypingTest()

const text = ref<{ focus: () => void } | null>(null)
const results = ref<{ focus: () => void } | null>(null)

const MODES: { value: TestMode, label: string }[] = [
  { value: 'time', label: 'Time' },
  { value: 'words', label: 'Words' },
]

/** Restart and put the caret straight back in the words — this one is asked for. */
function again() {
  restart()
  nextTick(() => text.value?.focus())
}

// The field the person was typing into disappears with the result, so focus
// goes to the next obvious action rather than falling back to the page.
watch(result, (value) => {
  if (value)
    nextTick(() => results.value?.focus())
})

const progress = computed(() => test.value.config.mode === 'time'
  ? `${clock.value}`
  : `${test.value.index}/${test.value.config.words.length}`)
const progressLabel = computed(() => test.value.config.mode === 'time'
  ? `${clock.value} seconds left`
  : `${test.value.index} of ${test.value.config.words.length} words`)
</script>

<template>
  <div class="tool-frame flex flex-col gap-5">
    <!-- The result, once — never the keystrokes, never the clock ticking down. -->
    <p class="sr-only" aria-live="polite">
      {{ summary }}
    </p>

    <section
      class="flex flex-wrap items-end gap-x-6 gap-y-4 rounded-2xl border bg-background p-4 dark:bg-input/30 sm:p-5"
      aria-label="Test settings"
    >
      <div class="flex flex-col gap-1.5">
        <span id="typing-mode" class="text-sm font-medium">Test by</span>
        <div class="flex gap-1.5" role="group" aria-labelledby="typing-mode">
          <Button
            v-for="option in MODES"
            :key="option.value"
            :variant="settings.mode === option.value ? 'default' : 'outline'"
            :aria-pressed="settings.mode === option.value"
            class="h-11"
            @click="update({ mode: option.value })"
          >
            {{ option.label }}
          </Button>
        </div>
      </div>

      <div v-if="settings.mode === 'time'" class="flex flex-col gap-1.5">
        <span id="typing-length" class="text-sm font-medium">Seconds</span>
        <div class="flex gap-1.5" role="group" aria-labelledby="typing-length">
          <Button
            v-for="seconds in DURATIONS"
            :key="seconds"
            :variant="settings.duration === seconds ? 'default' : 'outline'"
            :aria-pressed="settings.duration === seconds"
            class="h-11 min-w-11 px-3 tabular-nums"
            @click="update({ duration: seconds })"
          >
            {{ seconds }}
          </Button>
        </div>
      </div>
      <div v-else class="flex flex-col gap-1.5">
        <span id="typing-length" class="text-sm font-medium">Words</span>
        <div class="flex gap-1.5" role="group" aria-labelledby="typing-length">
          <Button
            v-for="count in WORD_COUNTS"
            :key="count"
            :variant="settings.words === count ? 'default' : 'outline'"
            :aria-pressed="settings.words === count"
            class="h-11 min-w-11 px-3 tabular-nums"
            @click="update({ words: count })"
          >
            {{ count }}
          </Button>
        </div>
      </div>

      <div class="flex flex-col gap-1.5">
        <span id="typing-extras" class="text-sm font-medium">Include</span>
        <div class="flex gap-1.5" role="group" aria-labelledby="typing-extras">
          <Button
            :variant="settings.punctuation ? 'default' : 'outline'"
            :aria-pressed="settings.punctuation"
            class="h-11"
            @click="update({ punctuation: !settings.punctuation })"
          >
            Punctuation
          </Button>
          <Button
            :variant="settings.numbers ? 'default' : 'outline'"
            :aria-pressed="settings.numbers"
            class="h-11"
            @click="update({ numbers: !settings.numbers })"
          >
            Numbers
          </Button>
        </div>
      </div>
    </section>

    <section v-if="!result" class="relative flex flex-col gap-6 overflow-hidden rounded-2xl border border-border p-5 sm:p-8" aria-label="Typing test">
      <!-- How far through: time used, or words done. -->
      <div class="absolute inset-x-0 top-0 h-1 bg-muted" aria-hidden="true">
        <div class="h-full bg-primary motion-safe:transition-[width] motion-safe:duration-300" :style="{ width: `${Math.round(fraction * 1000) / 10}%` }" />
      </div>

      <div class="flex flex-wrap items-stretch gap-3">
        <dl class="grid flex-1 grid-cols-3 gap-3 sm:max-w-md">
          <div class="rounded-xl bg-muted/50 px-3 py-2.5 sm:px-4">
            <dt class="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Timer class="size-3.5" aria-hidden="true" />
              {{ settings.mode === 'time' ? 'Seconds' : 'Words' }}
            </dt>
            <dd role="timer" :aria-label="progressLabel" class="font-mono text-2xl font-semibold tabular-nums sm:text-3xl" :class="started ? 'text-primary' : ''">
              {{ progress }}
            </dd>
          </div>
          <div class="rounded-xl bg-muted/50 px-3 py-2.5 sm:px-4">
            <dt class="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Gauge class="size-3.5" aria-hidden="true" />
              WPM
            </dt>
            <dd class="font-mono text-2xl font-semibold tabular-nums sm:text-3xl">
              {{ live ? displayWpm(live.wpm) : '–' }}
            </dd>
          </div>
          <div class="rounded-xl bg-muted/50 px-3 py-2.5 sm:px-4">
            <dt class="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Target class="size-3.5" aria-hidden="true" />
              Accuracy
            </dt>
            <dd class="font-mono text-2xl font-semibold tabular-nums sm:text-3xl">
              {{ live ? `${Math.round(live.accuracy)}%` : '–' }}
            </dd>
          </div>
        </dl>
        <p class="w-full items-center gap-2 self-center text-sm text-muted-foreground sm:ml-auto sm:flex sm:w-auto" :class="best ? 'flex' : 'hidden'">
          <template v-if="best">
            <span class="grid size-9 place-items-center rounded-lg bg-primary/10 text-primary" aria-hidden="true">
              <Trophy class="size-4" />
            </span>
            <span>
              Best at {{ modeLabel(settings) }}<br>
              <span class="font-semibold text-foreground">{{ displayWpm(best.wpm) }} WPM</span>
            </span>
          </template>
          <span v-else class="rounded-full bg-muted px-3 py-1 text-xs font-medium">
            {{ modeLabel(settings) }}
          </span>
        </p>
      </div>

      <TypingText
        ref="text"
        :test="test"
        @input="input"
        @value="inputValue"
      />

      <!--
        Directly after the typing field in the DOM, so Tab from the words lands
        here and Enter restarts — no shortcut has to be intercepted.
      -->
      <div class="flex flex-col items-center gap-2">
        <Button variant="outline" size="lg" class="min-w-36" @click="again">
          <RotateCcw class="size-4" aria-hidden="true" />
          Restart
        </Button>
        <p class="hidden text-xs text-muted-foreground sm:block">
          <kbd>Tab</kbd> then <kbd>Enter</kbd> restarts · the clock starts on your first key
        </p>
      </div>
    </section>

    <TypingResults
      v-else
      ref="results"
      :result="result"
      :settings="settings"
      :new-best="newBest"
      :previous-best="previousBest"
      :best="best"
      @restart="again"
    />

    <p class="text-center text-xs text-muted-foreground">
      <template v-if="storageAvailable">
        Personal bests are kept in this browser only, one per mode. What you type is never stored or sent.
        <button
          v-if="hasBests"
          type="button"
          class="ml-1 inline-flex min-h-11 items-center font-medium text-foreground underline underline-offset-4 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          @click="clearBests"
        >
          Forget my bests
        </button>
      </template>
      <template v-else>
        This browser is not allowing storage, so personal bests will not be remembered. The test works the same.
      </template>
    </p>
  </div>
</template>
