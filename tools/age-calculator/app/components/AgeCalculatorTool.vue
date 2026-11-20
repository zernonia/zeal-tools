<script setup lang="ts">
import { Cake, CalendarCheck, CalendarDays, CalendarRange, Check, Clock, Copy, PartyPopper, Sun } from 'lucide-vue-next'
import { addYears, calculateAge, DateError, formatIsoDate, formatLongDate, localToday, parseIsoDate, toDayNumber, WEEKDAYS } from '../../core'

const { track } = useAnalytics()

/**
 * The date of birth is in the URL on purpose: a link that opens on your own
 * age is the useful thing to bookmark. "Age on" is only written when it is not
 * today, so an old link keeps measuring up to the day it is opened.
 */
const state = useToolState({
  birth: { type: 'string', default: '1990-06-15' },
  on: { type: 'string', default: '' },
  half: { type: 'boolean', default: false },
} as const)

const today = useAgeToday(() => formatIsoDate(localToday(new Date())))
const onInput = useAgeDateInput(() => state.on, value => state.on = value, today)

let interactive = false
onMounted(() => nextTick(() => interactive = true))

function useToday() {
  state.on = ''
  onInput.value = today.value
}

const outcome = computed(() => {
  const birth = parseIsoDate(state.birth)
  const on = parseIsoDate(onInput.value)
  if (!birth || !on)
    return { error: 'Finish the dates above to see the age.', soft: true } as const
  try {
    return { age: calculateAge(birth, on) } as const
  }
  catch (cause) {
    return { error: cause instanceof DateError ? cause.message : 'Those dates could not be compared.', soft: false } as const
  }
})

const age = computed(() => ('age' in outcome.value ? outcome.value.age : null))
const isToday = computed(() => onInput.value === today.value)

let tracked = false
watch(() => state.birth, () => {
  if (!interactive || tracked || !age.value)
    return
  tracked = true
  track('tool_completed', { tool: 'age-calculator', format: 'age' })
})

const n = (value: number) => value.toLocaleString('en-GB')
const plural = (value: number, unit: string) => `${n(value)} ${unit}${value === 1 ? '' : 's'}`
const long = (iso: string, withWeekday = true) => formatLongDate(parseIsoDate(iso)!, withWeekday)

const headline = computed(() => {
  const a = age.value
  return a ? `${plural(a.years, 'year')}, ${plural(a.months, 'month')} and ${plural(a.days, 'day')}` : ''
})

const tiles = computed(() => {
  const a = age.value
  if (!a)
    return []
  return [
    { icon: CalendarRange, label: 'Months', value: n(a.totalMonths), note: a.days ? `and ${plural(a.days, 'day')}` : 'exactly' },
    { icon: CalendarDays, label: 'Weeks', value: n(a.totalWeeks), note: a.remainderDays ? `and ${plural(a.remainderDays, 'day')}` : 'exactly' },
    { icon: Sun, label: 'Days', value: n(a.totalDays), note: 'calendar days' },
    { icon: Clock, label: 'Hours', value: n(a.totalHours), note: 'at 24 a day' },
  ]
})

/** Years, months and days as three big figures rather than one sentence. */
const parts = computed(() => {
  const a = age.value
  if (!a)
    return []
  return [
    { value: a.years, unit: a.years === 1 ? 'year' : 'years' },
    { value: a.months, unit: a.months === 1 ? 'month' : 'months' },
    { value: a.days, unit: a.days === 1 ? 'day' : 'days' },
  ]
})

/**
 * How far through the current year of life — last birthday to next — the
 * chosen day is. Drawn as the ring around the countdown.
 */
const yearProgress = computed(() => {
  const a = age.value
  if (!a)
    return 0
  const last = toDayNumber(addYears(parseIsoDate(a.birth)!, a.years))
  const next = toDayNumber(parseIsoDate(a.nextBirthday.date)!)
  const on = toDayNumber(parseIsoDate(a.on)!)
  return next > last ? (on - last) / (next - last) : 0
})

const RING = 2 * Math.PI * 52
const ringOffset = computed(() => RING * (1 - yearProgress.value))

/** Monday-first, as calendars here are printed. */
const WEEK = [1, 2, 3, 4, 5, 6, 0].map(index => WEEKDAYS[index]!)

const summary = computed(() => {
  const a = age.value
  if (!a)
    return ''
  const when = isToday.value ? 'today' : `on ${long(a.on, false)}`
  const lines = [
    `Age ${when}: ${headline.value} (${plural(a.totalDays, 'day')}).`,
    `Born on a ${a.bornOn}, ${long(a.birth, false)}.`,
    a.isBirthday
      ? `It is their ${a.years}${ordinal(a.years)} birthday.`
      : `Next birthday: ${long(a.nextBirthday.date)}, in ${plural(a.nextBirthday.daysUntil, 'day')} (turning ${a.nextBirthday.turning}).`,
  ]
  if (state.half)
    lines.push(`Next half-birthday: ${long(a.nextHalfBirthday.date)}, in ${plural(a.nextHalfBirthday.daysUntil, 'day')}.`)
  return lines.join('\n')
})

function ordinal(value: number) {
  const tens = value % 100
  if (tens >= 11 && tens <= 13)
    return 'th'
  return ['th', 'st', 'nd', 'rd'][value % 10] ?? 'th'
}

const copied = ref(false)
async function copy() {
  if (!summary.value)
    return
  await navigator.clipboard.writeText(summary.value)
  copied.value = true
  setTimeout(() => copied.value = false, 1600)
  track('tool_completed', { tool: 'age-calculator', format: 'clipboard' })
}

const announcement = computed(() => {
  if ('error' in outcome.value)
    return outcome.value.soft ? '' : outcome.value.error
  const a = age.value!
  return `${headline.value}. Next birthday in ${plural(a.nextBirthday.daysUntil, 'day')}.`
})

const sectionClass = 'space-y-5 rounded-2xl border border-border p-5 sm:p-6'
</script>

<template>
  <div class="tool-frame space-y-5">
    <section :class="sectionClass" aria-label="Dates">
      <div class="grid gap-x-8 gap-y-5 sm:grid-cols-2">
        <AgeDateFields id="age-birth" v-model="state.birth" legend="Date of birth" :icon="Cake" />
        <AgeDateFields id="age-on" v-model="onInput" legend="Age on" :icon="CalendarCheck">
          <template #action>
            <span v-if="isToday" class="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
              Today
            </span>
            <Button v-else variant="outline" size="sm" class="min-h-11" @click="useToday()">
              Back to today
            </Button>
          </template>
        </AgeDateFields>
      </div>
    </section>

    <section :class="sectionClass" aria-label="Age">
      <template v-if="age">
        <div class="grid items-center gap-6 md:grid-cols-[minmax(0,1fr)_auto]">
          <div class="min-w-0">
            <p class="text-sm text-muted-foreground">
              {{ isToday ? 'Age today' : `Age on ${long(age.on, false)}` }}
            </p>
            <p class="sr-only">
              {{ headline }}
            </p>
            <p class="mt-3 flex flex-wrap items-end gap-x-6 gap-y-3" aria-hidden="true">
              <span v-for="part in parts" :key="part.unit" class="flex flex-col">
                <span class="text-5xl font-semibold leading-none tracking-tight sm:text-6xl">{{ n(part.value) }}</span>
                <span class="mt-1.5 text-sm text-muted-foreground">{{ part.unit }}</span>
              </span>
            </p>

            <div class="mt-6">
              <p class="text-xs text-muted-foreground">
                Born on a <strong class="font-medium text-foreground">{{ age.bornOn }}</strong>
              </p>
              <ol class="mt-2 flex gap-1.5" aria-hidden="true">
                <li
                  v-for="day in WEEK"
                  :key="day"
                  class="flex h-8 w-9 items-center justify-center rounded-md text-xs font-medium"
                  :class="day === age.bornOn ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'"
                >
                  {{ day.slice(0, 2) }}
                </li>
              </ol>
              <p v-if="age.leapDayBirthday" class="mt-2 text-xs text-muted-foreground">
                A leap-day birthday: in years without a 29 February it is counted on 28 February.
              </p>
            </div>
          </div>

          <!-- The countdown: the ring fills as the year of life goes by. -->
          <div class="flex items-center gap-5 rounded-2xl bg-muted/50 p-5 md:flex-col md:gap-3 md:text-center">
            <div class="relative size-32 shrink-0">
              <svg viewBox="0 0 120 120" class="size-full -rotate-90" aria-hidden="true">
                <circle cx="60" cy="60" r="52" fill="none" stroke-width="10" class="stroke-border" />
                <circle
                  cx="60" cy="60" r="52" fill="none" stroke-width="10" stroke-linecap="round"
                  class="stroke-primary transition-[stroke-dashoffset] duration-700"
                  :stroke-dasharray="RING"
                  :stroke-dashoffset="ringOffset"
                />
              </svg>
              <div class="absolute inset-0 flex flex-col items-center justify-center">
                <template v-if="age.isBirthday">
                  <PartyPopper class="size-8 text-primary" aria-hidden="true" />
                  <span class="mt-1 text-xs font-medium">Birthday!</span>
                </template>
                <template v-else>
                  <span class="text-3xl font-semibold leading-none tabular-nums">{{ n(age.nextBirthday.daysUntil) }}</span>
                  <span class="mt-1 text-xs text-muted-foreground">{{ age.nextBirthday.daysUntil === 1 ? 'day to go' : 'days to go' }}</span>
                </template>
              </div>
            </div>
            <div class="min-w-0 text-sm">
              <p v-if="age.isBirthday" class="font-medium">
                Happy birthday — {{ age.years }} {{ isToday ? 'today' : 'on this day' }}
              </p>
              <p :class="age.isBirthday ? 'mt-1 text-muted-foreground' : 'font-medium'">
                {{ age.isBirthday ? 'Next' : 'Turning' }} {{ age.nextBirthday.turning }}
              </p>
              <p class="mt-0.5 text-muted-foreground">
                {{ long(age.nextBirthday.date) }}
              </p>
            </div>
          </div>
        </div>

        <dl class="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div v-for="tile in tiles" :key="tile.label" class="flex flex-col items-start gap-3 rounded-xl border border-border p-4 sm:flex-row">
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

        <div class="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-xl border border-border px-4 py-2">
          <div class="flex min-h-11 items-center gap-2">
            <Checkbox id="age-half" v-model="state.half" />
            <Label for="age-half" class="mb-0 text-sm font-normal text-foreground">Show the half-birthday</Label>
          </div>
          <p v-if="state.half" class="text-sm text-muted-foreground">
            <strong class="font-medium text-foreground">{{ long(age.nextHalfBirthday.date) }}</strong>
            · in {{ plural(age.nextHalfBirthday.daysUntil, 'day') }}
          </p>
        </div>

        <!-- The copy area. Nothing else ever goes here. -->
        <Button size="lg" class="min-h-11 w-full" @click="copy()">
          <component :is="copied ? Check : Copy" class="size-4" />
          {{ copied ? 'Copied' : 'Copy the result' }}
        </Button>
      </template>

      <p
        v-else
        class="py-8 text-center text-sm"
        :class="'error' in outcome && !outcome.soft ? 'text-destructive' : 'text-muted-foreground'"
      >
        {{ 'error' in outcome ? outcome.error : '' }}
      </p>
    </section>

    <div class="rounded-2xl border border-border p-5">
      <ShareBar tool="age-calculator" share-copy="Free age calculator — your exact age in years, months and days, and the countdown to your next birthday." />
    </div>

    <p aria-live="polite" class="sr-only">
      {{ announcement }}
    </p>
  </div>
</template>
