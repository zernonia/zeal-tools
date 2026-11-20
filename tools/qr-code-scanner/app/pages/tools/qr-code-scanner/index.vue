<script setup lang="ts">
import meta from '../../../../meta'

const { public: { siteUrl } } = useRuntimeConfig()

useSeoMeta({
  title: 'QR Code Scanner — Scan from Camera or Image, Check Links First',
  description: 'Scan a QR code with your camera, from a screenshot or photo, or by pasting an image. See the real website before you open a link, with warnings for lookalike and shortened addresses. Free, no app, nothing uploaded.',
  ogTitle: 'QR Code Scanner — see where a code really goes',
  ogDescription: 'Camera, screenshot or paste. Links are checked and shown first, never opened by themselves. Runs on your device; nothing is uploaded.',
  ogUrl: `${siteUrl}/tools/${meta.slug}`,
  twitterCard: 'summary_large_image',
})

defineOgImage('Default', { title: 'QR Code Scanner', description: meta.tagline })

const howToSteps = [
  { title: 'Start the camera, or bring an image', body: 'Press Start camera and allow access; the rear camera is used on a phone. No camera, or the code is on your own screen? Drop in a screenshot or photo, choose one, or copy it and press Ctrl+V (⌘V on a Mac).' },
  { title: 'Hold the code in the frame', body: 'Keep it flat and steady, filling roughly a third of the view. The scanner reads about ten frames a second and stops repeating itself once it has a code, so there is no button to press.' },
  { title: 'Check what it says, then act', body: 'For a link, read the website name in large type and any warning beneath it before you press Open. WiFi codes show the network and password to copy, contacts and events download as files your phone can add, and the exact text of every code is shown underneath.' },
]

useToolJsonLd(meta, {
  description: meta.description,
  featureList: [
    'Scan with the camera, from an uploaded image, or by pasting a screenshot',
    'Links shown first, never opened automatically',
    'Warnings for lookalike domains, link shorteners, IP addresses and unencrypted links',
    'Reads WiFi, contact (vCard and MECARD), calendar, email, phone, SMS and location codes',
    'Reads EAN, UPC and Code 128 barcodes where the browser has a built-in detector',
    'Contacts and events download as .vcf and .ics files',
    'Everything processed on your device; nothing is uploaded or stored',
  ],
  howTo: { name: 'How to scan a QR code online', steps: howToSteps.map(s => ({ name: s.title, text: s.body })) },
})

const faq = [
  { q: 'Are my camera and images uploaded anywhere?', a: 'No. Camera frames and the images you drop or paste are decoded inside your browser, on your own device, and the page has no server code that could receive them — there is no upload endpoint at all. The scan history lives in the open tab only and disappears when you close it or reload. You can load the page, switch off your connection and keep scanning.' },
  { q: 'How do I scan a QR code from a screenshot or photo?', a: 'Drop the image onto the scanner, press Scan an image to choose a file, or copy the image and press Ctrl+V (⌘V on a Mac) anywhere on the page. This is the way to read a code that is on your own screen — in an email, a PDF or a social post — since a phone cannot point its camera at itself. Large photos are reduced in careful halving steps, so a small code in the corner of a 12-megapixel picture keeps its detail.' },
  { q: 'What is quishing, and how does this help?', a: 'Quishing is phishing with a QR code: a sticker over the real code on a parking meter, a fake “missed delivery” card, a code in an email that dodges link filters. The code looks the same as any other, so the defence is to read the destination before you open it. This scanner never opens a link by itself. It shows the website that actually answers in large type and spells out what looks wrong: letters from another alphabet that imitate ordinary ones, an address that starts with a famous name but belongs to someone else, a link shortener hiding the real destination, a bare IP address, or a page without encryption.' },
  { q: 'Can it connect me to a WiFi network?', a: 'Not from a web page — no browser lets a site join a network, and that is a good rule. The scanner shows the network name and password with buttons to copy each, so you can pick the network in your settings and paste. On a phone, the built-in camera app can join directly from the same code.' },
  { q: 'Why will a code not scan?', a: 'The usual causes are glare across the code, a code too small or too far away, motion blur, or damage. Tilt the code away from the light, move closer until it fills about a third of the frame, and hold still for a second. Low-contrast designs — pale colours, or light modules on a dark background — are harder to read. Very dense codes with a lot of data need a sharp image; a screenshot always beats a photo of a screen.' },
  { q: 'Does it read ordinary barcodes too?', a: 'Where your browser has a built-in barcode detector — Chrome on Android, ChromeOS and Macs, for example — it also reads EAN, UPC, Code 128, Code 39, Data Matrix, PDF417 and Aztec codes, and checks the check digit on retail barcodes. Other browsers read QR codes only, using the open-source jsQR decoder, which is fetched only when it is needed. The note under the scanner says which one your browser is using.' },
  { q: 'Is it safe to open the link once I have checked it?', a: 'The checks catch the common tricks, but no scanner can know whether a page is honest. A link to the right website can still be the wrong page, and a brand-new domain with a plausible name will pass every check here. If a code asks you to log in, pay or enter card details, type the company’s address into your browser yourself instead.' },
  { q: 'Does it need an app or an account?', a: 'No. It is a web page that works in any modern browser on a phone, tablet or computer. There is no sign-up, no limit on scans, and no ads — the same promise as every tool on this site.' },
]

const contents = [
  { id: 'howto-heading', label: 'How to use it' },
  { id: 'safety-heading', label: 'Checking a code before you trust it' },
  { id: 'types-heading', label: 'What a code can hold' },
  { id: 'faq-heading', label: 'Questions' },
  { id: 'promise', label: 'The Zeal Promise' },
]
</script>

<template>
  <div class="container-page py-10">
    <ToolPageHeader
      title="QR Code Scanner"
      description="Scan with your camera, from a screenshot or photo, or by pasting an image — and see where a link really goes before you open it. Everything happens on your device."
    />

    <QrScannerTool />

    <section class="mt-12 flex flex-wrap gap-2 text-sm" aria-label="Related tools">
      <NuxtLink to="/tools/qr-code-generator" class="rounded-full border border-border px-4 py-1.5 transition-colors hover:border-primary/40 hover:text-primary">
        QR code generator →
      </NuxtLink>
      <NuxtLink to="/tools/qr-code-generator/wifi" class="rounded-full border border-border px-4 py-1.5 transition-colors hover:border-primary/40 hover:text-primary">
        WiFi QR code →
      </NuxtLink>
      <NuxtLink to="/tools/exif-viewer" class="rounded-full border border-border px-4 py-1.5 transition-colors hover:border-primary/40 hover:text-primary">
        EXIF viewer →
      </NuxtLink>
    </section>

    <ToolContents :items="contents">
      <section aria-labelledby="howto-heading" class="rounded-2xl bg-muted/50 p-6 sm:p-8">
        <h2 id="howto-heading" class="text-xl font-semibold">
          How to scan a QR code online
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

      <section aria-labelledby="safety-heading" class="rounded-2xl bg-muted/50 p-6 sm:p-8">
        <h2 id="safety-heading" class="text-xl font-semibold">
          Checking a code before you trust it
        </h2>
        <div class="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground">
          <p>
            A QR code is a link you cannot read. That is the whole of its convenience and the whole of its
            risk: a printed sticker over a car park’s payment code, or a code in an email about a parcel, looks
            exactly like the genuine one. Scams that use them have a name — <strong class="text-foreground">quishing</strong>
            — and they work because most scanners open the link the moment they see it.
          </p>
          <p>
            <strong class="text-foreground">This one never opens anything by itself.</strong> It shows you the
            part of the address that decides who runs the site — <span class="font-mono">bbc.co.uk</span> from
            <span class="font-mono">www.shop.bbc.co.uk</span> — in large type, and only then a button to
            open it. Beneath that, each specific reason for doubt is spelt out in words:
          </p>
          <ul class="list-disc space-y-2 pl-5">
            <li>
              <strong class="text-foreground">Lookalike letters.</strong> A Cyrillic “а” is a different character
              from a Latin “a” but looks identical, so <span class="font-mono">аpple.com</span> is not Apple. The
              scanner shows the address as it appears and as the browser really reads it
              (<span class="font-mono">xn--pple-43d.com</span>).
            </li>
            <li>
              <strong class="text-foreground">A famous name in the wrong place.</strong>
              <span class="font-mono">paypal.com.secure-login.xyz</span> belongs to whoever owns
              <span class="font-mono">secure-login.xyz</span>; everything before it is decoration.
            </li>
            <li>
              <strong class="text-foreground">Shorteners and redirects.</strong> A bit.ly or “dynamic QR” link
              shows you the middleman, not the destination — and the destination can be changed after the code
              has been printed.
            </li>
            <li>
              <strong class="text-foreground">Bare IP addresses, odd ports and unencrypted http.</strong> Real
              businesses almost never print any of them.
            </li>
          </ul>
          <p>
            Codes that run scripts (<span class="font-mono">javascript:</span>) or reach into your device
            rather than open a page are refused outright and shown as text. And whatever the scanner concludes,
            the exact text of the code is printed underneath, so you can check it yourself.
          </p>
        </div>
      </section>

      <section aria-labelledby="types-heading" class="rounded-2xl bg-muted/50 p-6 sm:p-8">
        <h2 id="types-heading" class="text-xl font-semibold">
          What a code can hold, and what the scanner does with it
        </h2>
        <div class="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground">
          <p>
            A QR code only stores text, but there are conventions for what that text means, and phones follow
            them. The scanner reads each one into something you can use. A <strong class="text-foreground">WiFi</strong>
            code (<span class="font-mono">WIFI:S:…;P:…;;</span>) shows the network name, password and security type,
            with escaped characters such as a semicolon in a password handled properly. A
            <strong class="text-foreground">contact</strong> card in vCard or the shorter MECARD format becomes a
            .vcf file your address book can import. A <strong class="text-foreground">calendar event</strong> becomes
            an .ics file, completed with the fields calendar apps insist on. Email, phone, text-message and map
            codes get a button that hands them to the right app — rebuilt from what was parsed, so it does exactly
            what the card says.
          </p>
          <p>
            <strong class="text-foreground">How it reads the pixels.</strong> Where the browser has a built-in
            barcode detector, the scanner uses it: it is fast, costs nothing to download and reads a dozen kinds
            of barcode. Elsewhere it falls back to jsQR, an open-source QR decoder that is fetched only when it is
            first needed. Camera frames are read about ten times a second rather than thirty, which is plenty to
            catch a code and spares your battery, and the camera is switched off the moment you leave the tab.
          </p>
          <p>
            <strong class="text-foreground">From a screenshot.</strong> When the code is on your own screen —
            in an email, a PDF or an online ticket — take a screenshot and paste it in. A screenshot is a far
            cleaner image than a photo of a screen, which picks up moiré and glare. Need to make a code rather
            than read one? The <NuxtLink to="/tools/qr-code-generator" class="text-primary underline-offset-4 hover:underline">
              QR code generator
            </NuxtLink> makes static codes that never expire.
          </p>
        </div>
      </section>

      <FaqSection :items="faq" class="rounded-2xl bg-muted/50 p-6 sm:p-8" />

      <ZealPromise />
    </ToolContents>
  </div>
</template>
