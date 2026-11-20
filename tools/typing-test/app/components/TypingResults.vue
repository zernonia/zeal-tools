<script setup lang="ts">
import type { PersonalBest, TestResult, TestSettings } from '../../core'
import { Delete, Keyboard, RotateCcw, Timer, Trophy, Zap } from 'lucide-vue-next'
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
  { label: 'Raw speed', value: `${displayWpm(props.result.raw)}`, hint: 'every character, right or wrong', icon: Zap },
  { label: 'Time', value: `${Math.round(props.result.seconds * 10) / 10}s`, hint: props.settings.mode === 'time' ? 'the whole test' : 'first key to last', icon: Timer },
  { label: 'Keystrokes', value: `${props.result.keystrokes.correct}/${props.result.keystrokes.total}`, hint: 'right out of typed', icon: Keyboard },
  { label: 'Mistakes', value: `${props.result.chars.incorrect + props.result.chars.extra + props.result.chars.missed}`, hint: 'wrong, extra and missed letters', icon: Delete },
])

/** Each kind of letter as a share of all of them, for one stacked bar. */
const chars = computed(() => {
  const c = props.result.chars
  const total = c.correct + c.incorrect + c.extra + c.missed
  return [
    { label: 'Correct', value: c.correct, swatch: 'bg-primary' },
    { label: 'Incorrect', value: c.incorrect, swatch: 'bg-destructive' },
    { label: 'Extra', value: c.extra, swatch: 'bg-destructive/50' },
    { label: 'Missed', value: c.missed, swatch: 'bg-muted-foreground/40' },
  ].map(item => ({ ...item, share: total ? item.value / total * 100 : 0 }))
})

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

    <div class="grid items-center gap-6 rounded-2xl bg-muted/50 p-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:p-8">
      <div class="flex flex-col items-center gap-1 text-center sm:items-start sm:text-left">
        <p class="flex items-baseline gap-3">
          <span class="font-mono text-7xl font-semibold tabular-nums sm:text-8xl">{{ wpm }}</span>
          <span class="text-sm font-medium text-muted-foreground">WPM</span>
        </p>
        <p class="text-sm text-muted-foreground">
          words per minute · {{ modeLabel(settings) }}
        </p>
        <p
          v-if="bestLine"
          class="mt-3 inline-flex max-w-full items-center gap-2 rounded-full px-4 py-1.5 text-sm"
          :class="newBest ? 'bg-primary font-semibold text-primary-foreground' : 'bg-background text-muted-foreground dark:bg-input/40'"
        >
          <Trophy v-if="newBest" class="size-4 shrink-0" aria-hidden="true" />
          {{ bestLine }}
        </p>
      </div>
      <div class="flex justify-center gap-6">
        <TypingRing :value="result.accuracy" label="Accuracy" />
        <TypingRing :value="result.consistency" label="Consistency" />
      </div>
    </div>

    <dl class="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <div v-for="stat in stats" :key="stat.label" class="flex items-start gap-3 rounded-xl border border-border p-4">
        <span class="hidden size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary sm:grid" aria-hidden="true">
          <component :is="stat.icon" class="size-4" />
        </span>
        <div class="min-w-0">
          <dt class="text-xs font-medium text-muted-foreground">
            {{ stat.label }}
          </dt>
          <dd class="font-mono text-xl font-semibold tabular-nums">
            {{ stat.value }}
          </dd>
          <dd class="text-xs text-muted-foreground">
            {{ stat.hint }}
          </dd>
        </div>
      </div>
    </dl>

    <div class="flex flex-col gap-3">
      <h3 class="text-sm font-medium">
        Letters
      </h3>
      <div class="flex h-3 gap-0.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
        <span
          v-for="item in chars"
          v-show="item.value"
          :key="item.label"
          class="h-full"
          :class="item.swatch"
          :style="{ width: `${item.share}%` }"
        />
      </div>
      <ul class="flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
        <li v-for="item in chars" :key="item.label" class="inline-flex items-center gap-1.5">
          <span class="size-2.5 rounded-sm" :class="item.swatch" aria-hidden="true" />
          <span class="font-mono font-semibold tabular-nums text-foreground">{{ item.value }}</span> {{ item.label.toLowerCase() }}
        </li>
      </ul>
    </div>

    <div v-if="result.series.length >= 2" class="flex flex-col gap-3 rounded-xl border border-border p-4 sm:p-5">
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
