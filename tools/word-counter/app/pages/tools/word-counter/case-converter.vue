<script setup lang="ts">
import meta from '../../../../meta'

const { public: { siteUrl } } = useRuntimeConfig()
const pageUrl = `${siteUrl}/tools/${meta.slug}/case-converter`

useSeoMeta({
  title: 'Case Converter — Title Case, Sentence Case, UPPER, camelCase, snake_case',
  description: 'Convert text to Title Case, Sentence case, UPPER CASE, lower case, camelCase, PascalCase, snake_case, kebab-case, CONSTANT_CASE and more. Undo any change, or copy the result. Free, and your text stays in your browser.',
  ogTitle: 'Case Converter — eleven cases, with undo',
  ogDescription: 'Title Case that keeps "of" and "the" small, Sentence case that restores "I", and every identifier style. In your browser.',
  ogUrl: pageUrl,
  twitterCard: 'summary_large_image',
})

defineOgImage('Default', { title: 'Case Converter', description: 'Title, Sentence, UPPER, camelCase, snake_case and more — with undo.' })

useToolJsonLd(meta, {
  variant: 'case-converter',
  name: 'Case Converter',
  description: 'Convert text between Title Case, Sentence case, UPPER, lower, camelCase, PascalCase, snake_case, kebab-case, CONSTANT_CASE, alternating and inverse case.',
  featureList: [
    'Title Case with small words kept lower case',
    'Sentence case that restores the pronoun I',
    'camelCase, PascalCase, snake_case, kebab-case and CONSTANT_CASE',
    'Acronyms like NASA and brand names like iPhone left intact',
    'Undo, or copy the result without changing your text',
  ],
})

const examples = [
  { from: 'the lord of the rings', to: 'The Lord of the Rings', label: 'Title Case' },
  { from: 'HOW ARE YOU? I\'M FINE.', to: 'How are you? I\'m fine.', label: 'Sentence case' },
  { from: 'user account id', to: 'userAccountId', label: 'camelCase' },
  { from: 'parseXMLHttpRequest', to: 'parse_xml_http_request', label: 'snake_case' },
  { from: 'Max Retry Count', to: 'MAX_RETRY_COUNT', label: 'CONSTANT_CASE' },
  { from: 'Blog Post Title', to: 'blog-post-title', label: 'kebab-case' },
]

const faq = [
  { q: 'Which words stay lower case in Title Case?', a: 'Articles, short conjunctions and short prepositions: a, an, the, and, but, or, of, in, on, at, to, for and by. They are capitalised when they open the title or follow a colon or a full stop, so "star wars: a new hope" becomes "Star Wars: A New Hope". Longer prepositions like "with" and "from" are capitalised, which is where AP and Chicago style agree. Style guides differ on the details — Chicago lowercases every preposition, whatever its length — so check a title that matters against your house style.' },
  { q: 'Will it ruin acronyms like NASA or names like iPhone?', a: 'Not in mixed-case text. A word that already has a capital after its first letter is left exactly as it is in Title Case and Sentence case, so NASA, BBC, iPhone and McDonald survive. The exception is text written entirely in capitals: there, NASA and a shouted word look the same, so everything is treated as ordinary words.' },
  { q: 'What is the difference between camelCase, PascalCase and snake_case?', a: 'They are ways of writing several words as one name, with no spaces. camelCase starts lower case and capitalises each following word (userAccountId) — the JavaScript and Java convention for variables. PascalCase capitalises every word (UserAccountId), used for classes and components. snake_case joins lower-case words with underscores (user_account_id), common in Python, Ruby and SQL. kebab-case uses hyphens (user-account-id), seen in URLs and CSS. CONSTANT_CASE is snake_case in capitals, for constants and environment variables.' },
  { q: 'Can I convert a whole list of names at once?', a: 'Yes. Code cases convert each line on its own, so a column of field names pasted from a spreadsheet comes back as a column of identifiers. Prose cases keep every line break where it was.' },
  { q: 'What happens to punctuation and accents?', a: 'Prose cases leave punctuation and spacing untouched and change only letters; accented and non-Latin letters convert correctly, so "élan" becomes "Élan" and "привет" becomes "Привет". Code cases drop punctuation and apostrophes, because identifiers cannot hold them — "don\'t stop" becomes dont_stop — but keep accented letters, since most modern languages allow them in names.' },
  { q: 'I converted the wrong thing. Can I get it back?', a: 'Press Undo. Every conversion and every Clear can be undone, one step at a time, back to what you had. If you only want the converted text somewhere else, switch to "Copy the result" first: the converted version goes to your clipboard and your text is not touched.' },
]

const contents = [
  { id: 'examples-heading', label: 'Examples' },
  { id: 'faq-heading', label: 'Questions' },
  { id: 'promise', label: 'The Zeal Promise' },
]
</script>

<template>
  <div class="container-page py-10">
    <ToolPageHeader
      title="Case Converter"
      description="Title Case, Sentence case, UPPER, lower, camelCase, snake_case and more — rewrite your text with undo, or copy the result and leave it alone."
    />

    <WordCounterTool focus="case" />

    <section class="mt-12 flex flex-wrap gap-2 text-sm" aria-label="Related tools">
      <NuxtLink to="/tools/word-counter" class="rounded-full border border-border px-4 py-1.5 transition-colors hover:border-primary/40 hover:text-primary">
        Word counter →
      </NuxtLink>
      <NuxtLink to="/tools/word-counter/character-counter" class="rounded-full border border-border px-4 py-1.5 transition-colors hover:border-primary/40 hover:text-primary">
        Character counter →
      </NuxtLink>
    </section>

    <ToolContents :items="contents">
      <section aria-labelledby="examples-heading" class="rounded-2xl bg-muted/50 p-6 sm:p-8">
        <h2 id="examples-heading" class="text-xl font-semibold">
          What each case does
        </h2>
        <div class="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground">
          <p>
            There are two kinds of case here, and they behave differently. <strong class="text-foreground">Prose
              cases</strong> — UPPER, lower, Title, Sentence, alternating and inverse — change letters and nothing
            else, so spacing, punctuation and line breaks come through exactly as they were.
            <strong class="text-foreground">Code cases</strong> — camelCase, PascalCase, snake_case, kebab-case
            and CONSTANT_CASE — rebuild each line as a single name, splitting at spaces, punctuation and the
            humps of an existing camelCase name, so they also convert from one identifier style to another.
          </p>
        </div>
        <div class="mt-5 overflow-x-auto">
          <table class="w-full min-w-md text-left text-sm">
            <thead>
              <tr class="border-b border-border">
                <th scope="col" class="py-2 pr-4 font-medium">
                  Case
                </th>
                <th scope="col" class="py-2 pr-4 font-medium">
                  From
                </th>
                <th scope="col" class="py-2 font-medium">
                  To
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="example in examples" :key="example.label" class="border-b border-border/60">
                <th scope="row" class="py-2 pr-4 font-medium">
                  {{ example.label }}
                </th>
                <td class="py-2 pr-4 font-mono text-muted-foreground">
                  {{ example.from }}
                </td>
                <td class="py-2 font-mono">
                  {{ example.to }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <FaqSection :items="faq" class="rounded-2xl bg-muted/50 p-6 sm:p-8" />
      <ZealPromise />
    </ToolContents>
  </div>
</template>
