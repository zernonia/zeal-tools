<script setup lang="ts">
import meta from '../../../../meta'

const { public: { siteUrl } } = useRuntimeConfig()
const pageUrl = `${siteUrl}/tools/${meta.slug}/character-counter`

useSeoMeta({
  title: 'Character Counter — With and Without Spaces, SMS and X Limits',
  description: 'Count characters with and without spaces as you type, plus UTF-8 bytes, SMS segments (GSM-7 and UCS-2) and X post length as X counts it. Emoji count as one. Free, and your text never leaves your browser.',
  ogTitle: 'Character Counter — the count each platform actually uses',
  ogDescription: 'Characters with and without spaces, SMS segments, X weighting and bytes. Counted in your browser.',
  ogUrl: pageUrl,
  twitterCard: 'summary_large_image',
})

defineOgImage('Default', { title: 'Character Counter', description: 'With and without spaces, SMS segments, X length and bytes.' })

useToolJsonLd(meta, {
  variant: 'character-counter',
  name: 'Character Counter',
  description: 'Count characters with and without spaces, SMS segments, X post length and UTF-8 bytes, live in your browser.',
  featureList: [
    'Characters with and without spaces, emoji counted as one',
    'SMS encoding (GSM-7 or UCS-2) and segment count',
    'X post length with emoji, CJK and link weighting',
    'Meta description and page title length',
    'UTF-16 length and UTF-8 bytes',
  ],
})

const faq = [
  { q: 'Do spaces count as characters?', a: 'Usually, yes — X, SMS, meta descriptions and most form fields count every space and line break. Some essay and application limits say "characters without spaces", which is why both numbers sit side by side at the top. "Without spaces" leaves out spaces, tabs and line breaks, and keeps everything else.' },
  { q: 'Why does an emoji count as one character here but two somewhere else?', a: 'Because an emoji is often built from several pieces. 👍🏽 is a thumbs-up plus a skin-tone modifier; a family emoji can be seven pieces joined together. This counter counts what you see, so each is one. Software that counts UTF-16 units — JavaScript, many web forms, UCS-2 text messages — sees 👍🏽 as four. X counts every emoji as two, however it is built. The Details panel gives the UTF-16 length so you can check against a form that counts the other way.' },
  { q: 'Why did my text message jump from 160 to 70 characters?', a: 'One character outside the GSM-7 alphabet switches the whole message to UCS-2 encoding, which holds 70 instead of 160. The usual culprits are invisible: a curly apostrophe or quotation mark pasted from a word processor, an en dash, or an emoji. The SMS row names the characters responsible, so you can replace ’ with \' and send one message instead of three.' },
  { q: 'Why are long messages split at 153, not 160?', a: 'Each part of a long message carries a small header that tells the phone how to put the parts back in order. It takes the space of seven GSM-7 characters, leaving 153 per part — or 67 instead of 70 in UCS-2. Characters from the GSM extension table (€, [, ], {, }, ^, ~, | and \\) take two places each, and are never split across two parts, so a part can end one place short.' },
  { q: 'How does X count characters?', a: 'By weight, not by count. Latin, Greek and Cyrillic letters, digits and most punctuation weigh one; Chinese, Japanese, Korean and most other scripts weigh two; every emoji weighs two; every link weighs 23 because X shortens it with t.co. A post can weigh 280. This counter applies those rules to links that begin with http or www — X also links bare domains like example.com, which it does not catch.' },
  { q: 'How long should a meta description be?', a: 'Google trims snippets by pixel width rather than characters, which works out at roughly 155 characters on desktop and a little less on mobile. Past that, the end is replaced with an ellipsis. It is not a penalty — Google often rewrites the description anyway — but the important words should come first. Page titles are cut at about 60.' },
]

const contents = [
  { id: 'counts-heading', label: 'Which count to use' },
  { id: 'faq-heading', label: 'Questions' },
  { id: 'promise', label: 'The Zeal Promise' },
]
</script>

<template>
  <div class="container-page py-10">
    <ToolPageHeader
      title="Character Counter"
      description="Characters with and without spaces, counted as you type — with SMS segments, X post length and bytes, the way each one is really measured."
    />

    <WordCounterTool focus="characters" />

    <section class="mt-12 flex flex-wrap gap-2 text-sm" aria-label="Related tools">
      <NuxtLink to="/tools/word-counter" class="rounded-full border border-border px-4 py-1.5 transition-colors hover:border-primary/40 hover:text-primary">
        Word counter →
      </NuxtLink>
      <NuxtLink to="/tools/word-counter/case-converter" class="rounded-full border border-border px-4 py-1.5 transition-colors hover:border-primary/40 hover:text-primary">
        Case converter →
      </NuxtLink>
      <NuxtLink to="/tools/meta-tag-checker" class="rounded-full border border-border px-4 py-1.5 transition-colors hover:border-primary/40 hover:text-primary">
        Meta tag checker →
      </NuxtLink>
    </section>

    <ToolContents :items="contents">
      <section aria-labelledby="counts-heading" class="rounded-2xl bg-muted/50 p-6 sm:p-8">
        <h2 id="counts-heading" class="text-xl font-semibold">
          One text, four different character counts
        </h2>
        <div class="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground">
          <p>
            Most character counters give you one number and leave you to find out the hard way that the
            platform counted differently. The trouble is that &ldquo;character&rdquo; is not one thing. For
            plain English text every method agrees, but add an emoji, an accent or a link and they part
            company — and the platform with the limit is the one whose method counts.
          </p>
          <p>
            <strong class="text-foreground">For a form field or an essay limit</strong>, use the headline
            &ldquo;Characters&rdquo; figure, or &ldquo;Without spaces&rdquo; if the instructions say so. It
            counts what you see, so é and 👍🏽 are one each. If a web form disagrees by a few, it is almost
            certainly counting UTF-16 units — check the UTF-16 length in Details.
          </p>
          <p>
            <strong class="text-foreground">For a text message</strong>, read the SMS row. It shows whether the
            message fits the GSM-7 alphabet, how many parts it will be sent as, and how much room is left in
            the last one. Each part is billed as a message by most carriers and bulk-SMS services, which is why
            one stray curly apostrophe turning a single message into three is worth catching.
          </p>
          <p>
            <strong class="text-foreground">For an X post</strong>, the X row applies X&rsquo;s own weighting,
            where Chinese, Japanese and Korean characters and every emoji count double and a link counts 23.
            <strong class="text-foreground">For a database column or a file</strong>, UTF-8 bytes is the number
            that matters: a 255-byte column holds 255 English letters but only 63 emoji.
          </p>
          <p>
            Everything is counted in your browser. The text is not uploaded, not put in the page address, and
            only kept on this device if you leave &ldquo;Remember on this device&rdquo; ticked.
          </p>
        </div>
      </section>

      <FaqSection :items="faq" class="rounded-2xl bg-muted/50 p-6 sm:p-8" />
      <ZealPromise />
    </ToolContents>
  </div>
</template>
