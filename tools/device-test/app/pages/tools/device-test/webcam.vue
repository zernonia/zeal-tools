<script setup lang="ts">
import meta from '../../../../meta'

const { public: { siteUrl } } = useRuntimeConfig()

useSeoMeta({
  title: 'Webcam Test — Check Your Camera, Resolution and Frame Rate',
  description: 'A free online webcam test: see your camera live, with the resolution and frame rate it actually delivers, a measured fps, its capabilities, and a snapshot saved straight to your device. Nothing is recorded or uploaded.',
  ogTitle: 'Webcam Test — real resolution and frame rate, nothing uploaded',
  ogDescription: 'Preview your camera and see what it really delivers. Runs in the browser, no app, no sign-up.',
  ogUrl: `${siteUrl}/tools/${meta.slug}/webcam`,
  twitterCard: 'summary_large_image',
})

defineOgImage('Default', { title: 'Webcam Test', description: 'Real resolution and frame rate — nothing uploaded.' })

const howToSteps = [
  { title: 'Press Start and allow the camera', body: 'The browser asks only when you press the button. The preview appears mirrored, the way a selfie camera and most video-call apps show you to yourself.' },
  { title: 'Read what the camera delivers', body: 'Resolution, aspect ratio and frame rate come from the camera stream itself, and the measured frame rate counts the frames that actually arrive. Compare them with what the box or the spec sheet promised.' },
  { title: 'Ask for more, or switch camera', body: 'Choose 1080p or 4K to ask the camera for a larger picture; it opens at the nearest size it can manage, which may be lower. Once access is allowed the camera list shows real device names, including phone rear cameras.' },
  { title: 'Take a snapshot', body: 'Save snapshot writes the current frame as a PNG, at full resolution and unmirrored, straight to your downloads. It is a quick way to check focus, colour and exposure at the pixel level.' },
]

useToolJsonLd(meta, {
  variant: 'webcam',
  name: 'Webcam Test',
  description: 'Test a webcam in the browser: live preview, real resolution and frame rate, measured fps, capabilities and local snapshots.',
  featureList: [
    'Live preview with a mirror toggle',
    'Resolution, aspect ratio and frame rate reported by the camera stream',
    'Frame rate measured from the frames that actually arrive',
    'Camera capability list where the browser provides one',
    'Request 720p, 1080p or 4K',
    'Full-resolution PNG snapshot saved to your device',
    'Nothing recorded or uploaded',
  ],
  howTo: { name: 'How to test a webcam online', steps: howToSteps.map(s => ({ name: s.title, text: s.body })) },
})

const faq = [
  { q: 'Why is my 1080p webcam showing 640 × 480?', a: 'Because the browser opens a camera at a modest default size unless a page asks for more. Choose 1080p in the Ask for list and the camera reopens at the nearest size it supports. If it still comes back small, the camera may be connected through a slow USB port or hub, another app may already have it open at a lower size, or the camera simply does not do what the box claims at a usable frame rate.' },
  { q: 'Why is the frame rate lower than 30 fps?', a: 'Light, most often. In a dim room many webcams slow down to keep each frame exposed for longer, so the picture is brighter but less smooth. Turn on a light in front of you and watch the measured figure climb. Long USB extension cables, busy hubs and the camera running at a high resolution over USB 2 can also cap it.' },
  { q: 'What is the difference between the reported and measured frame rate?', a: 'The reported figure is what the camera stream says it is set to. The measured figure counts the frames that actually reach the page each second. When they disagree, the measured one is what people on a call see. Measuring needs a browser feature called requestVideoFrameCallback, which most current browsers have; where it is missing, the readout says so rather than guessing.' },
  { q: 'Am I really mirrored to other people?', a: 'No. Video-call apps show you a mirrored preview because that is what a mirror looks like, but send the unmirrored picture, so text on your T-shirt reads the right way round for everyone else. Turn mirroring off here to see what they see. The snapshot is always saved unmirrored.' },
  { q: 'Is the video recorded or uploaded?', a: 'No. The picture is drawn on this page by your browser and nothing is recorded. A snapshot is made from the current frame on your own device and handed to your downloads folder; it never passes through zeal.tools. The camera is turned off when you press Stop, leave the page or switch away from the tab.' },
  { q: 'What do the capabilities mean?', a: 'They are the ranges the camera tells the browser it supports: the largest and smallest frame sizes, frame rates, and controls such as zoom, focus, exposure and white balance where it offers them. They describe the hardware\'s limits, not what is in use; the readouts at the top are what is in use.' },
]

const contents = [
  { id: 'howto-heading', label: 'How to use it' },
  { id: 'reading-heading', label: 'What the readouts mean' },
  { id: 'trouble-heading', label: 'When the camera will not start' },
  { id: 'faq-heading', label: 'Questions' },
  { id: 'promise', label: 'The Zeal Promise' },
]
</script>

<template>
  <div class="container-page py-10">
    <ToolPageHeader
      title="Webcam Test"
      description="See your camera live, with the resolution and frame rate it really delivers, and save a full-size snapshot. Nothing is recorded or uploaded."
    />

    <DeviceTestWebcam />

    <section class="mt-12 flex flex-wrap gap-2 text-sm" aria-label="Related tools">
      <NuxtLink to="/tools/device-test/microphone" class="rounded-full border border-border px-4 py-1.5 transition-colors hover:border-primary/40 hover:text-primary">
        Mic test →
      </NuxtLink>
      <NuxtLink to="/tools/device-test" class="rounded-full border border-border px-4 py-1.5 transition-colors hover:border-primary/40 hover:text-primary">
        All device tests →
      </NuxtLink>
      <NuxtLink to="/tools/exif-viewer" class="rounded-full border border-border px-4 py-1.5 transition-colors hover:border-primary/40 hover:text-primary">
        EXIF viewer →
      </NuxtLink>
    </section>

    <ToolContents :items="contents">
      <section aria-labelledby="howto-heading" class="rounded-2xl bg-muted/50 p-6 sm:p-8">
        <h2 id="howto-heading" class="text-xl font-semibold">
          How to test a webcam online
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
            <strong class="text-foreground">Resolution</strong> is the size of the frames the page is
            actually receiving, read from the video itself rather than from the request. That distinction is
            the whole point: a page asks a camera for a size, and the camera answers with the nearest one it
            can do. Many &ldquo;1080p&rdquo; webcams deliver 1080p only at a low frame rate, or only in a
            compressed mode the browser may not pick.
          </p>
          <p>
            <strong class="text-foreground">Frame rate</strong> appears twice. The reported figure is what
            the stream is configured for; the measured figure is a count of frames that arrived over the last
            second. Expect 30 in good light. A measured figure that falls to 15 when you turn the room light
            off is the camera lengthening its exposure, which is normal behaviour rather than a fault.
          </p>
          <p>
            <strong class="text-foreground">Aspect ratio</strong> is usually 16:9 for modern webcams and 4:3
            for older ones and some phones. If your picture looks stretched in a call app but correct here,
            the app is the one changing it.
          </p>
          <p>
            <strong class="text-foreground">Capabilities</strong> list what the camera says it supports,
            from frame size and rate ranges to zoom, focus and exposure controls. Not every browser shares
            them with pages; when yours does not, the delivered settings above are still accurate.
          </p>
        </div>
      </section>

      <section aria-labelledby="trouble-heading" class="rounded-2xl bg-muted/50 p-6 sm:p-8">
        <h2 id="trouble-heading" class="text-xl font-semibold">
          When the camera will not start
        </h2>
        <div class="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground">
          <p>
            <strong class="text-foreground">&ldquo;Could not be opened&rdquo; almost always means another
              app has it.</strong> Windows lets one program use a camera at a time, so Teams, Zoom, OBS, the
            Camera app or another browser holding it will stop this page. Close them — check the system
            tray for apps that keep running in the background — and press Start again.
          </p>
          <p>
            <strong class="text-foreground">If access was blocked,</strong> allow it from the icon at the
            left of the address bar in Chrome and Edge, the crossed-out camera in Firefox, or Safari &rarr;
            Settings &rarr; Websites &rarr; Camera. Then check the operating system: Windows Settings &rarr;
            Privacy &amp; security &rarr; Camera, including &ldquo;Let desktop apps access your camera&rdquo;;
            on a Mac, System Settings &rarr; Privacy &amp; Security &rarr; Camera, with your browser switched
            on. Restart the browser after changing a macOS permission.
          </p>
          <p>
            <strong class="text-foreground">If the picture is black,</strong> look for a physical privacy
            shutter over the lens, or a camera key on the keyboard — several laptops cut the camera in
            hardware with a key or a switch on the side, and no setting overrides it. On Windows, Device
            Manager shows whether the camera is detected at all; if it is missing there, it is a driver or
            hardware problem rather than the browser.
          </p>
          <p>
            <strong class="text-foreground">If the wrong camera opens,</strong> pick the right one from the
            list here, which fills in once access is allowed. Virtual cameras from OBS or video-call apps
            appear in the list too and show a still image or nothing when their app is closed.
          </p>
        </div>
      </section>

      <FaqSection :items="faq" class="rounded-2xl bg-muted/50 p-6 sm:p-8" />

      <ZealPromise />
    </ToolContents>
  </div>
</template>
