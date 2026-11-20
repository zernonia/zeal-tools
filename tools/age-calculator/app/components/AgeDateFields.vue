<script setup lang="ts">
import { daysInMonth, formatIsoDate, isValidDate, MAX_YEAR, MIN_YEAR, MONTHS, parseIsoDate } from '../../core'

/**
 * A date as three number fields — day, month, year — bound to an ISO
 * `YYYY-MM-DD` string.
 *
 * Not `<input type="date">`: that opens the operating system's own picker,
 * which looks different on every device, is a chore for a birth year fifty
 * years back, and renders the date in whatever order the browser prefers.
 * Three typed fields are quick on a keyboard, work with arrow keys, and say
 * plainly which part is which.
 *
 * Emits an empty string while the parts do not make a real date (31 April),
 * and says why underneath, so the parent never computes with a guess.
 */
const props = defineProps<{
  id: string
  legend: string
  /** Optional hint under the legend. */
  hint?: string
}>()

const model = defineModel<string>({ required: true })

const initial = parseIsoDate(model.value)
const day = ref<number | null>(initial?.day ?? null)
const month = ref<number | null>(initial?.month ?? null)
const year = ref<number | null>(initial?.year ?? null)

// Follow outside changes (a "Today" button, the URL on mount) without
// echoing our own emits back.
watch(model, (value) => {
  const date = parseIsoDate(value)
  if (!date)
    return
  day.value = date.day
  month.value = date.month
  year.value = date.year
})

const problem = computed(() => {
  if (day.value === null || month.value === null || year.value === null)
    return 'Enter a day, a month and a year.'
  if (!isValidDate({ year: year.value, month: month.value, day: day.value })) {
    const length = daysInMonth(year.value, month.value)
    return `${MONTHS[month.value - 1]} ${year.value} has only ${length} days.`
  }
  return ''
})

watch([day, month, year], () => {
  const next = problem.value ? '' : formatIsoDate({ year: year.value!, month: month.value!, day: day.value! })
  if (next !== model.value)
    model.value = next
})

const NUMBER_FORMAT = { useGrouping: false } as const
const monthName = computed(() => (month.value && month.value >= 1 && month.value <= 12 ? MONTHS[month.value - 1] : ''))
const inputClass = 'font-mono text-base'
</script>

<template>
  <fieldset :aria-describedby="problem ? `${props.id}-problem` : undefined">
    <legend class="mb-1 text-sm font-medium">
      {{ props.legend }}
    </legend>
    <p v-if="props.hint" class="mb-2 text-xs text-muted-foreground">
      {{ props.hint }}
    </p>
    <div class="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.4fr)] gap-2">
      <NumberField
        :id="`${props.id}-day`"
        :model-value="day"
        :min="1"
        :max="31"
        :format-options="NUMBER_FORMAT"
        @update:model-value="value => day = value ?? null"
      >
        <Label :for="`${props.id}-day`" class="mb-0 text-xs font-normal text-muted-foreground">Day</Label>
        <NumberFieldContent>
          <NumberFieldInput :class="inputClass" placeholder="DD" />
        </NumberFieldContent>
      </NumberField>
      <NumberField
        :id="`${props.id}-month`"
        :model-value="month"
        :min="1"
        :max="12"
        :format-options="NUMBER_FORMAT"
        @update:model-value="value => month = value ?? null"
      >
        <Label :for="`${props.id}-month`" class="mb-0 text-xs font-normal text-muted-foreground">
          Month<span v-if="monthName" class="sr-only">, {{ monthName }}</span>
        </Label>
        <NumberFieldContent>
          <NumberFieldInput :class="inputClass" placeholder="MM" />
        </NumberFieldContent>
      </NumberField>
      <NumberField
        :id="`${props.id}-year`"
        :model-value="year"
        :min="MIN_YEAR"
        :max="MAX_YEAR"
        :format-options="NUMBER_FORMAT"
        @update:model-value="value => year = value ?? null"
      >
        <Label :for="`${props.id}-year`" class="mb-0 text-xs font-normal text-muted-foreground">Year</Label>
        <NumberFieldContent>
          <NumberFieldInput :class="inputClass" placeholder="YYYY" />
        </NumberFieldContent>
      </NumberField>
    </div>
    <p class="mt-1.5 min-h-4 text-xs" :class="problem ? 'text-destructive' : 'text-muted-foreground'">
      <span v-if="problem" :id="`${props.id}-problem`">{{ problem }}</span>
      <span v-else aria-hidden="true">{{ day }} {{ monthName }} {{ year }}</span>
    </p>
  </fieldset>
</template>
