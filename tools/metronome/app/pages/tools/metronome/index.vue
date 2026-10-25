<script setup lang="ts">
import meta from '../../../../meta'

const { public: { siteUrl } } = useRuntimeConfig()

useSeoMeta({
  title: 'Online Metronome — Tap Tempo, Accents and Subdivisions, Free',
  description: 'A free online metronome from 20 to 300 BPM with tap tempo, any number of beats per bar, accented or muted beats, and eighth, triplet and sixteenth subdivisions. Timed on the audio clock, no app, no sign-up.',
  ogTitle: 'Metronome — steady time in the browser',
  ogDescription: 'Tap tempo, accents, subdivisions, 20–300 BPM. Timed on the audio clock so it does not drift. No app, no sign-up.',
  ogUrl: `${siteUrl}/tools/${meta.slug}`,
  twitterCard: 'summary_large_image',
})

defineOgImage('Default', { title: 'Metronome', description: meta.tagline })

const howToSteps = [
  { title: 'Set the tempo', body: 'Type a number, drag the slider, use the plus and minus buttons, or tap along to a recording with Tap tempo. The Italian marking underneath — Andante, Allegro — updates as you go.' },
  { title: 'Shape the bar', body: 'Choose how many beats are in a bar, and press any beat to cycle it between accented, normal and muted. Add a subdivision to hear eighths, triplets or sixteenths between the beats.' },
  { title: 'Press Start', body: 'Or press the space bar. Changes made while it is running take effect on the next beat, so you can push the tempo up without losing your place. The settings are in the address bar, ready to bookmark or send.' },
]

useToolJsonLd(meta, {
  description: meta.description,
  featureList: [
    '20 to 300 BPM, with tap tempo',
    '1 to 12 beats per bar, each accented, normal or muted',
    'Eighth-note, triplet and sixteenth subdivisions',
    'Scheduled on the audio clock for steady timing',
    'Keeps time in a background tab',
    'Settings saved in a shareable link',
    'No app, no sign-up, nothing downloaded',
  ],
  howTo: { name: 'How to use the online metronome', steps: howToSteps.map(s => ({ name: s.title, text: s.body })) },
})

const faq = [
  { q: 'Is an online metronome accurate enough to practise with?', a: 'This one is, because it does not use the page\'s timers to make the clicks. Each click is handed to the browser\'s audio engine ahead of time with an exact start time, measured on the same clock that plays the sound. The page can be busy, or the timer that feeds the engine can run tens of milliseconds late, and the clicks still land where they should. Every click\'s time is calculated from the start rather than added up one after another, so it does not drift over a long session either.' },
  { q: 'How does tap tempo work?', a: 'Press Tap tempo, or the T key, in time with the music — four or more taps give a good reading. It takes the middle value of the gaps between your last eight taps rather than the average, so one rushed or late tap does not throw the result. Pause for two seconds and the next tap starts a fresh measurement.' },
  { q: 'How do I set 6/8 or another compound time?', a: 'Compound time is felt in groups of three. For 6/8 at a moderate tempo, set 2 beats per bar with triplets: each beat is a dotted quarter, and you hear the three eighths inside it. For a slow 6/8, set 6 beats per bar with the first and fourth accented instead. 9/8 and 12/8 work the same way with 3 and 4 beats.' },
  { q: 'How do I practise with fewer clicks?', a: 'Mute beats. Press a beat to cycle it to muted, and it stays silent while the count carries on. Clicking only on beats 2 and 4 is the classic way to practise swing and backbeat feel; muting everything except beat 1 trains you to keep time across the bar on your own.' },
  { q: 'Does it keep going if I switch tabs?', a: 'Yes. Browsers slow down timers on pages you are not looking at, which is what makes many web metronomes stutter the moment you switch to your sheet music. The timer that feeds this one runs in a separate worker that is not slowed down that way. On phones, locking the screen may still suspend audio — that is the operating system, not the page.' },
  { q: 'What do the tempo markings mean?', a: 'They are the traditional Italian terms composers write at the top of a score, roughly from slowest to fastest: Grave, Largo, Larghetto, Adagio, Andante, Moderato, Allegro, Vivace, Presto and Prestissimo. The BPM ranges vary a little between sources and between editions, so treat the marking as a guide to character rather than a rule.' },
  { q: 'Can I save my settings?', a: 'Tempo, beats per bar, subdivision and the accent pattern are kept in the page address as you change them. Bookmark it, or send it to the rest of the band, and it opens exactly as you left it. Nothing is stored on a server, and there is no account to make.' },
  { q: 'Why does it need a press before it makes a sound?', a: 'Browsers do not let a page start playing audio on its own — a click or key press has to come first. That is a good rule, and it is why the metronome waits for Start.' },
]

const contents = [
  { id: 'howto-heading', label: 'How to use it' },
  { id: 'timing-heading', label: 'Why the timing holds' },
  { id: 'practice-heading', label: 'Practising with it' },
  { id: 'faq-heading', label: 'Questions' },
  { id: 'promise', label: 'The Zeal Promise' },
]
</script>

<template>
  <div class="container-page py-10">
    <ToolPageHeader
      title="Metronome"
      description="A steady click from 20 to 300 BPM, with tap tempo, accented and muted beats, and subdivisions — timed on the audio clock, in your browser."
    />

    <MetronomeTool />

    <section class="mt-12 flex flex-wrap gap-2 text-sm" aria-label="Related tools">
      <NuxtLink to="/tools/tuner" class="rounded-full border border-border px-4 py-1.5 transition-colors hover:border-primary/40 hover:text-primary">
        Tuner →
      </NuxtLink>
      <NuxtLink to="/tools/chord-transposer" class="rounded-full border border-border px-4 py-1.5 transition-colors hover:border-primary/40 hover:text-primary">
        Chord transposer →
      </NuxtLink>
      <NuxtLink to="/tools/worship-pads" class="rounded-full border border-border px-4 py-1.5 transition-colors hover:border-primary/40 hover:text-primary">
        Worship pads →
      </NuxtLink>
    </section>

    <ToolContents :items="contents">
      <section aria-labelledby="howto-heading" class="rounded-2xl bg-muted/50 p-6 sm:p-8">
        <h2 id="howto-heading" class="text-xl font-semibold">
          How to use the online metronome
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

      <section aria-labelledby="timing-heading" class="rounded-2xl bg-muted/50 p-6 sm:p-8">
        <h2 id="timing-heading" class="text-xl font-semibold">
          Why the timing holds
        </h2>
        <div class="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground">
          <p>
            The obvious way to build a metronome in a web page is a timer that fires every beat and plays a
            click. It is also the wrong way. Page timers are a request, not a promise: the browser runs them
            when it gets round to it, which can be a few milliseconds late when the page is busy and far
            later when it is in the background. You can hear a few milliseconds of wobble in a click track,
            and a metronome that wobbles is worse than none.
          </p>
          <p>
            <strong class="text-foreground">This one separates deciding from playing.</strong> A timer still
            wakes up every 25 milliseconds, but all it does is look a little way ahead and hand every click
            due in the next tenth of a second to the browser&rsquo;s audio engine, each stamped with its exact
            start time. The audio engine runs on its own clock, on its own thread, and starts each click to
            the sample. A late timer only means the next batch is handed over a little later; the clicks
            themselves do not move.
          </p>
          <p>
            Each click&rsquo;s time is worked out from when you pressed Start, not by adding one beat to the
            last. Adding up intervals gathers tiny rounding errors, and over twenty minutes they become
            audible drift; multiplying from a fixed point does not. When you change tempo mid-play, the
            change is pinned to the next beat, so the bar you are in finishes at the speed it started.
          </p>
        </div>
      </section>

      <section aria-labelledby="practice-heading" class="rounded-2xl bg-muted/50 p-6 sm:p-8">
        <h2 id="practice-heading" class="text-xl font-semibold">
          Getting more out of a click
        </h2>
        <div class="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground">
          <p>
            <strong class="text-foreground">Start slow enough to play it clean.</strong> The usual advice
            for a hard passage is to find the tempo where you can play it perfectly three times in a row,
            then go up a few BPM. The plus button and the + key move one BPM at a time, and the change waits
            for the next beat, so you can nudge it up without stopping.
          </p>
          <p>
            <strong class="text-foreground">Use subdivisions to fix rushing.</strong> Most timing problems
            live between the beats. Hearing the eighths or sixteenths makes it obvious when a run is
            racing ahead, and once it is even, switch back to plain beats and see if it holds.
          </p>
          <p>
            <strong class="text-foreground">Then take clicks away.</strong> Muting beats makes the
            metronome do less of the work. Clicks on 2 and 4 only give a backbeat to swing against; a single
            click on beat 1 of every bar leaves you to keep time on your own for the rest. When the click
            and you still land together on the downbeat, your time is your own.
          </p>
          <p>
            For a band, set the tempo and send the link: the address carries the tempo, the bar and the
            accents, so everyone practises to the same click.
          </p>
        </div>
      </section>

      <FaqSection :items="faq" class="rounded-2xl bg-muted/50 p-6 sm:p-8" />

      <ZealPromise />
    </ToolContents>
  </div>
</template>
