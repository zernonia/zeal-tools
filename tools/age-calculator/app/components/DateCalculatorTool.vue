<script setup lang="ts">
import { Briefcase, CalendarCheck2, CalendarClock, CalendarDays, CalendarFold, Check, Copy, Sofa, Sun } from 'lucide-vue-next'
import { addToDate, dateDifference, DateError, formatIsoDate, formatLongDate, localToday, MAX_OFFSET, parseIsoDate } from '../../core'

const { track } = useAnalytics()

const state = useToolState({
  mode: { type: 'string', default: 'between' },
  from: { type: 'string', default: '' },
  to: { type: 'string', default: '' },
  end: { type: 'boolean', default: false },
  start: { type: 'string', default: '' },
  years: { type: 'number', default: 0 },
  months: { type: 'number', default: 0 },
  weeks: { type: 'number', default: 0 },
  days: { type: 'number', default: 30 },
  subtract: { type: 'boolean', default: false },
  business: { type: 'boolean', default: false },
} as const)

const today = useAgeToday(() => formatIsoDate(localToday(new Date())))
// The example on load: from today to the last day of this year.
const yearEnd = computed(() => `${today.value.slice(0, 4)}-12-31`)

const fromInput = useAgeDateInput(() => state.from, value => state.from = value, today)
const toInput = useAgeDateInput(() => state.to, value => state.to = value, yearEnd)
const startInput = useAgeDateInput(() => state.start, value => state.start = value, today)

const n = (value: number) => value.toLocaleString('en-GB')
const plural = (value: number, unit: string) => `${n(value)} ${unit}${value === 1 ? '' : 's'}`
const long = (iso: string) => formatLongDate(parseIsoDate(iso)!)
const message = (cause: unknown) => (cause instanceof DateError ? cause.message : 'Those dates could not be worked out.')

const difference = computed(() => {
  const a = parseIsoDate(fromInput.value)
  const b = parseIsoDate(toInput.value)
  if (!a || !b)
    return { error: 'Finish both dates to see the difference.', soft: true } as const
  try {
    return { result: dateDifference(a, b, { includeEnd: state.end }) } as const
  }
  catch (cause) {
    return { error: message(cause), soft: false } as const
  }
})

const added = computed(() => {
  const start = parseIsoDate(startInput.value)
  if (!start)
    return { error: 'Finish the start date to see the result.', soft: true } as const
  try {
    return {
      result: addToDate(
        start,
        { years: state.years, months: state.months, weeks: state.weeks, days: state.days },
        { subtract: state.subtract, businessDays: state.business },
      ),
    } as const
  }
  catch (cause) {
    return { error: message(cause), soft: false } as const
  }
})

const diff = computed(() => ('result' in difference.value ? difference.value.result : null))
const sum = computed(() => ('result' in added.value ? added.value.result : null))

const diffHeadline = computed(() => {
  const d = diff.value
  if (!d)
    return ''
  const parts = [
    d.years ? plural(d.years, 'year') : '',
    d.months ? plural(d.months, 'month') : '',
    d.days || (!d.years && !d.months) ? plural(d.days, 'day') : '',
  ].filter(Boolean)
  return parts.length > 1 ? `${parts.slice(0, -1).join(', ')} and ${parts.at(-1)}` : parts[0]!
})

const diffTiles = computed(() => {
  const d = diff.value
  if (!d)
    return []
  return [
    { icon: Sun, label: 'Total days', value: n(d.totalDays), note: d.includeEnd ? 'end date included' : 'end date not counted' },
    { icon: CalendarDays, label: 'Weeks', value: n(d.weeks), note: d.remainderDays ? `and ${plural(d.remainderDays, 'day')}` : 'exactly' },
    { icon: Briefcase, label: 'Business days', value: n(d.businessDays), note: 'Monday to Friday' },
  ]
})

/** Years, months and days as separate figures, leaving out leading zeros. */
const diffParts = computed(() => {
  const d = diff.value
  if (!d)
    return []
  const all = [
    { value: d.years, unit: d.years === 1 ? 'year' : 'years' },
    { value: d.months, unit: d.months === 1 ? 'month' : 'months' },
    { value: d.days, unit: d.days === 1 ? 'day' : 'days' },
  ]
  const first = all.findIndex(part => part.value > 0)
  return first === -1 ? all.slice(2) : all.slice(first)
})

/** Share of the span that falls on working days versus weekends. */
const workShare = computed(() => {
  const d = diff.value
  return d && d.totalDays ? d.businessDays / d.totalDays : 0
})

const sumDate = computed(() => (sum.value ? parseIsoDate(sum.value.date)! : null))
const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const offsetLabel = computed(() => {
  const parts = [
    state.years ? plural(state.years, 'year') : '',
    state.months ? plural(state.months, 'month') : '',
    state.weeks ? plural(state.weeks, 'week') : '',
    state.days ? plural(state.days, state.business ? 'working day' : 'day') : '',
  ].filter(Boolean)
  return parts.length ? parts.join(', ') : 'nothing'
})

const summary = computed(() => {
  if (state.mode === 'add') {
    const s = sum.value
    return s ? `${long(s.start)} ${state.subtract ? 'minus' : 'plus'} ${offsetLabel.value} is ${long(s.date)}.` : ''
  }
  const d = diff.value
  if (!d)
    return ''
  return `From ${long(d.from)} to ${long(d.to)}${d.includeEnd ? ', end date included' : ''}: ${diffHeadline.value}. `
    + `${plural(d.totalDays, 'day')} in total, or ${plural(d.weeks, 'week')} and ${plural(d.remainderDays, 'day')}; `
    + `${plural(d.businessDays, 'business day')} (Monday to Friday).`
})

const announcement = computed(() => {
  const current = state.mode === 'add' ? added.value : difference.value
  if ('error' in current)
    return current.soft ? '' : current.error
  return summary.value
})

const copied = ref(false)
async function copy() {
  if (!summary.value)
    return
  await navigator.clipboard.writeText(summary.value)
  copied.value = true
  setTimeout(() => copied.value = false, 1600)
  track('tool_completed', { tool: 'age-calculator', format: state.mode === 'add' ? 'date-add' : 'date-difference' })
}

const UNITS = [
  { key: 'years', label: 'Years' },
  { key: 'months', label: 'Months' },
  { key: 'weeks', label: 'Weeks' },
  { key: 'days', label: 'Days' },
] as const
const NUMBER_FORMAT = { useGrouping: false } as const

const sectionClass = 'space-y-5 rounded-2xl border border-border p-5 sm:p-6'
const tileClass = 'flex items-start gap-3 rounded-xl border border-border p-4'
</script>

<template>
  <div class="tool-frame space-y-5">
    <Tabs :model-value="state.mode" @update:model-value="value => state.mode = String(value)">
      <TabsList aria-label="Calculation" class="grid w-full grid-cols-2">
        <TabsTrigger value="between" class="min-h-11">
          Between two dates
        </TabsTrigger>
        <TabsTrigger value="add" class="min-h-11">
          Add or subtract
        </TabsTrigger>
      </TabsList>

      <TabsContent value="between" class="mt-5 space-y-5">
        <section :class="sectionClass" aria-label="Dates to compare">
          <div class="grid gap-x-8 gap-y-5 sm:grid-cols-2">
            <AgeDateFields id="date-from" v-model="fromInput" legend="From" :icon="CalendarClock" />
            <AgeDateFields id="date-to" v-model="toInput" legend="To" :icon="CalendarCheck2" />
          </div>
          <div class="flex min-h-11 items-center gap-2">
            <Checkbox id="date-include-end" v-model="state.end" />
            <Label for="date-include-end" class="mb-0 text-sm font-normal text-foreground">Include the end date (count both days)</Label>
          </div>
        </section>

        <section :class="sectionClass" aria-label="Difference">
          <template v-if="diff">
            <div>
              <p class="text-sm text-muted-foreground">
                {{ diff.fromWeekday }} to {{ diff.toWeekday }}
              </p>
              <p class="sr-only">
                {{ diffHeadline }}
              </p>
              <p class="mt-3 flex flex-wrap items-end gap-x-6 gap-y-3" aria-hidden="true">
                <span v-for="part in diffParts" :key="part.unit" class="flex flex-col">
                  <span class="text-5xl font-semibold leading-none tracking-tight sm:text-6xl">{{ n(part.value) }}</span>
                  <span class="mt-1.5 text-sm text-muted-foreground">{{ part.unit }}</span>
                </span>
              </p>
              <p v-if="diff.reversed" class="mt-3 text-sm text-muted-foreground">
                The second date is the earlier one, so this counts from {{ long(diff.from) }}.
              </p>
            </div>

            <!-- The span as a bar: working days against weekends. -->
            <div v-if="diff.totalDays" class="rounded-xl bg-muted/50 p-4">
              <div class="flex items-center justify-between gap-4 text-xs text-muted-foreground">
                <span class="truncate">{{ long(diff.from) }}</span>
                <span class="truncate text-right">{{ long(diff.to) }}</span>
              </div>
              <div class="mt-2 flex h-3 overflow-hidden rounded-full bg-border" aria-hidden="true">
                <div class="h-full bg-primary transition-[width] duration-500" :style="{ width: `${workShare * 100}%` }" />
              </div>
              <div class="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs">
                <span class="flex items-center gap-1.5">
                  <span class="size-2.5 rounded-full bg-primary" aria-hidden="true" />
                  <Briefcase class="size-3.5 text-muted-foreground" aria-hidden="true" />
                  {{ plural(diff.businessDays, 'working day') }}
                </span>
                <span class="flex items-center gap-1.5">
                  <span class="size-2.5 rounded-full bg-border" aria-hidden="true" />
                  <Sofa class="size-3.5 text-muted-foreground" aria-hidden="true" />
                  {{ plural(diff.totalDays - diff.businessDays, 'weekend day') }}
                </span>
              </div>
            </div>

            <dl class="grid gap-3 sm:grid-cols-3">
              <div v-for="tile in diffTiles" :key="tile.label" :class="tileClass">
                <span class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary" aria-hidden="true">
                  <component :is="tile.icon" class="size-4" />
                </span>
                <div class="min-w-0">
                  <dt class="text-xs text-muted-foreground">
                    {{ tile.label }}
                  </dt>
                  <dd class="mt-0.5 text-lg font-semibold leading-tight tabular-nums">
                    {{ tile.value }}
                  </dd>
                  <dd class="text-xs text-muted-foreground">
                    {{ tile.note }}
                  </dd>
                </div>
              </div>
            </dl>
            <p class="text-xs text-muted-foreground">
              Business days count Monday to Friday and nothing else — public holidays differ by country and
              region, so none are taken off.
            </p>
          </template>
          <p
            v-else
            class="py-8 text-center text-sm"
            :class="'error' in difference && !difference.soft ? 'text-destructive' : 'text-muted-foreground'"
          >
            {{ 'error' in difference ? difference.error : '' }}
          </p>
        </section>
      </TabsContent>

      <TabsContent value="add" class="mt-5 space-y-5">
        <section :class="sectionClass" aria-label="Start date and amount">
          <AgeDateFields id="date-start" v-model="startInput" legend="Start date" :icon="CalendarClock" class="sm:max-w-md" />

          <div role="group" aria-label="Direction" class="grid grid-cols-2 gap-2 sm:max-w-xs">
            <Button
              :variant="state.subtract ? 'outline' : 'default'"
              class="min-h-11"
              :aria-pressed="!state.subtract"
              @click="state.subtract = false"
            >
              Add
            </Button>
            <Button
              :variant="state.subtract ? 'default' : 'outline'"
              class="min-h-11"
              :aria-pressed="state.subtract"
              @click="state.subtract = true"
            >
              Subtract
            </Button>
          </div>

          <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <NumberField
              v-for="unit in UNITS"
              :id="`date-${unit.key}`"
              :key="unit.key"
              :model-value="state[unit.key]"
              :min="0"
              :max="MAX_OFFSET"
              :format-options="NUMBER_FORMAT"
              @update:model-value="value => state[unit.key] = value ?? 0"
            >
              <Label :for="`date-${unit.key}`" class="mb-0 text-xs font-normal text-muted-foreground">
                {{ unit.key === 'days' && state.business ? 'Working days' : unit.label }}
              </Label>
              <NumberFieldContent>
                <NumberFieldDecrement />
                <NumberFieldInput class="font-mono text-base" />
                <NumberFieldIncrement />
              </NumberFieldContent>
            </NumberField>
          </div>

          <div class="flex min-h-11 items-center gap-2">
            <Checkbox id="date-business" v-model="state.business" />
            <Label for="date-business" class="mb-0 text-sm font-normal text-foreground">Count days as working days (Monday to Friday)</Label>
          </div>
        </section>

        <section :class="sectionClass" aria-label="Resulting date">
          <template v-if="sum && sumDate">
            <div class="flex flex-col gap-5 sm:flex-row sm:items-center">
              <!-- A tear-off calendar page for the answer. -->
              <div class="w-32 shrink-0 overflow-hidden rounded-2xl border border-border bg-card text-center shadow-sm" aria-hidden="true">
                <div class="bg-primary py-1.5 text-xs font-semibold uppercase tracking-widest text-primary-foreground">
                  {{ MONTH_SHORT[sumDate.month - 1] }} {{ sumDate.year }}
                </div>
                <div class="pb-2 pt-1">
                  <div class="text-5xl font-semibold leading-tight tabular-nums">
                    {{ sumDate.day }}
                  </div>
                  <div class="text-xs text-muted-foreground">
                    {{ sum.weekday }}
                  </div>
                </div>
              </div>
              <div class="min-w-0">
                <p class="text-sm text-muted-foreground">
                  {{ long(sum.start) }} {{ state.subtract ? 'minus' : 'plus' }} {{ offsetLabel }}
                </p>
                <p class="mt-1 text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
                  {{ long(sum.date) }}
                </p>
                <p class="mt-3 inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-sm text-muted-foreground">
                  <CalendarFold class="size-3.5" aria-hidden="true" />
                  <template v-if="sum.dayDelta === 0">
                    The same day
                  </template>
                  <template v-else>
                    {{ plural(Math.abs(sum.dayDelta), 'calendar day') }} {{ sum.dayDelta > 0 ? 'later' : 'earlier' }}
                  </template>
                </p>
              </div>
            </div>
          </template>
          <p
            v-else
            class="py-8 text-center text-sm"
            :class="'error' in added && !added.soft ? 'text-destructive' : 'text-muted-foreground'"
          >
            {{ 'error' in added ? added.error : '' }}
          </p>
        </section>
      </TabsContent>
    </Tabs>

    <!-- The copy area. Nothing else ever goes here. -->
    <Button size="lg" class="min-h-11 w-full" :disabled="!summary" @click="copy()">
      <component :is="copied ? Check : Copy" class="size-4" />
      {{ copied ? 'Copied' : 'Copy the result' }}
    </Button>

    <div class="rounded-2xl border border-border p-5">
      <ShareBar tool="age-calculator" share-copy="Free date calculator — days between two dates, business days, and adding or subtracting days, weeks and months." />
    </div>

    <p aria-live="polite" class="sr-only">
      {{ announcement }}
    </p>
  </div>
</template>
