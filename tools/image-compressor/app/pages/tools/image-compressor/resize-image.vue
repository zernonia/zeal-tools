<script setup lang="ts">
import meta from '../../../../meta'

const { public: { siteUrl } } = useRuntimeConfig()
const pageUrl = `${siteUrl}/tools/${meta.slug}/resize-image`

useSeoMeta({
  title: 'Resize Image — Free Image Resizer, No Upload',
  description: 'Resize JPG, PNG and WebP images to an exact width, height or percentage without uploading them. Batch resize in your browser, download as a zip. Free, no watermark.',
  ogTitle: 'Resize Image — free image resizer that never uploads',
  ogDescription: 'Resize photos to any width, height or percentage in your browser. Batch, no upload, no sign-up.',
  ogUrl: pageUrl,
  twitterCard: 'summary_large_image',
})

defineOgImage('Default', { title: 'Resize Image', description: 'Any size, in your browser, never uploaded.' })

const faq = [
  { q: 'How do I resize an image to a specific width?', a: 'Choose Width in the Resize menu and type the number of pixels. The height follows automatically so the picture keeps its shape — nothing is stretched or squashed. Longest edge does the same for whichever side is bigger, which is the easiest setting for a batch of mixed portrait and landscape photos.' },
  { q: 'Will it make a small image bigger?', a: 'No. Images are only ever made smaller. Enlarging cannot add detail that was never captured, so an upscaled photo is just a bigger, blurrier file — and a tool that does it silently can turn a 200 KB picture into a 4 MB one while claiming to have optimised it.' },
  { q: 'What size should I use?', a: '1920 pixels on the longest edge, the default here, fills a full-HD screen and suits most websites, emails and messages. 1080 is plenty for social media posts. 800 to 1200 is typical for product photos on a shop, and 3000 or more only matters if the picture will be printed large.' },
  { q: 'Is the quality reduced?', a: 'Resizing throws away pixels by definition, but it is done carefully: the image is halved in steps rather than squashed in one jump, so each pass averages what it discards. That is what keeps edges smooth instead of jagged. The output format and quality can be changed beside the resize setting.' },
  { q: 'Are my photos uploaded?', a: 'No. Your browser decodes, resizes and re-encodes each image on your own device. You can load this page, disconnect from the internet, and resize as many images as you like.' },
  { q: 'Is the location data kept?', a: 'No. Re-encoding through the browser writes a fresh file without the camera\'s metadata, so GPS coordinates, the camera model and the timestamp are not carried into the resized copy.' },
]

useToolJsonLd(meta, {
  variant: 'resize-image',
  name: 'Image Resizer',
  description: 'Resize images by width, height, longest edge or percentage in your browser, with no upload.',
  featureList: ['Resize by width, height, longest edge or percentage', 'Batch resizing with a zip download', 'Never enlarges an image', 'No upload and no watermark'],
})
const contents = [
  { id: 'sizes-heading', label: 'Which size to pick' },
  { id: 'how-heading', label: 'How the resizing is done' },
  { id: 'faq-heading', label: 'Questions' },
  { id: 'promise', label: 'The Zeal Promise' },
]
</script>

<template>
  <div class="container-page py-10">
    <ToolPageHeader
      title="Resize Image"
      description="Make images smaller by width, height, longest edge or percentage — one at a time or a whole batch, without uploading anything."
    />

    <ClientOnly>
      <ImageCompressorTool default-format="image/jpeg" :default-resize="{ mode: 'longest', value: 1920 }" />
      <template #fallback>
        <div class="grid tool-frame place-items-center rounded-2xl border border-border text-sm text-muted-foreground">
          Loading the resizer…
        </div>
      </template>
    </ClientOnly>

    <ToolContents :items="contents">
      <section aria-labelledby="sizes-heading" class="rounded-2xl bg-muted/50 p-6 sm:p-8">
        <h2 id="sizes-heading" class="text-xl font-semibold">
          Which size to pick
        </h2>
        <div class="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground">
          <p>
            Most resizing is about one of three things: a website that loads quickly, an attachment small enough to send, or an upload form with a limit. In every case the useful number is the longest edge, because it caps the size of portrait and landscape photos alike. That is why it is the default here, at 1920 pixels.
          </p>
          <p>
            <strong class="text-foreground">A phone photo is usually 4000 pixels or more across</strong> — around four times wider than most screens can show. Bringing it down to 1920 typically cuts the file to a fifth or less, and on a screen the difference is invisible. For social media, 1080 is the common target; for a thumbnail or an avatar, a few hundred.
          </p>
          <p>
            If a form asks for an exact width — a banner, a header, a marketplace listing — use Width instead and type the number. Percentage is handy when you just want everything half the size.
          </p>
        </div>
      </section>
      <section aria-labelledby="how-heading" class="rounded-2xl bg-muted/50 p-6 sm:p-8">
        <h2 id="how-heading" class="text-xl font-semibold">
          How the resizing is done
        </h2>
        <div class="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground">
          <p>
            A canvas can shrink an image in one step, but doing so samples roughly one pixel in ten and ignores the rest, which turns fine detail into jagged noise. This tool halves the image repeatedly instead, so every step averages the pixels it discards, and only the last step lands on the exact size.
          </p>
          <p>
            Everything happens in your browser. Nothing is uploaded, nothing is queued on a server, and there is no daily limit or watermark.
          </p>
        </div>
      </section>

      <FaqSection :items="faq" class="rounded-2xl bg-muted/50 p-6 sm:p-8" />
      <ZealPromise />
    </ToolContents>
  </div>
</template>
