<script setup lang="ts">
import meta from '../../../../meta'

const { public: { siteUrl } } = useRuntimeConfig()
const pageUrl = `${siteUrl}/tools/${meta.slug}`

useSeoMeta({
  title: 'Chord Transposer — Change the Key of Any Chart, Free',
  description: 'Transpose chord charts to any key in your browser. Lyrics and layout stay exactly as they were. Capo calculator included. No sign-up, no watermark, open source.',
  ogTitle: 'Chord Transposer — change the key of any chart',
  ogDescription: 'Paste a chart, pick a key. Chords move, lyrics do not. Free, no sign-up, works offline.',
  ogUrl: pageUrl,
  twitterCard: 'summary_large_image',
})

defineOgImage('Default', {
  title: 'Chord Transposer',
  description: 'Paste a chart, pick a key. Chords move, lyrics do not. Free, no sign-up, works offline.',
})

const faq = [
  { q: 'Will it change my lyrics?', a: 'No. A line is only transposed when every word on it parses as a chord, so a lyric line beginning with "And" or "Amazing" is left alone. That single rule is what separates a usable transposer from one that quietly corrupts your words.' },
  { q: 'Does the alignment survive?', a: 'Yes. Chords are rebuilt at their original columns, so a chart with chords sitting above particular syllables still lines up afterwards. Where a chord gets longer — C becoming C# — everything after it shifts by the minimum needed rather than collapsing.' },
  { q: 'Will it use sharps or flats?', a: 'Whichever the destination key uses. Transposing into B flat gives you Bb and Eb; transposing into D gives you F# and C#. Musicians read a chart far faster when the accidentals match the key signature they expect.' },
  { q: 'How does the capo setting work?', a: 'A capo raises the pitch, so you finger a lower key than the one people hear. Set the key you want to sound and the capo fret, and you get the shapes to actually play. Capo 2 with a chart sounding in D means playing C shapes.' },
  { q: 'Does it handle slash chords and extensions?', a: 'Yes. D/F# transposes to E/G# — both the chord and the bass note move. Extensions and alterations like maj7, m7b5, sus4 and add9 are carried across untouched, because only the root and bass need to change.' },
  { q: 'Is my chart uploaded anywhere?', a: 'No. The transposition runs entirely in your browser using our own open-source code. Nothing is sent to a server, which also means it keeps working if the wifi at your venue does not.' },
  { q: 'Can I use it for a whole songbook?', a: 'Yes, and there is a free REST API if you want to transpose in bulk from a script or spreadsheet. No API key and no sign-up — the same code that runs on this page runs behind the endpoint.' },
  { q: 'What if it does not recognise my chart?', a: 'Chords need to be on their own lines, above the lyrics. Charts with chords embedded inline in square brackets are a different format and are not supported yet. If nothing is detected, the page tells you rather than silently returning your text unchanged.' },
]

const apiSnippet = `# Transpose a chart from C to D
curl -X POST https://zeal.tools/api/v1/chords \\
  -H 'content-type: application/json' \\
  -d '{"chart": "C   G\\nAm  F", "fromKey": "C", "toKey": "D"}'

# Or move by a fixed number of semitones
curl -X POST https://zeal.tools/api/v1/chords \\
  -H 'content-type: application/json' \\
  -d '{"chart": "C   G", "semitones": 3}'`

const howToSteps = [
  { title: 'Paste your chart', body: 'Chords on their own lines with lyrics underneath — the format almost every chart already uses. Nothing needs reformatting first.' },
  { title: 'Set the two keys', body: 'Pick the key it is written in and the key you want. If we can work out the original from the chords, we will offer it as a one-click correction.' },
  { title: 'Add a capo if you want one', body: 'Set the fret and the output switches to the shapes you actually finger, while still sounding in the key you chose.' },
  { title: 'Copy it out', body: 'One button copies the transposed chart, spacing intact, ready to paste into your song sheet or projection software.' },
]

useToolJsonLd(meta, {
  description: meta.description,
  howTo: {
    name: 'How to transpose a chord chart',
    steps: howToSteps.map(step => ({ name: step.title, text: step.body })),
  },
})
</script>

<template>
  <div class="container-page py-10">
    <ToolPageHeader
      title="Chord Transposer"
      description="Change the key of any chord chart. The chords move, your lyrics and spacing stay exactly where they were."
    />

    <ClientOnly>
      <ChordTransposerTool />
      <template #fallback>
        <div class="grid h-[1180px] place-items-center rounded-2xl border border-border text-sm text-muted-foreground sm:h-[980px] lg:h-[720px]">
          Loading the transposer…
        </div>
      </template>
    </ClientOnly>

    <section class="mt-12 flex flex-wrap gap-2 text-sm" aria-label="Related tools">
      <NuxtLink to="/tools/chord-transposer/capo" class="rounded-full border border-border px-4 py-1.5 transition-colors hover:border-primary/40 hover:text-primary">
        Capo calculator →
      </NuxtLink>
      <NuxtLink to="/tools/worship-pads" class="rounded-full border border-border px-4 py-1.5 transition-colors hover:border-primary/40 hover:text-primary">
        Worship pads →
      </NuxtLink>
    </section>

    <div class="mx-auto mt-16 space-y-12">
      <section aria-labelledby="howto-heading" class="rounded-2xl bg-muted/50 p-6 sm:p-8">
        <h2 id="howto-heading" class="text-xl font-semibold">
          How to transpose a chord chart
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

      <section aria-labelledby="concepts-heading" class="rounded-2xl bg-muted/50 p-6 sm:p-8">
        <h2 id="concepts-heading" class="text-xl font-semibold">
          Why transposing by hand goes wrong
        </h2>
        <div class="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground">
          <p>
            Transposing is simple arithmetic — every chord moves the same number of semitones — and it is
            still one of the easiest things to get wrong at half past seven on a Sunday morning. The
            arithmetic is not the hard part. The hard part is everything around it.
          </p>
          <p>
            <strong class="text-foreground">Spelling.</strong> The note a semitone above A can be written
            A sharp or B flat. They sound identical and they are not interchangeable on paper: a chart in
            B flat that spells its chords with sharps forces the reader to translate every one of them
            mid-song. This tool picks the spelling that matches the destination key signature, so a chart
            transposed into E flat comes back reading Eb, Ab and Bb rather than D#, G# and A#.
          </p>
          <p>
            <strong class="text-foreground">Layout.</strong> In a chords-over-lyrics chart, the horizontal
            position of a chord is information — it says which syllable to change on. Naive
            find-and-replace destroys that the moment a chord changes width. Rebuilding the line so each
            chord lands back at its original column, and only shifting when a chord genuinely grew, keeps
            the chart readable.
          </p>
          <p>
            <strong class="text-foreground">Knowing what is a chord.</strong> The letters A through G are
            also ordinary words and the starts of many more. &ldquo;And&rdquo;, &ldquo;Amazing&rdquo;,
            &ldquo;Ends&rdquo;, &ldquo;Be&rdquo;, &ldquo;Father&rdquo; — a transposer that treats any
            token starting with A–G as a chord will quietly rewrite the lyrics. We only transpose a line
            when <em>every</em> token on it parses as a real chord, and a chord quality has to decompose
            into recognised parts: maj7 is maj plus 7, m7b5 is m plus 7 plus b5. &ldquo;nd&rdquo; is not
            a chord quality, so &ldquo;And&rdquo; is not a chord.
          </p>
          <p>
            <strong class="text-foreground">Capos.</strong> A capo shortens every string, raising the
            pitch. So the shapes you finger are <em>lower</em> than the key you hear — capo 2 playing C
            shapes sounds in D. People routinely transpose the wrong direction here, arriving at a chart
            a whole tone away from the band. Setting the sounding key and the fret separately means the
            tool does that subtraction for you.
          </p>
          <p>
            Slash chords need both halves moved: D/F# in the key of D becomes E/G# in E, not E/F#. And
            extensions ride along unchanged — only the root and the bass note are pitches, so sus4,
            add9 and m7b5 simply travel with their chord.
          </p>
        </div>
      </section>

      <FaqSection :items="faq" class="rounded-2xl bg-muted/50 p-6 sm:p-8" />

      <section id="api" aria-labelledby="api-heading" class="rounded-2xl bg-muted/50 p-6 sm:p-8">
        <h2 id="api-heading" class="text-xl font-semibold">
          API — same transposer, no key required
        </h2>
        <p class="mt-2 text-sm text-muted-foreground">
          The exact code that runs on this page also runs behind a free REST endpoint, for transposing a
          whole songbook at once. No API key, no sign-up, honest rate limits.
        </p>
        <CodeBlock :code="apiSnippet" lang="bash" />
        <p class="mt-3 text-sm text-muted-foreground">
          MCP clients can call the same core: add <code class="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">https://zeal.tools/mcp</code>
          to your client and use the <code class="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">transpose_chords</code> tool.
        </p>
      </section>

      <ZealPromise />
    </div>
  </div>
</template>
