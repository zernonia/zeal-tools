<script setup lang="ts">
import meta from '../../../../meta'

const { public: { siteUrl } } = useRuntimeConfig()
const pageUrl = `${siteUrl}/tools/${meta.slug}/png-to-jpg`

useSeoMeta({
  title: 'PNG to JPG Converter — Free, In Your Browser',
  description: 'Convert PNG images to JPG without uploading them. Runs entirely in your browser, keeps the full resolution, and adds no watermark. Free and open source.',
  ogTitle: 'PNG to JPG — converted in your browser, never uploaded',
  ogDescription: 'Turn PNGs into JPGs locally. No upload, no sign-up, no watermark.',
  ogUrl: pageUrl,
  twitterCard: 'summary_large_image',
})

defineOgImage('Default', { title: 'PNG to JPG', description: 'Converted in your browser, never uploaded.' })

const faq = [
  { q: 'Why convert a PNG to a JPG at all?', a: 'Because PNG stores every pixel exactly, which is wonderful for screenshots and logos and enormously wasteful for photographs. A photo saved as PNG is routinely five to ten times larger than the same photo as JPG at a quality nobody can distinguish. If the image is a photograph, JPG is almost always the right answer.' },
  { q: 'When should I keep the PNG instead?', a: 'When the image has transparency, sharp edges or text. JPG has no transparency at all — transparent areas come out solid — and its compression smears the hard boundaries in screenshots, diagrams and logos into visible fuzz. For those, keep PNG or convert to WebP, which supports transparency and is smaller than both.' },
  { q: 'What happens to transparency?', a: 'It is flattened, because JPG cannot store it. Anything transparent becomes solid in the output. If your image has a transparent background and you need to keep it, convert to WebP instead — it supports transparency and produces a smaller file than PNG.' },
  { q: 'Does the image get uploaded?', a: 'No. Your browser decodes the PNG, redraws it and encodes a JPG, entirely on your own machine. You can load this page, disconnect from the internet, and convert as many images as you like.' },
  { q: 'Will I lose quality?', a: 'A little, by definition — JPG is a lossy format. At the default quality the difference is very hard to see on a photograph. Converting the same file repeatedly does compound the loss, so convert from your original PNG rather than from a JPG you made earlier.' },
]

useToolJsonLd(meta, {
  variant: 'png-to-jpg',
  name: 'PNG to JPG Converter',
  description: 'Convert PNG images to JPG in your browser, with no upload and no watermark.',
  featureList: ['Converts PNG to JPG locally', 'No upload and no watermark', 'Full resolution kept', 'Batch conversion with a zip download'],
})
</script>

<template>
  <div class="container-page py-10">
    <ToolPageHeader
      title="PNG to JPG"
      description="Convert PNG images to JPG without uploading them. It happens in your browser, at full resolution, with no watermark."
    />

    <ClientOnly>
      <ImageCompressorTool default-format="image/jpeg" />
      <template #fallback>
        <div class="grid h-[420px] place-items-center rounded-2xl border border-border text-sm text-muted-foreground">
          Loading the converter…
        </div>
      </template>
    </ClientOnly>

    <div class="mx-auto mt-16 space-y-12">
      <section aria-labelledby="why-heading" class="rounded-2xl bg-muted/50 p-6 sm:p-8">
        <h2 id="why-heading" class="text-xl font-semibold">
          PNG is the wrong format for a photograph
        </h2>
        <div class="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground">
          <p>
            PNG is lossless: it stores every pixel exactly as it was. For a screenshot, a logo or a
            diagram that is precisely what you want, because the alternative smears text and sharp edges.
            For a photograph it is a very expensive promise to keep — photographs have no exact edges
            worth preserving, just millions of slightly different colours.
          </p>
          <p>
            <strong class="text-foreground">The result is that a photo stored as PNG is commonly five to
              ten times larger than the same photo as JPG</strong>, at a quality difference you would
            struggle to point at. That is the entire reason this conversion exists.
          </p>
          <p>
            The one thing to watch is transparency. JPG has none, so anything see-through becomes solid.
            If you need transparency and a small file, convert to WebP instead — it keeps the alpha
            channel and still beats PNG on size.
          </p>
        </div>
      </section>

      <FaqSection :items="faq" class="rounded-2xl bg-muted/50 p-6 sm:p-8" />
      <ZealPromise />
    </div>
  </div>
</template>
