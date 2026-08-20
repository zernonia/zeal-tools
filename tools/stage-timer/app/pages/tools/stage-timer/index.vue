<script setup lang="ts">
import meta from '../../../../meta'

const { public: { siteUrl } } = useRuntimeConfig()
const pageUrl = `${siteUrl}/tools/${meta.slug}`

useSeoMeta({
  title: 'Stage Timer — Countdown for Speakers, Free',
  description: 'A huge countdown for the stage screen plus a separate presenter view for the desk. Add time mid-talk, send a message to the speaker. No sign-up, no server, open source.',
  ogTitle: 'Stage Timer — a countdown the speaker can actually read',
  ogDescription: 'Stage view on the screen, presenter controls on your laptop. In sync, with no account and no server.',
  ogUrl: pageUrl,
  twitterCard: 'summary_large_image',
})

defineOgImage('Default', {
  title: 'Stage Timer',
  description: 'Stage view on the screen, presenter controls on your laptop. In sync, with no account and no server.',
})

useToolJsonLd(meta)

const faq = [
  { q: 'How do the two windows stay in sync?', a: 'Through a browser feature called a BroadcastChannel, which passes messages between windows on the same site in the same browser. There is no server involved and no account, which also means the sync works with no internet at all once the pages have loaded.' },
  { q: 'Can I put the stage view on a second screen?', a: 'Yes, and that is the intended setup. Open the stage view, drag that window to the screen the speaker sees, and put it full screen. Keep the presenter window on your laptop to control it.' },
  { q: 'Does it work across two different computers?', a: 'No. Sync is between windows in the same browser on the same machine, which is what lets it work with no server and no account. For a second computer, run a separate timer on it.' },
  { q: 'Can I add time while someone is speaking?', a: 'Yes. The plus and minus one-minute buttons change the length while the clock is running, and the stage view updates immediately. That is usually kinder than letting a speaker run into a red screen they cannot do anything about.' },
  { q: 'What happens when time runs out?', a: 'The clock keeps counting, upward, with a minus sign and in red. Knowing you are two minutes over is far more useful to a speaker than a clock frozen at zero.' },
  { q: 'Can I send the speaker a message?', a: 'Yes. Anything you type in the message field appears under the clock on the stage screen. Useful for "wrap up", "Q&A next", or the time you are coming back from a break.' },
  { q: 'Will the stage screen go to sleep?', a: 'That depends on the machine, not the page. Set the display to never sleep in the operating system before the session, and put the browser in full screen so no toolbars are visible.' },
  { q: 'Is the timer visible to search engines?', a: 'The stage view is marked no-index because it is a display, not a page anyone should land on from a search. This page, the one you set the timer up on, is indexed normally.' },
]
const contents = [
  { id: 'setup-heading', label: 'Setting it up' },
  { id: 'faq-heading', label: 'Questions' },
  { id: 'promise', label: 'The Zeal Promise' },
]
</script>

<template>
  <div class="container-page py-10">
    <ToolPageHeader
      title="Stage Timer"
      description="A countdown big enough to read from the back of the room, with a separate presenter view for the desk."
    />

    <ClientOnly>
      <StageTimerTool />
      <template #fallback>
        <div class="grid h-[720px] place-items-center rounded-2xl border border-border text-sm text-muted-foreground sm:h-[660px]">
          Loading the timer…
        </div>
      </template>
    </ClientOnly>

    <section class="mt-12 flex flex-wrap gap-2 text-sm" aria-label="Related tools">
      <NuxtLink to="/tools/countdown-timer" class="rounded-full border border-border px-4 py-1.5 transition-colors hover:border-primary/40 hover:text-primary">
        Countdown to a date →
      </NuxtLink>
      <NuxtLink to="/tools/worship-pads" class="rounded-full border border-border px-4 py-1.5 transition-colors hover:border-primary/40 hover:text-primary">
        Worship pads →
      </NuxtLink>
    </section>

    <ToolContents :items="contents">
      <section aria-labelledby="setup-heading" class="rounded-2xl bg-muted/50 p-6 sm:p-8">
        <h2 id="setup-heading" class="text-xl font-semibold">
          Setting it up before the session
        </h2>
        <div class="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground">
          <p>
            <strong class="text-foreground">Two windows, two screens.</strong> The presenter window is the
            one with the buttons; the stage window is the one with the enormous clock. Open the stage view,
            drag it to the screen the speaker can see, and put it full screen. Everything you do in the
            presenter window shows up there immediately.
          </p>
          <p>
            <strong class="text-foreground">There is no server.</strong> The two windows talk to each other
            through the browser itself, so no data leaves the machine and no account exists to sign into.
            The practical consequence is worth knowing in both directions: it works with the network
            unplugged, and it will not sync to a different computer.
          </p>
          <p>
            <strong class="text-foreground">Decide the warning point in advance.</strong> The clock turns
            amber at whatever threshold you set — a minute is a common choice, two minutes if the speaker
            needs to land a conclusion rather than just stop. Set it to zero if you would rather the colour
            never change.
          </p>
          <p>
            <strong class="text-foreground">Let it run past zero.</strong> When time is up the clock keeps
            counting upward in red with a minus sign. A speaker who can see they are ninety seconds over
            behaves differently from one looking at a clock stuck on 0:00, and the difference is usually
            the length of your afternoon.
          </p>
          <p>
            <strong class="text-foreground">Use the message line.</strong> Anything you type appears under
            the clock. It is far less disruptive than walking to the front, and specific messages work
            better than vague ones: &ldquo;5 min then Q&amp;A&rdquo; tells a speaker what to do, where
            &ldquo;hurry up&rdquo; only tells them how you feel.
          </p>
          <p>
            Finally, check the display sleep settings on the machine driving the stage screen before you
            start. A timer that blanks out twenty minutes into a session is the one failure this tool
            cannot protect you from, because it happens below the browser.
          </p>
        </div>
      </section>

      <FaqSection :items="faq" class="rounded-2xl bg-muted/50 p-6 sm:p-8" />

      <ZealPromise />
    </ToolContents>
  </div>
</template>
