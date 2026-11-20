<script setup lang="ts">
import meta from '../../../../meta'

const { public: { siteUrl } } = useRuntimeConfig()

useSeoMeta({
  title: 'Mic Test — Check Your Microphone Online, With Playback',
  description: 'A free online mic test: see a live level meter in dBFS with peak hold, frequency bars, the sample rate and channels, then record ten seconds and hear yourself back. The sound never leaves your device.',
  ogTitle: 'Mic Test — level meter and playback, nothing uploaded',
  ogDescription: 'Check your microphone before a call: live level, sample rate, and a recording that stays in your browser.',
  ogUrl: `${siteUrl}/tools/${meta.slug}/microphone`,
  twitterCard: 'summary_large_image',
})

defineOgImage('Default', { title: 'Mic Test', description: 'Live level, sample rate and playback — nothing uploaded.' })

const howToSteps = [
  { title: 'Press Start and allow the microphone', body: 'The browser asks only when you press the button. Once you allow it, the device list fills in with your microphones\' real names, so you can switch if the wrong one opened.' },
  { title: 'Speak normally and watch the meter', body: 'Talk at the distance and volume you would on a call. The words above the meter tell you whether the level is too quiet, good, loud or clipping; the thin marker holds the loudest recent peak.' },
  { title: 'Record and listen back', body: 'Press Record, say a sentence, and play it back. This is the only way to hear what other people hear — the meter tells you how loud you are, not whether you sound muffled, echoey or robotic.' },
  { title: 'Try the processing switches', body: 'Echo cancellation, noise suppression and automatic gain are on by default, as they are on a video call. Switch them off and record again to hear what your microphone picks up on its own.' },
]

useToolJsonLd(meta, {
  variant: 'microphone',
  name: 'Mic Test',
  description: 'Test a microphone in the browser with a live dBFS level meter, peak hold, frequency bars and local recording playback.',
  featureList: [
    'Live level meter in dBFS with peak hold',
    'Frequency bars drawn from the live input',
    'Shows sample rate, channel count and which voice processing is active',
    'Record 5 or 10 seconds and play it back in the browser',
    'Echo cancellation, noise suppression and automatic gain toggles',
    'Choose between microphones once access is allowed',
    'Nothing recorded leaves your device',
  ],
  howTo: { name: 'How to test a microphone online', steps: howToSteps.map(s => ({ name: s.title, text: s.body })) },
})

const faq = [
  { q: 'What is a good microphone level?', a: 'For speech, aim for the meter sitting around −30 to −20 dBFS while you talk, with peaks reaching about −12 to −6. Below −45 most of the time and you are too quiet; peaks touching 0 dBFS mean the signal is clipping, which sounds harsh and cannot be fixed afterwards. Automatic gain, on by default, nudges the level towards a sensible range for you.' },
  { q: 'What does dBFS mean?', a: 'Decibels relative to full scale. 0 dBFS is the loudest value the audio can hold, so every real reading is negative, and every 6 dB down is roughly half the amplitude. It is the only honest unit a web page can show: the browser has no idea how sensitive your microphone is, so it cannot tell you the sound level in the room.' },
  { q: 'The meter moves but people say I sound bad. Why?', a: 'A meter measures loudness, not quality. Record a few seconds and listen. Muffled sound is often the wrong microphone — the webcam\'s across the room instead of the headset\'s. A thin, telephone-like sound on Bluetooth headphones is the headset switching to its hands-free mode, which most do as soon as the microphone is in use. Echo and pumping usually come from the processing, which you can switch off here to compare.' },
  { q: 'Why does the sample rate say 48 kHz on my Bluetooth headset?', a: 'Because the browser may resample everything to the rate its audio engine runs at, so the number shown is not always what the headset sends. Bluetooth hands-free mode carries narrowband audio, and you will hear that on playback — dull, with no high frequencies — even when the readout says 48 kHz.' },
  { q: 'Is my recording uploaded?', a: 'No. The recording is made by your browser and held in the tab\'s memory as a temporary file that only this page can play. It is replaced when you record again and deleted when you leave the page. There is no upload button because there is nowhere for it to go.' },
  { q: 'Why can I not hear myself live?', a: 'On purpose. Sending your microphone straight to your speakers produces a feedback howl on any laptop, and a delay that makes it hard to speak. Recording and playing back gives you the same information without either problem.' },
  { q: 'Should I leave echo cancellation and noise suppression on?', a: 'For calls on speakers, yes — without echo cancellation the other person hears themselves. With headphones you can often turn it off for a more natural sound. Noise suppression removes fans and keyboard clatter but can make the voice warble; try both ways and listen to the recordings.' },
]

const contents = [
  { id: 'howto-heading', label: 'How to use it' },
  { id: 'reading-heading', label: 'What the readouts mean' },
  { id: 'trouble-heading', label: 'When the meter does not move' },
  { id: 'faq-heading', label: 'Questions' },
  { id: 'promise', label: 'The Zeal Promise' },
]
</script>

<template>
  <div class="container-page py-10">
    <ToolPageHeader
      title="Mic Test"
      description="Check your microphone in a few seconds — a live level meter, the sample rate it delivers, and a short recording you can play back. The sound never leaves your device."
    />

    <DeviceTestMicrophone />

    <section class="mt-12 flex flex-wrap gap-2 text-sm" aria-label="Related tools">
      <NuxtLink to="/tools/device-test/webcam" class="rounded-full border border-border px-4 py-1.5 transition-colors hover:border-primary/40 hover:text-primary">
        Webcam test →
      </NuxtLink>
      <NuxtLink to="/tools/device-test" class="rounded-full border border-border px-4 py-1.5 transition-colors hover:border-primary/40 hover:text-primary">
        All device tests →
      </NuxtLink>
      <NuxtLink to="/tools/tuner" class="rounded-full border border-border px-4 py-1.5 transition-colors hover:border-primary/40 hover:text-primary">
        Tuner →
      </NuxtLink>
    </section>

    <ToolContents :items="contents">
      <section aria-labelledby="howto-heading" class="rounded-2xl bg-muted/50 p-6 sm:p-8">
        <h2 id="howto-heading" class="text-xl font-semibold">
          How to test a microphone online
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

      <section aria-labelledby="reading-heading" class="rounded-2xl bg-muted/50 p-6 sm:p-8">
        <h2 id="reading-heading" class="text-xl font-semibold">
          What the readouts mean
        </h2>
        <div class="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground">
          <p>
            <strong class="text-foreground">The level</strong> is the RMS — the average power — of the last
            few dozen milliseconds of sound, in dBFS. RMS follows how loud speech feels, which is why the bar
            moves smoothly rather than flickering on every consonant. The marker is the loudest single
            sample, held for a second and a half and then allowed to fall, because peaks last only a few
            milliseconds and you would never see them otherwise. When that marker turns red the input has
            reached full scale and is clipping.
          </p>
          <p>
            <strong class="text-foreground">The frequency bars</strong> split the sound into bands spaced by
            octaves, low on the left and high on the right. A voice fills the left half and middle; a hum at
            the far left that never goes away is mains interference or a fan, and a microphone that shows
            almost nothing on the right sounds muffled. If you have asked your system to reduce motion, the
            bars update a few times a second instead of continuously.
          </p>
          <p>
            <strong class="text-foreground">Sample rate and channels</strong> are what the browser reports
            for the open microphone. 48 kHz is normal; 44.1 kHz is common on Macs and USB microphones. Mono
            is normal too — most built-in and headset microphones are a single channel, and calls are mono
            anyway. Not every browser reports these; where it does not, the audio engine&rsquo;s own rate is
            shown instead.
          </p>
          <p>
            <strong class="text-foreground">Echo cancellation and noise suppression</strong> show what is
            actually in effect, which is not always what you asked for: some devices and browsers refuse to
            turn processing off, and the readout says so.
          </p>
        </div>
      </section>

      <section aria-labelledby="trouble-heading" class="rounded-2xl bg-muted/50 p-6 sm:p-8">
        <h2 id="trouble-heading" class="text-xl font-semibold">
          When the meter does not move
        </h2>
        <div class="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground">
          <p>
            <strong class="text-foreground">If it says no signal,</strong> the browser opened a microphone
            but heard nothing. Check for a mute switch on the headset or its cable, and pick another device
            from the list — laptops often have a disconnected line input listed as a microphone. On Windows,
            open Settings &rarr; System &rarr; Sound, choose the input and check its volume is not at zero.
            On a Mac, System Settings &rarr; Sound &rarr; Input shows its own level meter and input volume.
          </p>
          <p>
            <strong class="text-foreground">If access was blocked,</strong> allow it from the icon at the
            left of the address bar in Chrome and Edge, the crossed-out microphone in Firefox, or Safari
            &rarr; Settings &rarr; Websites &rarr; Microphone. Then check the operating system: Windows
            Settings &rarr; Privacy &amp; security &rarr; Microphone, including &ldquo;Let desktop apps access
            your microphone&rdquo;, and on a Mac, System Settings &rarr; Privacy &amp; Security &rarr;
            Microphone, with your browser switched on.
          </p>
          <p>
            <strong class="text-foreground">If the wrong microphone opens,</strong> choose the right one from
            the list here. To change what every site uses, set the default in your browser&rsquo;s site
            settings (Chrome and Edge let you pick a default microphone) or in the operating system&rsquo;s
            sound settings. Plugging in a headset after the page is open adds it to the list automatically.
          </p>
          <p>
            <strong class="text-foreground">If it says the microphone could not be opened,</strong> another
            program may have exclusive use of it — some audio interfaces and call apps take it over. Close
            them, or turn off &ldquo;Allow applications to take exclusive control&rdquo; in the device&rsquo;s
            Windows sound properties, and press Start again.
          </p>
        </div>
      </section>

      <FaqSection :items="faq" class="rounded-2xl bg-muted/50 p-6 sm:p-8" />

      <ZealPromise />
    </ToolContents>
  </div>
</template>
