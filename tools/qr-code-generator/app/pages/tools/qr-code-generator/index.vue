<script setup lang="ts">
import meta from '../../../../meta'

const { public: { siteUrl } } = useRuntimeConfig()
const pageUrl = `${siteUrl}/tools/${meta.slug}`

useSeoMeta({
  title: 'Free QR Code Generator — No Sign-up, No Watermark',
  description: meta.description,
  ogTitle: 'Free QR Code Generator — No Sign-up, No Watermark',
  ogDescription: meta.tagline,
  ogImage: `${siteUrl}/og.png`,
  ogUrl: pageUrl,
  twitterCard: 'summary_large_image',
})

useHead({
  link: [{ rel: 'canonical', href: pageUrl }],
  script: [{
    type: 'application/ld+json',
    innerHTML: JSON.stringify({
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'WebApplication',
          'name': meta.name,
          'url': pageUrl,
          'description': meta.description,
          'applicationCategory': 'UtilityApplication',
          'operatingSystem': 'Any',
          'offers': { '@type': 'Offer', 'price': '0', 'priceCurrency': 'USD' },
        },
        {
          '@type': 'BreadcrumbList',
          'itemListElement': [
            { '@type': 'ListItem', 'position': 1, 'name': 'zeal.tools', 'item': siteUrl },
            { '@type': 'ListItem', 'position': 2, 'name': meta.name, 'item': pageUrl },
          ],
        },
        {
          '@type': 'HowTo',
          'name': 'How to create a QR code',
          'step': [
            { '@type': 'HowToStep', 'name': 'Choose a type', 'text': 'Pick URL, text, WiFi, email, phone, SMS or vCard.' },
            { '@type': 'HowToStep', 'name': 'Enter your content', 'text': 'The QR code updates live as you type — no Generate button.' },
            { '@type': 'HowToStep', 'name': 'Style it', 'text': 'Adjust colors, module style, margin, and optionally embed a logo.' },
            { '@type': 'HowToStep', 'name': 'Download', 'text': 'Save as PNG (512–4096px) or SVG, or copy the image straight to your clipboard.' },
          ],
        },
      ],
    }),
  }],
})

const { track } = useAnalytics()
onMounted(() => track('tool_viewed', { tool: meta.slug }))

const howToSteps = [
  {
    title: 'Choose what to encode',
    body: 'URLs are the classic, but WiFi credentials, contact cards (vCard), email drafts, phone numbers and SMS messages all work — switch types with the tabs above.',
  },
  {
    title: 'Type your content',
    body: 'The preview updates live with every keystroke. There\'s no Generate button because there doesn\'t need to be one.',
  },
  {
    title: 'Style it (optional)',
    body: 'Change the foreground and background colors, switch to rounded or dot modules, adjust the quiet-zone margin, or drop your logo in the center. Keep contrast high — dark modules on a light background scan best.',
  },
  {
    title: 'Download or share',
    body: 'PNG for documents, SVG for print, or copy the image straight to your clipboard. The share link reproduces your exact settings — minus anything sensitive, which never enters the URL.',
  },
]

const faq = [
  { q: 'Is this QR code generator really free?', a: 'Yes — completely. No sign-up, no watermark, no expiring codes, no premium tier. The whole site is open source under the MIT license, so you can verify that yourself or even self-host it.' },
  { q: 'Do the QR codes expire?', a: 'Never. These are static QR codes: your content is encoded directly into the image itself. There is no redirect through our servers, so nothing can expire and no one can take your code hostage behind a paywall.' },
  { q: 'Is my data uploaded to your servers?', a: 'No. The QR code is generated entirely in your browser using our own open-source encoder. Your URLs, WiFi passwords and contact details never leave your device — you can even load the page and then go offline.' },
  { q: 'PNG or SVG — which should I download?', a: 'Use SVG for print and design work: it scales to any size without pixelation, from a business card to a billboard. Use PNG for documents, presentations and anywhere raster images are expected — up to 4096×4096 here.' },
  { q: 'What does the error correction level mean?', a: 'QR codes carry redundant Reed–Solomon data so they still scan when partially damaged or obscured. L survives about 7% damage, M 15%, Q 25%, H 30%. Higher levels create denser codes. When you embed a logo, we automatically switch to H.' },
  { q: 'Can I put my logo in the middle of the QR code?', a: 'Yes. Upload an image and it is drawn in the center; error correction is bumped to level H so the covered modules are recoverable. Always test-scan afterwards — very large logos can still defeat scanning.' },
  { q: 'Why is my WiFi QR code not connecting?', a: 'Check the network name is exactly right (SSID is case-sensitive), the password is correct, and the security type matches your router (WPA covers WPA2/WPA3). Both iOS and Android connect from the native camera app.' },
  { q: 'Can I use the generated QR codes commercially?', a: 'Yes. QR codes themselves are an open ISO standard (ISO/IEC 18004), and everything you create here is yours — use it in products, packaging, menus, ads, anything.' },
  { q: 'What is the maximum amount of data a QR code can hold?', a: 'Up to 2,953 bytes at the largest size (version 40, level L) — roughly 4,296 alphanumeric characters. In practice, keep payloads short: less data means bigger modules and far more reliable scanning.' },
  { q: 'Is there an API?', a: 'Yes — POST /api/v1/qr with your data and get an SVG or PNG back. No API key, no sign-up, same promise as the UI. There is also an MCP endpoint so AI assistants can generate QR codes directly.' },
]

const apiSnippet = `# SVG (default)
curl -X POST https://zeal.tools/api/v1/qr \\
  -H 'content-type: application/json' \\
  -d '{"data": "https://zeal.tools", "options": {"ecLevel": "M"}}'

# PNG, straight to a file
curl 'https://zeal.tools/api/v1/qr?data=https://zeal.tools&format=png&size=1024' -o qr.png

# WiFi payload
curl -X POST https://zeal.tools/api/v1/qr \\
  -H 'content-type: application/json' \\
  -d '{"type": "wifi", "ssid": "MyNetwork", "password": "secret123", "format": "svg"}'`
</script>

<template>
  <div class="container-page py-10">
    <ToolPageHeader
      title="Free QR Code Generator"
      description="No sign-up, no watermark, no expiry. Generated in your browser with our own open-source, zero-dependency encoder."
    />

    <ClientOnly>
      <QrTool />
      <template #fallback>
        <div class="grid h-96 place-items-center rounded-2xl border border-neutral-200 text-sm text-neutral-400 dark:border-neutral-800">
          Loading the generator…
        </div>
      </template>
    </ClientOnly>

    <!-- Long-tail variants -->
    <section class="mt-12 flex flex-wrap gap-2 text-sm" aria-label="QR code types">
      <NuxtLink to="/tools/qr-code-generator/wifi" class="rounded-full border border-neutral-200 px-4 py-1.5 transition-colors hover:border-primary/40 hover:text-primary dark:border-neutral-700">
        WiFi QR code →
      </NuxtLink>
      <NuxtLink to="/tools/qr-code-generator/vcard" class="rounded-full border border-neutral-200 px-4 py-1.5 transition-colors hover:border-primary/40 hover:text-primary dark:border-neutral-700">
        vCard QR code →
      </NuxtLink>
      <NuxtLink to="/tools/qr-code-generator/email" class="rounded-full border border-neutral-200 px-4 py-1.5 transition-colors hover:border-primary/40 hover:text-primary dark:border-neutral-700">
        Email QR code →
      </NuxtLink>
    </section>

    <!-- Content: how-to + concepts (the SEO body) -->
    <div class="mx-auto mt-16 space-y-12">
      <section aria-labelledby="howto-heading" class="rounded-2xl bg-muted/50 p-6 sm:p-8">
        <h2 id="howto-heading" class="text-xl font-semibold">
          How to create a QR code
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

      <section aria-labelledby="concepts-heading" class="rounded-2xl bg-muted/50 p-6 sm:p-8">
        <h2 id="concepts-heading" class="text-xl font-semibold">
          How QR codes actually work
        </h2>
        <div class="mt-4 space-y-4 text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
          <p>
            A QR code is a grid of dark and light modules encoding your data plus a generous helping of
            <strong>Reed–Solomon error correction</strong> — the same math that let CDs play through scratches. Your text is
            packed into the densest of three encoding modes (numeric, alphanumeric, or bytes), split into codewords, and the
            error-correction codewords are computed over a Galois field. The three big squares are finder patterns that tell
            the scanner where the code is and which way is up; the smaller squares are alignment patterns that correct for
            perspective distortion.
          </p>
          <p>
            Finally, one of eight <strong>mask patterns</strong> is XORed over the data region. Each mask is scored against
            four penalty rules — long runs, solid blocks, fake finder patterns, and dark/light imbalance — and the
            best-scoring mask wins, which is why the same content can produce different-looking (but equally valid) codes.
          </p>
          <p>
            Our encoder implements all of this from the ISO/IEC 18004 specification in about a thousand lines of audited,
            dependency-free TypeScript. Every build is verified by round-tripping thousands of payloads through an
            independent decoder across all versions, masks and error-correction levels.
          </p>
        </div>
      </section>

      <FaqSection :items="faq" class="rounded-2xl bg-muted/50 p-6 sm:p-8" />

      <!-- API docs -->
      <section id="api" aria-labelledby="api-heading" class="rounded-2xl bg-muted/50 p-6 sm:p-8">
        <h2 id="api-heading" class="text-xl font-semibold">
          API — same tool, no key required
        </h2>
        <p class="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
          The exact encoder that powers this page also runs behind a free REST endpoint. No API key, no sign-up, honest rate limits.
        </p>
        <CodeBlock :code="apiSnippet" lang="bash" />
        <p class="mt-3 text-sm text-neutral-600 dark:text-neutral-400">
          MCP clients can call the same core: add <code class="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-xs dark:bg-neutral-800">https://zeal.tools/mcp</code>
          to your client and use the <code class="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-xs dark:bg-neutral-800">generate_qr</code> tool.
        </p>
      </section>

      <ZealPromise />
    </div>
  </div>
</template>
