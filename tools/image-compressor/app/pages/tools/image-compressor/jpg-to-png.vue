<script setup lang="ts">
import meta from '../../../../meta'

const { public: { siteUrl } } = useRuntimeConfig()
const pageUrl = `${siteUrl}/tools/${meta.slug}/jpg-to-png`

useSeoMeta({
  title: 'JPG to PNG Converter — Free, In Your Browser',
  description: 'Convert JPG images to PNG without uploading them. Runs in your browser, keeps the full resolution and adds no watermark. Batch conversion with a zip download.',
  ogTitle: 'JPG to PNG — converted in your browser, never uploaded',
  ogDescription: 'Turn JPGs into PNGs locally. No upload, no sign-up, no watermark.',
  ogUrl: pageUrl,
  twitterCard: 'summary_large_image',
})

defineOgImage('Default', { title: 'JPG to PNG', description: 'Converted in your browser, never uploaded.' })

const faq = [
  { q: 'Why convert a JPG to a PNG?', a: 'Usually because something asks for PNG — an app icon, a design tool, a form — or because you are about to edit the image and want every later save to be lossless. PNG never throws detail away when it saves, so repeated edits do not pile up compression artefacts the way repeated JPG saves do.' },
  { q: 'Will the PNG look better than the JPG?', a: 'No, and it is worth being clear about this. Converting stops any further loss, but it cannot undo the compression the JPG already applied. The PNG is an exact copy of the JPG\'s pixels, blemishes included.' },
  { q: 'Why is the PNG so much bigger?', a: 'Because PNG stores every pixel exactly, and a photograph has millions of subtly different ones. Expect the PNG to be several times the size of the JPG. That is the cost of lossless storage, not a fault in the conversion.' },
  { q: 'Does converting add transparency?', a: 'No. A JPG has no transparent areas to carry over, so the PNG is fully opaque. To cut the subject out of a photo, use the background remover, which produces a PNG with a transparent background.' },
  { q: 'Is my image uploaded?', a: 'No. Your browser decodes the JPG and encodes the PNG on your own machine. You can load this page, disconnect from the internet, and convert as many images as you like.' },
]

useToolJsonLd(meta, {
  variant: 'jpg-to-png',
  name: 'JPG to PNG Converter',
  description: 'Convert JPG images to PNG in your browser, with no upload and no watermark.',
  featureList: ['Converts JPG to PNG locally', 'No upload and no watermark', 'Full resolution kept', 'Batch conversion with a zip download'],
})
const contents = [
  { id: 'why-heading', label: 'When PNG is the right choice' },
  { id: 'faq-heading', label: 'Questions' },
  { id: 'promise', label: 'The Zeal Promise' },
]
</script>

<template>
  <div class="container-page py-10">
    <ToolPageHeader
      title="JPG to PNG"
      description="Convert JPG images to PNG without uploading them. It happens in your browser, at full resolution, with no watermark."
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
          When PNG is the right choice
        </h2>
        <div class="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground">
          <p>
            JPG is built for photographs: it saves space by discarding detail the eye is unlikely to miss, and it does so again every time the file is saved. PNG is lossless — what goes in is exactly what comes out, every time.
          </p>
          <p>
            <strong class="text-foreground">That makes PNG the safer working format.</strong> If you are about to crop, annotate or retouch an image and save it several times, converting to PNG first means the only loss is the one the JPG already had. It is also what many design tools, app stores and upload forms ask for.
          </p>
          <p>
            For simply sharing a photo, JPG — or WebP, which is smaller still — remains the better choice. PNG copies of photographs are large, and the extra size buys nothing a viewer can see.
          </p>
        </div>
      </section>

      <FaqSection :items="faq" class="rounded-2xl bg-muted/50 p-6 sm:p-8" />
      <ZealPromise />
    </ToolContents>
  </div>
</template>
