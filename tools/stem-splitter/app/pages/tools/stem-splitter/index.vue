<script setup lang="ts">
import meta from '../../../../meta'

const { public: { siteUrl } } = useRuntimeConfig()
const pageUrl = `${siteUrl}/tools/${meta.slug}`

useSeoMeta({
  title: 'Stem Splitter — Separate Vocals, Drums & Bass, No Upload',
  description: 'Split any song into vocals, drums, bass, guitar, piano and other stems in your browser. The audio is never uploaded — the AI model runs on your own machine. Remix, solo and download WAV stems free, no sign-up, no watermark.',
  ogTitle: 'Stem Splitter — your song never leaves your device',
  ogDescription: 'Separate vocals, drums, bass and the rest in the browser. No upload, no sign-up, no watermark, no credits.',
  ogUrl: pageUrl,
  twitterCard: 'summary_large_image',
})

defineOgImage('Default', {
  title: 'Stem Splitter',
  description: meta.tagline,
})

const faq = [
  { q: 'Is my song uploaded anywhere?', a: 'No. The model is downloaded to your browser and runs there, on your own graphics card or processor. Your file is decoded in the tab, separated in the tab, and the stems are written out in the tab. What does leave your machine is a request for the model files themselves — nothing more.' },
  { q: 'Which stems do I get?', a: 'Choose before you drop the song in. Four stems gives vocals, drums, bass and other — "other" being everything else: guitars, keys, strings, synths, pads. That split is the standard one in music separation research and what most practice and remix workflows expect. Six stems adds guitar and piano as their own tracks, from a larger sibling of the same model. Use the 4 / 6 toggle above the drop zone.' },
  { q: 'Can it separate acoustic from electric guitar, or pick out synths?', a: 'No. The six-stem model has one guitar stem that holds acoustic and electric alike, and synthesizers stay in "other". Models that split more finely do exist, but none that we found are both openly licensed and small enough to run in a browser — the fine-grained ones are research-only or locked inside paid services. We would rather offer six stems honestly than eight that are not ours to give.' },
  { q: 'How good are the guitar and piano stems?', a: 'Guitar is usually solid; piano is the weakest of the six, which its authors say themselves — hence the "rough" label on that lane. Expect a piano stem to carry some guitar and pad bleed, and for a dense mix to leave part of the piano in "other". The four core stems come out about as cleanly from either model.' },
  { q: 'Why is there a download the first time?', a: 'Running a model locally means having the model locally. The four-stem model is about 120 MB and the six-stem one about 270 MB; you only download the one you use. None of it is fetched when the page loads, only when you actually split a track, and your browser caches it afterwards — the second song starts almost immediately, including on future visits.' },
  { q: 'How long does it take?', a: 'It depends on your machine rather than our servers. With WebGPU — current Chrome and Edge on most laptops and desktops — a three-minute song takes about a minute on a recent laptop with four stems, and about two with six. Without it the same model runs on the processor and the same song takes several minutes. The result is identical either way; the tool tells you which one it is using.' },
  { q: 'How good is the separation?', a: 'It is HT-Demucs, Meta’s hybrid transformer model, which was state of the art when it was published and still underpins many stem tools. Vocals and drums separate very cleanly on most modern productions. Bass is usually good. "Other" is the hardest, because it is everything left over. Expect some faint bleed — a ghost of the hi-hat in the vocal stem, reverb tails that belong to two stems at once — because a recording is a mix, and un-mixing it is an estimate.' },
  { q: 'Do the stems add back up to the original song?', a: 'Very nearly — that is a property of the model, and we check it. Turn every stem on at full volume and you hear the original, within a fraction of a percent. That is what makes the mixer honest: "no vocals" really is the song minus the vocal stem, nothing more processed than that.' },
  { q: 'What format are the downloads?', a: '16-bit WAV at 44.1 kHz, stereo — the format every DAW, editor and phone opens without asking. Each stem downloads on its own, all of them come together as a zip, and the mix button saves exactly what you are hearing, with your mutes, solo and volumes applied.' },
  { q: 'Is there a watermark, a credit limit or a sign-up?', a: 'None of the three, and there never will be. Stem separation is one of the places those are usually used to force an account — a short free preview, then a paywall for the full song or the WAV. You get the whole track, at full quality, every time.' },
  { q: 'Can I use the stems commercially?', a: 'The model is MIT licensed and so is this site, so nobody here has rights to assert over your output. The song is a different matter: separating a track does not change who owns it. Stems of your own recordings are yours; stems of someone else’s are fine for practice and study, and need the rights holder’s permission to release.' },
  { q: 'Does it work on a phone?', a: 'Sometimes. The model needs well over a gigabyte of working memory and a download of 120 MB or more, which many phones will not give a single tab. A recent iPhone or high-end Android may manage a short track; a laptop is the dependable choice.' },
  { q: 'Is there an API for this one?', a: 'No, deliberately. Most tools here are callable over REST and MCP because their logic is a pure function we can run on a server. This one is a neural network, and running it for you would mean you uploading your song to us — which is exactly what this tool exists to avoid.' },
]

useToolJsonLd(meta, {
  name: 'Stem Splitter',
  description: meta.description,
  featureList: [
    'Runs entirely in the browser — no upload',
    'Vocals, drums, bass and other stems — or six, adding guitar and piano',
    'Mute, solo and volume per stem, with live playback',
    'WAV downloads of each stem, a zip of all of them, or your own mix',
    'GPU-accelerated with WebGPU where available',
    'No sign-up, no watermark, no credits',
  ],
  howTo: {
    name: 'How to split a song into stems',
    steps: [
      { name: 'Choose a song', text: 'Pick four stems, or six to add guitar and piano, then drop an MP3, WAV, M4A, FLAC or OGG onto the page. It is read locally and never uploaded.' },
      { name: 'Wait for the separation', text: 'The first time, the model downloads to your browser and is cached. Then the song is separated section by section on your own machine.' },
      { name: 'Listen and remix', text: 'Play the track and switch stems on and off, solo one, or change its volume. Presets cover the common cases — no vocals, vocals only, no drums.' },
      { name: 'Download', text: 'Save any stem as WAV, all of them as a zip, or the mix you are hearing as one WAV.' },
    ],
  },
})

const contents = [
  { id: 'privacy-heading', label: 'Why no upload' },
  { id: 'how-heading', label: 'How the separation works' },
  { id: 'uses-heading', label: 'What people use stems for' },
  { id: 'results-heading', label: 'Getting a better result' },
  { id: 'faq-heading', label: 'Questions' },
  { id: 'promise', label: 'The Zeal Promise' },
]
</script>

<template>
  <div class="container-page py-10">
    <ToolPageHeader
      title="Stem Splitter"
      description="Split your audio into separate stems — vocals, drums, bass and everything else, or six with guitar and piano. The model runs in your browser, so the song never leaves your device."
    />

    <StemSplitterTool />

    <section class="mt-12 flex flex-wrap gap-2 text-sm" aria-label="Related tools">
      <NuxtLink to="/tools/stem-splitter/vocal-remover" class="rounded-full border border-border px-4 py-1.5 transition-colors hover:border-primary/40 hover:text-primary">
        Vocal remover →
      </NuxtLink>
      <NuxtLink to="/tools/chord-transposer" class="rounded-full border border-border px-4 py-1.5 transition-colors hover:border-primary/40 hover:text-primary">
        Chord transposer →
      </NuxtLink>
      <NuxtLink to="/tools/tuner" class="rounded-full border border-border px-4 py-1.5 transition-colors hover:border-primary/40 hover:text-primary">
        Tuner →
      </NuxtLink>
    </section>

    <ToolContents :items="contents">
      <section aria-labelledby="privacy-heading" class="rounded-2xl bg-muted/50 p-6 sm:p-8">
        <h2 id="privacy-heading" class="text-xl font-semibold">
          Why "no upload" matters for audio
        </h2>
        <div class="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground">
          <p>
            Almost every online stem splitter works the same way: you send your track to a company's server,
            it runs a model there, and you download the result. For a song off an album that is merely a
            privacy question. For the files people most often want to split, it is a bigger one — an
            unreleased demo, a mix that is not finished, a client's session, a recording of a rehearsal or a
            service. Those are exactly the files that should not be sitting on a stranger's disk.
          </p>
          <p>
            <strong class="text-foreground">Here the model comes to your audio instead.</strong> The network
            is downloaded to your browser once and executed by your own graphics card or processor. Your file
            is decoded inside the tab, separated inside the tab, and the stems are written out inside the tab.
            Traffic goes one way only: weights come down, the song never goes up.
          </p>
          <p>
            It is worth being exact about it. The model files are fetched from Hugging Face and the runtime that
            executes them from jsDelivr, so both see an IP address, the way any website does. What is never transmitted is the audio, and no server here ever
            holds it — so there is nothing to log, retain, train on, or leak.
          </p>
          <p>
            The trade-off is time, and it is honest to say so. A data centre GPU separates a song in seconds;
            your laptop takes longer, and much longer without WebGPU. What you get in exchange is a tool with
            no queue, no account, no daily limit, and no question of whether you trust someone with the file.
          </p>
        </div>
      </section>

      <section aria-labelledby="how-heading" class="rounded-2xl bg-muted/50 p-6 sm:p-8">
        <h2 id="how-heading" class="text-xl font-semibold">
          How the separation actually works
        </h2>
        <div class="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground">
          <p>
            The model is <strong class="text-foreground">HT-Demucs</strong>, a hybrid transformer published by
            Meta's research team. "Hybrid" is the interesting part. Audio can be looked at two ways: as a
            waveform, the raw pressure wave over time, or as a spectrogram, a picture of which frequencies are
            sounding at each moment. Drums are easy to see in a waveform, where every hit is a sharp spike.
            A sustained vocal is easier to see in a spectrogram, where its harmonics form stacked lines. HT-Demucs
            reads the music both ways at once, lets a transformer compare the two views, and produces each stem
            from both branches added together.
          </p>
          <p>
            A song is too long to look at in one go, so it is cut into windows of 7.8 seconds — the length the
            model was trained on — that overlap by a quarter. The model is least sure of itself at the edges of
            each window, where it has no context, so the windows are crossfaded into each other with ramps that
            add up to exactly one. The seams are inaudible, and a steady note passes through at exactly the
            level it went in.
          </p>
          <p>
            Each window then becomes four stereo signals — vocals, drums, bass, and everything else — or six, if
            you chose the model that also pulls out guitar and piano. Because the model was trained so that its
            outputs add back up to its input, the stems are not separate guesses — they are one decomposition of
            the song. That is why turning every stem on gives you the
            original back, and why muting one gives you the song without it rather than something reconstructed.
          </p>
          <p>
            On a browser with <strong class="text-foreground">WebGPU</strong>, the model runs on your graphics
            card — the four-stem model in 21 short pieces, so the page stays responsive while it works. Without it, the same model runs
            on the processor through WebAssembly. Both produce the same stems; one is simply several times faster.
            If the graphics card turns out not to cope — some do not — the tool notices and switches to the
            processor without losing the work already done.
          </p>
        </div>
      </section>

      <section aria-labelledby="uses-heading" class="rounded-2xl bg-muted/50 p-6 sm:p-8">
        <h2 id="uses-heading" class="text-xl font-semibold">
          What people use stems for
        </h2>
        <div class="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground">
          <p>
            <strong class="text-foreground">Practising an instrument.</strong> Mute the part you play and play
            it yourself with the real band. Bassists mute the bass, drummers mute the drums, singers mute the
            vocal. Solo the part instead and you can hear exactly what is being played, without the rest of the
            arrangement on top of it — which is the fastest way to learn a line by ear.
          </p>
          <p>
            <strong class="text-foreground">Karaoke and backing tracks.</strong> "No vocals" is an instrumental
            built from the record itself, not a cover version. For worship teams and cover bands, the same idea
            makes a rehearsal track: drop the part that a real person will be covering live.
          </p>
          <p>
            <strong class="text-foreground">Remixing and sampling.</strong> An a cappella to put over a new beat,
            a drum break on its own, a bassline to chop. These are what producers used to need official stems or a
            lucky multitrack leak for.
          </p>
          <p>
            <strong class="text-foreground">Transcription and study.</strong> Hearing the bass clearly is most of
            working out a song's harmony; hearing the drums alone is how you write out a groove. Teachers use
            stems to show a class what each instrument is contributing to a mix.
          </p>
          <p>
            <strong class="text-foreground">Rescuing a recording.</strong> A rehearsal where the drums swamp the
            singer, a phone video of a performance, an old demo with no multitrack: separating it lets you
            rebalance what was captured as one stereo file.
          </p>
        </div>
      </section>

      <section aria-labelledby="results-heading" class="rounded-2xl bg-muted/50 p-6 sm:p-8">
        <h2 id="results-heading" class="text-xl font-semibold">
          Getting a better result
        </h2>
        <div class="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground">
          <p>
            <strong class="text-foreground">Start from the best file you have.</strong> The model can only
            separate what is there. A lossless file or a high-bitrate MP3 gives cleaner stems than a 128 kbps
            copy or the audio ripped from a video, because compression smears exactly the fine detail the model
            uses to tell instruments apart.
          </p>
          <p>
            <strong class="text-foreground">Expect "other" to be the messiest stem.</strong> It is everything
            left over, so it holds whatever the model was not sure about. If you need guitar or piano on its own,
            split with six stems — and with four, anything you want from "other" is a starting point, not the finished
            article.
          </p>
          <p>
            <strong class="text-foreground">Use volume rather than mute for practice.</strong> Taking a part
            down to around 20% instead of switching it off keeps a guide you can lean on while learning, and hides
            most of the faint bleed between stems.
          </p>
          <p>
            <strong class="text-foreground">Mind the clipping on a custom mix.</strong> Pushing several stems
            above 100% can make the mix louder than the original. The WAV is clamped rather than wrapped, so it
            distorts instead of exploding, but it is better to pull the others down than to push one up.
          </p>
          <p>
            <strong class="text-foreground">Live recordings and old mono records are harder.</strong> The model
            learned from modern studio productions. Heavy reverb, a crowd, or a mono mix with everything in the
            same place will separate less cleanly — still useful, but with more bleed.
          </p>
        </div>
      </section>

      <FaqSection :items="faq" class="rounded-2xl bg-muted/50 p-6 sm:p-8" />

      <ZealPromise />
    </ToolContents>
  </div>
</template>
