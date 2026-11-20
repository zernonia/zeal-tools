<script setup lang="ts">
import type { PersonalBest, TestResult, TestSettings } from '../../core'
import { RotateCcw, Trophy } from 'lucide-vue-next'
import { displayWpm, MIN_ACCURACY_FOR_BEST, modeLabel } from '../../core'

const props = defineProps<{
  result: TestResult
  settings: TestSettings
  newBest: boolean
  previousBest: PersonalBest | null
  best: PersonalBest | undefined
}>()

defineEmits<{ restart: [] }>()

const next = ref<{ $el: HTMLElement } | null>(null)

const wpm = computed(() => displayWpm(props.result.wpm))
const percent = (value: number) => `${Math.round(value)}%`

const bestLine = computed(() => {
  if (props.newBest) {
    return props.previousBest
      ? `New personal best — up ${displayWpm(props.result.wpm - props.previousBest.wpm)} on your previous ${displayWpm(props.previousBest.wpm)} WPM.`
      : 'New personal best — your first record for this mode.'
  }
  if (props.result.accuracy < MIN_ACCURACY_FOR_BEST && props.result.wpm > 0)
    return `Not kept as a record: personal bests need ${MIN_ACCURACY_FOR_BEST}% accuracy or more.`
  if (props.best)
    return `Your best for this mode is ${displayWpm(props.best.wpm)} WPM at ${percent(props.best.accuracy)}, set ${props.best.date}.`
  return ''
})

const shareCopy = computed(() =>
  `I typed ${wpm.value} WPM at ${percent(props.result.accuracy)} accuracy on a free typing test (${modeLabel(props.settings)}) — no sign-up.`,
)

const stats = computed(() => [
  { label: 'Accuracy', value: percent(props.result.accuracy), hint: `${props.result.keystrokes.correct} of ${props.result.keystrokes.total} keystrokes right` },
  { label: 'Raw speed', value: `${displayWpm(props.result.raw)}`, hint: 'every character, right or wrong' },
  { label: 'Consistency', value: props.result.consistency === null ? '—' : percent(props.result.consistency), hint: 'how even your pace was' },
  { label: 'Time', value: `${Math.round(props.result.seconds * 10) / 10}s`, hint: modeLabel(props.settings) },
])

const chars = computed(() => [
  { label: 'correct', value: props.result.chars.correct },
  { label: 'incorrect', value: props.result.chars.incorrect },
  { label: 'extra', value: props.result.chars.extra },
  { label: 'missed', value: props.result.chars.missed },
])

function focus() {
  next.value?.$el?.focus()
}

defineExpose({ focus })
</script>

<template>
  <section class="flex flex-col gap-6 rounded-2xl border border-border p-5 sm:p-8" aria-labelledby="typing-result-heading">
    <h2 id="typing-result-heading" class="sr-only">
      Your result
    </h2>

    <div class="flex flex-col items-center gap-1 text-center">
      <p class="font-mono text-7xl font-semibold tabular-nums sm:text-8xl">
        {{ wpm }}
      </p>
      <p class="text-sm font-medium text-muted-foreground">
        words per minute
      </p>
      <p
        v-if="bestLine"
        class="mt-3 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm"
        :class="newBest ? 'bg-primary text-primary-foreground font-semibold' : 'bg-muted text-muted-foreground'"
      >
        <Trophy v-if="newBest" class="size-4" aria-hidden="true" />
        {{ bestLine }}
      </p>
    </div>

    <dl class="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <div v-for="stat in stats" :key="stat.label" class="rounded-xl bg-background p-4 dark:bg-input/30">
        <dt class="text-xs font-medium text-muted-foreground">
          {{ stat.label }}
        </dt>
        <dd class="mt-1 font-mono text-2xl font-semibold tabular-nums">
          {{ stat.value }}
        </dd>
        <dd class="mt-0.5 text-xs text-muted-foreground">
          {{ stat.hint }}
        </dd>
      </div>
    </dl>

    <div class="flex flex-col gap-2">
      <h3 class="text-sm font-medium">
        Characters
      </h3>
      <ul class="flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
        <li v-for="item in chars" :key="item.label">
          <span class="font-mono font-semibold tabular-nums text-foreground">{{ item.value }}</span> {{ item.label }}
        </li>
      </ul>
    </div>

    <div v-if="result.series.length >= 2" class="flex flex-col gap-2">
      <h3 class="text-sm font-medium">
        Speed through the test
      </h3>
      <TypingSpeedChart :series="result.series" />
    </div>

    <div class="flex flex-col items-center gap-4">
      <Button ref="next" size="lg" class="min-w-44" @click="$emit('restart')">
        <RotateCcw class="size-4" aria-hidden="true" />
        Next test
      </Button>
      <ShareBar tool="typing-test" :share-copy="shareCopy" class="justify-center" />
    </div>
  </section>
</template>
