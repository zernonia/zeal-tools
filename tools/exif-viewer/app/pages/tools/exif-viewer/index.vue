<script setup lang="ts">
import meta from '../../../../meta'

const { public: { siteUrl } } = useRuntimeConfig()

useSeoMeta({
  title: 'EXIF Viewer — See and Remove Photo Metadata, No Upload',
  description: 'See the camera, timestamp and GPS location hidden in a photo, then download a copy with it all removed — losslessly, without re-encoding the image. Free, no upload, open source.',
  ogTitle: 'EXIF Viewer — see what your photos give away',
  ogDescription: 'Camera, time and location hidden in your photos. View it, then strip it losslessly. Nothing uploaded.',
  ogUrl: `${siteUrl}/tools/${meta.slug}`,
  twitterCard: 'summary_large_image',
})

defineOgImage('Default', { title: 'EXIF Viewer', description: meta.tagline })

const howToSteps = [
  { title: 'Drop in a photo', body: 'A JPEG or PNG. It is read straight from your disk into the page — no upload, which matters more here than anywhere else on this site.' },
  { title: 'Read what it carries', body: 'Anything identifying is shown first: the camera and lens, the exact moment it was taken, and the coordinates if the photo has them. Camera settings follow underneath.' },
  { title: 'Save a clean copy', body: 'The metadata is removed and the image data copied across untouched. The result is the same photo, byte for byte, with the labels gone.' },
]

useToolJsonLd(meta, {
  description: meta.description,
  featureList: [
    'Shows camera, lens, timestamp and GPS coordinates',
    'Removes metadata losslessly — the image is never re-encoded',
    'Runs entirely in your browser, nothing uploaded',
    'Supports JPEG and PNG',
    'No sign-up and no watermark',
  ],
  howTo: { name: 'How to see and remove photo metadata', steps: howToSteps.map(s => ({ name: s.title, text: s.body })) },
})

const faq = [
  { q: 'What is EXIF data?', a: 'A block of information the camera writes inside the image file alongside the picture. It typically records the make and model of the camera or phone, the lens, the exposure settings, the exact date and time to the second, and — if location services were on — the latitude and longitude where you were standing. None of it is visible when you look at the photo, and all of it travels with the file.' },
  { q: 'Is my photo uploaded to see this?', a: 'No, and on this tool in particular that would be self-defeating. The file is read into the page and parsed by your browser. You can load this page, disconnect from the internet, and still read and strip metadata. Nothing is sent, nothing is stored.' },
  { q: 'What does "lossless" mean here?', a: 'That the picture is not re-encoded. Most metadata removers open the image and save it again, which drops the metadata as a side effect and also throws away a little image quality every time. This one treats the file as what it is — a container — and copies the compressed image data across untouched while dropping the metadata segments beside it. We verified this against a 5.6 MB photograph: the image data came out byte for byte identical, same length, same checksum.' },
  { q: 'Do social networks not already strip this?', a: 'Most large platforms do strip EXIF when you upload, though they read it first. The gap is everywhere else: files sent over email or chat, uploaded to forums and marketplaces, attached to a support ticket, or shared in a cloud folder generally keep everything. A photo of something you are selling, taken at home, commonly carries your home coordinates.' },
  { q: 'How precise is the location?', a: 'Usually to within a few metres — precise enough to identify a specific building, and often a specific room. That is why it is shown first and why there is a link to see it on a map: the number itself does not convey how exposing it is until you look at where it points.' },
  { q: 'Why is the colour profile kept?', a: 'Because it is not information about you, and removing it changes how the image looks. A colour profile tells software how to interpret the pixel values; strip it and colours can shift visibly, especially on wide-gamut photos. This removes what identifies you and keeps what renders the picture correctly.' },
  { q: 'Which formats are supported?', a: 'JPEG and PNG, which is where photo metadata overwhelmingly lives. HEIC is not supported because only Safari can decode it, and a tool that quietly works for some visitors and not others is worse than one that says so. Sharing a photo off an iPhone usually converts it to JPEG anyway.' },
  { q: 'Does removing metadata change the file size?', a: 'It gets slightly smaller, by exactly the size of what was removed — often a few kilobytes, sometimes more if the camera embedded a thumbnail. The tool tells you how much it took out.' },
  { q: 'Can I strip metadata from a batch of photos?', a: 'Not yet — this tool handles one at a time so it can show you what each file contains, which is the point of looking. If you only want the pixels and not the labels, the image compressor drops all metadata as a side effect of re-encoding, and handles batches.' },
]
</script>

<template>
  <div class="container-page py-10">
    <ToolPageHeader
      title="EXIF Viewer"
      description="See the camera, the timestamp and the location hidden inside a photo — then remove it all without re-encoding a single pixel."
    />

    <ClientOnly>
      <ExifViewerTool />
      <template #fallback>
        <div class="grid h-[280px] place-items-center rounded-2xl border border-border text-sm text-muted-foreground">
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

    <div class="mx-auto mt-16 space-y-12">
      <section aria-labelledby="howto-heading" class="rounded-2xl bg-muted/50 p-6 sm:p-8">
        <h2 id="howto-heading" class="text-xl font-semibold">
          How to see and remove photo metadata
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

      <section aria-labelledby="reveal-heading" class="rounded-2xl bg-muted/50 p-6 sm:p-8">
        <h2 id="reveal-heading" class="text-xl font-semibold">
          The photo of the sofa that shows your address
        </h2>
        <div class="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground">
          <p>
            The classic case is a marketplace listing. You photograph something in your living room, upload
            it to a site that does not strip metadata, and the file carries the coordinates of your living
            room with it — accurate to a few metres, readable by anyone who downloads the picture and knows
            where to look.
          </p>
          <p>
            <strong class="text-foreground">Nothing about the image looks different.</strong> The data sits
            in a separate block inside the file, written by the camera and carried along by every copy,
            every email attachment and every chat forward. Large social platforms usually strip it on
            upload, but email, forums, cloud folders and most smaller sites do not.
          </p>
          <p>
            It is not only location. The camera body and lens identify your equipment, the timestamp is
            accurate to the second, and the software field often names the app that edited it. Individually
            harmless; together, a reasonably precise description of who took the photo, with what, and
            where they were standing.
          </p>
        </div>
      </section>

      <section aria-labelledby="lossless-heading" class="rounded-2xl bg-muted/50 p-6 sm:p-8">
        <h2 id="lossless-heading" class="text-xl font-semibold">
          Removing it without spoiling the photo
        </h2>
        <div class="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground">
          <p>
            The easy way to strip metadata is to open the image and save it again. It works, and it also
            re-encodes every pixel — so a step taken purely for privacy quietly costs you a generation of
            image quality. Do it a few times and the difference becomes visible.
          </p>
          <p>
            <strong class="text-foreground">A JPEG is a container, not a single blob.</strong> The
            compressed picture lives in its own segment, and the metadata sits in separate segments
            beside it. So this copies the image segment across untouched and simply omits the others. The
            output decodes to precisely the same pixels because it contains precisely the same compressed
            data — we checked against a 5.6 MB photograph and the image data came out identical, same
            length and same checksum. PNG works the same way, with text and timestamp chunks dropped and
            the pixel chunks copied through.
          </p>
          <p>
            One thing is deliberately kept: the colour profile. It describes how the pixel values should
            be interpreted rather than anything about you, and removing it can visibly shift the colours.
          </p>
        </div>
      </section>

      <FaqSection :items="faq" class="rounded-2xl bg-muted/50 p-6 sm:p-8" />

      <ZealPromise />
    </div>
  </div>
</template>
