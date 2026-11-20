<script setup lang="ts">
import meta from '../../../../meta'

const { public: { siteUrl } } = useRuntimeConfig()
const pageUrl = `${siteUrl}/tools/${meta.slug}/webp-to-png`

useSeoMeta({
  title: 'WebP to PNG Converter — Free, No Upload',
  description: 'Convert WebP images to PNG in your browser, keeping transparency and full resolution. No upload, no sign-up, no watermark. Batch convert and download as a zip.',
  ogTitle: 'WebP to PNG — converted in your browser, transparency kept',
  ogDescription: 'Turn WebP images into PNG locally, transparency included. No upload, no sign-up.',
  ogUrl: pageUrl,
  twitterCard: 'summary_large_image',
})

defineOgImage('Default', { title: 'WebP to PNG', description: 'Transparency kept, never uploaded.' })

const faq = [
  { q: 'Why do I have WebP images in the first place?', a: 'Many websites now serve WebP because it is smaller than JPG and PNG at the same quality, so \'Save image as\' in a browser often hands you a .webp file. Browsers open it fine, but some older photo editors, office software and upload forms do not.' },
  { q: 'Is transparency kept?', a: 'Yes. WebP and PNG both support transparency, so a logo or cut-out with a see-through background stays see-through. Converting to JPG instead would fill those areas with a solid colour.' },
  { q: 'Do animated WebP files work?', a: 'Only the first frame is converted, because a browser canvas draws one frame at a time and PNG is a still-image format. For animation you would need a GIF or a video format.' },
  { q: 'Why is the PNG larger than the WebP?', a: 'WebP compresses much more efficiently than PNG, so the same picture usually takes more space as a PNG. That is expected; the trade is wider compatibility for a bigger file.' },
  { q: 'Is the image uploaded?', a: 'No. Your browser decodes the WebP and writes the PNG on your own device, with no upload, no queue and no daily limit.' },
]

useToolJsonLd(meta, {
  variant: 'webp-to-png',
  name: 'WebP to PNG Converter',
  description: 'Convert WebP images to PNG in your browser, keeping transparency, with no upload.',
  featureList: ['Converts WebP to PNG locally', 'Keeps transparency', 'No upload and no watermark', 'Batch conversion with a zip download'],
})
const contents = [
  { id: 'why-heading', label: 'Getting a WebP into something that wants PNG' },
  { id: 'faq-heading', label: 'Questions' },
  { id: 'promise', label: 'The Zeal Promise' },
]
</script>

<template>
  <div class="container-page py-10">
    <ToolPageHeader
      title="WebP to PNG"
      description="Convert WebP images to PNG so they open everywhere — transparency kept, full resolution, nothing uploaded."
    />

    <ClientOnly>
      <ImageCompressorTool default-format="image/png" />
      <template #fallback>
        <div class="grid tool-frame place-items-center rounded-2xl border border-border text-sm text-muted-foreground">
          Loading the converter…
        </div>
      </template>
    </ClientOnly>

    <ToolContents :items="contents">
      <section aria-labelledby="why-heading" class="rounded-2xl bg-muted/50 p-6 sm:p-8">
        <h2 id="why-heading" class="text-xl font-semibold">
          Getting a WebP into something that wants PNG
        </h2>
        <div class="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground">
          <p>
            WebP is a good format with an awkward history: browsers adopted it years before everything else did, so it is common to download an image that a desktop program, an older phone or a form refuses to accept. PNG is the safe destination, because it is understood everywhere and, like WebP, it keeps transparency.
          </p>
          <p>
            <strong class="text-foreground">The conversion is lossless from here on.</strong> The PNG holds exactly the pixels your browser decoded from the WebP. If the WebP was saved with lossy compression, that loss is already baked in and is carried over faithfully rather than repaired.
          </p>
          <p>
            If you only need a smaller file rather than a PNG specifically, JPG is the more compact choice for photographs — though it gives up transparency.
          </p>
        </div>
      </section>

      <FaqSection :items="faq" class="rounded-2xl bg-muted/50 p-6 sm:p-8" />
      <ZealPromise />
    </ToolContents>
  </div>
</template>
