<script setup lang="ts">
import meta from '../../../../meta'

const { public: { siteUrl } } = useRuntimeConfig()

useSeoMeta({
  title: 'Drum Remover — Make a Drumless Track to Practise Along To, No Upload',
  description: 'Remove the drums from any song in your browser and download a drumless backing track as WAV. The audio is never uploaded — the AI model runs on your own machine. Free, no sign-up, no watermark, full-length tracks.',
  ogTitle: 'Drum Remover — drumless practice tracks without uploading your song',
  ogDescription: 'Take the drums out of a song and play along with the real band. Runs in your browser; nothing is uploaded.',
  ogUrl: `${siteUrl}/tools/${meta.slug}/drum-remover`,
  twitterCard: 'summary_large_image',
})

defineOgImage('Default', { title: 'Drum Remover', description: 'Drumless practice tracks from any song — in your browser, nothing uploaded.' })

useToolJsonLd(meta, {
  variant: 'drum-remover',
  name: 'Drum Remover',
  description: 'Remove the drums from a song to make a drumless practice track, or keep only the drums to study a groove. Runs in the browser; the audio is never uploaded.',
  featureList: [
    'Drumless backing track from any song',
    'Drums-only stem for transcribing a groove',
    'Runs in the browser — the song is never uploaded',
    'Full-length 16-bit WAV, no watermark',
  ],
  howTo: {
    name: 'How to remove the drums from a song',
    steps: [
      { name: 'Drop the song in', text: 'Drop an MP3, WAV, M4A, FLAC or OGG onto the page. It is read locally and never uploaded.' },
      { name: 'Wait for the separation', text: 'The model downloads once and is cached, then separates the song into vocals, drums, bass and other on your own machine.' },
      { name: 'Check the drumless mix', text: '"No drums" is already selected. Play the quiet passages to check for leftover cymbals.' },
      { name: 'Download', text: 'Save the drumless track as one WAV, or every stem as a zip.' },
    ],
  },
})

const contents = [
  { id: 'practice-heading', label: 'Practising with the real band' },
  { id: 'clean-heading', label: 'What comes out cleanly' },
  { id: 'setup-heading', label: 'Setting up a practice session' },
  { id: 'faq-heading', label: 'Questions' },
  { id: 'promise', label: 'The Zeal Promise' },
]

const faq = [
  { q: 'How do I make a drumless track?', a: 'Drop the song in and wait for it to separate — the "No drums" mix is already selected on this page. Press play to check it, then Download drumless track. That WAV is the original vocals, bass and everything else, with the drum stem taken out.' },
  { q: 'Can I get the drums on their own instead?', a: 'Yes. Solo the drums stem and the download button saves exactly that. Hearing a kit with nothing on top of it is the quickest way to work out a groove by ear, or to check your transcription against the record.' },
  { q: 'Is percussion removed too, or only the kit?', a: 'The model was trained to treat everything percussive — kit, shakers, tambourine, most hand percussion — as drums, so it mostly leaves together. Pitched percussion such as marimba or glockenspiel tends to stay in "other", and an electronic kick with a long tuned tail can split between drums and bass.' },
  { q: 'I can still hear a faint hi-hat. Why?', a: 'Cymbals are noise across a wide band of frequencies, which is exactly where vocals and guitars live too, so a little hi-hat or ride wash can stay behind in the vocal or "other" stem. Once you are playing along it is masked by your own kit; if it bothers you, a high-cut in your headphone mix hides it.' },
  { q: 'Can I slow the track down to learn it?', a: 'Not on this page — time-stretching well is its own hard problem. Download the WAV and open it in a practice app or DAW that slows audio without changing pitch; the drumless track behaves like any other song file.' },
  { q: 'Is my song uploaded?', a: 'No. The model runs in your browser on your own hardware, and the song is decoded, separated and saved without leaving the tab. The only download is the model itself, about 120 MB, fetched once and then cached.' },
  { q: 'Can I post a play-along video using the drumless track?', a: 'The tool asserts no rights over the output, and there is no watermark. The song still belongs to whoever owns it, though, and a drumless version of a commercial track is still that track. Practising is fine; publishing a cover video is governed by the platform’s licensing and the rights holder, not by us.' },
]
</script>

<template>
  <div class="container-page py-10">
    <ToolPageHeader
      title="Drum Remover"
      description="Take the drums out of any song and play along with the real band — or keep only the drums to learn the groove. Separated in your browser, so the song never leaves your device."
    />

    <StemSplitterTool variant="drum-remover" />

    <section class="mt-12 flex flex-wrap gap-2 text-sm" aria-label="Related pages">
      <NuxtLink to="/tools/stem-splitter" class="rounded-full border border-border px-4 py-1.5 transition-colors hover:border-primary/40 hover:text-primary">
        All four stems →
      </NuxtLink>
      <NuxtLink to="/tools/stem-splitter/vocal-remover" class="rounded-full border border-border px-4 py-1.5 transition-colors hover:border-primary/40 hover:text-primary">
        Vocal remover →
      </NuxtLink>
    </section>

    <ToolContents :items="contents">
      <section aria-labelledby="practice-heading" class="rounded-2xl bg-muted/50 p-6 sm:p-8">
        <h2 id="practice-heading" class="text-xl font-semibold">
          Practising with the real band, not a click
        </h2>
        <div class="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground">
          <p>
            Drummers have always practised along to records, and always with the same problem: the record
            already has a drummer on it. Play over the top and you are in a flam contest with a professional,
            mixed louder than you can hear yourself. You cannot tell whether your fill landed, because theirs
            landed on top of it.
          </p>
          <p>
            A drumless track fixes that. The singer, the bass player and the guitars are the original recording,
            playing exactly what they played, and the gap where the kit was is yours. You hear immediately
            whether you are pushing the chorus or dragging the verse, because the band does not follow you —
            which is the same discipline as playing with a click, but with a groove that feels like music.
          </p>
          <p>
            Drumless tracks used to mean buying a play-along book, hoping someone had uploaded one, or
            hand-building a cover from MIDI. This page makes one from any song you already have, using a neural
            network that separates the drums from everything else, and runs on your own computer so the file
            never leaves it.
          </p>
        </div>
      </section>

      <section aria-labelledby="clean-heading" class="rounded-2xl bg-muted/50 p-6 sm:p-8">
        <h2 id="clean-heading" class="text-xl font-semibold">
          What comes out cleanly, and what does not
        </h2>
        <div class="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground">
          <p>
            <strong class="text-foreground">Drums are the stem the model is best at.</strong> A hit is a sharp
            transient that nothing else in a mix quite resembles, and HT-Demucs reads the waveform directly as
            well as the spectrogram, which is where transients are easiest to see. On most studio recordings the
            drumless track is clean enough that you forget it was ever a full mix.
          </p>
          <p>
            <strong class="text-foreground">Cymbals are the usual leftover.</strong> A crash or a ride is a wash
            of noise spread across the same frequencies as vocals and strummed guitars, so a faint ghost of it can
            stay in the other stems. Behind a real kit you will not hear it.
          </p>
          <p>
            <strong class="text-foreground">Electronic and programmed drums depend on the sound.</strong> A dry
            808 snare separates as well as an acoustic one. A sub-heavy 808 kick is half drum and half bass note,
            and the model may split it between the two stems — check the bass stem if your kick sounds thin.
          </p>
          <p>
            <strong class="text-foreground">Live recordings are harder.</strong> In a room the drums bleed into
            every microphone and the reverb ties everything together, so expect more of the kit to survive in a
            concert recording than in a studio one.
          </p>
        </div>
      </section>

      <section aria-labelledby="setup-heading" class="rounded-2xl bg-muted/50 p-6 sm:p-8">
        <h2 id="setup-heading" class="text-xl font-semibold">
          Setting up a practice session
        </h2>
        <div class="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground">
          <p>
            <strong class="text-foreground">Keep a quiet guide while learning.</strong> Instead of removing the
            drums entirely, take the drum stem down to about 15%. You keep the original part as a reference for
            fills and accents, and it disappears under your own playing. Switch it off once you know the song.
          </p>
          <p>
            <strong class="text-foreground">Solo the drums to transcribe.</strong> Before you play it, listen to
            it alone. A kit with no band on top tells you where the ghost notes are, which hand is on the hi-hat
            and what the kick is actually doing under the bass — most of which is inaudible in the full mix.
          </p>
          <p>
            <strong class="text-foreground">Use closed-back headphones or in-ears.</strong> An acoustic kit is
            louder than any speaker you are likely to practise with, so the track needs to reach you directly. A
            small mixer or an interface with a headphone mix lets you set the track and your kit separately.
          </p>
          <p>
            <strong class="text-foreground">Start from the best file you own.</strong> A lossless file or a
            high-bitrate download separates more cleanly than audio ripped from a video, because compression
            throws away the detail the model uses to tell a snare from a guitar chop.
          </p>
          <p>
            <strong class="text-foreground">For a band rehearsal, remove more than the drums.</strong> The same
            separation gives you every stem, so if the bassist is coming too, mute both and the two of you have
            the rest of the record to lock in over.
          </p>
        </div>
      </section>

      <FaqSection :items="faq" class="rounded-2xl bg-muted/50 p-6 sm:p-8" />

      <ZealPromise />
    </ToolContents>
  </div>
</template>
