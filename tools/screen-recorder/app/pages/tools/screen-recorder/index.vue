<script setup lang="ts">
import meta from '../../../../meta'

const { public: { siteUrl } } = useRuntimeConfig()

useSeoMeta({
  title: 'Free Online Screen Recorder — With Audio, No Watermark, No Upload',
  description: 'Record your screen, one window or a browser tab, with tab or system sound and your microphone. Recorded on your device and saved as MP4 or WebM — never uploaded. No watermark, no time limit, no sign-up.',
  ogTitle: 'Screen Recorder — recorded on your device, never uploaded',
  ogDescription: 'Screen, window or tab, with sound. Saved straight to your computer as MP4 or WebM. No watermark, no sign-up.',
  ogUrl: `${siteUrl}/tools/${meta.slug}`,
  twitterCard: 'summary_large_image',
})

defineOgImage('Default', { title: 'Screen Recorder', description: meta.tagline })

const howToSteps = [
  { title: 'Choose the sound and quality', body: 'Leave “Record tab or system sound” ticked to capture what the page or computer is playing, tick “Add my microphone” for a voice-over, and pick a quality. High suits most screens; Standard keeps files small for slides and code.' },
  { title: 'Press Start recording and pick what to share', body: 'Your browser opens its own picker: a whole screen, one window or one tab. For a tab’s sound, tick “Share tab audio” in that picker. A three-second countdown gives you time to switch to what you are recording — skip it with Start now.' },
  { title: 'Pause, resume, stop', body: 'The timer and the size so far stay on this page. Pause leaves the gap out of the video. Stop here, or use the browser’s own “Stop sharing” bar — either way the recording is kept.' },
  { title: 'Watch it back and download', body: 'The recording plays on the page with its length and size. Download saves it as screen-recording-date-time.mp4 or .webm. Until you do, it exists only in this tab.' },
]

useToolJsonLd(meta, {
  description: meta.description,
  featureList: [
    'Record a whole screen, a single window or a browser tab',
    'Tab or system sound where the browser and operating system allow it',
    'Optional microphone voice-over, mixed into one track',
    'Saves MP4 in Chrome, Edge and Safari; WebM in Firefox',
    'WebM files get a proper duration, so they can be scrubbed',
    'Pause and resume, countdown, live size estimate',
    'Recorded on your device and never uploaded',
    'No watermark, no time limit, no sign-up',
  ],
  howTo: { name: 'How to record your screen online', steps: howToSteps.map(s => ({ name: s.title, text: s.body })) },
})

const faq = [
  { q: 'Is my recording uploaded anywhere?', a: 'No. The browser captures the screen, its built-in encoder turns that into video, and the file is assembled in this tab’s memory. The only place it goes is your Downloads folder, when you press Download. This site never receives a frame of it, and there is no account it could be attached to. You can check: open your browser’s developer tools, watch the Network tab while you record, and you will see nothing being sent.' },
  { q: 'Is there a watermark or a time limit?', a: 'Neither. There is no logo on the video, no “upgrade to remove” and no cut-off at five or fifteen minutes. The one practical limit is room: the recording is held by the browser until you save it. At the High preset that is up to about 38 MB a minute, and usually much less for a still screen. The page shows the size as you go and warns you when it gets large, so for a session of several hours it is worth stopping, saving and starting a fresh recording now and then.' },
  { q: 'Why is there no sound in my recording?', a: 'Usually because the sound was not shared in the picker. Sound from a tab needs “Share tab audio” ticked when you choose the tab, and sound from the whole computer needs “Share system audio” when you choose an entire screen — that one is offered on Windows and ChromeOS. Sharing a single window never includes its sound in any browser. Firefox and Safari do not currently share tab or system sound at all, so in those browsers only the microphone can be recorded. The page tells you after you start if no sound came with the share.' },
  { q: 'Can I record on an iPhone, iPad or Android phone?', a: 'Not from a web page — and that is true of every website, not just this one. Mobile browsers do not include screen capture. Your phone has a recorder built in instead: on iOS and iPadOS, add Screen Recording to Control Centre in Settings and start it from there; on most Android phones, swipe down twice from the top and tap Screen record.' },
  { q: 'Can it record my webcam as well?', a: 'Not yet. A webcam bubble in the corner means drawing two videos together on every frame, and this recorder deliberately keeps to the screen and the sound. If you need your face in shot, share the screen here and open your camera in a small window you place on that screen — it will be recorded like anything else that is on it.' },
  { q: 'Will my notifications appear in the recording?', a: 'If you share the whole screen, yes: anything that pops up on it is recorded. Sharing a single window or tab avoids that, because only that window or tab is captured. Turning on Do Not Disturb or Focus before you start is the belt-and-braces option.' },
  { q: 'Why does my browser show a “sharing your screen” bar?', a: 'It is the browser telling you, honestly, that the page can see your screen — and it cannot be hidden by any website. Pressing “Stop sharing” on it ends the recording and keeps what you have; it does not throw it away.' },
  { q: 'Do I need to install anything?', a: 'No extension, no app and no plug-in. Screen capture has been part of desktop Chrome, Edge, Firefox and Safari for years. The first time, the browser asks which screen to share; on a Mac it may also send you to System Settings to allow screen recording for the browser, which is the operating system’s rule rather than ours.' },
]

const contents = [
  { id: 'howto-heading', label: 'How to use it' },
  { id: 'privacy-heading', label: 'Where the recording goes' },
  { id: 'sound-heading', label: 'Recording sound' },
  { id: 'format-heading', label: 'WebM or MP4?' },
  { id: 'faq-heading', label: 'Questions' },
  { id: 'promise', label: 'The Zeal Promise' },
]
</script>

<template>
  <div class="container-page py-10">
    <ToolPageHeader
      title="Screen Recorder"
      description="Record your screen, a window or a browser tab — with sound and your microphone — and save it straight to your computer. Nothing is uploaded, and there is no watermark."
    />

    <ScreenRecorderTool />

    <section class="mt-12 flex flex-wrap gap-2 text-sm" aria-label="Related tools">
      <NuxtLink to="/tools/send-to-device" class="rounded-full border border-border px-4 py-1.5 transition-colors hover:border-primary/40 hover:text-primary">
        Send to device →
      </NuxtLink>
      <NuxtLink to="/tools/image-redactor" class="rounded-full border border-border px-4 py-1.5 transition-colors hover:border-primary/40 hover:text-primary">
        Image redactor →
      </NuxtLink>
      <NuxtLink to="/tools/image-compressor" class="rounded-full border border-border px-4 py-1.5 transition-colors hover:border-primary/40 hover:text-primary">
        Image compressor →
      </NuxtLink>
    </section>

    <ToolContents :items="contents">
      <section aria-labelledby="howto-heading" class="rounded-2xl bg-muted/50 p-6 sm:p-8">
        <h2 id="howto-heading" class="text-xl font-semibold">
          How to record your screen
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
          Where the recording goes: nowhere but your computer
        </h2>
        <div class="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground">
          <p>
            A screen recording is often the most private thing you will make all week. It catches the
            inbox in the next tab, the name in the corner of a spreadsheet, the notification that slides
            in halfway through. So it matters where it ends up.
          </p>
          <p>
            Many online screen recorders work by sending the video to their own servers — to process
            it, to host it behind a share link, or to hold it until you have made an account. That is a
            reasonable design for a service whose product is hosting, and it is also why so many of them
            ask you to sign up, stamp a logo on the free version or stop at a few minutes.
          </p>
          <p>
            <strong class="text-foreground">This one has no server side at all.</strong> Your browser
            already contains everything a recorder needs: screen capture, which asks you what to share,
            and a video encoder, which turns the capture into a file. The page wires the two together and
            keeps the pieces in memory as they arrive. When you press Download, the browser writes the
            file to your disk. Close the tab before then and it is gone; nobody has a copy, including us.
          </p>
          <p>
            That design is also why there is no watermark and no time limit. There is no storage bill to
            recover and no upgrade to sell — the only limit is how much video your browser can hold, and
            the page shows you that number as you record.
          </p>
        </div>
      </section>

      <section aria-labelledby="sound-heading" class="rounded-2xl bg-muted/50 p-6 sm:p-8">
        <h2 id="sound-heading" class="text-xl font-semibold">
          Recording sound: tab, system and microphone
        </h2>
        <div class="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground">
          <p>
            Picture is easy; sound depends on your browser and operating system, and it is worth knowing
            the rules before you record a twenty-minute demo in silence.
          </p>
          <p>
            <strong class="text-foreground">A browser tab, with its sound,</strong> is the most reliable
            option and works the same everywhere Chrome and Edge run. Choose the tab in the picker and
            tick “Share tab audio”. This is the way to record a video call in the browser, a web
            presentation or a video playing on a site.
          </p>
          <p>
            <strong class="text-foreground">The whole computer’s sound</strong> is offered by Chrome and
            Edge on Windows and ChromeOS when you share an entire screen — look for “Share system audio”
            in the picker. On a Mac, browsers generally cannot capture system sound: macOS only lets
            them share a tab’s sound. Some recent versions of Chrome on recent macOS have started to
            offer more, but it is not something to count on, so test a few seconds first. On Linux it
            depends on the browser build and the sound system.
          </p>
          <p>
            <strong class="text-foreground">Firefox and Safari</strong> record the screen well but do not
            currently share tab or system sound with a page. In those browsers, the microphone is the only
            sound that can be recorded.
          </p>
          <p>
            <strong class="text-foreground">Your microphone</strong> is separate, and asked for only if you
            tick it. When both a share’s sound and the microphone are present, they are mixed into one
            track, because a video file’s players expect one. Headphones stop the computer’s sound from
            leaking back into the microphone and being recorded twice.
          </p>
        </div>
      </section>

      <section aria-labelledby="format-heading" class="rounded-2xl bg-muted/50 p-6 sm:p-8">
        <h2 id="format-heading" class="text-xl font-semibold">
          WebM or MP4?
        </h2>
        <div class="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground">
          <p>
            The recorder uses the best format your browser can write. Chrome and Edge (from version 126)
            and Safari record <strong class="text-foreground">MP4</strong> with H.264 video, which opens
            almost everywhere: QuickTime, the Windows Photos app, iMovie, PowerPoint, phones, and every
            video site. Firefox records <strong class="text-foreground">WebM</strong>, as do older
            versions of Chrome.
          </p>
          <p>
            WebM is a perfectly good format — YouTube, Chrome, Firefox, Edge and VLC all play it — but
            browsers write it as a live stream and leave out the video’s length, so in most players you
            cannot skip around in it. This recorder fixes that before you download: it writes the
            duration into the file’s header, touching only its first few hundred bytes, so the WebM you
            save can be scrubbed like any other video.
          </p>
          <p>
            If you need MP4 from a WebM — for an editor or an older player that refuses it — convert it
            on your own computer rather than with an upload site. VLC can do it from Media → Convert /
            Save, HandBrake opens WebM directly, and with ffmpeg it is one line:
            <code class="rounded bg-muted px-1 py-0.5 text-foreground">ffmpeg -i recording.webm -c:v libx264 -c:a aac recording.mp4</code>.
            Or record in Chrome, Edge or Safari, and get MP4 to begin with.
          </p>
          <p>
            The quality preset sets the most the encoder may spend each second. Standard (2.5 Mbit/s)
            keeps slides and code crisp in small files; High (5 Mbit/s) is right for most screens; Very
            high (10 Mbit/s) holds up through scrolling, video and games. A screen that barely moves comes
            in far below the figure, which is why the size estimate on the page switches from the preset
            to what your recording is actually using after the first few seconds.
          </p>
        </div>
      </section>

      <FaqSection :items="faq" class="rounded-2xl bg-muted/50 p-6 sm:p-8" />

      <ZealPromise />
    </ToolContents>
  </div>
</template>
