<script setup lang="ts">
import meta from '../../../../meta'

const { public: { siteUrl } } = useRuntimeConfig()
const pageUrl = `${siteUrl}/tools/qr-code-generator/vcard`

useSeoMeta({
  title: 'vCard QR Code Generator — Digital Business Card, Free Forever',
  description: 'Create a vCard QR code that adds your name, phone, email and company straight to any phone\'s contacts. Free, no sign-up, no expiry — generated in your browser, your details never touch a server.',
  ogTitle: 'vCard QR Code Generator — free, no sign-up',
  ogDescription: 'One scan adds you to their contacts. Free forever, generated in your browser.',
  ogUrl: pageUrl,
  twitterCard: 'summary_large_image',
})

defineOgImage('Default', {
  title: 'vCard QR Code Generator',
  description: 'One scan adds you to their contacts. Free forever, generated in your browser.',
})

useToolJsonLd(meta, { variant: 'vcard' })

const { track } = useAnalytics()
onMounted(() => track('tool_viewed', { tool: 'qr-code-generator' }))

const faq = [
  { q: 'What is a vCard QR code?', a: 'It encodes your contact details in the standard vCard format. When someone scans it with their phone camera, they get an "Add to contacts" prompt with your name, phone, email, company and website already filled in — no typing, no app.' },
  { q: 'Does it work on both iPhone and Android?', a: 'Yes. The vCard (VCF) format has been the contact-exchange standard for decades; the native camera apps on iOS and Android both recognize it and offer to save the contact directly.' },
  { q: 'Do my contact details get uploaded anywhere?', a: 'No. The QR code is generated entirely in your browser by our open-source encoder — your details are encoded into the image itself and never sent to us. There is nothing to expire and no account to lose.' },
  { q: 'Where should I put a vCard QR code?', a: 'Business cards (print it on the back), email signatures, conference badges, slide decks, storefront windows — anywhere someone might want to save your details. Since the code is static and offline, it works forever with no scan limits.' },
  { q: 'How much contact information can it hold?', a: 'Comfortably: name, phone, email, organization, job title and website. Keep it to the essentials — the less data encoded, the larger and more scannable the modules. Skip the postal address unless you truly need it.' },
]
</script>

<template>
  <div class="container-page py-10">
    <ToolPageHeader
      title="vCard QR Code Generator"
      description="One scan adds you to their contacts. Your details are encoded into the image itself — no account, no expiry, no middleman."
    />

    <ClientOnly>
      <QrTool initial-tab="vcard" />
      <template #fallback>
        <div class="grid h-96 place-items-center rounded-2xl border border-border text-sm text-muted-foreground">
          Loading the generator…
        </div>
      </template>
    </ClientOnly>

    <div class="mx-auto mt-16 space-y-12">
      <section aria-labelledby="vcard-howto" class="rounded-2xl bg-muted/50 p-6 sm:p-8">
        <h2 id="vcard-howto" class="text-xl font-semibold">
          The business card that updates their phone, not their pocket
        </h2>
        <div class="mt-4 space-y-4 text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
          <p>
            Paper business cards get lost; typed-in numbers get typo'd. A vCard QR code carries your details in the same
            <code class="rounded bg-neutral-100 px-1 font-mono text-xs dark:bg-neutral-800">BEGIN:VCARD</code> format phones
            have understood for years — one scan and the "save contact" sheet appears with everything filled in.
          </p>
          <p>
            Because the code is static, it never expires and nothing sits between your card and their phone. Print it once
            and it works for as long as your phone number does.
          </p>
        </div>
      </section>

      <FaqSection :items="faq" class="rounded-2xl bg-muted/50 p-6 sm:p-8" />
    </div>
  </div>
</template>
