<script setup lang="ts">
import type { Component } from 'vue'
import { daysInMonth, formatIsoDate, isValidDate, MAX_YEAR, MIN_YEAR, MONTHS, parseIsoDate, weekdayName } from '../../core'

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
  /** A lucide icon drawn in a chip beside the legend. */
  icon?: Component
}>()

/*
 * The header row has a fixed height whatever sits in the `action` slot (a
 * "Today" badge, a "Back to today" button, nothing), so two of these side by
 * side always start their fields on the same line.
 */

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
const weekday = computed(() => {
  if (problem.value)
    return ''
  return weekdayName({ year: year.value!, month: month.value!, day: day.value! })
})
const monthName = computed(() => (month.value && month.value >= 1 && month.value <= 12 ? MONTHS[month.value - 1] : ''))
const inputClass = 'font-mono text-base tabular-nums'
</script>

<template>
  <fieldset class="relative min-w-0" :aria-describedby="problem ? `${props.id}-problem` : undefined">
    <legend class="float-left mb-3 flex h-11 w-full items-center gap-2.5 pr-36 text-sm font-medium">
      <span v-if="props.icon" class="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary" aria-hidden="true">
        <component :is="props.icon" class="size-4" />
      </span>
      {{ props.legend }}
    </legend>
    <div class="absolute right-0 top-0 flex h-11 items-center">
      <slot name="action" />
    </div>
    <div class="clear-left grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.4fr)] gap-2">
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
    <p class="mt-2 flex min-h-5 items-center gap-1.5 text-xs" :class="problem ? 'text-destructive' : 'text-muted-foreground'">
      <span v-if="problem" :id="`${props.id}-problem`">{{ problem }}</span>
      <span v-else aria-hidden="true"><span class="font-medium text-foreground">{{ weekday }}</span> · {{ day }} {{ monthName }} {{ year }}</span>
    </p>
  </fieldset>
</template>
