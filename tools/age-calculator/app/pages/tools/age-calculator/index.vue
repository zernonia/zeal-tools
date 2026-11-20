<script setup lang="ts">
import meta from '../../../../meta'

const { public: { siteUrl } } = useRuntimeConfig()

useSeoMeta({
  title: 'Age Calculator — Exact Age in Years, Months and Days, Free',
  description: 'Work out your exact age in years, months and days from your date of birth, on today or any date. Total months, weeks, days and hours, the weekday you were born, and your next birthday. No sign-up.',
  ogTitle: 'Age Calculator — how old, exactly?',
  ogDescription: 'Exact age in years, months and days, the weekday you were born, and the countdown to your next birthday.',
  ogUrl: `${siteUrl}/tools/${meta.slug}`,
  twitterCard: 'summary_large_image',
})

defineOgImage('Default', { title: 'Age Calculator', description: meta.tagline })

const howToSteps = [
  { title: 'Enter the date of birth', body: 'Type the day, the month and the year into their own boxes — 15, 6, 1990 — or use the arrow keys to step through them. The result updates as soon as you leave a box.' },
  { title: 'Pick the day to measure on', body: 'It starts on today. Change it to see how old someone was on a particular day — a wedding, an exam, the date on a form — or will be on a day still to come.' },
  { title: 'Read or copy the result', body: 'You get the age in years, months and days, the same span as totals, the weekday of birth and the next birthday. Copy the result as text, or copy the link: the date of birth is in the address, so it opens on the same answer.' },
]

useToolJsonLd(meta, {
  description: meta.description,
  featureList: [
    'Exact age in years, months and days',
    'Age on any date, past or future',
    'Total months, weeks, days and hours',
    'The day of the week you were born',
    'Next birthday with its weekday and a day count',
    'Optional half-birthday',
    'Leap-day birthdays handled, with the convention stated',
    'Calendar arithmetic, unaffected by time zones',
  ],
  howTo: { name: 'How to calculate your exact age', steps: howToSteps.map(s => ({ name: s.title, text: s.body })) },
})

const faq = [
  { q: 'How is an exact age in years, months and days worked out?', a: 'The same way you would count it on a calendar. First the whole years since your birth date, then the whole months since your last birthday, then the days left over. Someone born on 15 June 1990 is 36 years old on 15 June 2026; on 20 November 2026 they are 36 years, 5 months and 5 days — five whole months to 15 November, and five days after that.' },
  { q: 'What happens if I was born on 29 February?', a: 'In years with no 29 February, this calculator counts your birthday on 28 February — the last day of the month you were born in. It is the most common convention and the one most software uses, but it is a convention, not a law of nature: some legal systems treat 1 March as the day a leap-day baby comes of age. If the answer matters for a legal age or a contract, check which rule applies where you are.' },
  { q: 'Why is a month sometimes 28 days and sometimes 31?', a: 'Because months are. A month is counted from a day in one month to the same day in the next, so 15 January to 15 February is one month of 31 days and 15 February to 15 March is one month of 28 or 29. When the day does not exist in the next month — 31 January has no 31 February — the month ends on the last day instead. That is why someone born on the 31st has a month-birthday on 30 April and 28 February.' },
  { q: 'Can I see how old someone was on a particular date?', a: 'Yes. Change the "Age on" date to any day after the date of birth, in the past or the future. It is useful for forms that ask for your age on a given date, for working out how old a relative was at an event, or for checking an age limit on the day it applies. "Back to today" puts it back.' },
  { q: 'Why do the total hours look so round?', a: 'They are whole calendar days multiplied by 24. The calculator does not know the time you were born, and a day with a clock change is really 23 or 25 hours, so an hour-exact figure would be precision it does not have. The total in days is exact; the hours are a fair translation of it.' },
  { q: 'Can a time zone change the answer?', a: 'Not here. The arithmetic is done on calendar dates — year, month, day — and never on timestamps, so there is no midnight in some other time zone for a date to slip across. The only time zone involved is yours, to decide what "today" is when the page opens.' },
  { q: 'What is a half-birthday?', a: 'The day six months after your birthday — a small excuse for cake, and a real date on some school calendars for children with summer birthdays. Tick "Show the half-birthday too" and it appears under your next birthday. It follows the same month-end rule as everything else, so a 31 August birthday has its half-birthday on the last day of February.' },
  { q: 'Is my date of birth sent anywhere?', a: 'No. Everything is worked out in your browser. The date of birth is written into the page address so that the link can be bookmarked or shared — if you would rather it was not, simply do not share the link. Nothing is stored on a server and there is no account.' },
  { q: 'Can I use this from a script or an AI agent?', a: 'Yes. GET /api/v1/age?birth=1990-06-15&on=2026-11-20 returns the same breakdown as JSON, and the MCP server offers it as the calculate_age tool. Leave out "on" and the server uses today in UTC, since it cannot know your time zone — pass the date to be exact.' },
]

const contents = [
  { id: 'howto-heading', label: 'How to use it' },
  { id: 'counting-heading', label: 'How the counting works' },
  { id: 'uses-heading', label: 'When an exact age matters' },
  { id: 'faq-heading', label: 'Questions' },
  { id: 'promise', label: 'The Zeal Promise' },
]
</script>

<template>
  <div class="container-page py-10">
    <ToolPageHeader
      title="Age Calculator"
      description="Your exact age in years, months and days — on today or any other date — with the weekday you were born and the countdown to your next birthday."
    />

    <AgeCalculatorTool />

    <section class="mt-12 flex flex-wrap gap-2 text-sm" aria-label="Related tools">
      <NuxtLink to="/tools/age-calculator/date-calculator" class="rounded-full border border-border px-4 py-1.5 transition-colors hover:border-primary/40 hover:text-primary">
        Date calculator →
      </NuxtLink>
      <NuxtLink to="/tools/countdown-timer" class="rounded-full border border-border px-4 py-1.5 transition-colors hover:border-primary/40 hover:text-primary">
        Countdown timer →
      </NuxtLink>
    </section>

    <ToolContents :items="contents">
      <section aria-labelledby="howto-heading" class="rounded-2xl bg-muted/50 p-6 sm:p-8">
        <h2 id="howto-heading" class="text-xl font-semibold">
          How to calculate your exact age
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

      <section aria-labelledby="counting-heading" class="rounded-2xl bg-muted/50 p-6 sm:p-8">
        <h2 id="counting-heading" class="text-xl font-semibold">
          How the counting works
        </h2>
        <div class="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground">
          <p>
            Your age in years is the easy part: the number of birthdays you have had. The months and days
            are where calculators quietly disagree, because a month is not a fixed length. This one counts
            the way a person with a wall calendar would. From your last birthday it counts whole months —
            each one ending on the same day of the following month — and then the days left over. Add those
            months and days back onto your last birthday and you land on the date you asked about, every
            time. That is checked by the tests behind this page, across thousands of random pairs of dates.
          </p>
          <p>
            <strong class="text-foreground">Month ends are clamped, not rolled over.</strong> When a month
            has no matching day — 31 January has no 31 February — the month ends on the last day that does
            exist. Some software rolls over instead, so a month after 31 January becomes 3 March. That makes
            the arithmetic tidy and the answers strange; clamping keeps a month inside the month it names.
          </p>
          <p>
            <strong class="text-foreground">Leap-day birthdays fall on 28 February.</strong> If you were
            born on 29 February, you turn a year older on 28 February in the three years out of four that
            lack a leap day, and on 29 February when it comes round. The calculator says so on screen
            whenever it applies, rather than leaving you to wonder.
          </p>
          <p>
            <strong class="text-foreground">Dates, not timestamps.</strong> Many age calculators turn both
            dates into a number of milliseconds and divide. That drags in a time of day and a time zone, and
            either can move a date by one: midnight in London is still the previous evening in New York, and
            a day with a clock change is an hour short or long. Here every date is a plain year, month and
            day, converted to a whole day number with a standard algorithm that is exact for every date in
            the Gregorian calendar. There is no clock involved, so there is nothing to shift.
          </p>
          <p>
            The totals follow from that. Total days is the exact number of calendar days between the two
            dates; weeks are those days in groups of seven; months are the whole months counted above; and
            hours are the days times 24, which is honest about not knowing what time you were born.
          </p>
        </div>
      </section>

      <section aria-labelledby="uses-heading" class="rounded-2xl bg-muted/50 p-6 sm:p-8">
        <h2 id="uses-heading" class="text-xl font-semibold">
          When an exact age matters
        </h2>
        <div class="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground">
          <p>
            <strong class="text-foreground">Forms and cut-off dates.</strong> School admissions, sports
            leagues, insurance and visa forms often ask how old someone will be on a specific date rather
            than today — "aged 11 on 1 September", say. Set "Age on" to that date and read the years.
          </p>
          <p>
            <strong class="text-foreground">Children&rsquo;s development.</strong> Health visitors, nurseries
            and paediatric charts talk in months, or in years and months, for the first few years. The total
            months tile gives the figure they use, and the breakdown gives the "2 years 4 months" form.
          </p>
          <p>
            <strong class="text-foreground">Family history.</strong> Put a birth date from a certificate or
            a census and the date of an event, and you get the age at that event — useful for checking
            whether two records describe the same person. The calendar goes back to year 1, though dates
            before your country adopted the Gregorian calendar were written in the Julian one and can be ten
            or more days out.
          </p>
          <p>
            <strong class="text-foreground">Milestones.</strong> The day count is the fun one: 10,000 days
            old arrives at about 27 years and 4 months, and most people never notice it pass. Change the
            "Age on" date until the total reads 10,000 and you have a date worth marking.
          </p>
          <p>
            For the span between any two dates that are not a birthday — a notice period, a project, the
            working days until a deadline — the
            <NuxtLink to="/tools/age-calculator/date-calculator" class="font-medium text-foreground underline underline-offset-4">
              date calculator
            </NuxtLink>
            does the same counting, with business days and adding or subtracting from a date.
          </p>
        </div>
      </section>

      <FaqSection :items="faq" class="rounded-2xl bg-muted/50 p-6 sm:p-8" />

      <ZealPromise />
    </ToolContents>
  </div>
</template>
