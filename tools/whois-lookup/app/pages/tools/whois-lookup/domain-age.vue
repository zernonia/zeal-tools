<script setup lang="ts">
import meta from '../../../../meta'

const { public: { siteUrl } } = useRuntimeConfig()

useSeoMeta({
  title: 'Domain Age Checker — When Was a Domain Registered?',
  description: 'Check how old any domain is, with its exact registration date, expiry date and registrar — read straight from the registry, not estimated. Free, no sign-up.',
  ogTitle: 'Domain Age Checker — how old is this domain?',
  ogDescription: 'The exact registration date of any domain, from the registry itself. Free, no sign-up.',
  ogUrl: `${siteUrl}/tools/${meta.slug}/domain-age`,
  twitterCard: 'summary_large_image',
})

defineOgImage('Default', { title: 'Domain Age Checker', description: 'When was this domain registered? Ask the registry.' })

useToolJsonLd(meta, {
  variant: 'domain-age',
  name: 'Domain Age Checker',
  description: 'Check a domain\'s exact registration date and age, read from the registry over RDAP.',
  featureList: ['Exact registration date from the registry', 'Age in years and months', 'Expiry date and days remaining', 'Registrar and status history at a glance', 'Free, with no login or account'],
})

const contents = [
  { id: 'age-heading', label: 'What the age tells you' },
  { id: 'faq-heading', label: 'Questions' },
  { id: 'promise', label: 'The Zeal Promise' },
]

const faq = [
  { q: 'How is the age worked out?', a: 'From the registration date the registry itself holds — the "registration" event in its RDAP record — counted in calendar months, so a domain registered on 15 September turns a year older on 15 September. Nothing is estimated from archive snapshots or search results, which is how many age checkers work and why they disagree with each other.' },
  { q: 'Does the age reset when a domain changes hands?', a: 'Not when it is sold or transferred between registrars: the registration date stays where it was, because the registration never lapsed. It resets only when a domain expires, is deleted and is then registered fresh by someone else. So an old date means continuous registration, not continuous ownership — a domain can be 25 years old and on its fourth owner.' },
  { q: 'Does an old domain rank better on Google?', a: 'Google has said repeatedly that domain age is not a ranking factor in itself. What an old domain often has is what age tends to bring — links, history, a reputation — and those do matter. A freshly registered expired domain with a long history behind it is not old in the registry\'s eyes, and search engines are good at telling the difference.' },
  { q: 'Why check the age of a domain at all?', a: 'Mostly to judge trust. A shop, bank or charity whose domain was registered last week deserves suspicion — phishing domains are typically days old when they are used. It is also useful when buying a domain, to see whether the seller\'s story about its history holds up, and for spotting a lookalike of a domain you own.' },
  { q: 'Why is no registration date shown?', a: 'Some registries do not publish one. A few country registries, .de among them, publish only when the record was last changed, and a handful publish no dates at all. The tool says "Not published" in that case rather than guessing.' },
]
</script>

<template>
  <div class="container-page py-10">
    <ToolPageHeader
      title="Domain Age Checker"
      description="How old is a domain, really? The exact registration date, straight from the registry — plus when it expires and who it is registered with."
    />

    <WhoisLookupTool />

    <ToolContents :items="contents">
      <section aria-labelledby="age-heading" class="rounded-2xl bg-muted/50 p-6 sm:p-8">
        <h2 id="age-heading" class="text-xl font-semibold">
          What a domain's age does and does not tell you
        </h2>
        <div class="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground">
          <p>The age shown here is the registry's own date, not an estimate. Plenty of age checkers work it out from the first time an archive crawled the site, which measures when something was <em>published</em> there, not when the name was registered — and the two can be years apart in either direction.</p>
          <p><strong class="text-foreground">Age is a good signal for trust.</strong> Phishing and scam domains are overwhelmingly new: registered days before they are used, and abandoned soon after. A site claiming to be an established business on a domain registered last month is worth a second look, and a lookalike of your own domain with a registration date of yesterday is worth acting on.</p>
          <p><strong class="text-foreground">It says nothing about who owned it.</strong> A sale or a transfer to another registrar leaves the date alone, because the registration never lapsed. Only a domain that expired, was deleted and was registered again starts from zero. So a 20-year-old domain may have changed hands several times; the status codes and the "last changed" date are where a recent move shows.</p>
          <p>Check the expiry date while you are here. A domain with a long history that expires next week, and has no renewal lock, is one missed payment from being bought by someone else.</p>
        </div>
      </section>

      <FaqSection :items="faq" class="rounded-2xl bg-muted/50 p-6 sm:p-8" />

      <ZealPromise />
    </ToolContents>
  </div>
</template>
