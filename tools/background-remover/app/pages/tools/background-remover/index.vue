<script setup lang="ts">
import meta from '../../../../meta'

const { public: { siteUrl } } = useRuntimeConfig()
const pageUrl = `${siteUrl}/tools/${meta.slug}`

useSeoMeta({
  title: 'Background Remover — Free, Private, No Upload',
  description: 'Remove the background from any photo in your browser. The image is never uploaded — the model runs on your own machine. Free transparent PNGs, no sign-up, no watermark, open source.',
  ogTitle: 'Background Remover — your photo never leaves your device',
  ogDescription: 'Cut out backgrounds in the browser. No upload, no sign-up, no watermark, no credits.',
  ogUrl: pageUrl,
  twitterCard: 'summary_large_image',
})

defineOgImage('Default', {
  title: 'Background Remover',
  description: meta.tagline,
})

const faq = [
  { q: 'Is my photo uploaded anywhere?', a: 'No. The model is downloaded to your browser and runs there, on your own processor. Your image is read from disk into a canvas and is never sent over the network. What does leave your machine is a request for the model file itself — nothing more.' },
  { q: 'You say nothing is uploaded, but something is downloaded. Which is it?', a: 'Both, and the distinction is the whole point. Traffic goes one way: weights come down, your picture never goes up. The model files are fetched from Hugging Face, so they see your IP address the way any website you visit would. Nothing else about you is sent, and your photograph never is.' },
  { q: 'Why is there a download the first time I use it?', a: 'Running a model locally means having the model locally. The background model is about 94 MB, the runtime that executes it about 13 MB, and the magic brush a further 13 MB if you use it. None of it is fetched when the page loads — only when you actually remove a background, so nobody who is merely reading the page pays for it. Your browser then caches all of it, and every later image starts immediately, including on future visits.' },
  { q: 'What is the magic brush?', a: 'A second, much smaller model that answers a different question. The background model looks at a picture and gives you its own opinion, which you cannot argue with. The magic brush takes your click as an input: point at an object and it works out that object\u2019s edges, so you can add something it dropped or cut away something it kept. It costs a 13 MB download the first time and a few seconds to read each picture, after which every click takes well under a second.' },
  { q: 'Why can I not just re-run the model after correcting it?', a: 'Because the background model has no way to hear the correction. It is a saliency detector: it looks at a picture and restates its own opinion, and your corrections are precisely the places where that opinion was wrong. Feeding it its own corrected output simply reproduces the original answer and throws your edits away — we measured exactly that, which is why the magic brush uses a promptable model instead.' },
  { q: 'The edges around hair look rough. Can I fix that?', a: 'Lower the cut tightness and raise the edge softness a little. Tightness controls how much of the uncertain boundary survives, and hair lives almost entirely inside that uncertain band, so a tight cut removes it. If whole clumps are missing rather than fine strands, the magic brush will usually bring them back in one click.' },
  { q: 'Is there a watermark, a credit limit or a sign-up?', a: 'None of the three, and there never will be. This is exactly the part of background removal that is normally used to force an account: a free preview at low resolution, then a paywall for the full-size file. You get the full resolution of whatever you put in, every time.' },
  { q: 'What resolution do I get back?', a: 'The same resolution you supplied, up to 4096 pixels on the longest edge. The model itself only ever looks at a 512-pixel square, because that is what it was trained at, but the resulting matte is scaled back up and applied to your original pixels. The output is not a 512-pixel image.' },
  { q: 'Can I put the cutout on a coloured background?', a: 'Yes. Choose one of the presets or pick any colour, and the cutout is composited onto it before download. Leave it on transparent and you get a PNG with a real alpha channel, ready for a design tool, a slide or a website.' },
  { q: 'Does it work on a phone?', a: 'Yes, but the first run is a real cost on mobile data: about 94 MB before anything happens. Once cached it stays usable and later pictures start immediately. If a very large photo makes the tab run out of memory, scale it down before you start.' },
  { q: 'Can I use the results commercially?', a: 'Yes. The background model is BiRefNet-lite under the MIT licence, the magic brush is SlimSAM under Apache 2.0, and this site is MIT — so there are no rights for anyone here to assert over your output. Whatever rights you held in the original photograph, you still hold.' },
  { q: 'Is there an API for this one?', a: 'No, deliberately. Every other tool here is callable over REST and MCP because the logic is a pure function we can run on a server. This one is a neural network, and running it for you would mean you uploading your image to us — which is precisely what this tool exists to avoid.' },
]

useToolJsonLd(meta, {
  name: 'Background Remover',
  description: meta.description,
  featureList: [
    'Runs entirely in the browser — no upload',
    'Transparent PNG output at full resolution',
    'Solid colour backgrounds',
    'Adjustable edge softness and cut tightness',
    'No sign-up, no watermark, no credits',
  ],
  howTo: {
    name: 'How to remove the background from a photo',
    steps: [
      { name: 'Choose an image', text: 'Drop a photo onto the page or pick one from your device. It is read locally and never uploaded.' },
      { name: 'Wait for the first run', text: 'The first image downloads the model to your browser and caches it. Later images start immediately.' },
      { name: 'Adjust the edge', text: 'Use cut tightness and edge softness to suit the subject — softer for hair, tighter for hard-edged products.' },
      { name: 'Download', text: 'Save a transparent PNG, or composite the cutout onto a solid colour first.' },
    ],
  },
})
const contents = [
  { id: 'privacy-heading', label: 'Why no upload' },
  { id: 'how-heading', label: 'How the cutout is actually made' },
  { id: 'results-heading', label: 'Getting a better result' },
  { id: 'faq-heading', label: 'Questions' },
  { id: 'promise', label: 'The Zeal Promise' },
]
</script>

<template>
  <div class="container-page py-10">
    <ToolPageHeader
      title="Background Remover"
      description="Cut the background out of any photo, without uploading it anywhere. The model runs in your browser, so the image never leaves your device."
    />

    <ClientOnly>
      <BackgroundRemoverTool />
      <template #fallback>
        <div class="grid h-[420px] place-items-center rounded-2xl border border-border text-sm text-muted-foreground">
          Loading the background remover…
        </div>
      </template>
    </ClientOnly>

    <section class="mt-12 flex flex-wrap gap-2 text-sm" aria-label="Related tools">
      <NuxtLink to="/tools/qr-code-generator" class="rounded-full border border-border px-4 py-1.5 transition-colors hover:border-primary/40 hover:text-primary">
        QR code generator →
      </NuxtLink>
      <NuxtLink to="/tools/countdown-timer" class="rounded-full border border-border px-4 py-1.5 transition-colors hover:border-primary/40 hover:text-primary">
        Countdown timer →
      </NuxtLink>
    </section>

    <ToolContents :items="contents">
      <section aria-labelledby="privacy-heading" class="rounded-2xl bg-muted/50 p-6 sm:p-8">
        <h2 id="privacy-heading" class="text-xl font-semibold">
          Why "no upload" is the whole point
        </h2>
        <div class="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground">
          <p>
            Nearly every background remover on the web works the same way: you hand your photograph to a
            company, their server processes it, and you get a result back. That is a reasonable engineering
            choice and a genuinely awkward privacy one. The images people most want to cut out are the ones
            they are least casual about — staff headshots, product shots before launch, photographs of
            children, identity documents, someone's face for a slide.
          </p>
          <p>
            <strong class="text-foreground">Here the model comes to your image instead.</strong> The
            network is downloaded to your browser once and executed by your own processor. Your
            photograph is read from disk into a canvas, turned into numbers, and the numbers stay in the
            tab. Traffic goes one way only: weights come down, the picture never goes up.
          </p>
          <p>
            It is worth being exact, because "private" is a word people use loosely. The model files are
            fetched from Hugging Face, which means they see an IP address, exactly as any site you visit
            does. What is never transmitted is the picture, and no server here ever holds it — so there is
            nothing for anyone to log, retain, train on, or leak.
          </p>
          <p>
            The remaining trade-off is real and worth stating. A server can run a model ten times larger
            than anything sensible to download, and larger models cut better hair. What you get here is a
            model that fits down a wire in under a minute, is honest about where its limits are, and does
            not ask you to decide whether you trust a stranger with the file.
          </p>
        </div>
      </section>

      <section aria-labelledby="how-heading" class="rounded-2xl bg-muted/50 p-6 sm:p-8">
        <h2 id="how-heading" class="text-xl font-semibold">
          How the cutout is actually made
        </h2>
        <div class="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground">
          <p>
            The model is a salient-object detector. It does not know what a person or a chair is; it was
            trained to answer a narrower question — which pixels belong to the thing this picture is
            <em>about</em>? That framing explains most of its behaviour. Give it one clear subject and it
            is confident. Give it a group photo, a shelf of similar products or a landscape with no focal
            point, and it has no basis on which to choose. That is what the magic brush is for.
          </p>
          <p>
            Your image is scaled to the 512-pixel square the model was trained at and passed through the
            network, which returns a score for
            every pixel. Those scores become a greyscale <em>matte</em>: white where it is certain this is
            the subject, black where it is certain it is not, and grey along every boundary where it is
            genuinely unsure. That band of grey is the interesting part, and it is what the two edge
            controls act on.
          </p>
          <p>
            <strong class="text-foreground">Cut tightness</strong> decides how much of the uncertain band
            to keep. Push it up and only confident pixels survive, giving the crisp, decisive edge you
            want on a bottle or a box. Pull it down and more of the doubtful boundary stays, which is
            right for hair, fur and motion blur, where the true edge really is partly transparent.
            <strong class="text-foreground">Edge softness</strong> then blurs the matte slightly, so the
            cutout has a believable transition instead of the aliased staircase that makes a composite
            look pasted together.
          </p>
          <p>
            The matte is finally scaled back up to your original resolution and written into the alpha
            channel of your own pixels. The model only ever saw a small square, but the pixels you
            download are the ones you supplied — which is why the output is full resolution even though
            inference happens at 512.
          </p>
        </div>
      </section>

      <section aria-labelledby="results-heading" class="rounded-2xl bg-muted/50 p-6 sm:p-8">
        <h2 id="results-heading" class="text-xl font-semibold">
          Getting a better result
        </h2>
        <div class="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground">
          <p>
            <strong class="text-foreground">Separate your subject before you shoot, if you can.</strong>
            The single biggest factor is contrast between the subject and what is behind it. A dark jacket
            against a dark wall is hard for any model, including expensive ones. Half a metre of distance
            between subject and background, or a slightly brighter backdrop, does more for the cutout than
            any slider.
          </p>
          <p>
            <strong class="text-foreground">Reach for the magic brush before the sliders.</strong> If a
            whole region is wrong rather than the edge, one click on that object fixes it properly, where
            an edge slider can only trade one kind of error for another.
          </p>
          <p>
            <strong class="text-foreground">Crop to one subject.</strong> If two people are in the frame
            and you only want one, crop first. Saliency detection will usually try to keep both, and no
            amount of edge tuning will make it choose.
          </p>
          <p>
            <strong class="text-foreground">Check the cutout on the colour you will actually use.</strong>
            Edges that look clean on the checkerboard can show a bright fringe once composited onto a dark
            background, because the original background colour is still faintly present in the semi-
            transparent pixels. Switch the background to your real one and judge it there — that is why the
            colour presets sit beside the edge controls rather than after the download button.
          </p>
          <p>
            <strong class="text-foreground">Trim only at the end.</strong> Trimming crops away the
            transparent margin, which is useful for a logo or an asset going into a layout, and unhelpful
            if you need the subject to stay in position relative to the original frame.
          </p>
        </div>
      </section>

      <FaqSection :items="faq" class="rounded-2xl bg-muted/50 p-6 sm:p-8" />

      <ZealPromise />
    </ToolContents>
  </div>
</template>
