<script setup lang="ts">
import meta from '../../../../meta'

const { public: { siteUrl } } = useRuntimeConfig()

useSeoMeta({
  title: 'Image Compressor — Free, No Upload, No Watermark',
  description: 'Compress, convert and resize images in your browser. Nothing is uploaded, so your photos never leave your device. Batch friendly, free, no sign-up, open source.',
  ogTitle: 'Image Compressor — your photos never leave your device',
  ogDescription: 'Shrink JPEG, PNG and WebP in the browser. No upload, no sign-up, no watermark.',
  ogUrl: `${siteUrl}/tools/${meta.slug}`,
  twitterCard: 'summary_large_image',
})

defineOgImage('Default', { title: 'Image Compressor', description: meta.tagline })

const howToSteps = [
  { title: 'Drop your images in', body: 'One or a hundred. They are read straight from disk into the page — nothing is uploaded, and you can disconnect from the internet first if you would like to prove it.' },
  { title: 'Pick a format', body: 'WebP is the default because it is usually far smaller than JPEG at the same visual quality. Choose JPEG for maximum compatibility, or PNG when you need every pixel kept exactly.' },
  { title: 'Set the quality, and resize if you want to', body: 'Around 80% is generally indistinguishable from the original. Most photos destined for a website are also far larger than they need to be, so capping the longest edge often saves more than quality alone.' },
  { title: 'Save them', body: 'Each image individually, or the whole batch as a zip. The originals on your disk are untouched.' },
]

useToolJsonLd(meta, {
  description: meta.description,
  featureList: [
    'Runs entirely in your browser — images are never uploaded',
    'Convert between WebP, JPEG and PNG',
    'Resize by longest edge, width, height or percentage',
    'Batch compression with a zip download',
    'No sign-up, no watermark, no file size limit from us',
  ],
  howTo: { name: 'How to compress an image', steps: howToSteps.map(s => ({ name: s.title, text: s.body })) },
})

const faq = [
  { q: 'Are my images uploaded anywhere?', a: 'No. The file is read from your disk into the page, decoded by your browser, redrawn at the size you asked for and re-encoded — all on your own machine. You can open the network panel and watch it stay silent, or load the page and disconnect from the internet before adding a single image. Nothing is sent, nothing is stored, and there is no queue on a server somewhere holding your photos.' },
  { q: 'Which format should I choose?', a: 'WebP unless you have a reason not to: at the same visual quality it is typically 25–35% smaller than JPEG, and every browser in current use supports it. Choose JPEG if the file has to open in something old or in software that predates WebP. Choose PNG only when you need exact pixels — screenshots of text, images with sharp edges, or anything with transparency you cannot afford to approximate.' },
  { q: 'Why did my PNG get bigger?', a: 'Because PNG is lossless, so re-encoding it cannot invent savings — and if the original was written by a tool with a better compressor than a browser has, the result can come out slightly larger. The fix is usually to convert rather than recompress: the same image as WebP will almost always be dramatically smaller. The tool tells you honestly when the output grew rather than quietly claiming a saving.' },
  { q: 'What quality should I use?', a: 'Start at 80. For photographs the difference from the original is very hard to see, while the file is often a third of the size. Below about 60 you start to see blocking in skies and smooth gradients. Above 90 the file grows quickly for very little visible gain. Images with text or sharp graphics show artefacts sooner, so keep those higher — or use PNG.' },
  { q: 'Does resizing help more than compressing?', a: 'Very often, yes. A 4000-pixel photo displayed in a 800-pixel column is carrying twenty-five times more pixels than anyone will see, and no quality setting recovers that. Capping the longest edge at something near its real display size usually saves more than any amount of quality tuning, and it costs nothing visible.' },
  { q: 'Is there a limit on how many or how big?', a: 'None from us, because we never receive them. The real limit is your device: every image is decoded into memory, so a very large batch of very large photos will eventually run a phone out of room. On a laptop, hundreds of ordinary photos is fine. Nothing is queued, throttled or reserved for a paid tier.' },
  { q: 'Do you strip EXIF and location data?', a: 'Yes, as a side effect of how it works. The image is redrawn from its pixels, so camera settings, timestamps and GPS coordinates do not survive into the output. If you want to see what was in there first, or remove metadata without recompressing the image at all, use the EXIF viewer instead — it strips the data losslessly and leaves the pixels untouched.' },
  { q: 'Will the quality of an already-compressed image get worse?', a: 'It can, and that is worth understanding. Lossy formats lose a little each time they are re-encoded, so compressing an already-compressed JPEG twice is worse than doing it once well. This tool always works from the original file you dropped in, so changing the quality slider re-encodes from that original rather than stacking loss on loss.' },
  { q: 'What about HEIC photos from my iPhone?', a: 'They are not supported, and being straight about why: only Safari can decode HEIC, so a tool that offered it would work for some visitors and silently fail for the rest. Sharing or emailing a photo off an iPhone usually converts it to JPEG on the way out, which this handles fine.' },
  { q: 'Is there a catch?', a: 'No. No sign-up, no watermark, no daily limit, no "upgrade for full resolution". You get the full size of whatever you put in, every time. It is MIT licensed and the code is a few hundred lines you can read.' },
]
const contents = [
  { id: 'howto-heading', label: 'How to compress an image' },
  { id: 'size-heading', label: 'Why size matters' },
  { id: 'local-heading', label: 'Why nothing uploads' },
  { id: 'faq-heading', label: 'Questions' },
  { id: 'promise', label: 'The Zeal Promise' },
]
</script>

<template>
  <div class="container-page py-10">
    <ToolPageHeader
      title="Image Compressor"
      description="Shrink, convert and resize images in your browser. They are never uploaded — no sign-up, no watermark, no limit."
    />

    <ClientOnly>
      <ImageCompressorTool />
      <template #fallback>
        <div class="grid h-[420px] place-items-center rounded-2xl border border-border text-sm text-muted-foreground">
          Loading the compressor…
        </div>
      </template>
    </ClientOnly>

    <section class="mt-12 flex flex-wrap gap-2 text-sm" aria-label="Related tools">
      <NuxtLink to="/tools/image-compressor/png-to-jpg" class="rounded-full border border-border px-4 py-1.5 transition-colors hover:border-primary/40 hover:text-primary">
        PNG to JPG →
      </NuxtLink>
      <NuxtLink to="/tools/image-compressor/jpg-to-webp" class="rounded-full border border-border px-4 py-1.5 transition-colors hover:border-primary/40 hover:text-primary">
        JPG to WebP →
      </NuxtLink>
      <NuxtLink to="/tools/background-remover" class="rounded-full border border-border px-4 py-1.5 transition-colors hover:border-primary/40 hover:text-primary">
        Background remover →
      </NuxtLink>
    </section>

    <ToolContents :items="contents">
      <section aria-labelledby="howto-heading" class="rounded-2xl bg-muted/50 p-6 sm:p-8">
        <h2 id="howto-heading" class="text-xl font-semibold">
          How to compress an image
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

      <section aria-labelledby="size-heading" class="rounded-2xl bg-muted/50 p-6 sm:p-8">
        <h2 id="size-heading" class="text-xl font-semibold">
          The pixels you cannot see are the ones costing you
        </h2>
        <div class="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground">
          <p>
            Most oversized images on the web are not badly compressed. They are simply far bigger than the
            space they are shown in. A photo straight off a modern phone is around 4000 pixels wide; the
            column it ends up in is often 700. That image is carrying more than thirty times the pixels
            anyone will ever look at, and no quality slider recovers that waste.
          </p>
          <p>
            <strong class="text-foreground">Resize first, then compress.</strong> Capping the longest edge
            near the size it will actually be displayed at routinely takes 80% off the file before quality
            is touched at all — and unlike lowering quality, it costs nothing visible, because the detail
            being discarded was never going to reach a screen.
          </p>
          <p>
            Then let the format do the rest. WebP at quality 80 is usually a third of the original JPEG
            and visually identical at normal viewing size. The two together are the difference between a
            page that loads instantly and one that does not.
          </p>
        </div>
      </section>

      <section aria-labelledby="local-heading" class="rounded-2xl bg-muted/50 p-6 sm:p-8">
        <h2 id="local-heading" class="text-xl font-semibold">
          Why this one does not upload anything
        </h2>
        <div class="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground">
          <p>
            Nearly every image compressor works the same way: you upload your photos, a server processes
            them, and you download the results. It works, and it means handing a stranger a copy of every
            picture you compress — including the ones you were compressing precisely because you were
            about to share them somewhere careful.
          </p>
          <p>
            <strong class="text-foreground">There is no technical need for any of that.</strong> Browsers
            have been able to decode, resize and re-encode images natively for years. This tool reads the
            file from your disk, draws it into a canvas at the size you asked for, and asks the browser to
            encode it. The photo never becomes a network request, so there is no upload to interrupt, no
            queue to wait in, and no retention policy to read.
          </p>
          <p>
            It also means the honest limits are your own. Nothing is capped at ten files or five megabytes
            to push you toward an account, because there is no server cost for us to ration.
          </p>
        </div>
      </section>

      <FaqSection :items="faq" class="rounded-2xl bg-muted/50 p-6 sm:p-8" />

      <ZealPromise />
    </ToolContents>
  </div>
</template>
