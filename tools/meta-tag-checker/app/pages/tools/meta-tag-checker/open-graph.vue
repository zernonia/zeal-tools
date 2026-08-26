<script setup lang="ts">
import meta from '../../../../meta'

const { public: { siteUrl } } = useRuntimeConfig()

useSeoMeta({
  title: 'Open Graph Checker — Test og: Tags and Preview the Card',
  description: 'Check your Open Graph tags and see the card Facebook, LinkedIn and Slack will build from them. Paste your HTML and nothing leaves your browser. Free, no sign-up.',
  ogTitle: 'Open Graph Checker — test your og: tags',
  ogDescription: 'See the card Facebook, LinkedIn and Slack build from your Open Graph tags. Nothing uploaded.',
  ogUrl: `${siteUrl}/tools/${meta.slug}/open-graph`,
  twitterCard: 'summary_large_image',
})

defineOgImage('Default', { title: 'Open Graph Checker', description: 'Test your og: tags and preview the card.' })

useToolJsonLd(meta, {
  variant: 'open-graph',
  name: 'Open Graph Checker',
  description: 'Check Open Graph tags and preview the card Facebook, LinkedIn and Slack will build. Paste your HTML and nothing leaves your browser.',
  featureList: ['Validates og:title, og:description, og:image, og:url and og:type', 'Flags relative image URLs, the most common cause of a blank card', 'Previews Facebook, LinkedIn and Slack', 'Paste HTML and nothing is uploaded'],
})

const contents = [
  { id: 'tags-heading', label: 'The tags that matter' },
  { id: 'faq-heading', label: 'Questions' },
  { id: 'promise', label: 'The Zeal Promise' },
]

const faq = [
  { q: 'Which Open Graph tags do I actually need?', a: 'Four do the work: og:title, og:description, og:image and og:url. og:type is worth setting even though it defaults to website, and og:site_name gives the small label above the headline on some platforms. Everything else in the specification is for richer object types — music, video, articles with authors — and most pages never need any of it.' },
  { q: 'My og:image is set but the card is blank.', a: 'Check whether it is relative. That is the single most common cause, and this tool reports it as an error rather than a warning because it is genuinely broken rather than merely suboptimal: a crawler fetches the image URL on its own, with no page for context, so /og.png resolves to nothing. Use the full https:// URL. After that, the usual suspects are an image behind authentication, one that redirects, and one larger than the platform will fetch.' },
  { q: 'What size should the image be?', a: '1200 × 630 is the size everything is designed around, and it is the one to use if you only make one. It is the 1.91:1 ratio Facebook and LinkedIn crop to, and it is large enough that X will show it as a wide card. Below about 600 × 315 platforms drop to the small square treatment regardless of what you asked for.' },
  { q: 'Why does Facebook still show the old image?', a: 'Because it cached it, and caches are aggressive here. Changing the tag does not change what has already been scraped. Facebook\'s own Sharing Debugger has a "Scrape Again" button, LinkedIn has the Post Inspector, and both are the only way to force a refresh. This tool shows you what the tags say now — the platforms may take a while to agree.' },
  { q: 'Do LinkedIn and Slack need their own tags?', a: 'No, and that is the good news about Open Graph. Both read og: tags directly, which is why they preview identically here. Slack additionally understands oEmbed and some unfurl-specific hints, but for an ordinary page Open Graph is all either of them looks at.' },
  { q: 'Should property or name be used on the meta tag?', a: 'The specification says property, and that is what to write. In practice crawlers accept both, which is why this checker reads either — reporting a tag as missing when the platform can see it perfectly well would be worse than being strict. If you are writing them fresh, use property for og: and name for everything else.' },
]
</script>

<template>
  <div class="container-page py-10">
    <ToolPageHeader
      title="Open Graph Checker"
      description="Check your og: tags and see the card Facebook, LinkedIn and Slack will build from them. Paste your HTML and it never leaves your browser."
    />

    <MetaTagCheckerTool />

    <ToolContents :items="contents">
      <section aria-labelledby="tags-heading" class="rounded-2xl bg-muted/50 p-6 sm:p-8">
        <h2 id="tags-heading" class="text-xl font-semibold">
          Four tags do almost all of the work
        </h2>
        <div class="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground">
          <p>Open Graph is a big specification and you can ignore most of it. <strong class="text-foreground">og:title, og:description, og:image and og:url</strong> are what produce a card. Set those four properly and every platform that reads Open Graph has what it needs; the rest of the vocabulary exists for describing albums and video, not web pages.</p>
          <p><strong class="text-foreground">og:url is the one people skip, and it is quietly the important one.</strong> It tells the platform the canonical address of the thing being shared, so a link with a tracking parameter on the end and the same link without one are counted as the same page rather than two. Miss it and your share counts scatter across every variant anyone ever posted.</p>
          <p><strong class="text-foreground">og:image must be absolute, and it is worth saying twice.</strong> A relative path works in every browser you test in, because your page is right there to resolve it against. The crawler has no page — it takes the string and fetches it — so a relative path becomes a request to nowhere and the card renders without an image. This is flagged as an error here, not a warning.</p>
          <p>One more that costs nothing: og:type. It defaults to website, which is nearly always right, so setting it changes little — but a page declaring article gets treated as one by platforms that care, and it takes a second.</p>
        </div>
      </section>

      <FaqSection :items="faq" class="rounded-2xl bg-muted/50 p-6 sm:p-8" />

      <ZealPromise />
    </ToolContents>
  </div>
</template>
