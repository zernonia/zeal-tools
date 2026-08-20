<script setup lang="ts">
import meta from '../../../../meta'

const { public: { siteUrl } } = useRuntimeConfig()

useSeoMeta({
  title: 'Bass Tuner — Free, In Your Browser, No App',
  description: 'Tune a four or five string bass through your microphone. Built to handle low notes, where most tuners guess an octave wrong. Nothing recorded, no sign-up, no app.',
  ogTitle: 'Bass Tuner — built for the low strings',
  ogDescription: 'Four and five string, down to a low B. Analysed on your device.',
  ogUrl: `${siteUrl}/tools/${meta.slug}/bass`,
  twitterCard: 'summary_large_image',
})

defineOgImage('Default', { title: 'Bass Tuner', description: 'Four and five string, down to a low B. Analysed on your device.' })

useToolJsonLd(meta, {
  variant: 'bass',
  name: 'Bass Tuner',
  description: 'Tune a four or five string bass through your microphone. Built to handle low notes, where most tuners guess an octave wrong. Nothing recorded, no sign-up, no app.',
  featureList: ['Four and five string tunings', 'Handles a low B at 31 Hz', 'Analysed on your device, never recorded', 'No sign-up and no app'],
})

const contents = [
  { id: 'why-heading', label: 'Why bass is harder' },
  { id: 'faq-heading', label: 'Questions' },
  { id: 'promise', label: 'The Zeal Promise' },
]

const faq = [
  { q: 'Does it handle a five string low B?', a: 'Yes. The detector searches down to 28 Hz, comfortably below the 30.9 Hz of a low B, and the five-string tuning is in the instrument list. It is the hardest note on the instrument to measure, so give it a firm pluck and a second to settle.' },
  { q: 'Why does my low string read an octave high on other tuners?', a: 'Because the fundamental of a plucked bass string is often quieter than the harmonic above it, and simpler detection follows whichever repetition is strongest. This tuner normalises by the signal\'s own energy at each candidate period and prefers the first plausible one, which is what stops that error.' },
  { q: 'Should I tune plugged in or acoustically?', a: 'Acoustically is fine and is what the microphone hears. An unplugged electric bass is quiet but well within range — hold it near the device, away from anything humming, and pluck firmly.' },
  { q: 'Why is the reading unsteady at first?', a: 'The attack of a plucked bass note is a mess of harmonics and string noise that settles into a clear pitch after a moment. Wait for the note to bloom rather than reading the instant you pluck, and it will steady.' },
  { q: 'My bass will not stay in tune.', a: 'Usually new strings still stretching, or the neck responding to a change in temperature or humidity. Stretch new strings by hand and retune several times over the first hour. If it drifts sharp and flat between sessions with old strings, it is the neck moving, not the tuning.' },
]
</script>

<template>
  <div class="container-page py-10">
    <ToolPageHeader
      title="Bass Tuner"
      description="Four or five string, down to a low B — tuned through your microphone, with the audio analysed on your device and never recorded."
    />

    <ClientOnly>
      <TunerTool default-tuning="bass-standard" />
      <template #fallback>
        <div class="grid tool-frame place-items-center rounded-2xl border border-border text-sm text-muted-foreground">
          Loading the tuner…
        </div>
      </template>
    </ClientOnly>

    <ToolContents :items="contents">
      <section aria-labelledby="why-heading" class="rounded-2xl bg-muted/50 p-6 sm:p-8">
        <h2 id="why-heading" class="text-xl font-semibold">
          Why a bass is harder to tune than a guitar
        </h2>
        <div class="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground">
          <p>A low E on a bass repeats about 41 times a second, and a five-string&rsquo;s low B only about 31. That sounds like a detail and is the whole difficulty: to measure a pitch you need several repetitions of it, so a low B needs roughly a fifth of a second of audio before there is anything to measure. Everything about a bass tuner is slower than a guitar tuner for that reason alone.</p>
          <p><strong class="text-foreground">The fundamental is also the quiet part.</strong> On a plucked bass string the harmonics above the note frequently carry more energy than the note itself, and a small speaker or laptop microphone may barely reproduce the fundamental at all. Pitch detection that follows the loudest repetition therefore reports the octave above — which is the single most common wrong answer a bass player gets from a tuner.</p>
          <p>This one measures the signal against a delayed copy of itself and divides out its own energy at each candidate period, so a loud harmonic does not outweigh a quiet fundamental, and then takes the first plausible period rather than the strongest. That is the difference between reading a low B as B0 and reading it as B1.</p>
          <p>Practically: pluck nearer the bridge for a clearer fundamental, let the note ring rather than damping it, and give the reading a moment to settle before you judge it.</p>
        </div>
      </section>

      <FaqSection :items="faq" class="rounded-2xl bg-muted/50 p-6 sm:p-8" />

      <ZealPromise />
    </ToolContents>
  </div>
</template>
