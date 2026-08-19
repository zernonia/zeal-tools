<script setup lang="ts">
import meta from '../../../../meta'

const { public: { siteUrl } } = useRuntimeConfig()
const pageUrl = `${siteUrl}/tools/${meta.slug}`

useSeoMeta({
  title: 'Countdown Timer — Days Until Any Date, Free',
  description: 'Count down to any date and time, or pick Christmas, Easter or New Year and we work out the next occurrence. Full screen, shareable link, no sign-up. Open source.',
  ogTitle: 'Countdown Timer — days until any date',
  ogDescription: 'Count down to a date you choose, or to Christmas, Easter and New Year. Full screen and shareable.',
  ogUrl: pageUrl,
  twitterCard: 'summary_large_image',
})

defineOgImage('Default', {
  title: 'Countdown Timer',
  description: 'Count down to a date you choose, or to Christmas, Easter and New Year. Full screen and shareable.',
})

useToolJsonLd(meta)

const faq = [
  { q: 'Does the countdown keep working next year?', a: 'Yes, for the milestones. Christmas, Easter and New Year always resolve to the next occurrence, so a link you share in January still counts down to this December rather than showing a date that has passed.' },
  { q: 'How is the Easter date worked out?', a: 'It is calculated, not looked up in a table. Easter follows an algorithm known as the Computus, which is why it moves between late March and late April each year. That means the tool is correct for any year you point it at, not just the ones someone remembered to add.' },
  { q: 'Can I share a countdown with other people?', a: 'Yes. Everything you set is stored in the page address, so copying the link is all it takes. There is no account and nothing saved on our side — the link is the save file.' },
  { q: 'Can I put it on a screen at an event?', a: 'Yes. The full screen button gives you just the numbers, which works well on a foyer display or a projector. It keeps counting as long as the page is open.' },
  { q: 'What time zone does it use?', a: 'Yours. Dates and times are interpreted in the time zone of the device showing the page, so a countdown shared across a team shows each person the correct remaining time rather than a fixed clock.' },
  { q: 'What happens after the date passes?', a: 'It says so plainly rather than counting into negative numbers or resetting. For the recurring milestones this never happens, because they roll forward to the next occurrence automatically.' },
  { q: 'Is there a limit on how far ahead I can count?', a: 'No practical limit. Set a date years out and it will count the days correctly, including leap years, because the arithmetic is done on real dates rather than by multiplying out an approximation.' },
  { q: 'Does it need an internet connection?', a: 'Only to load the page. Once it is open the countdown runs entirely in your browser, so it keeps working if the connection drops mid-event.' },
]
</script>

<template>
  <div class="container-page py-10">
    <ToolPageHeader
      title="Countdown Timer"
      description="Count down to any date and time — or pick a milestone and we will work out when it next falls."
    />

    <ClientOnly>
      <CountdownTimerTool />
      <template #fallback>
        <div class="grid h-[720px] place-items-center rounded-2xl border border-border text-sm text-muted-foreground sm:h-[640px]">
          Loading the countdown…
        </div>
      </template>
    </ClientOnly>

    <section class="mt-12 flex flex-wrap gap-2 text-sm" aria-label="Related tools">
      <NuxtLink to="/tools/countdown-timer/christmas" class="rounded-full border border-border px-4 py-1.5 transition-colors hover:border-primary/40 hover:text-primary">
        Christmas countdown →
      </NuxtLink>
      <NuxtLink to="/tools/stage-timer" class="rounded-full border border-border px-4 py-1.5 transition-colors hover:border-primary/40 hover:text-primary">
        Stage timer →
      </NuxtLink>
    </section>

    <div class="mx-auto mt-16 space-y-12">
      <section aria-labelledby="about-heading" class="rounded-2xl bg-muted/50 p-6 sm:p-8">
        <h2 id="about-heading" class="text-xl font-semibold">
          Counting days is harder than it looks
        </h2>
        <div class="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground">
          <p>
            &ldquo;How many days until&rdquo; sounds like subtraction, and mostly it is. The awkward parts
            are the ones that only show up occasionally — and always at the worst moment, when the number
            on your foyer screen is wrong by one.
          </p>
          <p>
            <strong class="text-foreground">Leap years.</strong> Multiplying out an approximate year length
            drifts. Working on real dates does not, so a countdown set three years ahead still lands on the
            right day. That matters more than it sounds: a countdown that is a day out is worse than no
            countdown, because people trust it.
          </p>
          <p>
            <strong class="text-foreground">Daylight saving.</strong> A clock going forward makes one day
            twenty-three hours long. Counting in local time rather than fixed offsets means a countdown
            crossing a clock change still reaches zero at the right moment rather than an hour out.
          </p>
          <p>
            <strong class="text-foreground">Time zones.</strong> Everything is shown in the time zone of the
            device looking at it. A colleague two hours ahead sees the correct remaining time, not yours
            relabelled. That is usually what people want from a shared countdown, and it is why the target
            travels in the link rather than a pre-computed number of days.
          </p>
          <p>
            <strong class="text-foreground">Moving dates.</strong> Most milestones sit on a fixed day, but
            Easter does not — it follows an algorithm called the Computus, tied to the moon rather than the
            calendar, which is why it wanders between late March and late April. Calculating it rather than
            keeping a lookup table means every future year is correct without anyone maintaining anything.
          </p>
          <p>
            One deliberate omission: there is no account and nothing is stored. Everything you choose lives
            in the page address, so sharing the link shares the countdown, and closing the tab loses nothing
            you cannot get back by opening the link again.
          </p>
        </div>
      </section>

      <FaqSection :items="faq" class="rounded-2xl bg-muted/50 p-6 sm:p-8" />

      <ZealPromise />
    </div>
  </div>
</template>
