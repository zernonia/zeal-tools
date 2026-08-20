<script setup lang="ts">
import meta from '../../../../meta'

const { public: { siteUrl } } = useRuntimeConfig()

useSeoMeta({
  title: 'Favicon Generator — Free, In Your Browser, No Upload',
  description: 'Turn a logo into favicon.ico, the web icons, a full iOS AppIcon set and Android launcher and Play Store icons — as one zip. Rendered in your browser, never uploaded. Free and open source.',
  ogTitle: 'Favicon Generator — a whole icon set, made locally',
  ogDescription: 'ICO, Apple touch icon, manifest and markup in one zip. Nothing uploaded, no sign-up.',
  ogUrl: `${siteUrl}/tools/${meta.slug}`,
  twitterCard: 'summary_large_image',
})

defineOgImage('Default', { title: 'Favicon Generator', description: meta.tagline })

const howToSteps = [
  { title: 'Drop in your logo', body: 'PNG, JPEG, SVG or WebP. Square works best, but anything is fitted and centred rather than squashed — a stretched logo is unreadable at the size where legibility is the only thing that matters.' },
  { title: 'Add padding or a background if it needs one', body: 'A dense logo reads better at 16 pixels with a little breathing room. A background matters if your logo is transparent, because iOS draws home-screen icons on black.' },
  { title: 'Tick iOS or Android if you need app icons', body: 'You get a complete AppIcon.appiconset with its Contents.json, and every Android launcher density plus the adaptive layers and the Play Store icon.' },
  { title: 'Download the pack', body: 'One zip, sorted into web, ios and android folders. Unzip the web folder into the root of your site and drop the others into your project.' },
  { title: 'Paste the markup', body: 'Five lines into your <head>. The favicon.ico line matters even though browsers request that file anyway — declaring it is the difference between a hit and a 404 on every first visit.' },
]

useToolJsonLd(meta, {
  description: meta.description,
  featureList: [
    'Generates favicon.ico with 16, 32 and 48 pixel entries',
    'Full iOS AppIcon set with Contents.json, App Store icon written without an alpha channel',
    'Android launcher densities, adaptive icon layers and the 512 Play Store icon',
    'Web manifest, maskable icon and ready-to-paste markup',
    'Runs in your browser — the logo is never uploaded',
    'One zip, no sign-up and no watermark',
  ],
  howTo: { name: 'How to make a favicon', steps: howToSteps.map(s => ({ name: s.title, text: s.body })) },
})

const faq = [
  { q: 'Do I still need favicon.ico in 2026?', a: 'Yes, and for a slightly annoying reason: browsers request /favicon.ico whether or not you declare it. If the file is not there, every first visit generates a 404 in your logs. It is also still what several tools, feed readers and older browsers look for first. It costs about a kilobyte, so it is not worth the argument.' },
  { q: 'Why does my App Store upload get rejected for a transparent icon?', a: 'Because Apple refuses any App Store icon whose PNG carries an alpha channel — error ITMS-90717 — and a canvas always writes one, even when every pixel is fully opaque. Filling in a background is not enough: the channel still exists for the validator to object to. This tool re-encodes the 1024 icon as a true RGB PNG with no alpha channel at all, which is the only thing that actually satisfies it.' },
  { q: 'What do I get if I tick iOS?', a: 'A complete AppIcon.appiconset: every size Xcode asks for from 20 up to the 1024 App Store icon, plus the Contents.json that tells Xcode which file fills which slot. Drop the folder into your asset catalog and it is done. Every icon is opaque, because iOS does not honour transparency and composites it onto black.' },
  { q: 'What do I get if I tick Android?', a: 'All five launcher densities from mdpi to xxxhdpi, the 512-pixel Play Store listing icon, and the two adaptive icon layers with the XML that references them. Your logo is inset into the safe zone on the foreground layer, because Android composes adaptive icons at 108dp and only guarantees the middle 72dp survives the launcher\'s mask.' },
  { q: 'What is the safe zone, and why does my adaptive icon look smaller?', a: 'Android lets each launcher crop icons to its own shape — a circle, a squircle, a rounded square — and animates them with a parallax effect. To make that possible it only promises that the central 66% of the image is visible; anything outside can be cropped. So the foreground layer insets your logo to fit inside that band. It looks smaller in the file and correct on the device.' },
  { q: 'Why only six web files? Other generators produce thirty.', a: 'Because most of those thirty are for platforms that no longer exist. Windows tile images, a dozen iOS sizes from the era before iOS scaled icons itself, and the various Android densities are all legacy on the web. Modern browsers take the ICO or the 32px PNG, iOS takes the 180px apple-touch-icon, and Android reads 192 and 512 from the manifest. The app icon sets are separate, and you only get them if you ask.' },
  { q: 'What is inside favicon.ico?', a: 'Three PNG images, at 16, 32 and 48 pixels. ICO is a container that can hold several sizes so the browser picks the right one, and it has accepted PNG-compressed entries for many years — which is far more sensible than the original format of upside-down bitmaps with their own colour tables.' },
  { q: 'Should my logo have padding?', a: 'Usually a little for the web icons. A logo designed to be seen at 200 pixels often has fine detail and tight margins that turn to mush at 16. Ten to fifteen percent, and simplifying the mark itself if you can, does more for legibility than any amount of resampling. The adaptive and maskable icons get their own inset automatically, so you do not need to double up.' },
  { q: 'Why does my icon look black on my iPhone?', a: 'Because the source is transparent. iOS does not preserve transparency in home-screen icons — it composites them onto black. Tick the background option and pick a colour that suits your logo. The iOS set always gets a background for this reason, defaulting to white if you have not chosen one.' },
  { q: 'Can I use an SVG?', a: 'Yes, as the source, and it is the best thing to start from — your browser rasterises it fresh at every size, which beats upscaling a small PNG. The output is always PNG and ICO, because that is what the icon slots accept.' },
  { q: 'Is my logo uploaded?', a: 'No. Every size is drawn by a canvas in your browser and packaged into a zip there too. Nothing is sent anywhere, which for an unreleased app icon is a meaningful difference from the usual arrangement.' },
]
const contents = [
  { id: 'howto-heading', label: 'How to make a favicon' },
  { id: 'short-heading', label: 'Six files, not thirty' },
  { id: 'small-heading', label: 'Designing for sixteen pixels' },
  { id: 'faq-heading', label: 'Questions' },
  { id: 'promise', label: 'The Zeal Promise' },
]
</script>

<template>
  <div class="container-page py-10">
    <ToolPageHeader
      title="Favicon Generator"
      description="Turn a logo into every icon you need — favicons, a full iOS AppIcon set and Android launcher and Play Store icons, in one zip. Nothing is uploaded."
    />

    <ClientOnly>
      <FaviconGeneratorTool />
      <template #fallback>
        <div class="grid tool-frame place-items-center rounded-2xl border border-border text-sm text-muted-foreground">
          Loading…
        </div>
      </template>
    </ClientOnly>

    <section class="mt-12 flex flex-wrap gap-2 text-sm" aria-label="Related tools">
      <NuxtLink to="/tools/image-compressor" class="rounded-full border border-border px-4 py-1.5 transition-colors hover:border-primary/40 hover:text-primary">
        Image compressor →
      </NuxtLink>
      <NuxtLink to="/tools/background-remover" class="rounded-full border border-border px-4 py-1.5 transition-colors hover:border-primary/40 hover:text-primary">
        Background remover →
      </NuxtLink>
    </section>

    <ToolContents :items="contents">
      <section aria-labelledby="howto-heading" class="rounded-2xl bg-muted/50 p-6 sm:p-8">
        <h2 id="howto-heading" class="text-xl font-semibold">
          How to make a favicon
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

      <section aria-labelledby="short-heading" class="rounded-2xl bg-muted/50 p-6 sm:p-8">
        <h2 id="short-heading" class="text-xl font-semibold">
          Six files, not thirty
        </h2>
        <div class="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground">
          <p>
            Favicon generators have a habit of producing an enormous folder: Windows tile images in four
            sizes, a dozen iOS icons from before iOS learned to scale them itself, Android densities that
            the manifest replaced years ago, and a browserconfig.xml for a browser nobody runs. It looks
            thorough. Almost none of it is ever requested.
          </p>
          <p>
            <strong class="text-foreground">Four slots cover essentially everything today.</strong>
            Desktop browsers take favicon.ico or the 32-pixel PNG. iOS takes the 180-pixel
            apple-touch-icon. Android's install prompt reads 192 and 512 from the web manifest. That is
            the list, and everything here exists to fill one of those slots.
          </p>
          <p>
            The one piece of apparent legacy worth keeping is favicon.ico itself — not for old browsers,
            but because every browser still requests that path unprompted. Shipping it turns a guaranteed
            404 into a cached kilobyte.
          </p>
        </div>
      </section>

      <section aria-labelledby="small-heading" class="rounded-2xl bg-muted/50 p-6 sm:p-8">
        <h2 id="small-heading" class="text-xl font-semibold">
          Designing for sixteen pixels
        </h2>
        <div class="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground">
          <p>
            A favicon is mostly seen at 16 pixels square, in a row of other tabs, at a glance. That is
            roughly the resolution of a single letter of body text — which is why logos with a wordmark,
            fine strokes or three colours reliably become an indistinct smudge no matter how the
            resampling is done.
          </p>
          <p>
            <strong class="text-foreground">What survives is a single shape with strong contrast.</strong>
            One letter, one symbol, one silhouette. If your full logo has a mark and a wordmark, use just
            the mark. If it has thin lines, thicken them. A little padding helps too, because tabs crop
            tightly and a shape that touches the edges reads as a rectangle.
          </p>
          <p>
            This tool fits your image rather than stretching it, so a wide logo keeps its proportions and
            gets letterboxed instead of squashed. That prevents the worst outcome, but it cannot make a
            detailed logo legible — for that, simplify the source and try again at 16 pixels until you can
            recognise it.
          </p>
        </div>
      </section>

      <FaqSection :items="faq" class="rounded-2xl bg-muted/50 p-6 sm:p-8" />

      <ZealPromise />
    </ToolContents>
  </div>
</template>
