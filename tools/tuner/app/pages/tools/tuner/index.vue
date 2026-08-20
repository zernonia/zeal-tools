<script setup lang="ts">
import meta from '../../../../meta'

const { public: { siteUrl } } = useRuntimeConfig()

useSeoMeta({
  title: 'Online Tuner — Guitar, Bass and Ukulele, In Your Browser',
  description: 'A chromatic tuner that listens through your microphone and shows the note, the cents and the string you are aiming at. The audio never leaves your device. Free, no sign-up, no app.',
  ogTitle: 'Tuner — the audio never leaves your device',
  ogDescription: 'Chromatic tuner for guitar, bass, ukulele and violin. Runs in the browser, no app, no sign-up.',
  ogUrl: `${siteUrl}/tools/${meta.slug}`,
  twitterCard: 'summary_large_image',
})

defineOgImage('Default', { title: 'Tuner', description: meta.tagline })

const howToSteps = [
  { title: 'Allow the microphone', body: 'The browser will ask once. Nothing is recorded and nothing is sent — the audio is analysed frame by frame on your own device and thrown away.' },
  { title: 'Pick your instrument, or stay chromatic', body: 'Choosing a tuning tells the tuner which string you are reaching for, so a badly flat low E still reads as the sixth string rather than as the note it currently happens to be.' },
  { title: 'Play one string at a time', body: 'A single ringing note, not a chord. Pitch detection needs one fundamental to lock on to; strummed chords give it several and it will pick one of them.' },
  { title: 'Turn until the needle centres', body: 'Green means within five cents, which is closer than anyone can hear on a single note. Tune up to the pitch rather than down to it — coming from below leaves the string more stable.' },
]

useToolJsonLd(meta, {
  description: meta.description,
  featureList: [
    'Listens through the microphone and detects pitch on your device',
    'Guitar, bass, ukulele and violin tunings, plus chromatic',
    'Shows the note, the cents and the string you are aiming at',
    'Adjustable reference pitch from 415 to 446 Hz',
    'No recording, no upload, no sign-up and no app',
  ],
  howTo: { name: 'How to tune an instrument with your microphone', steps: howToSteps.map(s => ({ name: s.title, text: s.body })) },
})

const contents = [
  { id: 'howto-heading', label: 'How to tune' },
  { id: 'cents-heading', label: 'What cents mean' },
  { id: 'how-heading', label: 'How it hears you' },
  { id: 'faq-heading', label: 'Questions' },
  { id: 'promise', label: 'The Zeal Promise' },
]

const faq = [
  { q: 'Is my microphone recorded or sent anywhere?', a: 'No. The browser hands the page a live stream of samples, the page measures the pitch of each short window and discards it. Nothing is stored, nothing is buffered to disk, and nothing is uploaded. You can open the network panel and watch it stay silent while you tune, or load the page and disconnect from the internet first.' },
  { q: 'Why does it need the microphone at all?', a: 'Because that is the only way to hear the string. There is no way to detect pitch without audio, and the browser will not give a page audio without asking you first. If you would rather not, the string frequencies are listed on the page and you can tune by ear against another instrument.' },
  { q: 'How accurate is it?', a: 'Within a cent or two under normal conditions, which is finer than the ear can resolve on a single sustained note. Two things set the floor: the sample rate your device uses, and how cleanly the string rings. A note that is buzzing, damped or already fading gives the detector less to work with, and the reading gets noisier as it decays.' },
  { q: 'Why does it say a different note than I expected?', a: 'Usually because the string is more than half a semitone out, in which case the nearest note genuinely is the next one along. That is exactly why picking a tuning helps: with an instrument selected, the tuner measures against the string you are aiming at, so a low E tuned a semitone sharp reads as 100 cents sharp on the sixth string rather than as a perfectly in-tune F.' },
  { q: 'Can I tune a chord or strum?', a: 'No, and no tuner can. Pitch detection works by finding one repeating period in the signal; a chord contains several at once, and whichever is strongest wins. Play one string at a time and let it ring.' },
  { q: 'What is the reference pitch for?', a: 'Concert pitch is A4 = 440 Hz and that is the default, but it is a convention rather than a law. Many European orchestras tune to 442 or 443 for a brighter sound, and baroque ensembles commonly use 415 — almost exactly a semitone below. Set it to match whatever you are playing with, and every string retunes around it.' },
  { q: 'Why does the reading jump around on the low string?', a: 'Low notes are the hard case. A low E repeats only about 82 times a second, so a reading needs a longer slice of audio, and the fundamental on a plucked bass string is often quieter than the harmonic above it. This tuner uses a method that divides out the signal\'s own energy specifically to avoid reporting that harmonic instead — but a dull or dying string still gives it less to work with. Pluck nearer the bridge and let it ring.' },
  { q: 'Does it work on a phone?', a: 'Yes, in any modern mobile browser, using the phone\'s own microphone. Keep the phone within a metre or so and away from anything humming. It works offline too once the page has loaded.' },
  { q: 'Should I tune up to the note or down to it?', a: 'Up. Tuning pegs and strings have slack in them, and arriving at the pitch from below leaves the winding under tension where it will stay. Coming down to the note leaves it loose enough to creep flat again over the next few minutes. If you overshoot, go back below and come up again.' },
  { q: 'Is there a catch?', a: 'No. No sign-up, no app to install, no ads, and nothing recorded. It is MIT licensed and the pitch detection is a hundred or so lines you can read in the repository — which is rather the point for a tool that asks for your microphone.' },
]
</script>

<template>
  <div class="container-page py-10">
    <ToolPageHeader
      title="Tuner"
      description="Tune a guitar, bass, ukulele or violin through your microphone. The audio is analysed on your device and never recorded or sent anywhere."
    />

    <ClientOnly>
      <TunerTool />
      <template #fallback>
        <div class="grid tool-frame place-items-center rounded-2xl border border-border text-sm text-muted-foreground">
          Loading the tuner…
        </div>
      </template>
    </ClientOnly>

    <section class="mt-12 flex flex-wrap gap-2 text-sm" aria-label="Related tools">
      <NuxtLink to="/tools/tuner/guitar" class="rounded-full border border-border px-4 py-1.5 transition-colors hover:border-primary/40 hover:text-primary">
        Guitar tuner →
      </NuxtLink>
      <NuxtLink to="/tools/tuner/bass" class="rounded-full border border-border px-4 py-1.5 transition-colors hover:border-primary/40 hover:text-primary">
        Bass tuner →
      </NuxtLink>
      <NuxtLink to="/tools/chord-transposer" class="rounded-full border border-border px-4 py-1.5 transition-colors hover:border-primary/40 hover:text-primary">
        Chord transposer →
      </NuxtLink>
    </section>

    <ToolContents :items="contents">
      <section aria-labelledby="howto-heading" class="rounded-2xl bg-muted/50 p-6 sm:p-8">
        <h2 id="howto-heading" class="text-xl font-semibold">
          How to tune an instrument with your microphone
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

      <section aria-labelledby="cents-heading" class="rounded-2xl bg-muted/50 p-6 sm:p-8">
        <h2 id="cents-heading" class="text-xl font-semibold">
          What the cents number actually means
        </h2>
        <div class="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground">
          <p>
            A semitone — one fret, one piano key — is divided into a hundred cents. So the number on the
            meter is how far you are from the note as a fraction of the smallest step in Western music:
            fifty cents is exactly halfway to the next note, and past that the tuner will start naming
            that note instead.
          </p>
          <p>
            <strong class="text-foreground">Five cents is the working definition of in tune here.</strong>
            On a single sustained note most people cannot reliably hear a difference below about five
            cents, and a guitar cannot hold better than that anyway — pressing a string to a fret bends it
            sharp, and how hard you press changes the number. Chasing zero on the display is chasing a
            precision the instrument does not have.
          </p>
          <p>
            Beating between two notes is a different matter: two strings a couple of cents apart produce a
            slow wobble that is very audible even though neither note sounds wrong alone. That is why a
            guitar tuned string-by-string to a perfect tuner can still sound slightly off with itself, and
            why players make small adjustments by ear afterwards.
          </p>
        </div>
      </section>

      <section aria-labelledby="how-heading" class="rounded-2xl bg-muted/50 p-6 sm:p-8">
        <h2 id="how-heading" class="text-xl font-semibold">
          How it hears you
        </h2>
        <div class="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground">
          <p>
            A plucked string does not produce one frequency. It produces a fundamental plus a stack of
            harmonics above it, and on a guitar's low strings the first harmonic is frequently
            <em>louder</em> than the fundamental itself. That is the trap in pitch detection: the obvious
            approach finds the strongest repetition in the signal and confidently reports a note an octave
            too high.
          </p>
          <p>
            <strong class="text-foreground">This one measures how well the signal matches a delayed copy
              of itself, divided by its own energy at that delay</strong>, and then takes the first
            candidate that clears a threshold rather than the strongest one. Dividing out the energy stops
            a loud harmonic dominating; taking the first peak stops it winning on a technicality. The
            result is then interpolated between samples, because without that step the reading would jump
            in steps of nearly a fifth of a semitone down at low E.
          </p>
          <p>
            The microphone is also asked for raw audio specifically: echo cancellation, noise suppression
            and automatic gain control are all switched off. They are tuned for speech, and each of them
            does something a tuner cannot tolerate — gating quiet sustained tones, reshaping harmonics, or
            pumping the level so the note appears to move.
          </p>
        </div>
      </section>

      <FaqSection :items="faq" class="rounded-2xl bg-muted/50 p-6 sm:p-8" />

      <ZealPromise />
    </ToolContents>
  </div>
</template>
