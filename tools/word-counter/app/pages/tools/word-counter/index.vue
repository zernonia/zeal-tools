<script setup lang="ts">
import meta from '../../../../meta'

const { public: { siteUrl } } = useRuntimeConfig()

useSeoMeta({
  title: 'Word Counter — Words, Characters and Reading Time, Free',
  description: 'A free online word counter: words, characters with and without spaces, sentences, paragraphs, reading and speaking time, keyword density and SMS segments, live as you type. Plus a case converter. Your text never leaves your browser.',
  ogTitle: 'Word Counter — live counts, nothing uploaded',
  ogDescription: 'Words, characters, sentences, reading time, SMS segments and a case converter. Counted in your browser, never sent anywhere.',
  ogUrl: `${siteUrl}/tools/${meta.slug}`,
  twitterCard: 'summary_large_image',
})

defineOgImage('Default', { title: 'Word Counter', description: meta.tagline })

const howToSteps = [
  { title: 'Paste or type your text', body: 'Everything updates as you type: words, characters, sentences, paragraphs, reading time and the limits panel. There is no Count button to press.' },
  { title: 'Read the numbers you need', body: 'The four headline figures sit under the box. Details below give characters without spaces, UTF-8 bytes, unique words and the longest word; Common limits shows how the text fares as an X post, a meta description, a page title and a text message.' },
  { title: 'Change the case if you need to', body: 'Pick Title Case, Sentence case, snake_case or any of the others to rewrite the text, and Undo to put it back. Switch to "Copy the result" to copy a converted version without touching what you wrote.' },
]

useToolJsonLd(meta, {
  description: meta.description,
  featureList: [
    'Live word, character, sentence and paragraph counts',
    'Characters with and without spaces, UTF-16 length and UTF-8 bytes',
    'Reading time at 238 wpm and speaking time at 130 wpm',
    'Top keywords with density',
    'SMS encoding and segment count, X post length, meta description length',
    'Case converter: Title, Sentence, UPPER, lower, camelCase, snake_case and more',
    'Counts Chinese, Japanese and Thai words by dictionary',
    'Text stays in your browser',
  ],
  howTo: { name: 'How to count words online', steps: howToSteps.map(s => ({ name: s.title, text: s.body })) },
})

const faq = [
  { q: 'Why does this give a different word count from Word or Google Docs?', a: 'Because there is no single definition of a word, and each tool picks one. Microsoft Word counts anything between spaces, so a dash with a space either side adds a word, and a URL is one word. Google Docs splits at more punctuation, so "e-mail" can become two. This counter follows Unicode\'s word-boundary rules: a word must contain a letter or a digit, contractions and hyphenated compounds are one word, and punctuation or an emoji on its own is not a word at all. On ordinary prose the three usually agree to within a percent or two; the gap shows up in text full of dashes, symbols, links or code.' },
  { q: 'Does it work for Chinese, Japanese and Thai?', a: 'Yes, which most word counters do not. Those languages are written without spaces between words, so a space-counting tool reports a whole sentence as one word. This one uses the dictionaries built into your browser to find word boundaries, so 日本語の文章です counts as four words. Some style guides count Chinese and Japanese by character instead — the character count is right beside it for that.' },
  { q: 'Is my text uploaded anywhere?', a: 'No. The page counts it with your browser\'s own text-segmentation engine, on your machine. If you leave "Remember on this device" ticked, the text is kept in this browser\'s local storage so it is still here next time; untick it and the stored copy is deleted. It is never put in the address bar, so sharing the page link never shares your text. The separate API, for scripts, does receive the text you send it — that is what an API is — and does not store it.' },
  { q: 'How is reading time worked out?', a: 'Words divided by 238 words a minute, the average silent-reading speed for non-fiction found by a 2019 review of 190 studies. Fiction reads a little faster, technical writing slower, and your own speed may be well off the average. Speaking time uses 130 words a minute, a comfortable pace for a talk or a sermon; conversation runs nearer 150 to 160. Both figures assume English; Chinese and Japanese word counts are not comparable with English ones, so the times are rough there.' },
  { q: 'Why are there two kinds of character count?', a: '"Characters" counts what you see — so 👍🏽 is one character, even though it is built from two code points. "Without spaces" removes spaces, tabs and line breaks, which some essay and form limits ask for. The Details panel adds UTF-16 length, which is what JavaScript and many web forms count (👍🏽 is four), and UTF-8 bytes, which is what a file or most databases actually store (👍🏽 is eight).' },
  { q: 'What do the keyword percentages mean?', a: 'How often a word appears as a share of all the words — keyword density. Common English words like "the", "and" and "is" are left out, along with numbers and single letters, so the list shows what the text is about. Search engines stopped rewarding a target density long ago; use the list to spot a word you have leaned on too often.' },
  { q: 'Can I count words from a script?', a: 'Yes: POST your text to /api/v1/text-stats as JSON, with an optional "case" to convert it, and you get every number on this page back. It is also an MCP tool, count_words, for AI agents. No key is needed; there is a light rate limit of 120 requests a minute.' },
]

const apiSnippet = `# Count a text, and convert it to Title Case while you are at it
curl -X POST https://zeal.tools/api/v1/text-stats \\
  -H 'content-type: application/json' \\
  -d '{"text": "The lord of the rings. A long read.", "case": "title"}'

# → { "words": 8, "characters": 35, "sentences": 2, "readingSeconds": 2,
#     "sms": { "encoding": "GSM-7", "segments": 1, ... },
#     "converted": "The Lord of the Rings. A Long Read.", ... }`

const contents = [
  { id: 'howto-heading', label: 'How to use it' },
  { id: 'words-heading', label: 'What counts as a word' },
  { id: 'chars-heading', label: 'Characters and bytes' },
  { id: 'case-heading', label: 'The case converter' },
  { id: 'api-heading', label: 'For scripts' },
  { id: 'faq-heading', label: 'Questions' },
  { id: 'promise', label: 'The Zeal Promise' },
]
</script>

<template>
  <div class="container-page py-10">
    <ToolPageHeader
      title="Word Counter"
      description="Words, characters, sentences and reading time, counted live as you type — with SMS and X limits and a case converter. Your text stays in your browser."
    />

    <WordCounterTool />

    <section class="mt-12 flex flex-wrap gap-2 text-sm" aria-label="Related tools">
      <NuxtLink to="/tools/word-counter/character-counter" class="rounded-full border border-border px-4 py-1.5 transition-colors hover:border-primary/40 hover:text-primary">
        Character counter →
      </NuxtLink>
      <NuxtLink to="/tools/word-counter/case-converter" class="rounded-full border border-border px-4 py-1.5 transition-colors hover:border-primary/40 hover:text-primary">
        Case converter →
      </NuxtLink>
      <NuxtLink to="/tools/meta-tag-checker" class="rounded-full border border-border px-4 py-1.5 transition-colors hover:border-primary/40 hover:text-primary">
        Meta tag checker →
      </NuxtLink>
    </section>

    <ToolContents :items="contents">
      <section aria-labelledby="howto-heading" class="rounded-2xl bg-muted/50 p-6 sm:p-8">
        <h2 id="howto-heading" class="text-xl font-semibold">
          How to use the word counter
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

      <section aria-labelledby="words-heading" class="rounded-2xl bg-muted/50 p-6 sm:p-8">
        <h2 id="words-heading" class="text-xl font-semibold">
          What counts as a word
        </h2>
        <div class="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground">
          <p>
            Counting words sounds like counting spaces, and that is how many counters do it. It goes wrong
            in two directions. Text with spaced dashes, bullet symbols or stray punctuation gets extra
            &ldquo;words&rdquo; that are not words at all, and languages written without spaces get almost
            none: a whole paragraph of Japanese comes out as one.
          </p>
          <p>
            <strong class="text-foreground">This counter uses Unicode&rsquo;s word-boundary rules</strong>, the
            same ones your browser uses when you double-click to select a word, through its built-in
            <code class="font-mono text-foreground">Intl.Segmenter</code>. On top of those, the rules are short
            enough to list in full:
          </p>
          <ul class="list-disc space-y-2 pl-5">
            <li>A word contains at least one letter or digit. A dash, an ampersand or an emoji on its own is not one.</li>
            <li>Apostrophes stay inside a word: <em>don&rsquo;t</em>, <em>it&rsquo;s</em> and <em>rock&rsquo;n&rsquo;roll</em> are one word each, with a straight or a curly apostrophe.</li>
            <li>Hyphenated compounds are one word: <em>e-mail</em>, <em>co-op</em>, <em>mother-in-law</em>. A dash with spaces round it, or an en or em dash, separates.</li>
            <li>Numbers are one word with their separators: <em>3.14</em> and <em>1,000</em>.</li>
            <li>Chinese, Japanese and Thai are split using the dictionaries your browser ships with, so <em>日本語の文章です</em> is four words and <em>สวัสดีครับ</em> is two.</li>
            <li>A hashtag or a handle counts its word part: <em>#launch</em> is one word.</li>
          </ul>
          <p>
            Those choices put it close to Microsoft Word on ordinary prose. Where they differ, it is usually
            because Word counts anything between two spaces — a lone dash included — and Google Docs splits
            hyphenated words. If a submission system gives you a hard word limit, check with its own counter
            as well: the rule that matters is the one the person enforcing the limit is using.
          </p>
          <p>
            Sentences are found the same way, with Unicode&rsquo;s sentence rules, which already know
            that the full stop in <em>3.5</em> or <em>e.g.</em> does not end one. Titles before a name do
            trip them up, so <em>Mr.</em>, <em>Mrs.</em>, <em>Dr.</em>, <em>Prof.</em> and a handful of others
            are taught not to end a sentence. One rule is worth knowing: a full stop followed by a lower-case
            letter does not end a sentence either, so text typed without capitals counts as fewer sentences than
            it has. Paragraphs are blocks of text separated by a blank line.
          </p>
        </div>
      </section>

      <section aria-labelledby="chars-heading" class="rounded-2xl bg-muted/50 p-6 sm:p-8">
        <h2 id="chars-heading" class="text-xl font-semibold">
          Characters, code units and bytes
        </h2>
        <div class="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground">
          <p>
            A &ldquo;character&rdquo; is three different numbers depending on who is counting, and the
            difference only shows up once there is an emoji or an accent in the text. Take
            <span class="font-mono text-foreground">Hi 👋🏽</span>:
          </p>
          <ul class="list-disc space-y-2 pl-5">
            <li><strong class="text-foreground">4 characters</strong> as you see them. The waving hand with its skin tone is one symbol on screen, so it counts as one here.</li>
            <li><strong class="text-foreground">7 UTF-16 units</strong>, which is what JavaScript&rsquo;s <code class="font-mono text-foreground">.length</code>, many web forms and the UCS-2 text messages use. The hand and the skin tone are two units each.</li>
            <li><strong class="text-foreground">11 UTF-8 bytes</strong>, which is what a file on disk takes up and what a MySQL <code class="font-mono text-foreground">VARCHAR</code> or a URL actually stores.</li>
          </ul>
          <p>
            <strong class="text-foreground">Text messages are the case that costs money.</strong> An SMS
            carries 160 characters only while every character is in the GSM-7 alphabet — plain letters,
            digits, common punctuation and a few accented letters like é and ü. A single character outside
            it, such as a curly apostrophe pasted from a word processor or any emoji, switches the whole
            message to UCS-2, and the limit falls to 70. Longer messages are split into parts of 153 or 67,
            because each part gives up some room to the header that stitches them back together, and
            € [ ] &#123; &#125; ^ ~ | and \ cost two places each. The limits panel shows the encoding, the parts
            and exactly which characters forced UCS-2, so you can swap them out.
          </p>
          <p>
            X counts differently again: most Latin, Greek and Cyrillic characters count one, Chinese, Japanese
            and Korean count two, every emoji counts two, and a link always counts 23 whatever its length.
            The X figure here follows those rules for links starting with http or www; X also shortens bare
            domains, which this does not detect.
          </p>
        </div>
      </section>

      <section aria-labelledby="case-heading" class="rounded-2xl bg-muted/50 p-6 sm:p-8">
        <h2 id="case-heading" class="text-xl font-semibold">
          The case converter
        </h2>
        <div class="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground">
          <p>
            Prose cases change the letters and leave every space, line break and mark of punctuation where it
            was. <strong class="text-foreground">Title Case</strong> capitalises each word but keeps
            <em>a, an, the, and, but, or, of, in, on, at, to, for</em> and <em>by</em> lower case in the
            middle of a title — never at the start or after a colon — so &ldquo;the lord of the rings&rdquo;
            becomes &ldquo;The Lord of the Rings&rdquo;. <strong class="text-foreground">Sentence case</strong>
            capitalises the first word of each sentence and line and restores &ldquo;I&rdquo;. Both leave
            acronyms and brand names like NASA and iPhone alone, unless the whole text was in capitals, in
            which case there is no way to tell an acronym from shouting.
          </p>
          <p>
            Code cases rebuild each line as an identifier: <em>first name</em> becomes
            <span class="font-mono text-foreground">firstName</span>, <span class="font-mono text-foreground">FirstName</span>,
            <span class="font-mono text-foreground">first_name</span>, <span class="font-mono text-foreground">first-name</span>
            or <span class="font-mono text-foreground">FIRST_NAME</span>. They also read existing identifiers,
            so <span class="font-mono text-foreground">parseXMLHttpRequest</span> converts cleanly to
            <span class="font-mono text-foreground">parse_xml_http_request</span>. Paste a column of field names
            and each line converts on its own.
          </p>
        </div>
      </section>

      <section aria-labelledby="api-heading" class="rounded-2xl bg-muted/50 p-6 sm:p-8">
        <h2 id="api-heading" class="text-xl font-semibold">
          Counting from a script
        </h2>
        <div class="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground">
          <p>
            The same counting code answers at <a href="/api/v1" class="font-medium text-foreground underline underline-offset-4">/api/v1/text-stats</a>.
            Send the text as a JSON body — never in the URL, where it would end up in logs — and add
            <span class="font-mono text-foreground">"case": "title"</span> or any other case to get it
            converted too. Text sent to the API does travel to our server to be counted; it is not stored or
            logged. Text typed into this page never does.
          </p>
        </div>
        <CodeBlock :code="apiSnippet" lang="bash" />
        <p class="mt-3 text-sm text-muted-foreground">
          MCP clients can call the same core: add <code class="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">https://zeal.tools/mcp</code>
          to your client and use the <code class="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">count_words</code> tool.
        </p>
      </section>

      <FaqSection :items="faq" class="rounded-2xl bg-muted/50 p-6 sm:p-8" />

      <ZealPromise />
    </ToolContents>
  </div>
</template>
