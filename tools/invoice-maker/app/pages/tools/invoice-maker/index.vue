<script setup lang="ts">
import meta from '../../../../meta'

const { public: { siteUrl } } = useRuntimeConfig()

useSeoMeta({
  title: 'Invoice Maker — Free, No Sign-Up, Nothing Uploaded',
  description: 'Write an invoice in your browser and save it as a PDF through your own print dialog. Your details and clients are remembered on your device, never uploaded. Free, no account, no per-invoice fee.',
  ogTitle: 'Invoice Maker — nothing uploaded, no account',
  ogDescription: 'A clean invoice, a real PDF, and your details kept for next time. Free and open source.',
  ogUrl: `${siteUrl}/tools/${meta.slug}`,
  twitterCard: 'summary_large_image',
})

defineOgImage('Default', { title: 'Invoice Maker', description: meta.tagline })

const howToSteps = [
  { title: 'Fill in your business once', body: 'Name, address, tax number and logo. These are saved in this browser, so every invoice after the first starts with them already there.' },
  { title: 'Add the client and the lines', body: 'Quantities can be fractional — 2.5 hours is a normal line. Clients you have billed before appear as chips you can click.' },
  { title: 'Set the tax and terms', body: 'A tax rate and a name for it, and how long they have to pay. The discount, if there is one, comes off before tax is worked out.' },
  { title: 'Print it, or save it as a PDF', body: 'The same button does both: your browser\'s print dialog has a "Save as PDF" destination. The text stays selectable, because it is a real document rather than a picture of one.' },
]

useToolJsonLd(meta, {
  description: meta.description,
  featureList: [
    'Live preview of the finished invoice as you type',
    'Business details, logo and clients remembered on your device',
    'Tax, discounts and payment terms',
    'Real PDF through your own print dialog, with selectable text',
    'Nothing uploaded, no account and no per-invoice fee',
  ],
  howTo: { name: 'How to make an invoice', steps: howToSteps.map(s => ({ name: s.title, text: s.body })) },
})

const contents = [
  { id: 'howto-heading', label: 'How to use it' },
  { id: 'pdf-heading', label: 'Where the PDF comes from' },
  { id: 'saved-heading', label: 'What is saved' },
  { id: 'faq-heading', label: 'Questions' },
  { id: 'promise', label: 'The Zeal Promise' },
]

const faq = [
  { q: 'Is my invoice uploaded anywhere?', a: 'No. The whole thing is built in your browser, and the PDF is produced by your own print dialog rather than by a server. You can load the page, disconnect from the internet, and still write and save an invoice. That matters more here than on most tools: an invoice carries your business details, your client\'s name and address, and what you charged them.' },
  { q: 'Where is my information stored?', a: 'In this browser, on this device, using the storage every website has. Your business details, logo, clients and the invoice you are working on are kept so the next one takes a minute instead of ten. Nothing is sent anywhere, and the "Clear saved data" button erases all of it immediately. On a shared or work computer, that button is worth knowing about.' },
  { q: 'How do I get a PDF?', a: 'Press "Print or save as PDF" and choose "Save as PDF" as the destination in the dialog your browser opens. That produces a proper PDF with selectable, searchable text — which is what a client\'s accounting software wants. Tools that build a PDF themselves usually give you a picture of a document instead.' },
  { q: 'Is this a legally valid invoice?', a: 'It produces the document; whether it satisfies your tax authority depends on where you are. Most require the word "invoice", a unique number, both parties\' details, the date, a description of what was supplied, and the tax charged with your registration number — all of which are here. Some places require more, so check your own rules. This is a tool, not tax advice.' },
  { q: 'Does the discount come off before or after tax?', a: 'Before. Tax is owed on what was actually charged rather than on the list price, so the discount reduces the taxable amount and the tax with it. Doing it the other way round overstates the tax on every discounted invoice.' },
  { q: 'Will the amounts always add up?', a: 'Yes, and that is deliberate engineering rather than luck. Every amount is held as a whole number of pence or cents rather than as a decimal, because 0.1 plus 0.2 does not equal 0.3 in floating point and an invoice whose lines do not sum to its total is a document you get asked to explain. Rounding happens in exactly one place.' },
  { q: 'Can I invoice in yen, or another currency without decimals?', a: 'Yes. Yen, won and a few others have no minor unit at all — ¥100 is a hundred yen, not one — and the tool knows that, so a yen invoice is not silently multiplied by a hundred the way it is in tools that assume two decimal places everywhere.' },
  { q: 'Does it keep my old invoices?', a: 'No. It keeps your details, your clients and the invoice you are currently writing, then advances the number when you start the next one. Finished invoices live wherever you saved the PDF. Keeping a pile of them in a browser would mean your billing history disappearing with a cleared cache, which is a worse promise than the one your filing system already makes.' },
  { q: 'What happens on a new device?', a: 'You start fresh — the storage belongs to that browser. There is no account to sign into, which is the trade: nothing to breach, and nothing to sync. Fill in your business details once on each device you invoice from.' },
  { q: 'Is there a catch?', a: 'No. No sign-up, no watermark, no limit on how many invoices, no "upgrade to remove branding". Invoicing tools are the classic place to meter a free tier, and this one has nothing to meter because there is no server doing the work.' },
]
</script>

<template>
  <div class="container-page py-10">
    <ToolPageHeader
      title="Invoice Maker"
      description="Write an invoice, save it as a real PDF from your own print dialog, and keep your details for the next one. Nothing is uploaded."
    />

    <ClientOnly>
      <InvoiceMakerTool />
      <template #fallback>
        <div class="grid tool-frame place-items-center rounded-2xl border border-border text-sm text-muted-foreground">
          Loading the invoice maker…
        </div>
      </template>
    </ClientOnly>

    <section class="mt-12 flex flex-wrap gap-2 text-sm print:hidden" aria-label="Related tools">
      <NuxtLink to="/tools/qr-code-generator" class="rounded-full border border-border px-4 py-1.5 transition-colors hover:border-primary/40 hover:text-primary">
        QR code generator →
      </NuxtLink>
      <NuxtLink to="/tools/image-compressor" class="rounded-full border border-border px-4 py-1.5 transition-colors hover:border-primary/40 hover:text-primary">
        Image compressor →
      </NuxtLink>
    </section>

    <ToolContents :items="contents">
      <section aria-labelledby="howto-heading" class="rounded-2xl bg-muted/50 p-6 sm:p-8">
        <h2 id="howto-heading" class="text-xl font-semibold">
          How to make an invoice
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

      <section aria-labelledby="pdf-heading" class="rounded-2xl bg-muted/50 p-6 sm:p-8">
        <h2 id="pdf-heading" class="text-xl font-semibold">
          Where the PDF actually comes from
        </h2>
        <div class="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground">
          <p>
            Your browser already contains a PDF writer, and it is a good one. Choosing "Save as PDF" in
            the print dialog produces a document with real text in it: selectable, searchable, and
            readable by the accounting software your client will drop it into.
          </p>
          <p>
            <strong class="text-foreground">Most web invoice tools do not use it.</strong> They either
            render the PDF on a server — which means your business details and your client's address make
            a round trip to someone else's machine — or they build one in the browser with a PDF library,
            which typically means embedding fonts, wrestling with layout, and shipping a few hundred
            kilobytes of code to produce something that is often a picture of a document rather than a
            document.
          </p>
          <p>
            So this one prints. The invoice on screen is the invoice on paper, the print stylesheet drops
            the app around it, and the colours are forced back to light so an invoice written in dark mode
            does not arrive as a sheet of black ink.
          </p>
        </div>
      </section>

      <section aria-labelledby="saved-heading" class="rounded-2xl bg-muted/50 p-6 sm:p-8">
        <h2 id="saved-heading" class="text-xl font-semibold">
          What is saved, and where
        </h2>
        <div class="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground">
          <p>
            This is the first tool here that remembers anything, and it is worth being exact about it.
            Your business details, your logo, your tax settings, the clients you have billed and the
            invoice you are part-way through are all written to this browser's own storage, on this
            device. None of it is transmitted, and there is no account for it to be attached to.
          </p>
          <p>
            <strong class="text-foreground">The reason is that an invoice maker without memory is a
              demo.</strong> Your address and tax number do not change between invoices, and retyping them
            every month is exactly the friction this site exists to remove. The invoice number advances by
            itself for the same reason.
          </p>
          <p>
            What is <em>not</em> kept is finished invoices. Those live wherever you saved the PDF, which is
            a filing system that survives a cleared cache and a new laptop. And because storage is the
            user's, the "Clear saved data" button erases all of it in one press — worth knowing if you are
            invoicing from a shared or work machine.
          </p>
        </div>
      </section>

      <FaqSection :items="faq" class="rounded-2xl bg-muted/50 p-6 sm:p-8" />

      <ZealPromise />
    </ToolContents>
  </div>
</template>
