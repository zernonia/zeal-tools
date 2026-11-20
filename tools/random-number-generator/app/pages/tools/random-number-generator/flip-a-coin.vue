<script setup lang="ts">
import meta from '../../../../meta'

const { public: { siteUrl } } = useRuntimeConfig()
const pageUrl = `${siteUrl}/tools/${meta.slug}/flip-a-coin`

useSeoMeta({
  title: 'Flip a Coin — Heads or Tails, With History and Streaks',
  description: 'Flip a coin online: heads or tails, decided by your operating system\'s cryptographic random source. Flip one or a thousand at once, with a running tally, the longest streak and every flip kept. Free, no sign-up, nothing uploaded.',
  ogTitle: 'Flip a Coin — a fair toss with a memory',
  ogDescription: 'Heads or tails, one coin or a thousand, with a tally and the longest streak. Cryptographic randomness, in your browser.',
  ogUrl: pageUrl,
  twitterCard: 'summary_large_image',
})

defineOgImage('Default', { title: 'Flip a Coin', description: 'Heads or tails — a fair toss with a tally, streaks and history.' })

useToolJsonLd(meta, {
  variant: 'flip-a-coin',
  name: 'Flip a Coin',
  description: 'Flip a virtual coin: heads or tails from a cryptographic random source, one at a time or a thousand at once, with a tally, streaks and history.',
  featureList: [
    'Heads or tails from crypto.getRandomValues',
    'Flip up to 1,000 coins in one press',
    'Running tally with percentages',
    'Longest and current streak',
    'Every flip kept for the session and copyable',
    'Respects reduced-motion settings',
  ],
})

const faq = [
  { q: 'Is an online coin flip really 50/50?', a: 'This one is exactly 50/50. Each flip reads one random bit from crypto.getRandomValues, your operating system\'s cryptographic generator, and a bit has two values and no remainder, so there is nothing to round and nothing to tilt. A real coin is very slightly less fair: studies of hundreds of thousands of hand tosses found it lands on the side it started on about 51% of the time.' },
  { q: 'I got heads six times in a row. Is it broken?', a: 'No — that is what fair looks like. In 100 flips the longest run of one side averages about seven, and a run of six or more turns up roughly four times in five. People expect a fair coin to alternate far more than it does, which is why streaks feel suspicious. The tally shows the longest streak so you can see this for yourself.' },
  { q: 'After five tails, is heads more likely?', a: 'No. The coin has no memory: every flip is a fresh one-in-two, whatever came before. Believing a result is "due" is the gambler\'s fallacy. Over thousands of flips the percentages drift towards 50%, not because heads catches up, but because the early imbalance becomes a smaller and smaller share of the total.' },
  { q: 'Can I flip more than one coin?', a: 'Yes. Set Coins per press to anything up to 1,000 and each press flips them all at once. The coin shows the last one, the headline gives the split for that press, and the tally keeps counting across every press until you press Start over.' },
  { q: 'Is there a record of my flips?', a: 'For as long as the tab is open. The tally, the streaks and the most recent sixty flips are shown, and Copy results copies the whole sequence as H and T. Nothing is saved to a server or to your browser, so closing the tab clears it — useful when the decision is made and you would rather it stayed made.' },
  { q: 'Why not just ask Google to flip a coin?', a: 'Google\'s flip is perfectly good for one decision. Use this when you want more than one result: a history of every flip, a tally and streaks, a thousand coins in one press, a result you can copy, or the dice and number generators one tab away. It also has an API, which is handy for a bot that needs to settle something fairly.' },
  { q: 'Does the animation decide the result?', a: 'No. The result is drawn the instant you press, and the spin is chosen to land on it — five full turns and then whichever half-turn puts the right face up. If your system asks for reduced motion, the spin is skipped and the result appears at once.' },
]

const contents = [
  { id: 'coin-fair-heading', label: 'A fairer coin than a coin' },
  { id: 'coin-streak-heading', label: 'Streaks are normal' },
  { id: 'coin-decide-heading', label: 'Using it to decide' },
  { id: 'faq-heading', label: 'Questions' },
  { id: 'promise', label: 'The Zeal Promise' },
]

const code = 'rounded bg-muted px-1.5 py-0.5 font-mono text-xs'
</script>

<template>
  <div class="container-page py-10">
    <ToolPageHeader
      title="Flip a Coin"
      description="Heads or tails, decided by a cryptographic random source — one coin or a thousand, with a running tally and the longest streak."
    />

    <RandomNumberGeneratorTool initial-mode="coin" />

    <section class="mt-12 flex flex-wrap gap-2 text-sm" aria-label="Related tools">
      <NuxtLink to="/tools/random-number-generator/dice-roller" class="rounded-full border border-border px-4 py-1.5 transition-colors hover:border-primary/40 hover:text-primary">
        Dice roller →
      </NuxtLink>
      <NuxtLink to="/tools/random-number-generator" class="rounded-full border border-border px-4 py-1.5 transition-colors hover:border-primary/40 hover:text-primary">
        Random number generator →
      </NuxtLink>
      <NuxtLink to="/tools/name-picker" class="rounded-full border border-border px-4 py-1.5 transition-colors hover:border-primary/40 hover:text-primary">
        Name picker wheel →
      </NuxtLink>
    </section>

    <ToolContents :items="contents">
      <section aria-labelledby="coin-fair-heading" class="rounded-2xl bg-muted/50 p-6 sm:p-8">
        <h2 id="coin-fair-heading" class="text-xl font-semibold">
          A fairer coin than a coin
        </h2>
        <div class="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground">
          <p>
            A real coin toss is less random than it looks. It is physics: the starting face, the spin and the
            height decide the result, and a large study of hand-tossed coins found they land on the side they
            started on slightly more often than half the time. Spun on a table rather than tossed, some coins
            are far more lopsided than that.
          </p>
          <p>
            <strong class="text-foreground">This coin has none of those problems.</strong> Each flip is one bit
            read from <code :class="code">crypto.getRandomValues</code>, the cryptographic random source your
            operating system provides. A bit has exactly two values, so the draw needs no remainder and no
            rounding — the two most common ways a digital coin gets bent. Heads and tails are each exactly one
            in two, and nobody, us included, can predict the next one.
          </p>
          <p>
            The spin is decoration. The result is drawn the moment you press, then the coin turns five times
            and lands on it. With reduced motion switched on in your system settings, the coin simply shows
            the result.
          </p>
        </div>
      </section>

      <section aria-labelledby="coin-streak-heading" class="rounded-2xl bg-muted/50 p-6 sm:p-8">
        <h2 id="coin-streak-heading" class="text-xl font-semibold">
          Streaks are what fair looks like
        </h2>
        <div class="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground">
          <p>
            Ask people to write down a hundred made-up coin flips and they alternate too much: their longest
            run is often only three or four. Real flips are streakier. Across a hundred fair flips the longest
            run of one side averages about seven, and a run of at least six happens around four times in
            five. That is why the tally shows the longest streak — it is the quickest way to see that a run
            which feels rigged is perfectly ordinary.
          </p>
          <p>
            <strong class="text-foreground">Try it with a thousand.</strong> Set Coins per press to 1,000 and
            flip. You will rarely see exactly 500 heads; anything from about 470 to 530 is normal, and the
            percentage settles closer to 50% the more you flip. It gets there because the early lead becomes
            a smaller share of a bigger total, not because the coin evens things up — it has no memory of what
            it did last.
          </p>
        </div>
      </section>

      <section aria-labelledby="coin-decide-heading" class="rounded-2xl bg-muted/50 p-6 sm:p-8">
        <h2 id="coin-decide-heading" class="text-xl font-semibold">
          Using a coin to decide
        </h2>
        <div class="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground">
          <p>
            Say which side means what <em>before</em> you flip, out loud if there is anyone else involved.
            Agreeing afterwards is how a coin toss turns into an argument. For a kick-off or who goes first, one
            flip is the whole job.
          </p>
          <p>
            There is an old trick for hard personal decisions: flip, and notice how you feel when the coin
            lands. If you are relieved, you have your answer; if you are disappointed, you also have your
            answer, and it is the other side. The coin did not decide anything — it just made you find out
            what you already wanted.
          </p>
          <p>
            When there are more than two options, a coin is the wrong tool. Roll a die from the Dice tab, draw
            a number from the Numbers tab, or put the choices on the
            <NuxtLink to="/tools/name-picker" class="font-medium text-foreground underline underline-offset-4">
              name picker wheel
            </NuxtLink>.
            And for a bot or a script, the API flips too:
            <a href="/api/v1/random?coin=1" class="font-medium text-foreground underline underline-offset-4">/api/v1/random?coin=1</a>.
          </p>
        </div>
      </section>

      <FaqSection :items="faq" class="rounded-2xl bg-muted/50 p-6 sm:p-8" />
      <ZealPromise />
    </ToolContents>
  </div>
</template>
