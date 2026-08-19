<script setup lang="ts">
import meta from '../../../../meta'

const { public: { siteUrl } } = useRuntimeConfig()

useSeoMeta({
  title: 'Password Generator — Made In Your Browser, Never Sent',
  description: 'Generate a strong random password using your operating system\'s cryptographic random source. Nothing is transmitted, nothing is stored. See its entropy and crack time before you use it. Free, no sign-up, open source.',
  ogTitle: 'Password Generator — never leaves your browser',
  ogDescription: 'Strong passwords from your OS random source, with the entropy shown. No sign-up, no logging, open source.',
  ogUrl: `${siteUrl}/tools/${meta.slug}`,
  twitterCard: 'summary_large_image',
})

defineOgImage('Default', {
  title: 'Password Generator',
  description: meta.tagline,
})

const howToSteps = [
  { title: 'Pick a length', body: 'Longer beats clever. Length adds more strength per character than any of the other settings, and a password manager means you never type it anyway.' },
  { title: 'Choose the character sets', body: 'Leave all four on unless something you are signing up to refuses symbols. Every set you switch off shrinks the pool the password is drawn from.' },
  { title: 'Check the strength line', body: 'It shows the entropy in bits and roughly how long the password would survive a fast offline attack. Aim comfortably past 80 bits.' },
  { title: 'Copy it into your password manager', body: 'Straight into the manager, not into a note or a message. The password only exists in this tab until you copy it, and the tab forgets it the moment you leave.' },
]

useToolJsonLd(meta, {
  description: meta.description,
  featureList: [
    'Generated in your browser by the OS cryptographic random source',
    'Never transmitted, never stored, never logged',
    'Entropy and crack-time shown before you use it',
    'Look-alike characters can be excluded',
    'Free REST API and MCP tool for automation',
  ],
  howTo: { name: 'How to generate a strong password', steps: howToSteps.map(s => ({ name: s.title, text: s.body })) },
})

const faq = [
  { q: 'Is the password sent to your server?', a: 'Not when you use this page. It is generated in your browser by crypto.getRandomValues, the random source your operating system provides, and it never leaves the tab — you can watch the network panel stay silent, or disconnect from the internet after the page loads and keep generating. Nothing is stored and nothing is logged.' },
  { q: 'What about the API? Does that send passwords over the wire?', a: 'Yes, and that is worth being straight about. The REST endpoint and the MCP tool generate on the server and send the result back over TLS. Nothing is stored or logged, but the password does travel, which the browser version never does. Use the API for scripts and agents; use this page for a password you actually care about.' },
  { q: 'How long should a password be?', a: 'Long enough that the strength line reads comfortably past 80 bits, which with all four character sets on means roughly 13 characters or more. Twenty is a good default and costs you nothing, because a password manager types it for you. Length buys more strength per character than any other setting here.' },
  { q: 'What does entropy actually mean?', a: 'It is the number of bits needed to describe every password the current settings could have produced, assuming an attacker knows those settings. Each extra bit doubles the work. It measures the process rather than the string, which is why a password manager\'s random output at 80 bits is genuinely strong while a human-chosen one that merely looks similar is not.' },
  { q: 'Why does requiring one of each type slightly lower the strength?', a: 'Because it rules out every password that happens to miss a set, so there are fewer possible outcomes. The reduction is under a bit at realistic lengths — far less than the cost of a site rejecting your password and pushing you toward something weaker. The figure shown is the plain estimate for the pool and length.' },
  { q: 'Should I avoid look-alike characters?', a: 'Only when a human has to read the password — off a projector, over the phone, from a printed sheet. It removes the pairs that get confused, l against 1 and I, O against 0. It also shrinks the pool, so add a character or two to compensate. If the password lives in a manager and is never read aloud, leave it off.' },
  { q: 'Do you use Math.random?', a: 'No. Math.random is not a cryptographic generator: its output is predictable from previous values, which is fine for shuffling a playlist and unfit for a secret. This uses crypto.getRandomValues in the browser and the equivalent on the server. The unbiased integer draw on top of it is unit-tested, because taking a modulo of a random number quietly skews the result.' },
  { q: 'Can I generate several at once?', a: 'On this page, press "New one" as many times as you need. Over the API, pass count up to fifty — that is the case the endpoint exists for, seeding a batch of service accounts or fixtures from a script.' },
  { q: 'Is a passphrase better than a password?', a: 'For something you have to type or remember, often yes — several random words are easier to handle at the same strength. For everything living in a password manager, which should be nearly everything, a long random string is simpler and shorter. This tool makes the second kind.' },
  { q: 'Is there a catch?', a: 'No. It is MIT licensed and there is no account, no watermark, no limit and no upsell. The code that generates the password is a few dozen lines you can read in the repository, which is rather the point for a tool like this — a password generator you cannot inspect is asking for a lot of trust.' },
]

const apiSnippet = `curl 'https://zeal.tools/api/v1/password?length=24&count=3'`
</script>

<template>
  <div class="container-page py-10">
    <ToolPageHeader
      title="Password Generator"
      description="Strong passwords, generated in your browser by your operating system's random source. Never transmitted, never stored."
    />

    <ClientOnly>
      <PasswordGeneratorTool />
      <template #fallback>
        <div class="grid h-[520px] place-items-center rounded-2xl border border-border text-sm text-muted-foreground">
          Loading the generator…
        </div>
      </template>
    </ClientOnly>

    <section class="mt-12 flex flex-wrap gap-2 text-sm" aria-label="Related tools">
      <NuxtLink to="/tools/qr-code-generator/wifi" class="rounded-full border border-border px-4 py-1.5 transition-colors hover:border-primary/40 hover:text-primary">
        WiFi QR code →
      </NuxtLink>
      <NuxtLink to="/tools/background-remover" class="rounded-full border border-border px-4 py-1.5 transition-colors hover:border-primary/40 hover:text-primary">
        Background remover →
      </NuxtLink>
    </section>

    <div class="mx-auto mt-16 space-y-12">
      <section aria-labelledby="howto-heading" class="rounded-2xl bg-muted/50 p-6 sm:p-8">
        <h2 id="howto-heading" class="text-xl font-semibold">
          How to generate a strong password
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

      <section aria-labelledby="length-heading" class="rounded-2xl bg-muted/50 p-6 sm:p-8">
        <h2 id="length-heading" class="text-xl font-semibold">
          Length is the setting that matters
        </h2>
        <div class="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground">
          <p>
            Password advice spent two decades pushing complexity — a capital, a number, a symbol — and the
            result was a generation of passwords that satisfied the rules and defeated nobody. The capital
            went at the front, the number and the symbol went at the end, and attackers learned that
            pattern long before the rest of us did.
          </p>
          <p>
            <strong class="text-foreground">What actually resists guessing is size of the search space,
              and length is the cheapest way to buy it.</strong> Each extra character multiplies the space by
            the size of the pool; each extra character set only widens the pool once. Going from twelve
            characters to twenty is worth far more than adding symbols to a short one, and it costs you
            nothing when a password manager does the typing.
          </p>
          <p>
            This is why the strength line here reports bits rather than a word like "strong". Bits are
            comparable and they compound: every extra bit doubles the work an attacker has to do. Around
            60 bits is uncomfortable, 80 is a reasonable floor for anything that matters, and past 100 the
            password stops being the weakest thing about the account by a wide margin.
          </p>
        </div>
      </section>

      <section aria-labelledby="random-heading" class="rounded-2xl bg-muted/50 p-6 sm:p-8">
        <h2 id="random-heading" class="text-xl font-semibold">
          Where the randomness comes from
        </h2>
        <div class="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground">
          <p>
            A password is only as unguessable as the source that produced it, so it is worth knowing what
            this uses. Characters are drawn with
            <code class="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">crypto.getRandomValues</code>,
            the cryptographic generator your operating system provides — not
            <code class="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">Math.random</code>, whose output
            can be predicted from earlier values and which has no business generating a secret.
          </p>
          <p>
            <strong class="text-foreground">Drawing a character fairly takes slightly more care than it
              looks.</strong> The obvious approach — take a random number and reduce it modulo the alphabet
            size — is subtly wrong, because the alphabet almost never divides evenly into the range, so
            the first few characters come up marginally more often than the rest. The skew is small, but
            it is free to avoid: values landing in the uneven tail are discarded and a fresh one is drawn.
            That, and the shuffle that mixes in the guaranteed characters, are unit-tested — they are
            precisely the kind of code that looks correct while being quietly biased.
          </p>
          <p>
            The password is never sent anywhere from this page. It is built in the tab, shown to you, and
            forgotten when you navigate away. There is no request to inspect, nothing in a log, and no
            policy you have to take on faith.
          </p>
        </div>
      </section>

      <FaqSection :items="faq" class="rounded-2xl bg-muted/50 p-6 sm:p-8" />

      <section id="api" aria-labelledby="api-heading" class="rounded-2xl bg-muted/50 p-6 sm:p-8">
        <h2 id="api-heading" class="text-xl font-semibold">
          API — for scripts and agents
        </h2>
        <p class="mt-2 text-sm text-muted-foreground">
          The same generator behind a free REST endpoint, for seeding a batch of accounts or fixtures. No
          API key, no sign-up. It returns the password with its entropy and crack time.
        </p>
        <CodeBlock :code="apiSnippet" lang="bash" />
        <p class="mt-3 text-sm text-muted-foreground">
          Be aware of the trade: a password generated here travels over the wire, which one made in your
          browser never does. Nothing is stored either way. MCP clients can call the same core — add
          <code class="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">https://zeal.tools/mcp</code> and
          use the <code class="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">generate_password</code> tool.
        </p>
      </section>

      <ZealPromise />
    </div>
  </div>
</template>
