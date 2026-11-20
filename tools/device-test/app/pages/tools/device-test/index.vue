<script setup lang="ts">
import meta from '../../../../meta'

const { public: { siteUrl } } = useRuntimeConfig()

useSeoMeta({
  title: 'Device Test — Keyboard, Mic, Webcam and Dead Pixel Tests, Free',
  description: 'Test your keyboard, microphone, webcam and screen in the browser: every key with rollover and chatter, a live mic level meter with playback, real camera resolution and frame rate, and full-screen dead pixel colours. Nothing is recorded or uploaded.',
  ogTitle: 'Device Test — keyboard, mic, webcam and screen, checked in the browser',
  ogDescription: 'Four hardware checks that run on your own device. Nothing recorded, nothing uploaded, no sign-up.',
  ogUrl: `${siteUrl}/tools/${meta.slug}`,
  twitterCard: 'summary_large_image',
})

defineOgImage('Default', { title: 'Device Test', description: meta.tagline })

const howToSteps = [
  { title: 'Pick a test', body: 'Keyboard, microphone, webcam or dead pixel. The keyboard test is open already; each of the others loads only when you open its tab, and each has a dedicated page with more detail.' },
  { title: 'Allow access when asked', body: 'The microphone and webcam tests need your permission, and the browser only asks when you press Start — never on page load. The keyboard and dead pixel tests need no permission at all.' },
  { title: 'Read the result in plain words', body: 'Keys light up as they work, the mic meter says whether the level is too quiet, good or clipping, the webcam shows the size and frame rate it actually delivers, and the colour screens tell you what kind of fault to look for.' },
]

useToolJsonLd(meta, {
  description: meta.description,
  featureList: [
    'Keyboard tester with full-size ANSI and ISO layouts, rollover count and chatter detection',
    'Microphone test with a dBFS level meter, peak hold, frequency bars and local playback',
    'Webcam test reporting real resolution, frame rate and camera capabilities, with snapshots',
    'Full-screen dead pixel test with solid colours and a gradient, never auto-flashing',
    'Runs on your device — nothing recorded or uploaded',
    'No app, no sign-up',
  ],
  howTo: { name: 'How to test your devices online', steps: howToSteps.map(s => ({ name: s.title, text: s.body })) },
})

const cards = [
  { to: 'keyboard', title: 'Keyboard Tester', body: 'Every key on a full-size drawing, with event.key and event.code, how many keys you can hold at once, and a flag for keys that register twice.' },
  { to: 'microphone', title: 'Mic Test', body: 'A live level meter in dBFS with a peak marker, frequency bars, the sample rate and channel count, and a short recording you can play back.' },
  { to: 'webcam', title: 'Webcam Test', body: 'A mirrored preview, the resolution and frame rate the camera actually delivers, its capabilities, and a snapshot saved straight to your device.' },
  { to: 'dead-pixel', title: 'Dead Pixel Test', body: 'Full-screen black, white, red, green, blue, grey and a gradient, stepped through by hand, to find dead, stuck and hot pixels.' },
]

const faq = [
  { q: 'Is anything I type, say or show recorded?', a: 'No. The keyboard test reads key events while its area has focus and keeps only counts in the page. The microphone is measured frame by frame and the short test recording lives in your browser\'s memory until you leave. The camera picture is drawn on the page and a snapshot is saved straight to your downloads. None of it is sent to zeal.tools or anyone else, and you can check that in your browser\'s network panel.' },
  { q: 'Why does the browser ask for permission for the mic and camera?', a: 'Because a web page cannot touch either without it, which is exactly as it should be. The prompt only appears when you press Start, and you can revoke the permission at any time from the icon in the address bar. If you refuse, the test explains how to allow it again rather than failing silently.' },
  { q: 'Does it work on a phone?', a: 'The microphone, webcam and dead pixel tests do, in current Chrome, Safari and Firefox. iPhone Safari has no full-screen mode for pages, so the dead pixel test fills the window instead. The keyboard tester works with any keyboard connected to a phone or tablet, but an on-screen keyboard does not send physical key codes, so it is not a useful test of one.' },
  { q: 'Why does the camera or microphone light stay off when I switch tabs?', a: 'The tests turn the device off when the tab is hidden, and when you leave the test. A microphone or camera left running in a background tab is a privacy problem and a battery drain, so the test asks you to press Start again rather than keep it open.' },
  { q: 'Which browsers are supported?', a: 'Current versions of Chrome, Edge, Firefox and Safari. A few readouts depend on the browser: measured frame rate needs requestVideoFrameCallback, the camera capability list is not offered by every browser, and some browsers do not report the microphone sample rate, in which case the audio engine\'s rate is shown.' },
  { q: 'Why is there no API for this tool?', a: 'Every check is of hardware attached to the device in front of you. A server, or an AI agent calling an API, has no keyboard, microphone, camera or screen to test, so there would be nothing to send and nothing true to return.' },
]

const contents = [
  { id: 'tests-heading', label: 'The four tests' },
  { id: 'howto-heading', label: 'How to use it' },
  { id: 'privacy-heading', label: 'What stays on your device' },
  { id: 'trouble-heading', label: 'When a device is not found' },
  { id: 'faq-heading', label: 'Questions' },
  { id: 'promise', label: 'The Zeal Promise' },
]
</script>

<template>
  <div class="container-page py-10">
    <ToolPageHeader
      title="Device Test"
      description="Check a keyboard, microphone, webcam or screen in your browser. Every test runs on your own device — nothing is recorded or uploaded."
    />

    <DeviceTestTool />

    <section class="mt-12 flex flex-wrap gap-2 text-sm" aria-label="Related tools">
      <NuxtLink to="/tools/tuner" class="rounded-full border border-border px-4 py-1.5 transition-colors hover:border-primary/40 hover:text-primary">
        Tuner →
      </NuxtLink>
      <NuxtLink to="/tools/send-to-device" class="rounded-full border border-border px-4 py-1.5 transition-colors hover:border-primary/40 hover:text-primary">
        Send to device →
      </NuxtLink>
      <NuxtLink to="/tools/exif-viewer" class="rounded-full border border-border px-4 py-1.5 transition-colors hover:border-primary/40 hover:text-primary">
        EXIF viewer →
      </NuxtLink>
    </section>

    <ToolContents :items="contents">
      <section aria-labelledby="tests-heading" class="rounded-2xl bg-muted/50 p-6 sm:p-8">
        <h2 id="tests-heading" class="text-xl font-semibold">
          The four tests
        </h2>
        <ul class="mt-6 grid gap-4 sm:grid-cols-2">
          <li v-for="card in cards" :key="card.to">
            <NuxtLink
              :to="`/tools/device-test/${card.to}`"
              class="block h-full rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <h3 class="font-medium">
                {{ card.title }} →
              </h3>
              <p class="mt-1 text-sm leading-relaxed text-muted-foreground">
                {{ card.body }}
              </p>
            </NuxtLink>
          </li>
        </ul>
      </section>

      <section aria-labelledby="howto-heading" class="rounded-2xl bg-muted/50 p-6 sm:p-8">
        <h2 id="howto-heading" class="text-xl font-semibold">
          How to test your devices online
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

      <section aria-labelledby="privacy-heading" class="rounded-2xl bg-muted/50 p-6 sm:p-8">
        <h2 id="privacy-heading" class="text-xl font-semibold">
          What stays on your device
        </h2>
        <div class="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground">
          <p>
            A hardware test is a strange thing to send to a server. The keyboard under your hands, the
            microphone on your desk and the camera above your screen are all attached to the device you are
            reading this on, and the browser already has everything it needs to check them. So that is where
            the checking happens.
          </p>
          <p>
            <strong class="text-foreground">Nothing captured by these tests leaves the page.</strong> Key
            presses are counted, not logged as text. The microphone is read on every screen refresh to draw the
            meter, and each reading is thrown away as soon as it is drawn; the optional five- or ten-second
            recording is a blob in the tab&rsquo;s memory that disappears when you close it. The webcam picture
            is shown in a video element and nowhere else, and a snapshot is made by your browser and saved to
            your own downloads folder.
          </p>
          <p>
            The camera and microphone are switched off when you stop the test, when you move to another tab
            on this page, and when the browser tab is hidden. If the light on your camera stays on after
            that, something else has it open.
          </p>
        </div>
      </section>

      <section aria-labelledby="trouble-heading" class="rounded-2xl bg-muted/50 p-6 sm:p-8">
        <h2 id="trouble-heading" class="text-xl font-semibold">
          When a device is not found
        </h2>
        <div class="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground">
          <p>
            <strong class="text-foreground">Check the browser&rsquo;s permission first.</strong> In Chrome
            and Edge, click the icon at the left of the address bar and set Camera or Microphone to Allow. In
            Firefox, the crossed-out camera or microphone icon in the address bar clears a block. In Safari on
            a Mac, use Safari &rarr; Settings &rarr; Websites. Then reload and press Start again.
          </p>
          <p>
            <strong class="text-foreground">Then the operating system.</strong> Windows has its own switch
            under Settings &rarr; Privacy &amp; security &rarr; Camera (and Microphone), including one for
            desktop apps, which is the one that covers your browser. macOS asks once per app; if you refused,
            go to System Settings &rarr; Privacy &amp; Security and turn your browser back on. Some laptops
            also have a physical camera shutter or a function key that cuts the camera or microphone in
            hardware, and no software setting overrides those.
          </p>
          <p>
            <strong class="text-foreground">Then other apps.</strong> On Windows a camera can usually be
            open in only one program at a time, so a video call, OBS or the Camera app running in the
            background makes the test report that the device could not be opened. Close it and try again.
            If the wrong microphone or camera opens, pick the right one from the device list, which fills in
            as soon as you have allowed access.
          </p>
        </div>
      </section>

      <FaqSection :items="faq" class="rounded-2xl bg-muted/50 p-6 sm:p-8" />

      <ZealPromise />
    </ToolContents>
  </div>
</template>
