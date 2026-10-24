<script setup lang="ts">
import meta from '../../../../meta'

const { public: { siteUrl } } = useRuntimeConfig()

useSeoMeta({
  title: 'Blur or Pixelate Part of an Image — Free, No Upload',
  description: 'Brush over faces, number plates, names and addresses to blur, pixelate or black them out. Undo any stroke, change the effect afterwards, download or copy. Runs in your browser — nothing is uploaded.',
  ogTitle: 'Image Redactor — blur or pixelate anything with a brush',
  ogDescription: 'Paint over a face, a plate or a line of text and it is hidden as you draw. Nothing uploaded, no sign-up.',
  ogUrl: `${siteUrl}/tools/${meta.slug}`,
  twitterCard: 'summary_large_image',
})

defineOgImage('Default', { title: 'Image Redactor', description: meta.tagline })

const howToSteps = [
  { title: 'Open a picture', body: 'Drop in a photo, choose a file, or paste a screenshot straight from the clipboard. It is read into the page on your device and never uploaded.' },
  { title: 'Paint over what should not be seen', body: 'Pick pixelate, blur or black out, then brush across the face, plate or text. It is hidden as you draw. The restore brush paints the original back if you go over the line.' },
  { title: 'Adjust, then save', body: 'Change the effect or its strength and every painted area updates at once. Undo works stroke by stroke. Download the result, or copy it to paste straight into a chat or a ticket.' },
]

useToolJsonLd(meta, {
  description: meta.description,
  featureList: [
    'Brush-based blur, pixelation and black-out',
    'Effect and strength can be changed after painting',
    'Stroke-by-stroke undo and redo, and a restore brush',
    'Paste screenshots directly from the clipboard',
    'Saves at full resolution with location metadata removed',
    'Runs entirely in your browser, nothing uploaded',
    'No sign-up and no watermark',
  ],
  howTo: { name: 'How to blur or pixelate part of an image', steps: howToSteps.map(s => ({ name: s.title, text: s.body })) },
})

const faq = [
  { q: 'Is my image uploaded?', a: 'No. The picture is decoded by your browser and every brush stroke is applied by code running on this page. There is no server step at all — you can load the page, disconnect from the internet, and redact and save as normal. For a tool whose whole purpose is hiding something, sending the unredacted original to a stranger\'s server first would defeat the point.' },
  { q: 'Which should I use — blur, pixelate or black out?', a: 'For faces and number plates in a photo, pixelate or blur at a high strength is fine and looks less heavy-handed. For text — names, email addresses, account numbers, anything typed — use black out. Blur and pixelation scramble information; black out removes it, and with text that difference matters.' },
  { q: 'Can pixelated or blurred text be read back?', a: 'Sometimes, yes. Text in a screenshot is drawn in a known font at a known size, so someone can render candidate words, pixelate them the same way and compare the blocks — public tools exist that do exactly this. Light blur has the same weakness. That is why black out is offered and why it is the right choice for text: there is nothing left to compare against.' },
  { q: 'Can I change the effect after I have painted?', a: 'Yes. Your strokes record where to hide, and the effect is applied on top of them. Switch from pixelate to black out, or turn the strength up, and every area you have already painted changes with it. Undo removes strokes one at a time, and redo puts them back.' },
  { q: 'I painted over too much. How do I fix it?', a: 'Switch the brush to Restore and paint over the part that should show — the original comes back under the brush. Undo also works for whole strokes, and Clear removes everything at once.' },
  { q: 'Does the saved image still contain GPS or camera data?', a: 'No. The download is written fresh from the redacted pixels, and that process carries no EXIF, so the location, camera and timestamp a phone photo usually holds are not in the saved file. If you only want to remove metadata without changing the picture, the EXIF viewer does that losslessly.' },
  { q: 'Is the quality reduced?', a: 'The image is saved at its full original resolution. Screenshots and PNGs are saved as PNG, which is lossless, so text you did not redact stays crisp. Photos are saved as JPEG or WebP at high quality, which keeps the file a sensible size; a JPEG is re-encoded once in the process.' },
  { q: 'Does it work on a phone?', a: 'Yes — paint with a finger. On a small screen, zoom the brush down and work in short strokes; undo is one tap away if a stroke lands somewhere it should not.' },
  { q: 'Can I redact a PDF or a video?', a: 'Not with this tool — it works on images. For a PDF, take a screenshot of the page and redact that, or use the redaction feature of a PDF editor that actually deletes the underlying text, not one that only draws a box over it.' },
]

const contents = [
  { id: 'howto-heading', label: 'How to use it' },
  { id: 'which-heading', label: 'Blur, pixelate or black out' },
  { id: 'text-heading', label: 'Why text needs black out' },
  { id: 'faq-heading', label: 'Questions' },
  { id: 'promise', label: 'The Zeal Promise' },
]
</script>

<template>
  <div class="container-page py-10">
    <ToolPageHeader
      title="Image Redactor"
      description="Brush over faces, number plates and private text to blur, pixelate or black them out — in your browser, without uploading anything."
    />

    <!--
      Rendered on the server: nothing touches a browser API until a file
      arrives, so a ClientOnly fallback would only add a layout shift.
    -->
    <ImageRedactorTool />

    <section class="mt-12 flex flex-wrap gap-2 text-sm" aria-label="Related tools">
      <NuxtLink to="/tools/exif-viewer" class="rounded-full border border-border px-4 py-1.5 transition-colors hover:border-primary/40 hover:text-primary">
        EXIF viewer →
      </NuxtLink>
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
          How to blur or pixelate part of an image
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

      <section aria-labelledby="which-heading" class="rounded-2xl bg-muted/50 p-6 sm:p-8">
        <h2 id="which-heading" class="text-xl font-semibold">
          Blur, pixelate or black out — which one hides it
        </h2>
        <div class="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground">
          <p>
            <strong class="text-foreground">Pixelate</strong> replaces each square of the picture with its
            average colour. It is the familiar look of a face hidden on the news, and at a high strength
            the squares are large enough that a face, a number plate or a house number simply is not
            there any more. The grid is fixed to the picture rather than to your brush, so neighbouring
            strokes line up and painting the same area twice never shifts it.
          </p>
          <p>
            <strong class="text-foreground">Blur</strong> smears each pixel across its neighbours. It reads
            as softer and less dramatic than pixelation — good for a crowd in the background of a photo,
            or a stranger&rsquo;s face in a holiday picture you want to post. At low strength it is a
            privacy gesture rather than a guarantee; turn it up for anything that matters.
          </p>
          <p>
            <strong class="text-foreground">Black out</strong> paints the area solid black. It is the least
            pretty and the only one that removes information rather than disguising it, which is why it is
            the right choice for text.
          </p>
          <p>
            Strength scales with the picture, so the same setting hides about the same share of a
            12-megapixel phone photo as of a small screenshot. And because the brush only records
            <em>where</em> to hide, you can paint first and decide on the effect afterwards — every area
            changes together.
          </p>
        </div>
      </section>

      <section aria-labelledby="text-heading" class="rounded-2xl bg-muted/50 p-6 sm:p-8">
        <h2 id="text-heading" class="text-xl font-semibold">
          Why pixelated text is not really hidden
        </h2>
        <div class="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground">
          <p>
            A face is unique, which is what makes pixelating one work: there is no way to guess what was
            under the squares. Text in a screenshot is the opposite. It is drawn in a known font, at a
            known size, from a small alphabet, so someone who wants to read it can type out candidate
            words, pixelate them the same way, and compare the resulting blocks against yours until they
            match. Tools that automate this are public, and they work best on exactly the thing people
            most often pixelate — a password, a name or an email address in a screenshot.
          </p>
          <p>
            <strong class="text-foreground">Blur has the same weakness</strong>, and a light blur is weaker
            still, since the shapes of the letters survive it. Black out does not: there is nothing left in
            the pixels to match against. So the rule of thumb is simple — blur or pixelate people and
            places, black out words.
          </p>
          <p>
            The other leak is the file itself. A photo straight off a phone usually carries the coordinates
            where it was taken. The redacted copy is written fresh from its pixels, and that carries no
            metadata, so hiding a house number in the picture does not leave the house&rsquo;s location in
            the file.
          </p>
        </div>
      </section>

      <FaqSection :items="faq" class="rounded-2xl bg-muted/50 p-6 sm:p-8" />

      <ZealPromise />
    </ToolContents>
  </div>
</template>
