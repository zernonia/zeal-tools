<script setup lang="ts">
import meta from '../../../../meta'

const { public: { siteUrl } } = useRuntimeConfig()

useSeoMeta({
  title: 'JPG to WebP Converter — Free, In Your Browser',
  description: 'Convert JPG images to WebP without uploading them. Typically 25-35% smaller at the same visual quality. Runs in your browser, free, no sign-up, open source.',
  ogTitle: 'JPG to WebP — smaller files, converted locally',
  ogDescription: 'Turn JPGs into WebP in your browser. No upload, no sign-up, no watermark.',
  ogUrl: `${siteUrl}/tools/${meta.slug}/jpg-to-webp`,
  twitterCard: 'summary_large_image',
})

defineOgImage('Default', { title: 'JPG to WebP', description: 'Smaller files, converted in your browser.' })

useToolJsonLd(meta, {
  variant: 'jpg-to-webp',
  name: 'JPG to WebP Converter',
  description: 'Convert JPG images to WebP in your browser, typically 25-35% smaller at the same quality.',
  featureList: ['Converts JPG to WebP locally', 'Typically 25-35% smaller than JPEG', 'No upload and no watermark', 'Batch conversion with a zip download'],
})

const faq = [
  { q: 'How much smaller is WebP than JPG?', a: 'For photographs, typically 25 to 35% smaller at a quality most people cannot tell apart. The saving is larger for images with flat areas or gentle gradients and smaller for very noisy ones. The tool shows the before and after for each file, so you can see the real number for your images rather than trusting an average.' },
  { q: 'Does every browser support WebP?', a: 'Yes, in every version in current use. Chrome, Firefox, Edge, Safari and every mobile browser have supported it for years. The remaining caveat is not browsers but software: some older desktop applications and a few upload forms still refuse WebP, so keep JPG when a file has to be accepted by something you do not control.' },
  { q: 'Is converting JPG to WebP lossless?', a: 'No, and it is worth understanding why. Your JPG has already lost detail, and re-encoding as WebP loses a little more on top. At the default quality this is very hard to see, but it does mean you should convert from the best original you have rather than from a copy that has already been through several rounds.' },
  { q: 'Should I use WebP for everything?', a: 'For photographs on the web, essentially yes. For images that must be pixel-exact — screenshots of text, diagrams, logos — WebP also has a lossless mode, but this tool uses the lossy one, so PNG remains the better choice there. For anything that leaves the web and lands in someone else\'s workflow, JPG is still the safest currency.' },
  { q: 'Are my images uploaded?', a: 'No. Your browser decodes the JPG and encodes the WebP on your own machine. Nothing is sent anywhere, so there is no upload to wait for and no copy left on a server.' },
]
const contents = [
  { id: 'why-heading', label: 'Why WebP' },
  { id: 'faq-heading', label: 'Questions' },
  { id: 'promise', label: 'The Zeal Promise' },
]
</script>

<template>
  <div class="container-page py-10">
    <ToolPageHeader
      title="JPG to WebP"
      description="Convert JPG images to WebP — usually a third smaller at the same visual quality. It happens in your browser, and nothing is uploaded."
    />

    <ClientOnly>
      <ImageCompressorTool default-format="image/webp" />
      <template #fallback>
        <div class="grid h-[420px] place-items-center rounded-2xl border border-border text-sm text-muted-foreground">
          Loading the converter…
        </div>
      </template>
    </ClientOnly>

    <ToolContents :items="contents">
      <section aria-labelledby="why-heading" class="rounded-2xl bg-muted/50 p-6 sm:p-8">
        <h2 id="why-heading" class="text-xl font-semibold">
          The same picture, a third of the bytes
        </h2>
        <div class="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground">
          <p>
            JPEG was designed in 1992, and it has aged remarkably well. WebP simply had thirty more years
            of research to draw on: better prediction of what the next block of pixels will look like,
            and smarter handling of the areas where JPEG traditionally struggles — smooth skies, gentle
            gradients, and the soft edges where compression artefacts are easiest to spot.
          </p>
          <p>
            <strong class="text-foreground">In practice that means 25 to 35% off a photograph at a quality
              difference you would have to hunt for.</strong> On a page carrying a dozen images, that is
            the difference between loading comfortably on a phone and not.
          </p>
          <p>
            The one thing to keep in mind is where the file is going. Browsers have supported WebP for
            years, so anything destined for a website is safe. Some older desktop software and the odd
            upload form still expect JPG — for those, convert to JPEG instead and accept the larger file.
          </p>
        </div>
      </section>

      <FaqSection :items="faq" class="rounded-2xl bg-muted/50 p-6 sm:p-8" />
      <ZealPromise />
    </ToolContents>
  </div>
</template>
