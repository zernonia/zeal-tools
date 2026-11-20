<script setup lang="ts">
import { Check, Copy } from 'lucide-vue-next'
import { calculateAge, DateError, formatIsoDate, formatLongDate, localToday, parseIsoDate } from '../../core'

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
    { label: 'Months', value: n(a.totalMonths), note: a.days ? `and ${plural(a.days, 'day')}` : 'exactly' },
    { label: 'Weeks', value: n(a.totalWeeks), note: a.remainderDays ? `and ${plural(a.remainderDays, 'day')}` : 'exactly' },
    { label: 'Days', value: n(a.totalDays), note: 'calendar days' },
    { label: 'Hours', value: n(a.totalHours), note: 'at 24 a day' },
  ]
})

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

const sectionClass = 'space-y-4 rounded-2xl border border-border p-5'
</script>

<template>
  <div class="tool-frame space-y-5">
    <section :class="sectionClass" aria-label="Dates">
      <div class="grid gap-5 sm:grid-cols-2">
        <AgeDateFields id="age-birth" v-model="state.birth" legend="Date of birth" />
        <div>
          <AgeDateFields
            id="age-on"
            v-model="onInput"
            legend="Age on"
            :hint="isToday ? 'Today — change it to see an age on another day.' : undefined"
          />
          <Button v-if="!isToday" variant="outline" size="sm" class="min-h-11" @click="useToday()">
            Back to today
          </Button>
        </div>
      </div>
    </section>

    <section :class="sectionClass" aria-label="Age">
      <template v-if="age">
        <div>
          <p class="text-sm text-muted-foreground">
            {{ isToday ? 'Age today' : `Age on ${long(age.on, false)}` }}
          </p>
          <p class="mt-1 text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
            {{ headline }}
          </p>
          <p class="mt-2 text-sm text-muted-foreground">
            Born on a <strong class="font-medium text-foreground">{{ age.bornOn }}</strong>.
            <template v-if="age.leapDayBirthday">
              A leap-day birthday: in years without a 29 February it is counted on 28 February.
            </template>
          </p>
        </div>

        <dl class="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div v-for="tile in tiles" :key="tile.label" class="rounded-xl border border-border p-3">
            <dt class="text-xs text-muted-foreground">
              {{ tile.label }}
            </dt>
            <dd class="mt-0.5 font-mono text-lg font-semibold tabular-nums break-all">
              {{ tile.value }}
            </dd>
            <dd class="text-xs text-muted-foreground">
              {{ tile.note }}
            </dd>
          </div>
        </dl>

        <div class="rounded-xl border border-border p-4">
          <p v-if="age.isBirthday" class="font-medium">
            Happy birthday — {{ age.years }} {{ isToday ? 'today' : 'on this day' }}.
          </p>
          <p class="text-sm" :class="age.isBirthday ? 'mt-1 text-muted-foreground' : ''">
            {{ age.isBirthday ? 'The one after' : 'Next birthday' }}:
            <strong class="font-medium">{{ long(age.nextBirthday.date) }}</strong>
            — in {{ plural(age.nextBirthday.daysUntil, 'day') }}, turning {{ age.nextBirthday.turning }}.
          </p>
          <p v-if="state.half" class="mt-1 text-sm text-muted-foreground">
            Next half-birthday: <strong class="font-medium text-foreground">{{ long(age.nextHalfBirthday.date) }}</strong>
            — in {{ plural(age.nextHalfBirthday.daysUntil, 'day') }}.
          </p>
          <div class="mt-2 flex min-h-11 items-center gap-2">
            <Checkbox id="age-half" v-model="state.half" />
            <Label for="age-half" class="mb-0 text-sm font-normal text-foreground">Show the half-birthday too</Label>
          </div>
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
