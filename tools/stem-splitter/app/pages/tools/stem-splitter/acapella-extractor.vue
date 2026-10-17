<script setup lang="ts">
import meta from '../../../../meta'

const { public: { siteUrl } } = useRuntimeConfig()

useSeoMeta({
  title: 'Acapella Extractor — Isolate Vocals from Any Song, No Upload',
  description: 'Extract the a cappella from any song in your browser and download the isolated vocals as WAV. The audio is never uploaded — the AI model runs on your own machine. Free, no sign-up, no watermark, no credits.',
  ogTitle: 'Acapella Extractor — isolated vocals without uploading your song',
  ogDescription: 'Pull the vocals out of a song for a remix, a mashup or a vocal study. Runs in your browser; nothing is uploaded.',
  ogUrl: `${siteUrl}/tools/${meta.slug}/acapella-extractor`,
  twitterCard: 'summary_large_image',
})

defineOgImage('Default', { title: 'Acapella Extractor', description: 'Isolate the vocals from any song — in your browser, nothing uploaded.' })

useToolJsonLd(meta, {
  variant: 'acapella-extractor',
  name: 'Acapella Extractor',
  description: 'Isolate the vocals from a song to make an a cappella for remixing, mashups or vocal practice. Runs in the browser; the audio is never uploaded.',
  featureList: [
    'Isolated vocals from any song',
    'Separated by an AI model, not phase cancellation',
    'Runs in the browser — the song is never uploaded',
    'Full-length stereo 16-bit WAV, no watermark',
  ],
  howTo: {
    name: 'How to extract the a cappella from a song',
    steps: [
      { name: 'Drop the song in', text: 'Drop an MP3, WAV, M4A, FLAC or OGG onto the page. It is read locally and never uploaded.' },
      { name: 'Wait for the separation', text: 'The model downloads once and is cached, then separates the song into vocals, drums, bass and other on your own machine.' },
      { name: 'Check the vocals', text: '"Vocals only" is already selected. Listen to the gaps between phrases, where leftover instruments are easiest to hear.' },
      { name: 'Download', text: 'Save the a cappella as a WAV, or every stem as a zip.' },
    ],
  },
})

const contents = [
  { id: 'remix-heading', label: 'Using an a cappella' },
  { id: 'quality-heading', label: 'What makes a clean one' },
  { id: 'tidy-heading', label: 'Tidying it up afterwards' },
  { id: 'faq-heading', label: 'Questions' },
  { id: 'promise', label: 'The Zeal Promise' },
]

const faq = [
  { q: 'How do I extract the vocals from a song?', a: 'Drop the song in and wait for it to separate — the "Vocals only" mix is already selected on this page. Press play to check it, then Download a cappella. That WAV is the vocal stem on its own, at full length and in stereo.' },
  { q: 'Are backing vocals included?', a: 'Yes. The model treats every sung voice as vocals, lead and harmonies alike, so they arrive together in one stem. There is no way to split the lead from the backing vocals here.' },
  { q: 'Will the reverb come with the vocal?', a: 'Mostly. Reverb and delay that belong to the voice are usually kept with it, which is what makes an a cappella sound like the record rather than a dry booth take. Long tails can thin out, and some can be counted as "other", so expect the very end of each phrase to be the least exact part.' },
  { q: 'Why do I hear a ghost of the hi-hat?', a: 'Cymbals spread across the same high frequencies as the breath and consonants in a voice, so a faint wash can stay in the vocal stem. In a new mix it is usually buried; on its own you can tame it with a gentle high-shelf cut or a noise gate between phrases.' },
  { q: 'Can I get the instrumental from the same split?', a: 'Yes — choose "No vocals" and the download saves the instrumental instead. The same separation produces both, so switching costs nothing. The vocal remover page opens on that mix.' },
  { q: 'Is my song uploaded?', a: 'No. The model runs in your browser on your own hardware, and the song is decoded, separated and saved without leaving the tab. That matters for an unreleased track or a client’s session, which should not be sent to a stranger’s server to be split.' },
  { q: 'Can I release a remix made with an a cappella from here?', a: 'The tool asserts no rights over the output, and there is no watermark. The vocal still belongs to the singer and the label, though: a remix of a commercial track needs their permission to release, however the a cappella was made. For your own recordings, it is all yours.' },
]
</script>

<template>
  <div class="container-page py-10">
    <ToolPageHeader
      title="Acapella Extractor"
      description="Pull the vocals out of any song for a remix, a mashup or a closer listen — or take them away for an instrumental. Separated in your browser, so the song never leaves your device."
    />

    <StemSplitterTool variant="acapella-extractor" />

    <section class="mt-12 flex flex-wrap gap-2 text-sm" aria-label="Related pages">
      <NuxtLink to="/tools/stem-splitter" class="rounded-full border border-border px-4 py-1.5 transition-colors hover:border-primary/40 hover:text-primary">
        All four stems →
      </NuxtLink>
      <NuxtLink to="/tools/stem-splitter/vocal-remover" class="rounded-full border border-border px-4 py-1.5 transition-colors hover:border-primary/40 hover:text-primary">
        Vocal remover →
      </NuxtLink>
    </section>

    <ToolContents :items="contents">
      <section aria-labelledby="remix-heading" class="rounded-2xl bg-muted/50 p-6 sm:p-8">
        <h2 id="remix-heading" class="text-xl font-semibold">
          What people do with an a cappella
        </h2>
        <div class="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground">
          <p>
            <strong class="text-foreground">Remixes and mashups.</strong> A vocal over a new beat is the oldest
            move in DJ culture, and for decades it depended on an official a cappella pressed on the B-side of a
            vinyl single, or a leak. Most songs never had one. Separation makes one for any track you own.
          </p>
          <p>
            <strong class="text-foreground">Learning a vocal part.</strong> A melody is far easier to hear without
            the band, and harmonies are easier still: with the instruments gone, the stacked voices in a chorus
            stop blurring into the guitars and you can pick out the line you are meant to sing.
          </p>
          <p>
            <strong class="text-foreground">Studying a production.</strong> Producers and engineers solo the
            vocal to hear what was done to it — how much compression, how bright, how much reverb, where the
            doubles and ad-libs sit. It is the closest you can get to opening the session file.
          </p>
          <p>
            <strong class="text-foreground">Transcribing lyrics.</strong> A word that is unintelligible under a
            wall of guitars is often perfectly clear on its own.
          </p>
        </div>
      </section>

      <section aria-labelledby="quality-heading" class="rounded-2xl bg-muted/50 p-6 sm:p-8">
        <h2 id="quality-heading" class="text-xl font-semibold">
          What makes a clean a cappella
        </h2>
        <div class="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground">
          <p>
            The old way to isolate a vocal was phase cancellation: take an instrumental version of the song,
            line it up to the sample, flip its polarity and add it to the original, so everything but the voice
            cancels. It works brilliantly when you have an instrumental from the same master, and not at all
            otherwise — a different mix, a different master or a lossy copy leaves a smeared mess.
          </p>
          <p>
            This page needs only the song. A neural network, HT-Demucs, trained on multitrack studio sessions,
            estimates which parts of the sound are a voice and returns them as their own stereo track. How clean
            that track is depends on the recording more than on anything you do here:
          </p>
          <ul class="list-disc space-y-2 pl-5">
            <li><strong class="text-foreground">A dry, upfront vocal</strong> separates best — most modern pop, hip-hop and R&amp;B.</li>
            <li><strong class="text-foreground">Heavy effects</strong> are harder: a vocoder, extreme distortion or a voice chopped into a synth can be read as an instrument.</li>
            <li><strong class="text-foreground">Instruments that sing</strong> — a lead guitar, a sax, a violin playing the melody — can leak into the vocal stem in places.</li>
            <li><strong class="text-foreground">The source file matters.</strong> Lossless or high-bitrate audio keeps the breath and consonant detail the model relies on; a low-bitrate rip loses it first.</li>
          </ul>
        </div>
      </section>

      <section aria-labelledby="tidy-heading" class="rounded-2xl bg-muted/50 p-6 sm:p-8">
        <h2 id="tidy-heading" class="text-xl font-semibold">
          Tidying it up afterwards
        </h2>
        <div class="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground">
          <p>
            An extracted vocal is a very good starting point, and a few minutes in any audio editor or DAW takes
            it the rest of the way:
          </p>
          <p>
            <strong class="text-foreground">Gate the gaps.</strong> Leftover instruments are most audible when
            nobody is singing. A noise gate, or simply cutting the silences by hand, removes most of what remains.
          </p>
          <p>
            <strong class="text-foreground">Cut the low end.</strong> Below roughly 80–100 Hz a voice contributes
            little, while kick and bass bleed live there. A high-pass filter cleans it up without changing how the
            vocal sounds.
          </p>
          <p>
            <strong class="text-foreground">Soften the very top.</strong> A gentle high-shelf cut tames cymbal
            wash, at the cost of a little air. Go lightly.
          </p>
          <p>
            <strong class="text-foreground">Mix it, do not just place it.</strong> Over a new track, the vocal
            will usually need its own reverb and some compression to sit naturally — a stem from someone else's
            mix was balanced for a different arrangement.
          </p>
        </div>
      </section>

      <FaqSection :items="faq" class="rounded-2xl bg-muted/50 p-6 sm:p-8" />

      <ZealPromise />
    </ToolContents>
  </div>
</template>
