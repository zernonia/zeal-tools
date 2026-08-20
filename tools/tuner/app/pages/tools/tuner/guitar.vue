<script setup lang="ts">
import meta from '../../../../meta'

const { public: { siteUrl } } = useRuntimeConfig()

useSeoMeta({
  title: 'Guitar Tuner — Free, In Your Browser, No App',
  description: 'Tune a guitar through your microphone: standard, drop D, half step down or open G. The audio is analysed on your device and never recorded. Free, no sign-up, no app.',
  ogTitle: 'Guitar Tuner — nothing recorded, nothing uploaded',
  ogDescription: 'Standard, drop D, half step down and open G, straight in the browser.',
  ogUrl: `${siteUrl}/tools/${meta.slug}/guitar`,
  twitterCard: 'summary_large_image',
})

defineOgImage('Default', { title: 'Guitar Tuner', description: 'Standard, drop D, half step down and open G, straight in the browser.' })

useToolJsonLd(meta, {
  variant: 'guitar',
  name: 'Guitar Tuner',
  description: 'Tune a guitar through your microphone: standard, drop D, half step down or open G. The audio is analysed on your device and never recorded. Free, no sign-up, no app.',
  featureList: ['Standard, drop D, half step down and open G', 'Shows which string you are aiming at', 'Analysed on your device, never recorded', 'No sign-up and no app'],
})

const contents = [
  { id: 'why-heading', label: 'Tuning order' },
  { id: 'faq-heading', label: 'Questions' },
  { id: 'promise', label: 'The Zeal Promise' },
]

const faq = [
  { q: 'Which tuning should I pick?', a: 'Standard — E A D G B E — unless you know otherwise. Drop D lowers only the sixth string a whole tone and is common in rock and folk. Half step down tunes everything a semitone flat, which suits singers and gives a slacker feel. Open G tunes the guitar to a chord itself and is a slide and blues tuning.' },
  { q: 'Why does my low E read as an octave too high on other tuners?', a: 'Because a plucked low E often has a first harmonic louder than the fundamental, and simpler pitch detection follows the loudest repetition it can find. This tuner divides out the signal\'s own energy at each candidate period and takes the first that clears a threshold rather than the strongest, which is specifically what stops that octave error.' },
  { q: 'Do I need to tune with the guitar plugged in?', a: 'No. Acoustic or electric, the microphone hears the instrument itself. On an electric, playing unplugged is quieter but perfectly loud enough — hold the guitar within a metre of the device and away from anything humming.' },
  { q: 'It says in tune but my chords sound wrong.', a: 'Almost always intonation rather than tuning. Pressing a string to a fret stretches it slightly sharp, and how far depends on the height of the strings and where the saddle sits. If open strings read true but fretted notes at the twelfth fret are sharp, the guitar needs setting up rather than retuning.' },
  { q: 'How often should I retune?', a: 'Every time you pick it up, and again after a few minutes of playing if the strings are new or the room has changed temperature. Wood and steel both move; a guitar that was perfect last night rarely still is.' },
]
</script>

<template>
  <div class="container-page py-10">
    <ToolPageHeader
      title="Guitar Tuner"
      description="Standard, drop D, half step down or open G — tuned through your microphone, with the audio analysed on your device and never recorded."
    />

    <ClientOnly>
      <TunerTool default-tuning="guitar-standard" />
      <template #fallback>
        <div class="grid tool-frame place-items-center rounded-2xl border border-border text-sm text-muted-foreground">
          Loading the tuner…
        </div>
      </template>
    </ClientOnly>

    <ToolContents :items="contents">
      <section aria-labelledby="why-heading" class="rounded-2xl bg-muted/50 p-6 sm:p-8">
        <h2 id="why-heading" class="text-xl font-semibold">
          The order you tune in matters more than you would think
        </h2>
        <div class="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground">
          <p>A guitar is not six independent strings. Every one of them pulls on the same neck, so tightening the low E bends the neck a fraction and drops the pitch of the five you already did. On a guitar that is badly out, one pass is never enough — tune all six, then go round again, and the second pass will be much smaller than the first.</p>
          <p><strong class="text-foreground">Always arrive at the note from below.</strong> Tuning machines and the winding on the post both have slack in them; coming up to the pitch leaves everything under tension where it will stay, while coming down leaves it loose enough to creep flat over the next few minutes. If you overshoot, drop well below and come back up.</p>
          <p>The B string is the one that will annoy you. It sits where the guitar&rsquo;s equal-tempered compromise is least comfortable, so a B tuned perfectly against a tuner can still sound slightly sour in an open G or D chord. Plenty of players tune it a couple of cents flat by ear afterwards, and that is not a mistake — it is the instrument, not the tuner.</p>
          <p>Fresh strings are a separate problem. They stretch for the first hour or so of playing, so a new set will go flat repeatedly no matter how carefully you tune it. Stretch each one gently by hand, retune, and repeat until it stops moving.</p>
        </div>
      </section>

      <FaqSection :items="faq" class="rounded-2xl bg-muted/50 p-6 sm:p-8" />

      <ZealPromise />
    </ToolContents>
  </div>
</template>
