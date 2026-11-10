<script setup lang="ts">
import meta from '../../../../meta'

const { public: { siteUrl } } = useRuntimeConfig()

useSeoMeta({
  title: 'WHOIS Lookup — Who Owns a Domain, Registrar and Expiry Date',
  description: 'Free WHOIS lookup: see a domain\'s owner, registrar, registration and expiry dates, status locks, nameservers and DNS, read straight from the registry over RDAP. No sign-up, no middleman.',
  ogTitle: 'WHOIS Lookup — who owns this domain?',
  ogDescription: 'Owner, registrar, expiry, status and DNS for any domain, read straight from the registry. Free, no sign-up.',
  ogUrl: `${siteUrl}/tools/${meta.slug}`,
  twitterCard: 'summary_large_image',
})

defineOgImage('Default', { title: 'WHOIS Lookup', description: meta.tagline })

const apiSnippet = `curl 'https://zeal.tools/api/v1/whois?domain=example.com'`

const howToSteps = [
  { title: 'Type or paste a domain', body: 'A bare name, a subdomain or a whole URL. Registries only know the registered name, so blog.example.co.uk is looked up as example.co.uk — and the tool tells you it did that.' },
  { title: 'Read the answer at the top', body: 'Whether it is registered, how old it is, when it expires and who it is registered with. A domain that expires within a month is flagged.' },
  { title: 'Check who owns it', body: 'The registrant\'s organisation and country where the registry publishes them. Most personal details are withheld by law, in which case the registrar\'s contact form is linked — that is the legitimate route to the owner.' },
  { title: 'Look at where it points', body: 'Nameservers, DNSSEC and the live A, MX and TXT records, with the DNS and email provider named where the hostnames make it unambiguous.' },
]

useToolJsonLd(meta, {
  description: meta.description,
  featureList: [
    'Registrar, registration date, expiry date and domain age',
    'Status codes explained in plain English',
    'Owner details where the registry publishes them, and the registrar contact form where it does not',
    'Nameservers, DNSSEC and live A, AAAA, MX, NS, TXT and CAA records',
    'Reads RDAP directly from the registry — the lookup never passes through our server',
    'Free REST and MCP endpoint',
  ],
  howTo: { name: 'How to look up who owns a domain', steps: howToSteps.map(s => ({ name: s.title, text: s.body })) },
})

const contents = [
  { id: 'howto-heading', label: 'How to use it' },
  { id: 'rdap-heading', label: 'WHOIS, now RDAP' },
  { id: 'privacy-heading', label: 'Why the owner is hidden' },
  { id: 'status-heading', label: 'Reading the status codes' },
  { id: 'faq-heading', label: 'Questions' },
  { id: 'api-heading', label: 'API' },
  { id: 'promise', label: 'The Zeal Promise' },
]

const faq = [
  { q: 'Can I see who owns any domain?', a: 'Sometimes. Registries publish the registrant\'s organisation and country for many domains, and some ccTLDs — .fr, for example — publish full contact details for organisations. But personal data for individuals has been withheld by default since GDPR took effect in 2018, and most registrars apply that worldwide rather than working out who is European. When the details are withheld this tool says so, and links the registrar\'s contact form where one is published: that form forwards your message to the owner without revealing their address to you.' },
  { q: 'Does the domain I look up get sent to zeal.tools?', a: 'No. Your browser asks IANA which registry runs the ending, then asks that registry, then the registrar, then Cloudflare\'s public DNS resolver. RDAP servers are expected to let web pages read them, and the major ones we checked all do, so none of those requests touches our server. The exception is a registry that refuses web pages, such as .de\'s: then the tool offers to ask from our server instead, says so in those words, and only does it if you press the button.' },
  { q: 'Is this the same as WHOIS?', a: 'It is the replacement for it. WHOIS is a plain-text protocol from the 1980s that runs on port 43 and returns whatever format each registry felt like. RDAP — the Registration Data Access Protocol — returns structured JSON over HTTPS, and ICANN made it the official source for every generic domain in January 2025, retiring WHOIS for them. People still call the lookup "WHOIS", and so does this page.' },
  { q: 'Why does it say my domain\'s ending is not supported?', a: 'Because that registry does not run RDAP. Most generic endings (.com, .org, .dev, .app and hundreds more) and many country endings (.uk, .fr, .au, .io) do, but some, including .jp and .cn, have no RDAP service listed with IANA and offer only port-43 WHOIS. That speaks raw TCP, which no web page can open. Their own websites have a lookup form.' },
  { q: 'What does "client transfer prohibited" mean? Is something wrong?', a: 'It is the opposite of wrong. That status is the lock that stops anyone moving the domain to another registrar without the owner unlocking it first — the main protection against domain hijacking. Most well-run domains show it. The statuses worth worrying about are the holds (the domain has been taken out of DNS), redemption period (it expired and is about to be lost) and pending delete. Every status is explained in plain words in the results.' },
  { q: 'How accurate are the dates?', a: 'They are the registry\'s own records, read live, so they are as accurate as the registry. The expiry date can move: most domains auto-renew, and a registrar may renew a domain a few weeks before the date shown. If a domain has just been renewed and the registrar has not told the registry yet, the old date can show for a day or two.' },
  { q: 'Can I use this to check if a domain is available?', a: 'Yes — a domain the registry has no record of is shown as not registered, which almost always means you can buy it. A small number of names are reserved by the registry or sold at premium prices and also have no record, so the registrar\'s own search is the final word. There is a dedicated page for this that explains what to do when the name you want is taken.' },
  { q: 'What is the abuse contact for?', a: 'Reporting phishing, malware, spam or fraud on the domain. ICANN requires registrars of generic domains to publish one and to act on reports, so it is the right address for a complaint — not the owner, and not the registry. Include the full URL and evidence; a specific report gets acted on far faster than a general one.' },
  { q: 'Is there a catch?', a: 'No. No sign-up, no ads, no lookup limit worth mentioning on the page, and nothing installed. The whole thing is MIT licensed, and the RDAP parser is tested against real responses captured from Verisign, MarkMonitor, Identity Digital, Nominet and AFNIC, because no two of them fill the format the same way.' },
]
</script>

<template>
  <div class="container-page py-10">
    <ToolPageHeader
      title="WHOIS Lookup"
      description="Who owns a domain, who it is registered with, when it expires and where it points — read straight from the registry, with every status code explained."
    />

    <WhoisLookupTool />

    <section class="mt-12 flex flex-wrap gap-2 text-sm" aria-label="Related pages">
      <NuxtLink to="/tools/whois-lookup/domain-age" class="rounded-full border border-border px-4 py-1.5 transition-colors hover:border-primary/40 hover:text-primary">
        Domain age checker →
      </NuxtLink>
      <NuxtLink to="/tools/whois-lookup/domain-availability" class="rounded-full border border-border px-4 py-1.5 transition-colors hover:border-primary/40 hover:text-primary">
        Domain availability checker →
      </NuxtLink>
      <NuxtLink to="/tools/meta-tag-checker" class="rounded-full border border-border px-4 py-1.5 transition-colors hover:border-primary/40 hover:text-primary">
        Meta tag checker →
      </NuxtLink>
    </section>

    <ToolContents :items="contents">
      <section aria-labelledby="howto-heading" class="rounded-2xl bg-muted/50 p-6 sm:p-8">
        <h2 id="howto-heading" class="text-xl font-semibold">
          How to look up a domain
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

      <section aria-labelledby="rdap-heading" class="rounded-2xl bg-muted/50 p-6 sm:p-8">
        <h2 id="rdap-heading" class="text-xl font-semibold">
          WHOIS is now RDAP, and that changes who sees your lookup
        </h2>
        <div class="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground">
          <p>
            For forty years a WHOIS lookup meant opening a raw TCP connection to port 43 and getting back a
            block of text in whatever layout that registry preferred. A web page cannot open that connection,
            so every WHOIS website was a middleman: you typed the domain into their form, their server made the
            query, and they saw everything anyone was curious about — which is a useful list to have if you
            sell domains, and some of them do.
          </p>
          <p>
            <strong class="text-foreground">RDAP replaced it.</strong> The Registration Data Access Protocol
            returns structured JSON over ordinary HTTPS, and ICANN made it the authoritative source for every
            generic domain in January 2025. Crucially, the registries serve it with a header that lets any web
            page read the answer. So this page does not need a server in the middle: your browser asks
            <a href="https://data.iana.org/rdap/dns.json" class="text-primary underline underline-offset-4" rel="noopener noreferrer" target="_blank">IANA's list</a>
            which registry runs the ending, asks that registry, and — for endings like .com where the registry
            keeps only the basics — follows its link to the registrar for the rest.
          </p>
          <p>
            The registry and registrar do see the lookup, the same as they would from any tool. We do not, and
            there is no list of what you looked up anywhere on our side to sell, leak or subpoena.
          </p>
        </div>
      </section>

      <section aria-labelledby="privacy-heading" class="rounded-2xl bg-muted/50 p-6 sm:p-8">
        <h2 id="privacy-heading" class="text-xl font-semibold">
          Why the owner is usually hidden
        </h2>
        <div class="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground">
          <p>
            Until 2018 every domain's owner — name, home address, phone and email — was public, and
            harvested by spammers within hours of registration. GDPR made publishing an individual's personal
            data without consent unlawful, and ICANN's response was to have registrars <strong class="text-foreground">redact
              it by default, for everyone</strong>, rather than try to work out who was European.
          </p>
          <p>
            What is usually left is the <strong class="text-foreground">organisation and country</strong>,
            which is often enough: a domain registered to "GitHub, Inc." in the US tells you what you needed to
            know. Some country registries go further and publish full details for organisations, which is why
            a .fr lookup can show a complete postal address.
          </p>
          <p>
            Where details are withheld, the registrar normally publishes a <strong class="text-foreground">contact
              form</strong> that relays your message to the owner without revealing their address. It is linked
            in the results when the registry provides one. Separately, some owners use a privacy service that
            registers the domain in its own name — "Domains By Proxy", "Withheld for Privacy" — and the tool
            labels those as what they are, rather than presenting the service as the owner.
          </p>
          <p>
            For legal disputes, law enforcement and trademark claims there is a formal route: ICANN's
            Registration Data Request Service, through which registrars can disclose redacted data to someone
            with a legitimate reason. No lookup tool can, and any that claims to is guessing.
          </p>
        </div>
      </section>

      <section aria-labelledby="status-heading" class="rounded-2xl bg-muted/50 p-6 sm:p-8">
        <h2 id="status-heading" class="text-xl font-semibold">
          Reading the status codes
        </h2>
        <div class="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground">
          <p>
            Status codes come from EPP, the protocol registrars use to talk to registries, and they read like
            error messages. Most are the opposite. <strong class="text-foreground">Anything ending in
              "prohibited" is a lock</strong>: "client" locks are set by the registrar and lifted by the owner
            from their account, and "server" locks are set by the registry itself, usually on request for
            high-value names. A domain with all six is about as protected as a domain can be.
          </p>
          <p>
            The ones to take seriously are the <strong class="text-foreground">holds</strong>, which mean the
            domain has been taken out of DNS and does not resolve — usually unpaid fees, unverified contact
            details or an abuse complaint — and the end-of-life sequence: <strong class="text-foreground">auto-renew
              period</strong> (it passed its expiry date and is in a grace window), <strong class="text-foreground">redemption
              period</strong> (it has been deleted, but the owner can still buy it back) and
            <strong class="text-foreground">pending delete</strong> (it is about to be released to anyone).
          </p>
          <p>
            If you own a domain and see "pending transfer" that you did not ask for, contact your registrar
            straight away — that is what a hijacking looks like from the outside.
          </p>
        </div>
      </section>

      <FaqSection :items="faq" class="rounded-2xl bg-muted/50 p-6 sm:p-8" />

      <section id="api" aria-labelledby="api-heading" class="rounded-2xl bg-muted/50 p-6 sm:p-8">
        <h2 id="api-heading" class="text-xl font-semibold">
          API — for scripts and agents
        </h2>
        <p class="mt-2 text-sm text-muted-foreground">
          The same lookup behind a free REST endpoint. No API key, no sign-up. Returns the parsed record, the
          live DNS records and the RDAP URLs it read.
        </p>
        <CodeBlock :code="apiSnippet" lang="bash" />
        <p class="mt-3 text-sm text-muted-foreground">
          Add <code class="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">&amp;dns=false</code> to skip DNS, or
          <code class="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">&amp;raw=true</code> for the untouched
          RDAP responses. Useful for a cron job that warns you a month before a domain lapses. MCP clients can
          add <code class="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">https://zeal.tools/mcp</code> and
          call <code class="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">whois_lookup</code>. Unlike the
          page, the API does run on our server — that is what an API is — and it can therefore also reach
          registries that refuse web pages.
        </p>
      </section>

      <ZealPromise />
    </ToolContents>
  </div>
</template>
