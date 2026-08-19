<script setup lang="ts">
import meta from '../../../../meta'

const { public: { siteUrl } } = useRuntimeConfig()
const pageUrl = `${siteUrl}/tools/${meta.slug}/christmas`

useSeoMeta({
  title: 'Christmas Countdown — How Many Days Until Christmas',
  description: 'A live countdown to Christmas Day that keeps working every year. Full screen for a display, shareable as a link, no sign-up. Free and open source.',
  ogTitle: 'Christmas Countdown — how many days until Christmas',
  ogDescription: 'Live countdown to Christmas Day. Full screen for a foyer display, shareable link, no account.',
  ogUrl: pageUrl,
  twitterCard: 'summary_large_image',
})

defineOgImage('Default', {
  title: 'Christmas Countdown',
  description: 'Live countdown to Christmas Day. Full screen for a foyer display, shareable link, no account.',
})

useToolJsonLd(meta, { variant: 'christmas', name: 'Christmas Countdown' })

const faq = [
  { q: 'How many days until Christmas?', a: 'The counter above is live and updates every second, counting to 25 December in your own time zone. Once the day passes it rolls straight on to the following year, so this page is never out of date.' },
  { q: 'Does it count to Christmas Day or Christmas Eve?', a: 'To the start of Christmas Day — midnight on 25 December. If you would rather count to Christmas Eve, or to a specific moment like a carol service, use the main countdown tool and set your own date and time.' },
  { q: 'Can I put this on a screen in a foyer or shop?', a: 'Yes. The full screen button gives you just the numbers, large enough to read across a room, and it keeps counting for as long as the page stays open. There is no watermark and no advertising on it.' },
  { q: 'Why does it show a different number to another site?', a: 'Time zones, usually. This counts down in the time zone of the device you are looking at, so someone several hours ahead legitimately sees fewer hours remaining than you do.' },
  { q: 'Do I need to sign up or install anything?', a: 'No. It runs in the browser, needs no account, and works offline once the page has loaded. Bookmark it and it will be correct next December without anyone updating anything.' },
]
</script>

<template>
  <div class="container-page py-10">
    <ToolPageHeader
      title="Christmas Countdown"
      description="A live countdown to Christmas Day that rolls forward every year — no account, no watermark, full screen for a display."
    />

    <ClientOnly>
      <CountdownTimerTool preset-id="christmas" />
      <template #fallback>
        <div class="grid h-[720px] place-items-center rounded-2xl border border-border text-sm text-muted-foreground sm:h-[640px]">
          Loading the countdown…
        </div>
      </template>
    </ClientOnly>

    <section class="mt-12 flex flex-wrap gap-2 text-sm" aria-label="Related tools">
      <NuxtLink to="/tools/countdown-timer" class="rounded-full border border-border px-4 py-1.5 transition-colors hover:border-primary/40 hover:text-primary">
        Count down to any date →
      </NuxtLink>
    </section>

    <div class="mx-auto mt-16 space-y-12">
      <section aria-labelledby="christmas-heading" class="rounded-2xl bg-muted/50 p-6 sm:p-8">
        <h2 id="christmas-heading" class="text-xl font-semibold">
          A countdown that looks after itself
        </h2>
        <div class="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground">
          <p>
            Christmas Day is fixed on 25 December, which makes it the easy case — but a countdown to it
            still has two ways to go wrong, and both are worth avoiding if this is going on a screen the
            public can see.
          </p>
          <p>
            The first is going stale. A countdown that stops on 26 December, or worse starts showing
            negative numbers, is a small but visible sign that nobody is looking after the display. This
            page rolls to the next occurrence the moment the day passes, so it is correct in January
            without anyone touching it.
          </p>
          <p>
            The second is the time zone. Counting in a fixed zone means everyone outside it sees a number
            that is subtly wrong. Counting in the viewer's own zone means the answer is right for whoever
            is standing in front of it, which is the only definition of correct that matters here.
          </p>
          <p>
            If you need something more specific than the day itself — the carol service, the moment doors
            open, the last posting date — the main countdown tool takes any date and time you like and
            shares the same full-screen display. And if you are running a service or an event, the stage
            timer is the one for counting down to the start rather than counting off the days.
          </p>
        </div>
      </section>

      <FaqSection :items="faq" class="rounded-2xl bg-muted/50 p-6 sm:p-8" />

      <ZealPromise />
    </div>
  </div>
</template>
