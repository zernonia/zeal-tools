<script setup lang="ts">
import meta from '../../../../meta'

const { public: { siteUrl } } = useRuntimeConfig()

useSeoMeta({
  title: 'Twitter Card Validator — Preview Your Link on X',
  description: 'Check your twitter: tags and preview the card X will show, without logging in. X retired its own validator; this replaces the part people used. Free, no sign-up.',
  ogTitle: 'Twitter Card Validator — no login required',
  ogDescription: 'Preview the card X builds from your tags. No X account needed.',
  ogUrl: `${siteUrl}/tools/${meta.slug}/twitter-card`,
  twitterCard: 'summary_large_image',
})

defineOgImage('Default', { title: 'Twitter Card Validator', description: 'Preview the card X builds from your tags.' })

useToolJsonLd(meta, {
  variant: 'twitter-card',
  name: 'Twitter Card Validator',
  description: 'Check twitter: tags and preview the card X will show, without logging in or having an X account.',
  featureList: ['Previews summary and summary_large_image', 'Shows the Open Graph fallback X actually uses', 'No X account or login needed', 'Shows the Open Graph card side by side, so stale twitter: tags are obvious'],
})

const contents = [
  { id: 'why-heading', label: 'Why X is different' },
  { id: 'faq-heading', label: 'Questions' },
  { id: 'promise', label: 'The Zeal Promise' },
]

const faq = [
  { q: 'X retired its own card validator. Is this the same thing?', a: 'It does the part people used it for. X shut its Card Validator down and the preview it offered went with it, which is why so many people ended up guessing. This reads the same tags and applies the same fallback rules, so it shows what the card should contain. What it cannot do is tell you what X has already cached for a URL, because only X knows that.' },
  { q: 'Why is my image showing as a small square?', a: 'Because twitter:card is missing or set to summary. X defaults to the small card and only shows the wide one when the page asks for summary_large_image by name. It is one line of HTML and it is the single most common reason a link looks worse on X than on LinkedIn.' },
  { q: 'Do I need twitter: tags at all?', a: 'No, and most pages should not bother. X falls back to Open Graph for the title, description and image, so a page with good og: tags already gets a good card. Add twitter: tags for two reasons only: to set summary_large_image, or to deliberately show something different on X than elsewhere. Duplicating og: values into twitter: tags achieves nothing but more to keep in sync.' },
  { q: 'Which tags does X prefer when both are set?', a: 'Its own, every time. twitter:title beats og:title, twitter:description beats og:description, twitter:image beats og:image. That precedence is what makes stale twitter: tags so confusing — you update Open Graph, every other platform changes, and X carries on showing a headline you wrote two years ago.' },
  { q: 'What image size should I use?', a: '1200 × 630 covers both cases. For summary_large_image X wants at least 300 × 157 and crops to roughly 1.91:1; for summary it crops to a square, so keep anything important away from the edges. Under 5 MB, and PNG, JPEG, WEBP or non-animated GIF.' },
  { q: 'My card is not updating on X.', a: 'X caches by URL for around a week, and there is no longer a public button to clear it. The usual workaround is to share the URL with a harmless query parameter on the end, which X treats as a different address — this is also exactly why setting og:url matters, so those variants still count as one page for everyone else.' },
]
</script>

<template>
  <div class="container-page py-10">
    <ToolPageHeader
      title="Twitter Card Validator"
      description="Check your twitter: tags and preview the card X will show — no login, and no X account needed."
    />

    <MetaTagCheckerTool />

    <ToolContents :items="contents">
      <section aria-labelledby="why-heading" class="rounded-2xl bg-muted/50 p-6 sm:p-8">
        <h2 id="why-heading" class="text-xl font-semibold">
          X is the one that behaves differently
        </h2>
        <div class="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground">
          <p>Every other major platform reads Open Graph and is done. X reads its own <code class="rounded bg-muted px-1">twitter:</code> tags first and only falls back to Open Graph for anything it does not find — which means X is the one place a page can show something nobody intended.</p>
          <p><strong class="text-foreground">The precedence is total.</strong> If twitter:title exists, og:title is not consulted. That is fine when it is deliberate, and a genuine trap when it is not: you update your Open Graph tags, check the link on LinkedIn, see the new headline, and X keeps showing the old one because a twitter:title you forgot about is still sitting there. This tool shows both cards side by side for exactly that reason.</p>
          <p><strong class="text-foreground">And the card type has to be asked for.</strong> X defaults to the small square card. The wide image everyone actually wants only appears with <code class="rounded bg-muted px-1">twitter:card = summary_large_image</code>, and that tag has no Open Graph equivalent to fall back to — so it is the one twitter: tag nearly every page genuinely needs.</p>
          <p>The practical advice: set og: tags properly, add <code class="rounded bg-muted px-1">twitter:card</code>, and add nothing else unless you specifically want X to differ. Fewer tags in two places means fewer chances for the two to drift apart.</p>
        </div>
      </section>

      <FaqSection :items="faq" class="rounded-2xl bg-muted/50 p-6 sm:p-8" />

      <ZealPromise />
    </ToolContents>
  </div>
</template>
