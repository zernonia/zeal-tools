<script setup lang="ts">
import meta from '../../../../meta'

const { public: { siteUrl } } = useRuntimeConfig()
const pageUrl = `${siteUrl}/tools/${meta.slug}/date-calculator`

useSeoMeta({
  title: 'Date Calculator — Days Between Dates, Business Days, Add Days',
  description: 'Count the days, weeks and business days between two dates, or add and subtract days, weeks, months and years from a date. Calendar arithmetic, free, no sign-up.',
  ogTitle: 'Date Calculator — days between dates, and adding to them',
  ogDescription: 'Days, weeks and business days between two dates, or a date plus or minus any number of days, weeks, months and years.',
  ogUrl: pageUrl,
  twitterCard: 'summary_large_image',
})

defineOgImage('Default', { title: 'Date Calculator', description: 'Days between dates, business days, and adding or subtracting from a date.' })

const howToSteps = [
  { title: 'Choose what to work out', body: '"Between two dates" counts the span from one date to another. "Add or subtract" starts from a date and moves forwards or backwards by the amount you give it.' },
  { title: 'Enter the dates', body: 'Each date is a day, a month and a year in their own boxes. The difference opens on today to the end of this year, and adding opens on today plus 30 days, so there is an answer on screen before you type anything.' },
  { title: 'Set the options', body: 'Tick "Include the end date" when both days should count, as in "1 to 5 March is five days". When adding, tick "working days" to count Monday to Friday only.' },
]

useToolJsonLd(meta, {
  variant: 'date-calculator',
  name: 'Date Calculator',
  description: 'Days, weeks and business days between two dates, and adding or subtracting days, weeks, months and years from a date.',
  featureList: [
    'Years, months and days between two dates',
    'Total days, and weeks and days',
    'Business days, Monday to Friday',
    'Optional "include the end date"',
    'Add or subtract years, months, weeks and days',
    'Add working days, skipping weekends',
    'End-of-month dates clamped, never rolled over',
  ],
  howTo: { name: 'How to use the date calculator', steps: howToSteps.map(s => ({ name: s.title, text: s.body })) },
})

const faq = [
  { q: 'How many days are there between two dates?', a: 'Enter both dates under "Between two dates" and read Total days. By default the count is the number of days you move forward to get from the first date to the second — Monday to Friday of the same week is 4 days. Tick "Include the end date" to count both ends, which gives 5. Which one you want depends on the question: a hotel stay counts nights and leaves the end out; a run of event days counts both.' },
  { q: 'How are business days counted?', a: 'Monday to Friday, and nothing else is taken off. Public holidays differ by country, by region and sometimes by employer, so any list built in would be wrong for most people. If your span crosses a bank holiday, subtract it yourself. The count follows the same rule as the total: the end date is only counted when you tick "Include the end date".' },
  { q: 'What do I get if I add a month to 31 January?', a: 'The last day of February — 28 February, or 29 in a leap year. When the day you start on does not exist in the month you land in, the date is clamped to that month\'s last day rather than spilling into the next. Adding two months to 31 January gives 31 March, because each step is counted from the original date and not from the clamped one.' },
  { q: 'In what order are years, months, weeks and days added?', a: 'Largest first: years and months together, then weeks, then days. The order changes some answers — in 2023, 30 January plus one month is 28 February, and one day more is 1 March; adding the day first would have reached 31 January, and the month then 28 February. Largest first is what people mean by "a month and a day from now".' },
  { q: 'How does adding working days work?', a: 'Each working day is a step to the next Monday-to-Friday date, and the start date itself is never counted — the same rule as the WORKDAY function in spreadsheets. So 1 working day after a Friday is the Monday, and 5 working days after a Monday is the Monday after. Years, months and weeks are still calendar amounts; only the days field switches to working days.' },
  { q: 'What if the second date is before the first?', a: 'The calculator swaps them and tells you, rather than showing negative numbers. A span is the same length in either direction; it says plainly when it has counted from the second date.' },
  { q: 'Do time zones or clock changes affect the result?', a: 'No. Every date is a plain year, month and day turned into a whole day number, so there is no time of day for a clock change to shorten and no midnight in another zone for a date to slip across. A span that includes the night the clocks go forward is still the right number of days.' },
  { q: 'Can I use it from code?', a: 'Yes. GET /api/v1/age?from=2026-11-16&to=2026-12-25 returns the same difference as JSON, including business days; add includeEnd=true to count both ends. The MCP server offers it through the calculate_age tool with the same from and to arguments.' },
]

const contents = [
  { id: 'howto-heading', label: 'How to use it' },
  { id: 'span-heading', label: 'Counting a span' },
  { id: 'adding-heading', label: 'Adding to a date' },
  { id: 'faq-heading', label: 'Questions' },
  { id: 'promise', label: 'The Zeal Promise' },
]
</script>

<template>
  <div class="container-page py-10">
    <ToolPageHeader
      title="Date Calculator"
      description="Count the days, weeks and business days between two dates, or add and subtract days, weeks, months and years from any date."
    />

    <DateCalculatorTool />

    <section class="mt-12 flex flex-wrap gap-2 text-sm" aria-label="Related tools">
      <NuxtLink to="/tools/age-calculator" class="rounded-full border border-border px-4 py-1.5 transition-colors hover:border-primary/40 hover:text-primary">
        Age calculator →
      </NuxtLink>
      <NuxtLink to="/tools/countdown-timer" class="rounded-full border border-border px-4 py-1.5 transition-colors hover:border-primary/40 hover:text-primary">
        Countdown timer →
      </NuxtLink>
    </section>

    <ToolContents :items="contents">
      <section aria-labelledby="howto-heading" class="rounded-2xl bg-muted/50 p-6 sm:p-8">
        <h2 id="howto-heading" class="text-xl font-semibold">
          How to use the date calculator
        </h2>
        <ol class="mt-6">
          <li v-for="(step, index) in howToSteps" :key="step.title" class="relative flex gap-4 pb-8 last:pb-0">
            <span
              v-if="index < howToSteps.length - 1"
              class="absolute bottom-0 left-4 top-9 w-px -translate-x-1/2 bg-border"
              aria-hidden="true"
            />
            <span class="relative grid size-8 shrink-0 place-items-center rounded-full border border-border bg-card text-sm font-semibold">
              {{ index + 1 }}
            </span>
            <div class="pt-1">
              <h3 class="font-medium">
                {{ step.title }}
              </h3>
              <p class="mt-1 text-sm leading-relaxed text-muted-foreground">
                {{ step.body }}
              </p>
            </div>
          </li>
        </ol>
      </section>

      <section aria-labelledby="span-heading" class="rounded-2xl bg-muted/50 p-6 sm:p-8">
        <h2 id="span-heading" class="text-xl font-semibold">
          Counting the days between two dates
        </h2>
        <div class="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground">
          <p>
            The question "how many days between" has two honest answers, and most arguments about it are
            people giving different ones. Counting the steps from one date to the next — the gap — gives
            one less than counting the days themselves. From Monday to Friday is four steps and five days.
            This calculator gives the gap by default, because that is what "days until" and "days since"
            mean, and the "Include the end date" box switches to counting both ends. Both figures stay
            consistent with each other: the total, the weeks and the business days all move together.
          </p>
          <p>
            <strong class="text-foreground">Years, months and days</strong> are counted the calendar way.
            Whole months first, each ending on the same day of a later month, then the days left over —
            so 16 November to 25 December is 1 month and 9 days. Where a month has no matching day, it
            ends on its last day instead, which is why 31 January to 28 February counts as exactly one
            month in a common year.
          </p>
          <p>
            <strong class="text-foreground">Business days</strong> are Monday to Friday. That is the whole
            rule, stated rather than hidden: no bank holidays, no regional days off, no company shutdowns.
            For a notice period or a delivery estimate that crosses a public holiday, take it off the
            figure yourself — a calculator that guessed your country would get it wrong for most visitors.
          </p>
          <p>
            Behind every figure is a whole day number for each date, worked out from the year, month and
            day with no clock involved. Two dates either side of the clocks changing are still the right
            number of days apart, which is not true of a calculator that subtracts timestamps and divides by
            24 hours.
          </p>
        </div>
      </section>

      <section aria-labelledby="adding-heading" class="rounded-2xl bg-muted/50 p-6 sm:p-8">
        <h2 id="adding-heading" class="text-xl font-semibold">
          Adding and subtracting days, weeks and months
        </h2>
        <div class="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground">
          <p>
            <strong class="text-foreground">Days and weeks are exact.</strong> 90 days from today is 90
            calendar days, and 6 weeks is 42. These are the figures behind deadlines, return windows,
            cooling-off periods and "due in 30 days" invoices.
          </p>
          <p>
            <strong class="text-foreground">Months and years follow the calendar.</strong> A month from 15
            March is 15 April, whichever month is in between. When the day does not exist — a month after
            31 March would be 31 April — the result is the last day of the month, 30 April. Adding a year
            to 29 February gives 28 February. Each amount is counted from the date you started on, so
            twelve months from the 31st is the 31st again, not a date that has slowly drifted down to the
            28th.
          </p>
          <p>
            <strong class="text-foreground">Working days skip weekends.</strong> Tick the box and the days
            field counts Monday to Friday only, starting from the day after the start date. Ten working
            days from a Friday is the Friday a fortnight later. This is how most notice periods,
            response-time promises and delivery estimates are written.
          </p>
          <p>
            Subtracting works the same way backwards — 90 days before a date, or 10 working days before a
            deadline to know when to start. If what you actually want is someone&rsquo;s age on a date, the
            <NuxtLink to="/tools/age-calculator" class="font-medium text-foreground underline underline-offset-4">
              age calculator
            </NuxtLink>
            does that directly, with the next birthday thrown in.
          </p>
        </div>
      </section>

      <FaqSection :items="faq" class="rounded-2xl bg-muted/50 p-6 sm:p-8" />

      <ZealPromise />
    </ToolContents>
  </div>
</template>
