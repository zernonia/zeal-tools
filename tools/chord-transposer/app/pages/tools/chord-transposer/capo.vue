<script setup lang="ts">
import meta from '../../../../meta'

const { public: { siteUrl } } = useRuntimeConfig()
const pageUrl = `${siteUrl}/tools/${meta.slug}/capo`

useSeoMeta({
  title: 'Capo Calculator — Which Shapes to Play, Free',
  description: 'Work out which chord shapes to play with a capo, and which fret to use to reach a key. Paste a chart and get the shapes back. Free, no sign-up, runs in your browser.',
  ogTitle: 'Capo Calculator — which shapes to play',
  ogDescription: 'Set the key you want to hear and the fret you are on. Get the shapes you actually finger.',
  ogUrl: pageUrl,
  twitterCard: 'summary_large_image',
})

defineOgImage('Default', {
  title: 'Capo Calculator',
  description: 'Set the key you want to hear and the fret you are on. Get the shapes you actually finger.',
})

useToolJsonLd(meta, { variant: 'capo', name: 'Capo Calculator' })

const faq = [
  { q: 'Which direction does a capo move the key?', a: 'Up. A capo shortens every string, so the pitch rises by one semitone per fret. That means the shapes you finger are lower than the key people hear — which is the opposite of what most people guess under pressure.' },
  { q: 'Capo 2 playing G shapes sounds in what key?', a: 'A. Two frets above G is A. The same arithmetic runs in reverse when you know the key you want: to sound in A with a capo on 2, play G shapes.' },
  { q: 'Why use a capo at all instead of just transposing?', a: 'Open strings. Playing E, A, D, G and C shapes gives you ringing open strings that closed barre shapes cannot, and those shapes are far easier to play quickly. A capo lets you keep the easy shapes while matching whatever key the singer needs.' },
  { q: 'Which fret should I choose?', a: 'The one that leaves you with shapes you can play well. Set the key you need to sound and try each fret — the tool shows the shape key for every position, and the familiar ones (C, G, D, A, E) are usually the right answer.' },
  { q: 'Can the whole band use the same capo setting?', a: 'Only the guitars. A capo changes what a guitarist fingers, not what anyone hears, so keyboards, bass and horns all read the sounding key. Print the sounding chart for them and the shape chart for the guitars.' },
  { q: 'Does this work for ukulele or banjo?', a: 'Yes. The arithmetic is the same on any fretted instrument with standard semitone frets — one fret is one semitone regardless of how the instrument is tuned.' },
]
</script>

<template>
  <div class="container-page py-10">
    <ToolPageHeader
      title="Capo Calculator"
      description="Set the key you need to hear and the fret you want to be on. We work out the shapes you actually finger."
    />

    <ClientOnly>
      <ChordTransposerTool />
      <template #fallback>
        <div class="grid h-[1180px] place-items-center rounded-2xl border border-border text-sm text-muted-foreground sm:h-[980px] lg:h-[720px]">
          Loading the calculator…
        </div>
      </template>
    </ClientOnly>

    <section class="mt-12 flex flex-wrap gap-2 text-sm" aria-label="Related tools">
      <NuxtLink to="/tools/chord-transposer" class="rounded-full border border-border px-4 py-1.5 transition-colors hover:border-primary/40 hover:text-primary">
        Full chord transposer →
      </NuxtLink>
    </section>

    <div class="mx-auto mt-16 space-y-12">
      <section aria-labelledby="capo-heading" class="rounded-2xl bg-muted/50 p-6 sm:p-8">
        <h2 id="capo-heading" class="text-xl font-semibold">
          The one thing people get backwards
        </h2>
        <div class="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground">
          <p>
            A capo clamps across the neck and shortens every string at once. Shorter strings mean higher
            pitch, one semitone per fret. So everything you play moves <em>up</em> — and the shapes you
            need to finger are correspondingly <em>lower</em> than what the room hears.
          </p>
          <p>
            That inversion is where it goes wrong. Someone needs a song in B flat, reaches for the capo,
            and transposes the chart up to B flat as well — ending up a long way from the band. The
            correct move is to subtract: with a capo on 3, sounding in B flat means playing G shapes.
          </p>
          <p>
            Set the key you want people to hear, choose a fret, and the shape key updates. Run through the
            frets and pick the position that leaves you with shapes you can play fluently — usually C, G,
            D, A or E, because those give you open strings that ring under the chord. That ringing is the
            whole reason to use a capo instead of barre chords: it is a different sound, not just an
            easier one.
          </p>
          <p>
            One caution for a band: a capo is a guitarist's convenience and nobody else's. Keyboards,
            bass, brass and singers all work in the sounding key. Hand the guitars the shape chart and
            everyone else the sounding chart, or you will spend the first verse discovering the problem.
          </p>
        </div>
      </section>

      <FaqSection :items="faq" class="rounded-2xl bg-muted/50 p-6 sm:p-8" />

      <ZealPromise />
    </div>
  </div>
</template>
