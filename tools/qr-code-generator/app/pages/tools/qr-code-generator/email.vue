<script setup lang="ts">
import meta from '../../../../meta'

const { public: { siteUrl } } = useRuntimeConfig()
const pageUrl = `${siteUrl}/tools/qr-code-generator/email`

useSeoMeta({
  title: 'Email QR Code Generator — Scan to Compose, Free Forever',
  description: 'Create a QR code that opens a pre-filled email — address, subject and body ready to send. Free, no sign-up, no watermark, generated entirely in your browser.',
  ogTitle: 'Email QR Code Generator — free, no sign-up',
  ogDescription: 'One scan opens a pre-written email. Free forever, generated in your browser.',
  ogUrl: pageUrl,
  twitterCard: 'summary_large_image',
})

defineOgImage('Default', {
  title: 'Email QR Code Generator',
  description: 'One scan opens a pre-written email. Free forever, generated in your browser.',
})

useToolJsonLd(meta, { variant: 'email' })

const { track } = useAnalytics()
onMounted(() => track('tool_viewed', { tool: 'qr-code-generator' }))

const faq = [
  { q: 'What happens when someone scans an email QR code?', a: 'Their phone opens its mail app with a new message already addressed to you — and, if you set them, the subject line and body pre-filled. They just hit send.' },
  { q: 'What are email QR codes used for?', a: 'Feedback and support requests ("scan to report an issue"), RSVP collection, job applications, print ads with a clear call to action — anywhere you want to lower the barrier from "interested" to "in your inbox".' },
  { q: 'Can I pre-fill the subject and body?', a: 'Yes — both are optional fields. Pre-filling them is powerful: you can route scans with a subject tag like "[Store 12] Feedback" and see exactly where a message came from.' },
  { q: 'Is my email address safe in a QR code?', a: 'The address is encoded in the image itself using the standard mailto: format — the same as publishing it on a website. Generate and use it freely; nothing is stored on our servers.' },
]
const contents = [
  { id: 'email-howto', label: 'From poster to inbox in one scan' },
  { id: 'faq-heading', label: 'Questions' },
]
</script>

<template>
  <div class="container-page py-10">
    <ToolPageHeader
      title="Email QR Code Generator"
      description="One scan opens a pre-written email to you. Perfect for feedback loops, RSVPs and print campaigns."
    />

    <ClientOnly>
      <QrTool initial-tab="email" />
      <template #fallback>
        <div class="grid tool-frame place-items-center rounded-2xl border border-border text-sm text-muted-foreground">
          Loading the generator…
        </div>
      </template>
    </ClientOnly>

    <ToolContents :items="contents">
      <section aria-labelledby="email-howto" class="rounded-2xl bg-muted/50 p-6 sm:p-8">
        <h2 id="email-howto" class="text-xl font-semibold">
          From poster to inbox in one scan
        </h2>
        <div class="mt-4 space-y-4 text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
          <p>
            The gap between "I should email them" and actually sending an email is where most messages die. An email QR
            code closes it: the scan opens a compose window with the address — and optionally the subject and body —
            already filled in via the standard <code class="rounded bg-neutral-100 px-1 font-mono text-xs dark:bg-neutral-800">mailto:</code> format.
          </p>
          <p>
            Like every code we generate, it's built in your browser by our open-source encoder, contains no tracking
            redirect, and never expires.
          </p>
        </div>
      </section>

      <FaqSection :items="faq" class="rounded-2xl bg-muted/50 p-6 sm:p-8" />
    </ToolContents>
  </div>
</template>
