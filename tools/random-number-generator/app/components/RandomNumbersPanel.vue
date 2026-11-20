<script setup lang="ts">
import type { NumberResult, SortOrder } from '../../core'
import { Check, Copy, Shuffle } from 'lucide-vue-next'
import { generateNumbers, MAX_COUNT, MAX_DECIMALS } from '../../core'
import { drawBelow, injectRandomState, useRandomCompletion, useRandomCopy } from '../composables/useRandomTool'

const state = injectRandomState()
const complete = useRandomCompletion()
const { copied, copy } = useRandomCopy()

const result = ref<NumberResult | null>(null)
const error = ref('')
/** Bumped on every draw so the result remounts and its entrance replays. */
const draws = ref(0)

const SORTS: { value: SortOrder, label: string }[] = [
  { value: 'none', label: 'Order drawn' },
  { value: 'asc', label: 'Smallest first' },
  { value: 'desc', label: 'Largest first' },
]

const sort = computed<SortOrder>({
  get: () => (SORTS.some(s => s.value === state.sort) ? state.sort as SortOrder : 'none'),
  set: (value) => { state.sort = value },
})

const PRESETS = [
  { label: '1–10', min: 1, max: 10, count: 1, unique: false },
  { label: '1–100', min: 1, max: 100, count: 1, unique: false },
  { label: '1–1000', min: 1, max: 1000, count: 1, unique: false },
  { label: '6 from 1–49', min: 1, max: 49, count: 6, unique: true },
]

function applyPreset(preset: typeof PRESETS[number]) {
  Object.assign(state, { min: preset.min, max: preset.max, count: preset.count, unique: preset.unique, decimals: 0 })
  // Lottery numbers read better in order; a single draw has no order to speak of.
  if (preset.unique)
    state.sort = 'asc'
}

/** The preset the settings currently match, shown pressed. */
const activePreset = computed(() => PRESETS.find(p =>
  p.min === state.min && p.max === state.max && p.count === state.count && p.unique === state.unique && state.decimals === 0,
)?.label)

function generate(pressed = false) {
  error.value = ''
  try {
    result.value = generateNumbers({
      min: state.min,
      max: state.max,
      count: state.count,
      unique: state.unique,
      sort: sort.value,
      decimals: state.decimals,
    }, drawBelow)
    draws.value++
    if (pressed)
      complete('numbers')
  }
  catch (cause) {
    result.value = null
    error.value = cause instanceof Error ? cause.message : 'Could not generate numbers.'
  }
}

// A number on screen the moment the page loads, and a fresh one whenever the
// settings change — the button is for drawing again with the same settings.
onMounted(() => generate())
watch(() => [state.min, state.max, state.count, state.unique, state.sort, state.decimals], () => generate())

const single = computed(() => result.value?.formatted.length === 1)
/** A handful of short numbers is drawn as lottery balls; anything else as chips. */
const balls = computed(() => {
  const list = result.value?.formatted
  return !!list && list.length > 1 && list.length <= 30 && list.every(value => value.length <= 4)
})
/** The result area scrolls only when it holds a long list. */
const scrolls = computed(() => !!result.value && !single.value && !balls.value)
const copyText = computed(() => result.value?.formatted.join('\n') ?? '')

const announcement = computed(() => {
  if (error.value)
    return error.value
  const list = result.value?.formatted
  if (!list)
    return ''
  if (list.length === 1)
    return `Your number is ${list[0]}.`
  const spoken = list.length > 20 ? `${list.slice(0, 20).join(', ')}, and ${list.length - 20} more` : list.join(', ')
  return `${list.length} numbers: ${spoken}.`
})

const NUMBER_FORMAT = computed(() => ({ useGrouping: false, maximumFractionDigits: state.decimals }))
const step = computed(() => 10 ** -state.decimals)
/*
  The range fields turn off reka's step snapping. It measures from `min`,
  which here is −(2^53 − 1), so `value − min` runs past what a double holds
  exactly and the snap cannot be trusted (0.5 at step 1 came back unsnapped).
  The core rounds to the chosen precision itself.
*/
const SAFE = Number.MAX_SAFE_INTEGER

const endLabel = (value: number) => value.toLocaleString('en', { maximumFractionDigits: state.decimals })

const sectionClass = 'space-y-4 rounded-2xl border border-border p-5'
</script>

<template>
  <div class="space-y-5">
    <section :class="sectionClass" aria-label="Result">
      <div
        class="rng-stage grid min-h-56 place-items-center overflow-hidden rounded-xl p-6 text-center"
        :class="scrolls ? 'max-h-80 overflow-y-auto' : ''"
        :tabindex="scrolls ? 0 : undefined"
        :aria-label="scrolls ? 'Generated numbers' : undefined"
        :role="scrolls ? 'region' : undefined"
      >
        <p v-if="error" class="max-w-md text-sm text-destructive" role="alert">
          {{ error }}
        </p>
        <p v-else-if="!result" class="font-mono text-8xl font-bold text-muted-foreground/40" aria-hidden="true">
          ?
        </p>
        <p
          v-else-if="single"
          :key="draws"
          class="rng-roll font-mono font-bold tracking-tight tabular-nums break-all"
          :class="result.formatted[0]!.length > 10 ? 'text-4xl sm:text-5xl' : result.formatted[0]!.length > 5 ? 'text-6xl sm:text-7xl' : 'text-8xl sm:text-9xl'"
        >
          {{ result.formatted[0] }}
        </p>
        <ol v-else-if="balls" :key="draws" class="flex max-w-xl flex-wrap justify-center gap-2.5 sm:gap-3">
          <li
            v-for="(value, index) in result.formatted"
            :key="index"
            class="rng-ball grid size-13 place-items-center rounded-full sm:size-15"
            :style="{ animationDelay: `${Math.min(index, 20) * 70}ms` }"
          >
            <span
              class="grid size-9 place-items-center rounded-full bg-card font-mono font-bold text-card-foreground tabular-nums sm:size-10"
              :class="value.length > 3 ? 'text-xs' : value.length > 2 ? 'text-sm' : 'text-base sm:text-lg'"
            >{{ value }}</span>
          </li>
        </ol>
        <ol v-else :key="draws" class="rng-roll flex flex-wrap justify-center gap-2">
          <li
            v-for="(value, index) in result.formatted"
            :key="index"
            class="min-w-12 rounded-lg border border-border bg-card px-3 py-2 font-mono text-base font-semibold tabular-nums"
          >
            {{ value }}
          </li>
        </ol>
      </div>

      <!-- Height reserved either way, so an error does not pull the buttons up. -->
      <div class="min-h-[4.5rem]">
        <template v-if="result && !error">
          <RandomRangeTrack
            :key="draws"
            :min="state.min"
            :max="state.max"
            :values="result.numbers"
            :min-label="endLabel(state.min)"
            :max-label="endLabel(state.max)"
            :value-label="single ? result.formatted[0] : undefined"
          />
          <p class="mt-1 text-center text-xs text-muted-foreground">
            {{ state.unique ? 'No repeats · ' : '' }}Each of the {{ result.possible.toLocaleString('en') }} possible values was equally likely.
          </p>
        </template>
      </div>

      <!-- The copy area. Nothing else ever goes here. -->
      <div class="grid gap-3 sm:grid-cols-2">
        <Button size="lg" class="min-h-11" @click="generate(true)">
          <Shuffle class="size-4" />
          {{ state.count > 1 ? 'Generate again' : 'New number' }}
        </Button>
        <Button size="lg" variant="outline" class="min-h-11" :disabled="!copyText" @click="copy(copyText)">
          <component :is="copied ? Check : Copy" class="size-4" />
          {{ copied ? 'Copied' : state.count > 1 ? 'Copy numbers' : 'Copy number' }}
        </Button>
      </div>
    </section>

    <section :class="sectionClass" aria-labelledby="rng-settings-heading">
      <h2 id="rng-settings-heading" class="text-sm font-semibold">
        Range and options
      </h2>
      <div class="grid grid-cols-2 gap-2 sm:grid-cols-4" role="group" aria-label="Common ranges">
        <Button
          v-for="preset in PRESETS"
          :key="preset.label"
          :variant="activePreset === preset.label ? 'default' : 'outline'"
          class="min-h-11"
          :aria-pressed="activePreset === preset.label"
          @click="applyPreset(preset)"
        >
          {{ preset.label }}
        </Button>
      </div>

      <div class="grid gap-x-4 gap-y-4 border-t border-border pt-4 sm:grid-cols-2">
        <NumberField
          id="rng-min"
          :model-value="state.min"
          :min="-SAFE"
          :max="SAFE"
          :step="step"
          :step-snapping="false"
          :format-options="NUMBER_FORMAT"
          @update:model-value="(value: number | undefined) => state.min = value ?? state.min"
        >
          <Label for="rng-min" class="mb-0">Minimum</Label>
          <NumberFieldContent>
            <NumberFieldDecrement />
            <NumberFieldInput />
            <NumberFieldIncrement />
          </NumberFieldContent>
        </NumberField>

        <NumberField
          id="rng-max"
          :model-value="state.max"
          :min="-SAFE"
          :max="SAFE"
          :step="step"
          :step-snapping="false"
          :format-options="NUMBER_FORMAT"
          @update:model-value="(value: number | undefined) => state.max = value ?? state.max"
        >
          <Label for="rng-max" class="mb-0">Maximum</Label>
          <NumberFieldContent>
            <NumberFieldDecrement />
            <NumberFieldInput />
            <NumberFieldIncrement />
          </NumberFieldContent>
        </NumberField>

        <NumberField
          id="rng-count"
          :model-value="state.count"
          :min="1"
          :max="MAX_COUNT"
          :step="1"
          :format-options="{ useGrouping: false }"
          @update:model-value="(value: number | undefined) => state.count = value ?? state.count"
        >
          <Label for="rng-count" class="mb-0">How many numbers</Label>
          <NumberFieldContent>
            <NumberFieldDecrement />
            <NumberFieldInput />
            <NumberFieldIncrement />
          </NumberFieldContent>
        </NumberField>

        <NumberField
          id="rng-decimals"
          :model-value="state.decimals"
          :min="0"
          :max="MAX_DECIMALS"
          :step="1"
          @update:model-value="(value: number | undefined) => state.decimals = value ?? state.decimals"
        >
          <Label for="rng-decimals" class="mb-0">Decimal places</Label>
          <NumberFieldContent>
            <NumberFieldDecrement />
            <NumberFieldInput />
            <NumberFieldIncrement />
          </NumberFieldContent>
        </NumberField>

        <!-- The same label-over-field shape as its neighbour, so the two line up. -->
        <div class="grid gap-1.5">
          <span id="rng-unique-heading" class="text-xs font-medium text-muted-foreground">Repeats</span>
          <div
            class="flex h-11 items-center gap-2.5 rounded-lg border border-input pl-3 dark:bg-input/30"
            role="group"
            aria-labelledby="rng-unique-heading"
          >
            <Checkbox id="rng-unique" v-model="state.unique" />
            <Label for="rng-unique" class="mb-0 flex h-full grow cursor-pointer items-center text-sm font-normal text-foreground">
              No repeats — every number different
            </Label>
          </div>
        </div>
        <div class="grid gap-1.5">
          <Label for="rng-sort" class="mb-0">Order</Label>
          <Select v-model="sort">
            <SelectTrigger id="rng-sort" class="h-11 w-full" />
            <SelectContent>
              <SelectItem v-for="option in SORTS" :key="option.value" :value="option.value">
                {{ option.label }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <p class="text-xs text-muted-foreground">
        Both ends are included: 1 to 6 can give 1 and can give 6. Copying puts one number per line, ready to
        paste into a spreadsheet column.
      </p>
    </section>

    <p class="sr-only" aria-live="polite">
      {{ announcement }}
    </p>
  </div>
</template>

<style scoped>
/* A soft spotlight behind the result, mixed from tokens so it suits both themes. */
.rng-stage {
  background:
    radial-gradient(ellipse at 50% 0%, color-mix(in oklab, var(--foreground) 8%, transparent), transparent 70%),
    color-mix(in oklab, var(--muted) 70%, transparent);
}

:global(.dark) .rng-stage {
  background:
    radial-gradient(ellipse at 50% 0%, color-mix(in oklab, var(--foreground) 10%, transparent), transparent 70%),
    color-mix(in oklab, var(--input) 30%, transparent);
}

/* The number rolls up into place, like a counter settling. */
.rng-roll {
  animation: rng-roll 420ms cubic-bezier(0.2, 0.9, 0.25, 1.15) both;
}

@keyframes rng-roll {
  from {
    opacity: 0;
    translate: 0 45%;
    filter: blur(6px);
  }
  to {
    opacity: 1;
    translate: 0 0;
    filter: blur(0);
  }
}

/* A lottery ball: lit from above, with a disc carrying the number. No stagger for reduced motion. */
@media (prefers-reduced-motion: reduce) {
  .rng-ball {
    animation-delay: 0ms !important;
  }
}

.rng-ball {
  background: radial-gradient(
    circle at 35% 28%,
    color-mix(in oklab, var(--primary) 55%, white) 0%,
    var(--primary) 55%,
    color-mix(in oklab, var(--primary) 75%, black) 100%
  );
  box-shadow: 0 6px 14px -8px rgb(0 0 0 / 0.55);
  animation: rng-ball 520ms cubic-bezier(0.3, 1.4, 0.5, 1) both;
}

@keyframes rng-ball {
  from {
    opacity: 0;
    translate: 0 -60%;
    rotate: -90deg;
    scale: 0.6;
  }
  to {
    opacity: 1;
    translate: 0 0;
    rotate: 0deg;
    scale: 1;
  }
}
</style>
