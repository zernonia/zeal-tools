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

const sectionClass = 'space-y-4 rounded-2xl border border-border p-5'
</script>

<template>
  <div class="space-y-5">
    <section :class="sectionClass" aria-label="Result">
      <div
        class="grid min-h-40 place-items-center rounded-xl bg-muted/50 p-4 text-center dark:bg-input/30"
        :class="single ? '' : 'max-h-80 overflow-y-auto'"
        :tabindex="single ? undefined : 0"
        :aria-label="single ? undefined : 'Generated numbers'"
        :role="single ? undefined : 'region'"
      >
        <p v-if="error" class="text-sm text-destructive" role="alert">
          {{ error }}
        </p>
        <p v-else-if="!result" class="font-mono text-7xl font-semibold text-muted-foreground" aria-hidden="true">
          –
        </p>
        <p
          v-else-if="single"
          :key="draws"
          class="rng-pop font-mono font-semibold tabular-nums break-all"
          :class="result.formatted[0]!.length > 10 ? 'text-4xl sm:text-5xl' : 'text-7xl sm:text-8xl'"
        >
          {{ result.formatted[0] }}
        </p>
        <ol v-else :key="draws" class="rng-pop flex flex-wrap justify-center gap-2">
          <li
            v-for="(value, index) in result.formatted"
            :key="index"
            class="min-w-12 rounded-lg border border-border bg-card px-3 py-2 font-mono text-lg font-semibold tabular-nums"
          >
            {{ value }}
          </li>
        </ol>
      </div>

      <p v-if="result && !error" class="text-center text-xs text-muted-foreground">
        {{ state.unique ? 'No repeats · ' : '' }}Each of the {{ result.possible.toLocaleString('en') }} possible values was equally likely.
      </p>

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

    <section :class="sectionClass" aria-label="Range and options">
      <div class="flex flex-wrap gap-2" role="group" aria-label="Common ranges">
        <Button
          v-for="preset in PRESETS"
          :key="preset.label"
          variant="outline"
          size="sm"
          class="min-h-11 px-4 text-sm"
          @click="applyPreset(preset)"
        >
          {{ preset.label }}
        </Button>
      </div>

      <div class="grid gap-4 sm:grid-cols-2">
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
      </div>

      <div class="grid gap-4 border-t border-border pt-4 sm:grid-cols-2 sm:items-end">
        <div class="flex min-h-11 items-center gap-2">
          <Checkbox id="rng-unique" v-model="state.unique" />
          <Label for="rng-unique" class="mb-0">No repeats</Label>
        </div>
        <div>
          <Label for="rng-sort">Order</Label>
          <Select v-model="sort">
            <SelectTrigger id="rng-sort" class="w-full" />
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
.rng-pop {
  animation: rng-pop 220ms ease-out;
}

@keyframes rng-pop {
  from {
    opacity: 0.2;
    scale: 0.92;
  }
  to {
    opacity: 1;
    scale: 1;
  }
}
</style>
