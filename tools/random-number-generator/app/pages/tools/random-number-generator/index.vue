<script setup lang="ts">
import meta from '../../../../meta'

const { public: { siteUrl } } = useRuntimeConfig()

useSeoMeta({
  title: 'Random Number Generator — Any Range, No Repeats, Truly Fair',
  description: 'Generate random numbers between any two values: one or a thousand, with or without repeats, sorted, whole or to fixed decimals. Drawn with crypto.getRandomValues and no modulo bias. Coin flip and dice roller included. Free, no sign-up.',
  ogTitle: 'Random Number Generator — fair, and you can check',
  ogDescription: 'Any range, up to 1,000 numbers, no repeats, decimals. Cryptographic randomness with no modulo bias, in your browser.',
  ogUrl: `${siteUrl}/tools/${meta.slug}`,
  twitterCard: 'summary_large_image',
})

defineOgImage('Default', { title: 'Random Number Generator', description: meta.tagline })

const howToSteps = [
  { title: 'Set the range', body: 'Type a minimum and a maximum, or press one of the common ranges. Both ends are included, so 1 to 10 can give you 1 and can give you 10. Negative numbers work, and so do ranges in the trillions.' },
  { title: 'Choose how many', body: 'One number, or up to a thousand at once. Tick No repeats for a draw where each number can come up only once — a lottery line, a raffle ticket order, a random sample. Pick an order, and add decimal places if you need them.' },
  { title: 'Draw, copy, share', body: 'A number is already on screen; press New number to draw again with the same settings. Copy puts one number per line. The address bar holds your settings — never the result — so a link opens the same generator, ready to draw.' },
]

useToolJsonLd(meta, {
  description: meta.description,
  featureList: [
    'Any range up to 2^53 values, negative numbers included',
    'Up to 1,000 numbers at once',
    'No-repeat draws for lotteries and samples',
    'Sorted or in the order drawn',
    'Fixed decimal places from 0 to 10',
    'crypto.getRandomValues with rejection sampling — no modulo bias',
    'Coin flip with history and streaks, dice roller with standard notation',
    'Free REST API and MCP tool',
  ],
  howTo: { name: 'How to generate a random number', steps: howToSteps.map(s => ({ name: s.title, text: s.body })) },
})

const faq = [
  { q: 'Is this random number generator actually random?', a: 'It is as random as your computer can make it. Every draw comes from crypto.getRandomValues, the cryptographically secure generator your browser takes from the operating system — the same source used to make encryption keys. It is not Math.random, whose output can be predicted from earlier values. No software generator is "true" random in the physical sense, but this one is unpredictable to anyone, including us.' },
  { q: 'What is modulo bias, and why does it matter?', a: 'The quick way to turn random bytes into a number from 1 to 6 is to take the remainder after dividing by 6. A byte has 256 values, and 256 does not divide evenly by 6, so the remainders 0 to 3 come up 43 times each and 4 and 5 only 42 times. That is a small tilt, but it is a real one, and it gets worse as the range grows. This generator throws away any draw that lands in the uneven part and draws again, so every number is exactly as likely as every other.' },
  { q: 'Can I generate numbers without repeats?', a: 'Yes — tick No repeats. Each number can then appear at most once, which is what you want for lottery lines, a random order for a list, or picking a sample. If you ask for more numbers than the range holds, say seven different numbers from 1 to 6, it tells you instead of quietly returning repeats.' },
  { q: 'Does the range include the minimum and maximum?', a: 'Both, always. 1 to 100 means a hundred possible numbers, and 1 and 100 are each as likely as 50. That sounds obvious, but the common shortcut of multiplying a random fraction by the width of the range can never return the maximum, and many generators built that way are quietly one short.' },
  { q: 'How do decimals work?', a: 'Choose a number of decimal places and the range is split into an even grid at that precision: 0 to 1 at two places is the 101 values 0.00, 0.01 … 1.00, each equally likely. Results always show exactly that many places, so 2.50 stays 2.50. Up to ten places are supported, as long as the range at that precision still fits within the 2^53 values a JavaScript number can hold exactly.' },
  { q: 'What is the largest range it can handle?', a: 'Any range holding up to 2^53 values — about nine thousand trillion — with both ends between minus and plus 9,007,199,254,740,991. That limit is not ours: it is the largest whole number a JavaScript number can store without rounding, and past it two neighbouring integers become the same value. Within it, every integer is reachable.' },
  { q: 'Can I trust it for a giveaway or a classroom draw?', a: 'For fairness, yes: nobody can predict or steer the result, and every number has the same chance. What it cannot give you is proof to a third party — there is no signed record, because that would need an account and a server. Draw in front of people, or record your screen. For a legally regulated prize draw, use a licensed service.' },
  { q: 'Are my numbers sent anywhere?', a: 'No. They are drawn in your browser and stay there. The page address carries your settings — the range, the count, whether repeats are allowed — and never the result, so a shared link cannot be used to pass off a chosen number as a fresh draw. The API, if you use it, draws on our server instead; nothing is stored or logged.' },
  { q: 'Google has a random number generator. Why use this?', a: 'Google\'s is fine for one number from a small range. Use this when you need more: a thousand numbers at once, a no-repeat draw, decimals, sorting, a copyable list, settings in a link you can send, or an API for a script. The coin and dice modes add flip history, streaks and full dice notation as well.' },
]

const apiSnippet = `curl 'https://zeal.tools/api/v1/random?min=1&max=49&count=6&unique=true&sort=asc'`
const contents = [
  { id: 'howto-heading', label: 'How to use it' },
  { id: 'fair-heading', label: 'Why it is fair' },
  { id: 'check-heading', label: 'Checking it yourself' },
  { id: 'faq-heading', label: 'Questions' },
  { id: 'api-heading', label: 'API' },
  { id: 'promise', label: 'The Zeal Promise' },
]

const code = 'rounded bg-muted px-1.5 py-0.5 font-mono text-xs'
</script>

<template>
  <div class="container-page py-10">
    <ToolPageHeader
      title="Random Number Generator"
      description="Random numbers between any two values — one or a thousand, with or without repeats — drawn fairly from your operating system's random source. Coin flips and dice too."
    />

    <RandomNumberGeneratorTool />

    <section class="mt-12 flex flex-wrap gap-2 text-sm" aria-label="Related tools">
      <NuxtLink to="/tools/random-number-generator/flip-a-coin" class="rounded-full border border-border px-4 py-1.5 transition-colors hover:border-primary/40 hover:text-primary">
        Flip a coin →
      </NuxtLink>
      <NuxtLink to="/tools/random-number-generator/dice-roller" class="rounded-full border border-border px-4 py-1.5 transition-colors hover:border-primary/40 hover:text-primary">
        Dice roller →
      </NuxtLink>
      <NuxtLink to="/tools/name-picker" class="rounded-full border border-border px-4 py-1.5 transition-colors hover:border-primary/40 hover:text-primary">
        Name picker wheel →
      </NuxtLink>
      <NuxtLink to="/tools/password-generator" class="rounded-full border border-border px-4 py-1.5 transition-colors hover:border-primary/40 hover:text-primary">
        Password generator →
      </NuxtLink>
    </section>

    <ToolContents :items="contents">
      <section aria-labelledby="howto-heading" class="rounded-2xl bg-muted/50 p-6 sm:p-8">
        <h2 id="howto-heading" class="text-xl font-semibold">
          How to generate a random number
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

      <section aria-labelledby="fair-heading" class="rounded-2xl bg-muted/50 p-6 sm:p-8">
        <h2 id="fair-heading" class="text-xl font-semibold">
          Why every number is equally likely
        </h2>
        <div class="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground">
          <p>
            A random number generator has two jobs, and most of them only think about the first. The first is
            a source of randomness nobody can predict. Here that is
            <code :class="code">crypto.getRandomValues</code>, the cryptographic generator the browser takes
            from your operating system, which gathers unpredictability from the hardware and is what
            encryption keys are made from. It is not <code :class="code">Math.random</code>, which is built
            for speed: fine for a game&rsquo;s sparkle, but its next value can be worked out from the ones
            before it.
          </p>
          <p>
            <strong class="text-foreground">The second job is turning random bits into your range without
              tilting it</strong>, and this is where generators quietly go wrong. Random bits come in powers of
            two; your range almost never is one. Squeeze 256 equally likely byte values into the numbers 1 to
            6 with a remainder and four of the six get one extra way to happen. Scale a random fraction up to
            the range instead and floating-point rounding makes some values fractionally more common, and the
            top of the range becomes unreachable.
          </p>
          <p>
            This generator does neither. For a range of <em>n</em> values it reads just enough bits to count
            to <em>n</em>, and if the value lands past the end it throws it away and reads again. Every value
            that survives was reached by exactly one pattern of bits, so all of them are equally likely —
            exactly, not approximately. Fewer than one draw in two is ever thrown away, so it costs nothing
            you could notice, even for ranges in the trillions.
          </p>
          <p>
            No repeats uses the same draw inside a shuffle that only touches the positions it needs, so asking
            for a thousand different numbers from a range of a trillion takes a thousand steps, not a
            trillion. Decimals are handled as whole numbers on a finer grid and divided at the end, which keeps
            both ends reachable at any precision.
          </p>
        </div>
      </section>

      <section aria-labelledby="check-heading" class="rounded-2xl bg-muted/50 p-6 sm:p-8">
        <h2 id="check-heading" class="text-xl font-semibold">
          You do not have to take our word for it
        </h2>
        <div class="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground">
          <p>
            Fairness you cannot check is just a claim, so here is how to check it. Set the range to 1 to 10,
            the count to 1,000, and leave repeats on. Each number should turn up about a hundred times —
            usually somewhere between 80 and 120, because real randomness is lumpy. A generator that gives you
            exactly a hundred of each is the suspicious one.
          </p>
          <p>
            <strong class="text-foreground">The code is open and tested.</strong> The unit tests feed the
            draw every possible byte in turn and confirm each outcome comes up the same number of times,
            which is the test a modulo fails. They also run a chi-square test — the standard statistical
            check for an even spread — over tens of thousands of draws. You can read both, and the few dozen
            lines that do the drawing, in the repository.
          </p>
          <p>
            And for the sceptical: open your browser&rsquo;s network panel and press New number. Nothing is
            requested. The draw happens on your machine, which also means it keeps working with the internet
            switched off once the page has loaded.
          </p>
        </div>
      </section>

      <FaqSection :items="faq" class="rounded-2xl bg-muted/50 p-6 sm:p-8" />

      <section id="api" aria-labelledby="api-heading" class="rounded-2xl bg-muted/50 p-6 sm:p-8">
        <h2 id="api-heading" class="text-xl font-semibold">
          API — for scripts and agents
        </h2>
        <p class="mt-2 text-sm text-muted-foreground">
          The same draw behind a free REST endpoint, no key and no sign-up. It takes
          <code :class="code">min</code>, <code :class="code">max</code>, <code :class="code">count</code>,
          <code :class="code">unique</code>, <code :class="code">sort</code> (none, asc or desc) and
          <code :class="code">decimals</code>; or <code :class="code">coin=10</code> for ten flips; or
          <code :class="code">dice=2d6%2B3</code> for a roll — write <code :class="code">+</code> as
          <code :class="code">%2B</code>, since a bare plus in a URL means a space.
        </p>
        <CodeBlock :code="apiSnippet" lang="bash" />
        <p class="mt-3 text-sm text-muted-foreground">
          Try it: <a href="/api/v1/random?min=1&max=100" class="font-medium text-foreground underline underline-offset-4">/api/v1/random?min=1&amp;max=100</a>,
          <a href="/api/v1/random?coin=10" class="font-medium text-foreground underline underline-offset-4">?coin=10</a> or
          <a href="/api/v1/random?dice=4d6kh3" class="font-medium text-foreground underline underline-offset-4">?dice=4d6kh3</a>.
          A result drawn there is drawn on our server, not in your browser; nothing is stored or logged.
        </p>
        <p class="mt-3 text-sm text-muted-foreground">
          Agents especially should use it: a language model asked for &ldquo;a random number&rdquo; returns a
          likely-sounding one, with a few favourites coming up far more often than chance allows. MCP clients
          can add <code :class="code">https://zeal.tools/mcp</code> and call the
          <code :class="code">random</code> tool for numbers, flips and rolls.
        </p>
      </section>

      <ZealPromise />
    </ToolContents>
  </div>
</template>
