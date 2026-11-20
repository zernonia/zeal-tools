<script setup lang="ts">
import meta from '../../../../meta'

const { public: { siteUrl } } = useRuntimeConfig()

useSeoMeta({
  title: 'Dead Pixel Test — Full-Screen Colours to Find Dead and Stuck Pixels',
  description: 'A free online dead pixel test: fill your screen with black, white, red, green, blue, grey and a gradient, stepped through by hand, to find dead, stuck and hot pixels on a monitor, laptop, TV or phone. No flashing, no auto-cycling unless you ask.',
  ogTitle: 'Dead Pixel Test — find dead and stuck pixels, full screen',
  ogDescription: 'Solid full-screen colours to check a new monitor or phone. Stepped by hand, never flashing.',
  ogUrl: `${siteUrl}/tools/${meta.slug}/dead-pixel`,
  twitterCard: 'summary_large_image',
})

defineOgImage('Default', { title: 'Dead Pixel Test', description: 'Find dead and stuck pixels with full-screen colours.' })

const howToSteps = [
  { title: 'Clean the screen first', body: 'A speck of dust looks exactly like a dead pixel. Wipe the screen with a dry microfibre cloth, and dim the room if you can — faults are easier to see without reflections.' },
  { title: 'Start the full-screen test', body: 'Press Start, or pick the colour to begin on. The page asks the browser for full screen so nothing but the colour is on the display; on iPhone, where pages cannot go full screen, it fills the window.' },
  { title: 'Step through every colour', body: 'Press the right arrow or Space, or tap, to move on. On each colour, look across the whole screen slowly, section by section, from a normal viewing distance and then close up. The tips say what to look for on each one.' },
  { title: 'Note anything that does not change', body: 'A dot that stays black on every colour is dead; one that stays lit on black is stuck. Note where it is, then press Esc to finish. Take a photo of it on the colour where it shows best if you are going to report it.' },
]

useToolJsonLd(meta, {
  variant: 'dead-pixel',
  name: 'Dead Pixel Test',
  description: 'Find dead, stuck and hot pixels with full-screen solid colours and a gradient, stepped through by hand.',
  featureList: [
    'Full-screen black, white, red, green, blue, grey and gradient screens',
    'Step by keyboard, click or tap — never changes on its own unless you turn auto-advance on',
    'Auto-advance no faster than once every two seconds',
    'Tips for what each colour reveals',
    'Works on monitors, laptops, TVs with a browser, tablets and phones',
  ],
  howTo: { name: 'How to test a screen for dead pixels', steps: howToSteps.map(s => ({ name: s.title, text: s.body })) },
})

const faq = [
  { q: 'What is the difference between a dead pixel and a stuck pixel?', a: 'A dead pixel gets no power, so it stays off — on most modern screens that is a black dot, easiest to see on the white screen. A stuck pixel has one or more of its red, green and blue sub-pixels permanently on, so it shows as a bright coloured dot, easiest to see on black. A pixel can also be partly stuck, with one sub-pixel failed off, which shows as a dark dot on that colour only.' },
  { q: 'Can a stuck pixel be fixed?', a: 'Sometimes a stuck pixel recovers on its own after hours or days of use, and very occasionally after the screen is switched off for a while. A dead pixel does not come back. Beyond that, there is no reliable fix that a web page or video can give you, and some popular ones carry real risks — see below.' },
  { q: 'Do pixel-fixing videos and flashing tools work?', a: 'There is no good evidence that they do. They rapidly flash colours over the faulty area in the hope of jolting the pixel back to life; reports of success are anecdotal and cannot be told apart from pixels that would have recovered anyway. They are also exactly the kind of rapid full-screen flashing that can trigger seizures in people with photosensitive epilepsy, which is why this test never flashes and its optional auto-advance changes no faster than once every two seconds.' },
  { q: 'What about pressing on the pixel?', a: 'Not recommended. Massaging the screen through a cloth is a well-known suggestion, and pressing on an LCD or OLED panel is also a good way to damage it further, and may not be covered by the warranty if it does. If the screen is new, return or warranty it instead.' },
  { q: 'How many dead pixels are allowed under warranty?', a: 'It depends entirely on the manufacturer. Many publish a pixel policy, often based on the pixel-fault classes of the ISO 9241-307 standard, which allows a small number of faults per million pixels; some premium lines promise zero bright pixels. Look up your model\'s policy, and test a new screen straight away — the shop\'s return window is usually easier than a warranty claim.' },
  { q: 'Does this work on a phone or a TV?', a: 'Yes, on anything with a browser. On Android, full screen works as on a computer. iPhone Safari cannot put a page into full screen, so the test fills the window; turn the phone sideways and scroll slightly to hide the bars. On a smart TV, open this page in its browser and use the remote\'s arrow keys.' },
  { q: 'Why is there a gradient?', a: 'A smooth ramp from black to white shows a different kind of fault: banding, where the screen shows visible steps instead of a smooth blend. A little banding is normal on cheaper panels and with some colour settings; heavy banding can mean the display is running at a reduced colour depth.' },
]

const contents = [
  { id: 'howto-heading', label: 'How to use it' },
  { id: 'kinds-heading', label: 'Dead, stuck and hot pixels' },
  { id: 'safety-heading', label: 'Flashing and pixel fixers' },
  { id: 'faq-heading', label: 'Questions' },
  { id: 'promise', label: 'The Zeal Promise' },
]
</script>

<template>
  <div class="container-page py-10">
    <ToolPageHeader
      title="Dead Pixel Test"
      description="Fill your screen with solid colours, one at a time, to find dead, stuck and hot pixels on a monitor, laptop, TV or phone. It changes only when you tell it to."
    />

    <DeviceTestDeadPixel />

    <section class="mt-12 flex flex-wrap gap-2 text-sm" aria-label="Related tools">
      <NuxtLink to="/tools/device-test/keyboard" class="rounded-full border border-border px-4 py-1.5 transition-colors hover:border-primary/40 hover:text-primary">
        Keyboard tester →
      </NuxtLink>
      <NuxtLink to="/tools/device-test/webcam" class="rounded-full border border-border px-4 py-1.5 transition-colors hover:border-primary/40 hover:text-primary">
        Webcam test →
      </NuxtLink>
      <NuxtLink to="/tools/device-test" class="rounded-full border border-border px-4 py-1.5 transition-colors hover:border-primary/40 hover:text-primary">
        All device tests →
      </NuxtLink>
    </section>

    <ToolContents :items="contents">
      <section aria-labelledby="howto-heading" class="rounded-2xl bg-muted/50 p-6 sm:p-8">
        <h2 id="howto-heading" class="text-xl font-semibold">
          How to test a screen for dead pixels
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

      <section aria-labelledby="kinds-heading" class="rounded-2xl bg-muted/50 p-6 sm:p-8">
        <h2 id="kinds-heading" class="text-xl font-semibold">
          Dead, stuck and hot pixels
        </h2>
        <div class="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground">
          <p>
            Every pixel on a colour screen is three smaller lights — red, green and blue sub-pixels — each
            switched by its own tiny transistor. The colour you see is how brightly each of the three is lit.
            A fault is one of those switches failing, and which way it fails decides what you see and which
            test screen shows it.
          </p>
          <p>
            <strong class="text-foreground">A dead pixel</strong> is one whose sub-pixels are all
            permanently off. On most modern LCD and OLED screens it is a black dot, invisible on the black
            screen and obvious on white. <strong class="text-foreground">A stuck pixel</strong> has one or
            two sub-pixels permanently on, so it glows red, green, blue, or a mix such as yellow or cyan, and
            stands out most on black. A <strong class="text-foreground">hot pixel</strong> is the name usually
            given to one stuck fully on, a white dot on black.
          </p>
          <p>
            The red, green and blue screens catch the subtler case: a pixel with one sub-pixel failed off
            looks almost normal on white but shows as a dark spot on the screen of that colour. The grey
            screen shows bright and dark faults together and makes uneven backlighting, clouding and
            &ldquo;dirty screen&rdquo; patches easier to see than either black or white.
          </p>
          <p>
            Not everything that looks like a pixel fault is one. Dust on the surface moves when you wipe it.
            A mark that is larger than a pixel and fuzzy at the edges is usually pressure damage or something
            between the layers of the panel. A pattern that appears only with certain images is more likely
            burn-in on an OLED, or image retention on an LCD, both of which this test also makes visible on
            the grey screen.
          </p>
        </div>
      </section>

      <section aria-labelledby="safety-heading" class="rounded-2xl bg-muted/50 p-6 sm:p-8">
        <h2 id="safety-heading" class="text-xl font-semibold">
          Why this test never flashes
        </h2>
        <div class="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground">
          <p>
            <strong class="text-foreground">Rapidly alternating saturated colours across a whole screen
              can trigger seizures</strong> in people with photosensitive epilepsy, and many do not know
            they have it until it happens. Web accessibility guidelines treat anything flashing more than three
            times a second as dangerous. So this test changes only when you press a key or tap, auto-advance
            is off unless you choose it, and even then the fastest choice is one change every two seconds.
          </p>
          <p>
            That rules out the &ldquo;pixel fixer&rdquo; feature many dead pixel sites offer, and we have
            left it out deliberately rather than by omission. Those tools flash red, green and blue many
            times a second over the faulty area, on the theory that it unsticks the pixel. There is no
            controlled evidence that it works; stuck pixels sometimes recover on their own, which makes
            anecdotes impossible to judge. A remedy that may do nothing and can cause a seizure is not one
            we will put on a page.
          </p>
          <p>
            If a new screen has a fault you can see in normal use, the reliable fix is the shop&rsquo;s
            return policy or the manufacturer&rsquo;s warranty. Check the model&rsquo;s pixel policy, and
            photograph the fault on the colour where it shows most clearly.
          </p>
        </div>
      </section>

      <FaqSection :items="faq" class="rounded-2xl bg-muted/50 p-6 sm:p-8" />

      <ZealPromise />
    </ToolContents>
  </div>
</template>
