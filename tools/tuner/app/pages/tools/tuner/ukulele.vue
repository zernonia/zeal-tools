<script setup lang="ts">
import meta from '../../../../meta'

const { public: { siteUrl } } = useRuntimeConfig()

useSeoMeta({
  title: 'Ukulele Tuner — Free, In Your Browser, No App',
  description: 'Tune a ukulele through your microphone, in standard re-entrant GCEA. The audio is analysed on your device and never recorded. Free, no sign-up, no app.',
  ogTitle: 'Ukulele Tuner — GCEA, in your browser',
  ogDescription: 'Standard re-entrant tuning, analysed on your device. No app.',
  ogUrl: `${siteUrl}/tools/${meta.slug}/ukulele`,
  twitterCard: 'summary_large_image',
})

defineOgImage('Default', { title: 'Ukulele Tuner', description: 'Standard re-entrant tuning, analysed on your device. No app.' })

useToolJsonLd(meta, {
  variant: 'ukulele',
  name: 'Ukulele Tuner',
  description: 'Tune a ukulele through your microphone, in standard re-entrant GCEA. The audio is analysed on your device and never recorded. Free, no sign-up, no app.',
  featureList: ['Standard re-entrant GCEA tuning', 'Shows which string you are aiming at', 'Analysed on your device, never recorded', 'No sign-up and no app'],
})

const contents = [
  { id: 'why-heading', label: 'The high fourth string' },
  { id: 'faq-heading', label: 'Questions' },
  { id: 'promise', label: 'The Zeal Promise' },
]

const faq = [
  { q: 'Which string is which?', a: 'Held in playing position, the string nearest your face is the fourth — G — and it is the highest sounding of the four. Then C, E and A as you move down towards the floor. The tuner shows which one you are aiming at as you play.' },
  { q: 'Why is my G string higher than my C?', a: 'Because that is standard ukulele tuning, and it is deliberate. Re-entrant tuning is what gives the instrument its bright, jangly character; a low fourth string turns it into something closer to a small guitar.' },
  { q: 'I have a low-G ukulele. Can I still use this?', a: 'Yes — switch on chromatic mode and tune that string to G3 instead of G4, an octave below. The other three are unchanged. Chromatic mode simply names the nearest note rather than assuming a tuning.' },
  { q: 'Does this work for a baritone ukulele?', a: 'A baritone is tuned D G B E, like the top four strings of a guitar, so the standard preset here does not fit. Use chromatic mode and tune to D3, G3, B3 and E4.' },
  { q: 'Why does it go out of tune so quickly?', a: 'Nylon strings stretch far more than steel, and a new set keeps stretching for several days. Retune often at first, and stretch each string gently by hand to speed it up. Once settled, a ukulele holds tune about as well as anything else.' },
]
</script>

<template>
  <div class="container-page py-10">
    <ToolPageHeader
      title="Ukulele Tuner"
      description="Standard GCEA tuning through your microphone, with the audio analysed on your device and never recorded."
    />

    <ClientOnly>
      <TunerTool default-tuning="ukulele" />
      <template #fallback>
        <div class="grid tool-frame place-items-center rounded-2xl border border-border text-sm text-muted-foreground">
          Loading the tuner…
        </div>
      </template>
    </ClientOnly>

    <ToolContents :items="contents">
      <section aria-labelledby="why-heading" class="rounded-2xl bg-muted/50 p-6 sm:p-8">
        <h2 id="why-heading" class="text-xl font-semibold">
          The string that is not where you expect it
        </h2>
        <div class="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground">
          <p>A ukulele in standard tuning is G C E A, and the surprise is that the G is the <em>highest</em> of the four, not the lowest. The fourth string — the one nearest your face, where a guitar would put its deepest note — sits a tone above the third. That is called re-entrant tuning, and it is the reason a ukulele sounds like a ukulele rather than like a small guitar.</p>
          <p><strong class="text-foreground">It also means you cannot tune it by ear from low to high the way you would a guitar.</strong> Running down the strings in order gives you a rising then falling pattern, and anyone assuming otherwise ends up tuning the G string an octave down and wondering why the chords sound thick and wrong.</p>
          <p>Low-G tuning does exactly that on purpose: the fourth string is replaced with a wound one and tuned an octave below, giving a wider range at the cost of the characteristic jangle. If that is what you are playing, use the chromatic mode here and tune that string to G3 rather than G4.</p>
          <p>Nylon strings need patience. They stretch far more than steel and go on stretching for days after a new set goes on, so expect to retune several times a session at first — that is the string settling, not the tuning slipping.</p>
        </div>
      </section>

      <FaqSection :items="faq" class="rounded-2xl bg-muted/50 p-6 sm:p-8" />

      <ZealPromise />
    </ToolContents>
  </div>
</template>
