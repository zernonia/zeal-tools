<script setup lang="ts">
import meta from '../../../../meta'

const { public: { siteUrl } } = useRuntimeConfig()

useSeoMeta({
  title: 'Vocal Remover — Make an Instrumental or Karaoke Track, No Upload',
  description: 'Remove the vocals from any song in your browser and download the instrumental as WAV. The audio is never uploaded — the AI model runs on your own machine. Free, no sign-up, no watermark, no credits.',
  ogTitle: 'Vocal Remover — instrumentals without uploading your song',
  ogDescription: 'Take the vocals out of a song, or keep only the vocals. Runs in your browser; nothing is uploaded.',
  ogUrl: `${siteUrl}/tools/${meta.slug}/vocal-remover`,
  twitterCard: 'summary_large_image',
})

defineOgImage('Default', { title: 'Vocal Remover', description: 'Make an instrumental or karaoke track — in your browser, nothing uploaded.' })

useToolJsonLd(meta, {
  variant: 'vocal-remover',
  name: 'Vocal Remover',
  description: 'Remove vocals from a song to make an instrumental or karaoke track, or keep only the vocals for an a cappella. Runs in the browser; the audio is never uploaded.',
  featureList: [
    'Instrumental and a cappella from any song',
    'Separated by an AI model, not phase cancellation',
    'Runs in the browser — the song is never uploaded',
    'Full-length 16-bit WAV, no watermark',
  ],
})

const contents = [
  { id: 'old-way-heading', label: 'Why the old trick fails' },
  { id: 'karaoke-heading', label: 'Making a backing track' },
  { id: 'faq-heading', label: 'Questions' },
  { id: 'promise', label: 'The Zeal Promise' },
]

const faq = [
  { q: 'How do I make an instrumental?', a: 'Drop the song in and wait for it to separate — the "No vocals" mix is already selected on this page, so press play to check it, then Download instrumental. That WAV is the original drums, bass and everything else, with the vocal stem taken out.' },
  { q: 'Can I get just the vocals instead?', a: 'Yes. Choose "Vocals only" and the download button saves the a cappella. The same separation produces both, so switching between them is instant; nothing runs again.' },
  { q: 'Will backing vocals and harmonies be removed too?', a: 'Mostly, yes — the model treats every sung voice as vocals, lead and backing alike. That is usually what karaoke wants. If you want to keep the harmonies, there is no way to split the lead from them here; they arrive in the same stem.' },
  { q: 'I can still hear a faint vocal. Why?', a: 'Reverb and delay on a voice spread it across the mix, and some of that tail ends up counted as "other". On most modern productions it is quiet enough to sing over. If it bothers you, take the other stem down a little rather than off — that hides the ghost while keeping the arrangement.' },
  { q: 'Can I change the key for singing?', a: 'Not here, and on purpose: pitch-shifting a mixed track well is a separate, hard problem, and doing it badly ruins the instrumental this page just made. Download the WAV and shift it in a DAW or audio editor, which do it properly. For chord charts, the chord transposer does change the key.' },
  { q: 'Is my song uploaded to make the instrumental?', a: 'No. The model runs in your browser on your own hardware; the song is decoded, separated and saved without ever leaving the tab. The only download is the model itself, about 120 MB, fetched once and then cached.' },
  { q: 'Is the instrumental free to use?', a: 'Free of charge and of watermarks, yes, and the tool asserts no rights over it. The song still belongs to whoever owns it, though: an instrumental of a commercial track is fine for singing along or practising, and needs permission to publish.' },
]
</script>

<template>
  <div class="container-page py-10">
    <ToolPageHeader
      title="Vocal Remover"
      description="Take the vocals out of any song for an instrumental or karaoke track — or keep only the vocals. Separated in your browser, so the song never leaves your device."
    />

    <StemSplitterTool variant="vocal-remover" />

    <section class="mt-12 flex flex-wrap gap-2 text-sm" aria-label="Related tools">
      <NuxtLink to="/tools/stem-splitter" class="rounded-full border border-border px-4 py-1.5 transition-colors hover:border-primary/40 hover:text-primary">
        All four stems →
      </NuxtLink>
      <NuxtLink to="/tools/chord-transposer" class="rounded-full border border-border px-4 py-1.5 transition-colors hover:border-primary/40 hover:text-primary">
        Chord transposer →
      </NuxtLink>
    </section>

    <ToolContents :items="contents">
      <section aria-labelledby="old-way-heading" class="rounded-2xl bg-muted/50 p-6 sm:p-8">
        <h2 id="old-way-heading" class="text-xl font-semibold">
          Why the old vocal-removal trick never really worked
        </h2>
        <div class="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground">
          <p>
            The classic vocal remover — in old karaoke machines and in audio editors as "centre channel
            removal" — subtracts the right channel from the left. Lead vocals are usually mixed dead centre,
            identical in both speakers, so they cancel. So does everything else in the centre: the kick drum,
            the snare, the bass. What survives is the reverb on the voice, the stereo guitars and a hollow,
            phasey ghost of a band. It also folds the result to mono.
          </p>
          <p>
            This page does something different in kind. A neural network trained on multitrack studio
            recordings listens to the whole song and estimates which parts of the sound are a voice, wherever
            they sit in the stereo field. The instrumental it leaves behind keeps the kick, the snare and the bass
            in the middle where they belong, and stays in stereo.
          </p>
          <p>
            It is still an estimate, and it is worth being straight about that. A recording is a mix, and
            un-mixing it cannot be perfect: the room around a voice, a harmony doubled by a synth, a vocal effect
            that sounds like an instrument, can all land on the wrong side of the line. On most modern
            productions the result is clean enough to sing over; on a live or heavily reverberant recording,
            expect more of a ghost.
          </p>
        </div>
      </section>

      <section aria-labelledby="karaoke-heading" class="rounded-2xl bg-muted/50 p-6 sm:p-8">
        <h2 id="karaoke-heading" class="text-xl font-semibold">
          Making a backing track people can sing to
        </h2>
        <div class="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground">
          <p>
            <strong class="text-foreground">Check the quiet passages, not the chorus.</strong> Leftover vocal is
            masked when the whole band is playing and exposed in a sparse verse or an intro. Play those before you
            download — the waveforms show you where they are.
          </p>
          <p>
            <strong class="text-foreground">Keep a guide vocal for rehearsals.</strong> Instead of removing the
            vocal, take it down to 15–20%. Singers learning a part get the melody to lean on, and you can make the
            fully instrumental version from the same separation for the performance itself.
          </p>
          <p>
            <strong class="text-foreground">For worship and cover bands, remove what you will play live.</strong>
            The same separation gives you all four stems. Mute the vocals and the drums, say, and your singer and
            drummer have the rest of the band to rehearse over — the original recording, not a MIDI cover.
          </p>
          <p>
            <strong class="text-foreground">Use the best source file you can.</strong> An instrumental made from
            a lossless or high-bitrate file is noticeably cleaner than one made from audio ripped from a video,
            because compression throws away the detail the model uses to tell a voice from a guitar.
          </p>
        </div>
      </section>

      <FaqSection :items="faq" class="rounded-2xl bg-muted/50 p-6 sm:p-8" />

      <ZealPromise />
    </ToolContents>
  </div>
</template>
