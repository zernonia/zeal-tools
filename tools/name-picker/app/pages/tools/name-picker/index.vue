<script setup lang="ts">
import meta from '../../../../meta'

const { public: { siteUrl } } = useRuntimeConfig()

useSeoMeta({
  title: 'Random Name Picker — Spin the Wheel of Names, Free',
  description: 'Paste a list of names, spin the picker wheel, get one winner. A free wheel of names whose draw uses real cryptographic randomness, not a rough approximation — and your list never leaves your browser. No sign-up.',
  ogTitle: 'Name Picker — a wheel that actually draws fairly',
  ogDescription: 'Spin a wheel to pick a random name, winner or team. Cryptographic draw, list stays in your browser, no sign-up.',
  ogUrl: `${siteUrl}/tools/${meta.slug}`,
  twitterCard: 'summary_large_image',
})

defineOgImage('Default', { title: 'Name Picker', description: meta.tagline })

const apiSnippet = `curl 'https://zeal.tools/api/v1/pick?names=Ada,Grace,Linus&count=1'`

const howToSteps = [
  { title: 'Paste your names', body: 'One per line. A spreadsheet column, a chat export or a class register all paste straight in — anything blank is ignored, so you do not have to tidy it first.' },
  { title: 'Weight anyone who deserves it', body: 'Put ×3 after a name and it takes three slices instead of one. That is how you run a raffle where people earned extra entries, without pasting the same name three times and making the wheel unreadable.' },
  { title: 'Spin', body: 'Click the wheel. The winner is drawn the instant you click — the spinning is the announcement, not the decision — so nothing about the animation can nudge the result.' },
  { title: 'Draw again, or take the winner off', body: 'Tick "take the winner off the wheel" and each spin removes whoever just won. Spin repeatedly for second and third place, or to work through a whole class without asking anyone twice.' },
]

useToolJsonLd(meta, {
  description: meta.description,
  featureList: [
    'Spinning wheel with one slice per name',
    'Drawn with crypto.getRandomValues, not Math.random',
    'Weights, so an entry can be worth several slices',
    'Remove the winner after each spin, for raffles and registers',
    'The list is saved in your browser and never sent anywhere',
    'Free REST and MCP endpoint for scripts and agents',
  ],
  howTo: { name: 'How to pick a random name with a wheel', steps: howToSteps.map(s => ({ name: s.title, text: s.body })) },
})

const contents = [
  { id: 'howto-heading', label: 'How to use it' },
  { id: 'fair-heading', label: 'What makes it fair' },
  { id: 'uses-heading', label: 'What people use it for' },
  { id: 'faq-heading', label: 'Questions' },
  { id: 'api-heading', label: 'API' },
  { id: 'promise', label: 'The Zeal Promise' },
]

const faq = [
  { q: 'Is the wheel actually random?', a: 'Yes, and in a specific sense worth spelling out. The winner is drawn by asking the browser\'s cryptographic random number generator for bytes and discarding any value that would not divide evenly across your list — the same rejection-sampling technique used to generate keys. The wheel then spins to the answer already drawn. Nothing about the animation, the easing or where you clicked can influence it.' },
  { q: 'Why not just use Math.random?', a: 'Because it is not built for this. Math.random is a fast pseudo-random generator with no guarantee of quality, and the obvious way to turn its output into a list position — take a remainder — quietly favours the entries at the start of the list whenever the range does not divide evenly. On a list of three the bias is small; on a list of a hundred it is measurable. For a tool people use to give away money or pick who goes first, "close enough to random" is not good enough.' },
  { q: 'Does my list of names get uploaded?', a: 'No. The page does the drawing; there is no request to make. Your list is saved in this browser so it is still there next time you open the tool, and that copy stays on your device — you can clear it from the tool itself. Open the network panel and spin: nothing goes out. The optional API endpoint is a separate thing you have to call deliberately.' },
  { q: 'Can I have more than one winner?', a: 'Yes. Tick "take the winner off the wheel" and spin as many times as you need — each spin removes whoever just won, so nobody wins twice, and the list of everyone drawn builds up beside the wheel in order. That is the right model for first, second and third place, or for drawing five names out of two hundred.' },
  { q: 'How do I give someone better odds?', a: 'Write ×3 after their name. They get three slices instead of one, so on a wheel of ten other names they have three chances in thirteen rather than one in eleven. Any whole number up to 999 works. This is how giveaways with earned entries are normally run, and it is why the slice sizes on the wheel are not all equal.' },
  { q: 'Why did the wheel jump back to the start?', a: 'Because the winner was removed. Every remaining name shifts round to fill the gap, so the wheel would otherwise be sitting there pointing at somebody who did not win. Snapping back to the top is the honest picture — the banner still names the winner, and the next spin starts clean.' },
  { q: 'How many names can I add?', a: 'Five hundred. Past about sixty the slices get too thin to print a name in, so the wheel shows colour alone and the full list stays readable beside it. The draw itself is unaffected — a wheel of five hundred is drawn exactly as fairly as a wheel of five.' },
  { q: 'Can I use it for a giveaway or prize draw?', a: 'Yes, and people do. Two honest caveats. It produces no certificate or audit log, so if you need to prove fairness to a regulator you want a service built for that. And it cannot verify the list — if a name is in there twice by accident, that person genuinely does have double the chance. Remove duplicates first; there is a button for it.' },
  { q: 'Does it work offline?', a: 'Yes. Once the page has loaded there is nothing left to fetch — the wheel, the drawing and your saved list are all local. It is also fine on a projector or a phone, which is mostly how it gets used.' },
  { q: 'Is there a catch?', a: 'No. No sign-up, no ads, no watermark on anything, no limit on spins, and nothing to install. It is MIT licensed, and the drawing and the wheel geometry are a couple of hundred lines you can read in the repository.' },
]
</script>

<template>
  <div class="container-page py-10">
    <ToolPageHeader
      title="Name Picker"
      description="Paste a list, spin the wheel, get a winner. The draw uses real cryptographic randomness, and your list never leaves this browser."
    />

    <ClientOnly>
      <NamePickerTool />
      <template #fallback>
        <div class="grid tool-frame place-items-center rounded-2xl border border-border text-sm text-muted-foreground">
          Loading the wheel…
        </div>
      </template>
    </ClientOnly>

    <section class="mt-12 flex flex-wrap gap-2 text-sm" aria-label="Related pages">
      <NuxtLink to="/tools/name-picker/wheel" class="rounded-full border border-border px-4 py-1.5 transition-colors hover:border-primary/40 hover:text-primary">
        Wheel of names →
      </NuxtLink>
      <NuxtLink to="/tools/name-picker/raffle" class="rounded-full border border-border px-4 py-1.5 transition-colors hover:border-primary/40 hover:text-primary">
        Raffle winner picker →
      </NuxtLink>
      <NuxtLink to="/tools/name-picker/classroom" class="rounded-full border border-border px-4 py-1.5 transition-colors hover:border-primary/40 hover:text-primary">
        Classroom picker →
      </NuxtLink>
      <NuxtLink to="/tools/password-generator" class="rounded-full border border-border px-4 py-1.5 transition-colors hover:border-primary/40 hover:text-primary">
        Password generator →
      </NuxtLink>
    </section>

    <ToolContents :items="contents">
      <section aria-labelledby="howto-heading" class="rounded-2xl bg-muted/50 p-6 sm:p-8">
        <h2 id="howto-heading" class="text-xl font-semibold">
          How to pick a random name
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
          What makes a wheel fair, and what does not
        </h2>
        <div class="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground">
          <p>
            <strong class="text-foreground">The wheel is a picture of a decision that has already been
              made.</strong> The moment you click, the winner is drawn; the five seconds of spinning exist
            so everyone watching sees it happen, not so the computer can work anything out. The alternative
            — give the wheel a random shove, let friction slow it down, and read off whatever ends up under
            the pointer — sounds more honest and is worse. Fairness then depends on an easing curve, the
            frame rate of the device, and whether a rounding error puts the pointer a hair on the wrong side
            of a boundary.
          </p>
          <p>
            <strong class="text-foreground">The draw itself uses the same source as a password.</strong>
            The browser is asked for cryptographic random bytes, and any value that would not divide evenly
            across the list is thrown away and re-drawn. That second part matters more than it sounds. The
            obvious shortcut is to take a remainder — a random number modulo the number of names — and that
            gives the first few entries in the list a slightly better chance every time the list length does
            not divide the range evenly. With ten names it is a rounding error. With a hundred it is a
            visible thumb on the scale.
          </p>
          <p>
            <strong class="text-foreground">What is left is your list.</strong> No amount of good
            randomness fixes a name that appears twice, so there is a button that removes duplicates and a
            count beside the box so you can check it against your register. And weights are deliberate and
            visible: if someone has ×3 after their name, their slice is three times the size, and you can
            see it on the wheel rather than having to take anyone's word for it.
          </p>
        </div>
      </section>

      <section aria-labelledby="uses-heading" class="rounded-2xl bg-muted/50 p-6 sm:p-8">
        <h2 id="uses-heading" class="text-xl font-semibold">
          What people actually use this for
        </h2>
        <div class="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground">
          <p>
            <strong class="text-foreground">Giveaways and prize draws.</strong> Paste the entrants, tick
            remove-after-picking, and spin once per prize. The list of everyone drawn builds up in order
            beside the wheel, which is what you screenshot afterwards.
          </p>
          <p>
            <strong class="text-foreground">Classrooms.</strong> Cold-calling by wheel takes the sting out
            of being picked — nobody thinks the teacher chose them — and with the winner removed after each
            spin it works through a register without asking the same child twice in one lesson.
          </p>
          <p>
            <strong class="text-foreground">Standups and retros.</strong> Who goes first, who facilitates,
            who takes the notes. It is faster than the pause where everyone waits for somebody else to
            volunteer, and it stops the same person getting it every week.
          </p>
          <p>
            <strong class="text-foreground">Deciding anything at all.</strong> Lunch, which task to start
            on, whose turn it is to drive. The names do not have to be people — a wheel of options is a
            perfectly good way to stop a group re-litigating a decision that does not matter.
          </p>
        </div>
      </section>

      <FaqSection :items="faq" class="rounded-2xl bg-muted/50 p-6 sm:p-8" />

      <section id="api" aria-labelledby="api-heading" class="rounded-2xl bg-muted/50 p-6 sm:p-8">
        <h2 id="api-heading" class="text-xl font-semibold">
          API — for scripts and agents
        </h2>
        <p class="mt-2 text-sm text-muted-foreground">
          The same draw behind a free REST endpoint. No API key, no sign-up. Pass
          <code class="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">count</code> for several winners
          and they are drawn without replacement, so nobody wins twice.
        </p>
        <CodeBlock :code="apiSnippet" lang="bash" />
        <p class="mt-3 text-sm text-muted-foreground">
          This one is worth pointing an agent at. A language model asked to pick something at random does
          not draw — it samples from what it finds likely, which leans reproducibly towards the first
          entry, the last, and whatever it has seen most. MCP clients can add
          <code class="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">https://zeal.tools/mcp</code> and
          call the <code class="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">pick_random</code> tool to
          get an actual draw instead.
        </p>
      </section>

      <ZealPromise />
    </ToolContents>
  </div>
</template>
