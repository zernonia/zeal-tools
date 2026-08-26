<script setup lang="ts">
import meta from '../../../../meta'

const { public: { siteUrl } } = useRuntimeConfig()

useSeoMeta({
  title: 'Meta Tag Checker — Preview Your Link on Google, X and Facebook',
  description: 'Check your meta tags and see the link card exactly as Google, X, Facebook, LinkedIn and Slack build it — each uses a different fallback chain. Free, no sign-up, no login.',
  ogTitle: 'Meta Tag Checker — see your link before you post it',
  ogDescription: 'Preview your page on five platforms, each using its own fallback chain. Free, no login.',
  ogUrl: `${siteUrl}/tools/${meta.slug}`,
  twitterCard: 'summary_large_image',
})

defineOgImage('Default', { title: 'Meta Tag Checker', description: meta.tagline })

const apiSnippet = `curl 'https://zeal.tools/api/v1/meta?url=https://example.com'`

const howToSteps = [
  { title: 'Give it a URL', body: 'Any public page. The request goes through our server, because a browser is forbidden from reading another site\'s HTML — that is a rule of the web, not a choice we made. The page is fetched, its head is read, and it is thrown away.' },
  { title: 'Look at the previews first', body: 'The five cards are not the same picture five times. Each platform resolves a different chain of tags, so a page can look right on Facebook and blank on X.' },
  { title: 'Work through the errors', body: 'Errors are things that are broken — a missing title, a relative og:image, a stray noindex. Warnings are things that will cost you something: a description that gets cut off, a card that shows small when it could show large.' },
  { title: 'Copy the corrected tags', body: 'The last block rebuilds your tags with the gaps filled in. It is built from what you already have, so it is a patch rather than a blank form.' },
]

useToolJsonLd(meta, {
  description: meta.description,
  featureList: [
    'Previews for Google, X, Facebook, LinkedIn and Slack',
    'Each platform\'s real fallback chain, not one generic preview',
    'Flags missing tags, truncated lengths and relative URLs',
    'Flags relative og:image URLs, the most common cause of a blank card',
    'Generates copy-ready tags from what you already have',
    'Free REST and MCP endpoint',
  ],
  howTo: { name: 'How to check a page\'s meta tags', steps: howToSteps.map(s => ({ name: s.title, text: s.body })) },
})

const contents = [
  { id: 'howto-heading', label: 'How to use it' },
  { id: 'chains-heading', label: 'Why the previews differ' },
  { id: 'lengths-heading', label: 'How long is too long' },
  { id: 'faq-heading', label: 'Questions' },
  { id: 'api-heading', label: 'API' },
  { id: 'promise', label: 'The Zeal Promise' },
]

const faq = [
  { q: 'Does the page I check get stored anywhere?', a: 'No. This is the one tool on zeal.tools that makes a request on your behalf, and it says so on screen rather than burying it. A browser is forbidden from reading another origin\'s HTML — that is what CORS is — so the fetch has to happen on our server. It requests the page, reads the head, parses it and throws the rest away. Nothing is written to disk, nothing is logged, and only the parsed result comes back to you. The endpoint deliberately never returns the page\'s own HTML, so it cannot be used as a proxy either.' },
  { q: 'Why do the five previews look different?', a: 'Because they are built differently. Google reads only <title> and the meta description and ignores Open Graph completely. X prefers its own twitter: tags and falls back to Open Graph. Facebook, LinkedIn and Slack read Open Graph, then fall back to the plain title and description. A page with a perfect og:title and no <title> looks fine when shared and blank in search — that is exactly the sort of thing this catches.' },
  { q: 'My og:image is set but nothing shows. Why?', a: 'Almost always because it is a relative path. Your browser resolves /og.png against the page it is on, but a crawler fetches that URL cold, with no page for context, so it has to be absolute — https://example.com/og.png. This flags it as an error rather than a warning for that reason. The other common causes are an image behind a login, one that redirects, or one over the platform\'s size limit.' },
  { q: 'Why does my card show a small square image on X?', a: 'Because twitter:card is missing or set to summary. X defaults to the small card; the wide one only appears if the page explicitly asks for summary_large_image. It is one line, and it is the single most common reason a link looks worse on X than everywhere else.' },
  { q: 'How long should a title and description be?', a: 'Around 50–60 characters for a title and 120–160 for a description. Those are conventions rather than hard limits: Google truncates on pixel width, not character count, so a title full of capitals runs out sooner than one in lower case. Treat the warnings here as "this will probably get cut", not as a rule.' },
  { q: 'Does it check the page after JavaScript runs?', a: 'No. It reads the HTML as delivered, which is what most crawlers see. If your tags are injected client-side they will show as missing here — and that is worth knowing, because they are missing as far as several crawlers are concerned too. Facebook and X do not run your JavaScript before building a card.' },
  { q: 'Can I check a page that is not public yet?', a: 'Not directly — the page has to be reachable from the internet, since our server is what fetches it. A staging site behind basic auth or on localhost will not work. If you need that, the MCP tool accepts raw HTML instead of a URL, and the whole thing is MIT licensed if you would rather run it yourself.' },
  { q: 'Why does it say my page is noindex?', a: 'Because it found a robots meta tag saying so, and that instruction beats everything else on the page. It is reported first for that reason. If it is not deliberate, it is usually a staging setting that shipped to production — which is a bad afternoon, and worth catching here.' },
  { q: 'Is there a catch?', a: 'No. No sign-up, no ads, no limit worth mentioning, and nothing installed. It is MIT licensed, and the parser is a few hundred lines you can read — worth doing if you are curious why it is a hand-written scanner rather than a pile of regular expressions.' },
]
</script>

<template>
  <div class="container-page py-10">
    <ToolPageHeader
      title="Meta Tag Checker"
      description="See what your page looks like on Google, X, Facebook, LinkedIn and Slack — each builds its card from a different chain of tags, so they genuinely differ."
    />

    <MetaTagCheckerTool />

    <section class="mt-12 flex flex-wrap gap-2 text-sm" aria-label="Related pages">
      <NuxtLink to="/tools/meta-tag-checker/open-graph" class="rounded-full border border-border px-4 py-1.5 transition-colors hover:border-primary/40 hover:text-primary">
        Open Graph checker →
      </NuxtLink>
      <NuxtLink to="/tools/meta-tag-checker/twitter-card" class="rounded-full border border-border px-4 py-1.5 transition-colors hover:border-primary/40 hover:text-primary">
        Twitter card validator →
      </NuxtLink>
      <NuxtLink to="/tools/favicon-generator" class="rounded-full border border-border px-4 py-1.5 transition-colors hover:border-primary/40 hover:text-primary">
        Favicon generator →
      </NuxtLink>
    </section>

    <ToolContents :items="contents">
      <section aria-labelledby="howto-heading" class="rounded-2xl bg-muted/50 p-6 sm:p-8">
        <h2 id="howto-heading" class="text-xl font-semibold">
          How to check a page's meta tags
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

      <section aria-labelledby="chains-heading" class="rounded-2xl bg-muted/50 p-6 sm:p-8">
        <h2 id="chains-heading" class="text-xl font-semibold">
          Why five previews and not one
        </h2>
        <div class="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground">
          <p>
            Most checkers draw one card and label it "preview". That is a guess, because no two platforms
            resolve the same tags. The differences are not subtle and they are not edge cases — they are the
            reason a link looks right in one place and broken in another.
          </p>
          <p>
            <strong class="text-foreground">Google reads <code class="rounded bg-muted px-1">&lt;title&gt;</code>
              and the meta description, and ignores Open Graph entirely.</strong> A page with immaculate
            <code class="rounded bg-muted px-1">og:title</code> and no <code class="rounded bg-muted px-1">&lt;title&gt;</code>
            shares beautifully and appears in search with nothing at the top.
          </p>
          <p>
            <strong class="text-foreground">X prefers its own tags and falls back to Open Graph.</strong> So
            <code class="rounded bg-muted px-1">twitter:title</code> silently overrides
            <code class="rounded bg-muted px-1">og:title</code> — which is useful when you want a different
            headline there, and confusing when you set it once years ago and forgot.
          </p>
          <p>
            <strong class="text-foreground">Facebook, LinkedIn and Slack read Open Graph, then fall back to
              the plain title and description.</strong> They are forgiving, which is why a page with no
            Open Graph at all still shows something — just not what you would have chosen.
          </p>
          <p>
            Those chains are written down as code here, and each one is covered by its own test. That is the
            part worth trusting: the pictures are only as good as the rules behind them.
          </p>
        </div>
      </section>

      <section aria-labelledby="lengths-heading" class="rounded-2xl bg-muted/50 p-6 sm:p-8">
        <h2 id="lengths-heading" class="text-xl font-semibold">
          How long is too long
        </h2>
        <div class="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground">
          <p>
            The honest answer is that nobody can tell you exactly. <strong class="text-foreground">Google
              truncates on pixel width, not character count</strong> — roughly 600 pixels — so a title in
            capitals runs out well before one in lower case, and a title full of narrow letters survives
            longer than the count suggests.
          </p>
          <p>
            The conventional proxies are 50–60 characters for a title and 120–160 for a description, and
            that is what the warnings here use. Treat them as "this will probably get cut", not as a limit.
            Front-load the important words either way: a truncated title that still says what the page is
            costs you nothing, and one that gets cut mid-brand-name costs you the click.
          </p>
          <p>
            Being too short is a real miss too, and less often flagged. A 20-character description is a fifth
            of the space search results will give you, handed back for nothing.
          </p>
        </div>
      </section>

      <FaqSection :items="faq" class="rounded-2xl bg-muted/50 p-6 sm:p-8" />

      <section id="api" aria-labelledby="api-heading" class="rounded-2xl bg-muted/50 p-6 sm:p-8">
        <h2 id="api-heading" class="text-xl font-semibold">
          API — for scripts and agents
        </h2>
        <p class="mt-2 text-sm text-muted-foreground">
          The same audit behind a free REST endpoint. No API key, no sign-up. Returns the tags, the findings
          with severities, and the resolved card for all five platforms.
        </p>
        <CodeBlock :code="apiSnippet" lang="bash" />
        <p class="mt-3 text-sm text-muted-foreground">
          Useful in CI: fail a build when a page ships with a stray <code class="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">noindex</code>
          or loses its <code class="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">og:image</code>. MCP
          clients can add <code class="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">https://zeal.tools/mcp</code>
          and call <code class="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">check_meta_tags</code>, which
          also accepts raw HTML so an agent can check a page it just wrote.
        </p>
      </section>

      <ZealPromise />
    </ToolContents>
  </div>
</template>
