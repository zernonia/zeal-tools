<script setup lang="ts">
import meta from '../../../../meta'

const { public: { siteUrl } } = useRuntimeConfig()

useSeoMeta({
  title: 'Domain Availability Checker — Is This Domain Taken?',
  description: 'Check whether a domain is registered by asking the registry directly — and if it is taken, see when it expires and who it is registered with. No sign-up, and nobody in the middle.',
  ogTitle: 'Domain Availability Checker — is this domain taken?',
  ogDescription: 'Ask the registry itself whether a domain is free, without telling a domain seller what you want.',
  ogUrl: `${siteUrl}/tools/${meta.slug}/domain-availability`,
  twitterCard: 'summary_large_image',
})

defineOgImage('Default', { title: 'Domain Availability Checker', description: 'Is this domain taken? Ask the registry, not a reseller.' })

useToolJsonLd(meta, {
  variant: 'domain-availability',
  name: 'Domain Availability Checker',
  description: 'Check whether a domain is registered by querying the registry directly over RDAP, from your own browser.',
  featureList: ['Asks the registry directly, from your browser', 'Shows expiry date and status when the domain is taken', 'Explains grace and redemption periods for lapsing domains', 'No search history kept by us', 'Free, with no login or account'],
})

const contents = [
  { id: 'avail-heading', label: 'Why ask the registry' },
  { id: 'taken-heading', label: 'When the name is taken' },
  { id: 'faq-heading', label: 'Questions' },
  { id: 'promise', label: 'The Zeal Promise' },
]

const faq = [
  { q: 'If it says "Not registered", can I buy it?', a: 'Almost always. It means the registry has no record of the name. The exceptions are names the registry has reserved — short names, trademarks of the registry, geographic names on some endings — and premium names sold at a higher price, which also have no record until someone buys them. Your registrar\'s checkout is the final word, and it will tell you the price.' },
  { q: 'Do domain search sites really register names people search for?', a: 'The practice has a name — domain front-running — and ICANN\'s Security and Stability Advisory Committee reported on it in 2007. Reputable registrars do not do it, but a search on a reseller\'s site does tell that reseller exactly what you want, and some aftermarket sites price accordingly. Here the question goes from your browser to the registry and no further, so there is no search history on our side for anyone to act on.' },
  { q: 'The name I want is taken. When might it become free?', a: 'Look at the expiry date and the status. Most domains auto-renew and never come free. If one is not renewed, it typically goes through an auto-renew grace period of up to 45 days, then a 30-day redemption period in which the old owner can still buy it back, then about five days of pending delete before anyone can register it. The tool explains each of those statuses when it sees them.' },
  { q: 'Can I contact the owner to buy it?', a: 'Often, yes. Owner details are usually withheld, but many registrars publish a contact form that relays a message to the owner, and the results link it when the registry provides one. Some domains also point at a "this domain is for sale" page — try visiting it.' },
  { q: 'Does it check every ending?', a: 'Every ending whose registry runs RDAP, which covers almost all generic endings and many country ones. A few, such as .jp and .cn, still offer only the old WHOIS protocol, which a web page cannot use; the tool tells you when that is the case.' },
]
</script>

<template>
  <div class="container-page py-10">
    <ToolPageHeader
      title="Domain Availability Checker"
      description="Is the domain you want taken? Ask the registry itself, from your browser — and if it is, see when it expires and who has it."
    />

    <WhoisLookupTool />

    <ToolContents :items="contents">
      <section aria-labelledby="avail-heading" class="rounded-2xl bg-muted/50 p-6 sm:p-8">
        <h2 id="avail-heading" class="text-xl font-semibold">
          Why ask the registry rather than a shop
        </h2>
        <div class="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground">
          <p>Every domain ending is run by one registry — Verisign for .com, Identity Digital for .io, Nominet for .uk — and the registry is the only place that actually knows whether a name is taken. Registrars and resellers are shops in front of it. Their search box asks the registry for you, and in doing so learns what you are about to buy.</p>
          <p><strong class="text-foreground">This page asks the registry itself, from your browser.</strong> Registries publish RDAP, the modern replacement for WHOIS, with a header that lets a web page read it, so no server sits in the middle — not ours, not a reseller's. If the registry has no record, the name is shown as not registered.</p>
          <p>When you are ready, buy it from any registrar you like. First-year prices are often discounted to win you over; the renewal price is what you will pay every year after, and that is the number worth comparing.</p>
        </div>
      </section>

      <section aria-labelledby="taken-heading" class="rounded-2xl bg-muted/50 p-6 sm:p-8">
        <h2 id="taken-heading" class="text-xl font-semibold">
          When the name is taken
        </h2>
        <div class="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground">
          <p>A taken name is not the end of the road, and the lookup shows what you need to decide. <strong class="text-foreground">The expiry date and status</strong> tell you whether it is being looked after: a long-registered domain with transfer and update locks is someone's working address, while one in its auto-renew or redemption period may be about to lapse.</p>
          <p><strong class="text-foreground">The nameservers and DNS records</strong> tell you whether it is in use. A domain with no A record and parking nameservers is often for sale; one with mail records is somebody's inbox, and they will not part with it cheaply.</p>
          <p>And it is worth checking the other endings. If the .com is gone, the .io, .dev or your country's ending may not be — look each one up here before settling.</p>
        </div>
      </section>

      <FaqSection :items="faq" class="rounded-2xl bg-muted/50 p-6 sm:p-8" />

      <ZealPromise />
    </ToolContents>
  </div>
</template>
