<script setup lang="ts">
import meta from '../../../../meta'

const { public: { siteUrl } } = useRuntimeConfig()

useSeoMeta({
  title: 'What Is My IP Address? — IPv4, IPv6, Location and ISP',
  description: 'See your public IP address instantly, whether it is IPv4 or IPv6, and what every website can tell from it: approximate city, time zone, internet provider and ASN. Nothing stored, no sign-up.',
  ogTitle: 'What is my IP? Your address, and what it gives away',
  ogDescription: 'Your public IP address, IPv4 or IPv6, with the approximate location and provider any site can see. Nothing stored, no sign-up.',
  ogUrl: `${siteUrl}/tools/${meta.slug}`,
  twitterCard: 'summary_large_image',
})

defineOgImage('Default', { title: 'What Is My IP', description: meta.tagline })

const apiSnippet = `curl https://zeal.tools/api/v1/ip

# just the address, for a script
curl 'https://zeal.tools/api/v1/ip?format=text'`

const howToSteps = [
  { title: 'Open the page', body: 'Your address appears at the top as soon as the page loads — there is nothing to type or press. The badge beside it says whether your browser connected over IPv4 or IPv6.' },
  { title: 'Copy it if you need it', body: 'Press Copy IP address to put it on your clipboard, ready to paste into a firewall allow-list, a support ticket or a game server\'s settings.' },
  { title: 'Read what it reveals', body: 'Below the address is everything a website can work out from it alone: roughly where you are, your time zone, and which provider the address belongs to. Each line says how far to trust it.' },
  { title: 'Check again after a change', body: 'Switched a VPN on, moved from Wi-Fi to mobile data, or restarted your router? Press Check again to see the address the internet sees now.' },
]

useToolJsonLd(meta, {
  description: meta.description,
  featureList: [
    'Your public IPv4 or IPv6 address, shown on load',
    'One-press copy',
    'Approximate city, region, country and time zone',
    'Internet provider and autonomous system number (ASN)',
    'Connection details: HTTP version, TLS version and data centre',
    'Nothing stored or logged',
    'Free REST endpoint, including a plain-text mode for scripts',
  ],
  howTo: { name: 'How to find your IP address', steps: howToSteps.map(s => ({ name: s.title, text: s.body })) },
})

const contents = [
  { id: 'howto-heading', label: 'How to use it' },
  { id: 'seen-heading', label: 'Why every site sees it' },
  { id: 'versions-heading', label: 'IPv4 and IPv6' },
  { id: 'location-heading', label: 'Why the location is rough' },
  { id: 'vpn-heading', label: 'VPNs and proxies' },
  { id: 'faq-heading', label: 'Questions' },
  { id: 'api-heading', label: 'API' },
  { id: 'promise', label: 'The Zeal Promise' },
]

const faq = [
  { q: 'What is my IP address?', a: 'It is the address shown at the top of this page: the public address your connection arrives from. It usually belongs to your router or your mobile network rather than to the device in your hand, so every phone and laptop on the same home Wi-Fi normally shows the same one.' },
  { q: 'Is my IP address the same as the one in my Wi-Fi settings?', a: 'Usually not. Your device\'s settings show its local address — something like 192.168.1.23 — which only means anything inside your own network. Your router swaps that for its single public address on the way out, a step called network address translation. The public one is what websites see, and it is the one shown here.' },
  { q: 'Do you store or log my IP address?', a: 'No. The page asks our server one question — what address did this request come from — and the answer is sent straight back and marked as not to be cached. It is not written to a database, a log or our analytics events.' },
  { q: 'Why is the location wrong?', a: 'Because it is an estimate of where your provider\'s block of addresses is registered, not a measurement of you. Mobile networks often route a whole region through one city, and some providers register everything at their head office. Country is right nearly always, city often, and the street never — which is the reason nothing on this page can give your home away.' },
  { q: 'Why do I see an IPv6 address when I expected IPv4?', a: 'When your provider and the site both support IPv6, browsers prefer it, and a site only ever sees the one address the connection used. You almost certainly have an IPv4 address too; it is simply not the one your browser chose for this page. Turning IPv6 off on your device or router will show the IPv4 one, though it is rarely worth doing.' },
  { q: 'Does my IP address change?', a: 'Most home addresses are dynamic: your provider can hand out a new one when the router restarts or after a lease expires, which may be days or months. IPv6 devices also rotate a temporary address every day or so for privacy. Mobile data changes it most often of all. A fixed, static address is usually something a business pays for.' },
  { q: 'Can someone find me from my IP address?', a: 'Not from the address alone. Anyone can see roughly the area and the provider, as this page shows. Linking an address to a named customer takes the provider\'s own records, which they hand over to police with a legal order, not to the public. What an address is good for is blocking, rate-limiting and spotting a login from somewhere unusual.' },
  { q: 'How do I hide my IP address?', a: 'Use a VPN, a privacy relay such as iCloud Private Relay, or the Tor Browser. Each sends your traffic through someone else\'s server, so websites see that server\'s address instead of yours. You are then trusting that service with what your provider could see before. Open this page with it switched on to check it is working.' },
  { q: 'What are the ASN and the data centre?', a: 'An ASN — autonomous system number — identifies one network on the internet, such as a broadband provider or a cloud company, and the provider name next to it is who holds it. The data centre is the airport code of the Cloudflare location that answered your request, which is usually the one nearest to you, network-wise.' },
]
</script>

<template>
  <div class="container-page py-10">
    <ToolPageHeader
      title="What Is My IP"
      description="Your public IP address, whether it is IPv4 or IPv6, and everything a website can work out from it — shown back to you and never stored."
    />

    <WhatIsMyIpTool />

    <section class="mt-12 flex flex-wrap gap-2 text-sm" aria-label="Related tools">
      <NuxtLink to="/tools/whois-lookup" class="rounded-full border border-border px-4 py-1.5 transition-colors hover:border-primary/40 hover:text-primary">
        WHOIS lookup →
      </NuxtLink>
      <NuxtLink to="/tools/meta-tag-checker" class="rounded-full border border-border px-4 py-1.5 transition-colors hover:border-primary/40 hover:text-primary">
        Meta tag checker →
      </NuxtLink>
      <NuxtLink to="/tools/send-to-device" class="rounded-full border border-border px-4 py-1.5 transition-colors hover:border-primary/40 hover:text-primary">
        Send to device →
      </NuxtLink>
    </section>

    <ToolContents :items="contents">
      <section aria-labelledby="howto-heading" class="rounded-2xl bg-muted/50 p-6 sm:p-8">
        <h2 id="howto-heading" class="text-xl font-semibold">
          How to find your IP address
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

      <section aria-labelledby="seen-heading" class="rounded-2xl bg-muted/50 p-6 sm:p-8">
        <h2 id="seen-heading" class="text-xl font-semibold">
          Every website sees your IP address — that is how the internet works
        </h2>
        <div class="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground">
          <p>
            An IP address is the return address on every packet your device sends. When you open a page, your
            browser sends a request to the site's server, and the server needs to know where to send the page
            back. There is no way to receive a reply without giving one — so every site you have ever opened
            has seen your address, whether or not it bothered to show you.
          </p>
          <p>
            <strong class="text-foreground">This page simply shows it back.</strong> Your browser asks
            zeal.tools for the address the request arrived from, and Cloudflare, which runs our servers, has
            already worked out the rest by the time the request reaches us: the approximate location, the
            network it came from and how the connection was set up. We read those details off the request,
            send them back to you, and keep nothing. There is no database to put them in.
          </p>
          <p>
            Most people have two addresses that matter. Your device has a <em>local</em> address, handed out
            by your router and meaningful only inside your home or office. Your router has a <em>public</em>
            address, given to it by your internet provider, and it rewrites every outgoing request to come
            from that one. The public address is the one on this page, which is why every device on the same
            Wi-Fi shows the same answer here.
          </p>
        </div>
      </section>

      <section aria-labelledby="versions-heading" class="rounded-2xl bg-muted/50 p-6 sm:p-8">
        <h2 id="versions-heading" class="text-xl font-semibold">
          IPv4 and IPv6, and why a site sees only one
        </h2>
        <div class="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground">
          <p>
            <strong class="text-foreground">IPv4</strong> addresses are four numbers from 0 to 255 separated
            by dots, such as <span class="font-mono">203.0.113.7</span>. There are about 4.3 billion of them,
            which ran out years ago — that shortage is why your whole household shares one, and why many
            mobile networks now share one address between many customers.
          </p>
          <p>
            <strong class="text-foreground">IPv6</strong> addresses are eight groups of hexadecimal digits
            separated by colons, such as <span class="font-mono">2001:db8::1</span>, where the double colon
            stands for a run of zeros. There are enough of them for every device to have its own, so there
            is no sharing: each phone and laptop gets a globally unique address, and most rotate a temporary
            one regularly so they are harder to track.
          </p>
          <p>
            Many connections have both, but each request travels over only one, so a website only ever sees
            one of your addresses. Browsers prefer IPv6 when your provider and the site both support it, and
            quietly fall back to IPv4 when the IPv6 route is slow. This page reports whichever your browser
            chose, and shows it in the standard short form — leading zeros dropped and the longest run of zero
            groups shortened — so the same address always looks the same.
          </p>
        </div>
      </section>

      <section aria-labelledby="location-heading" class="rounded-2xl bg-muted/50 p-6 sm:p-8">
        <h2 id="location-heading" class="text-xl font-semibold">
          Why the location is only approximate
        </h2>
        <div class="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground">
          <p>
            Nothing in an IP address says where it is. The location comes from a geolocation database, which
            maps blocks of addresses to the place they are registered to or were last seen being used. It is
            compiled from registry records, provider data and measurements, and it is an estimate of the
            <em>block</em>, not of you.
          </p>
          <p>
            In practice the country is right almost every time, the region usually, and the city often but
            far from always. Mobile networks are the worst case: a whole region's traffic often leaves
            through one city, so a phone in a village can appear to be a hundred miles away. The coordinates
            are the centre of the estimated area, shown to two decimal places because anything finer would
            claim a precision the data does not have. The postcode, where one appears, is usually only the
            first part.
          </p>
          <p>
            The time zone is inferred from that same location — it is not read from your device's clock — and
            the provider and network number come from the public records of who holds each block of addresses.
            None of it needs your permission, which is exactly why it is worth knowing what it says.
          </p>
        </div>
      </section>

      <section aria-labelledby="vpn-heading" class="rounded-2xl bg-muted/50 p-6 sm:p-8">
        <h2 id="vpn-heading" class="text-xl font-semibold">
          On a VPN, a proxy or Tor
        </h2>
        <div class="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground">
          <p>
            A VPN, a privacy relay or a proxy carries your traffic to its own server before it goes anywhere
            else, so websites see the server's address and not yours. That is the point of one, and this page
            is a quick way to check it is working: with it switched on, the address, location and provider
            should all describe the VPN's server. If your own provider's name still appears, something is
            leaking.
          </p>
          <p>
            Corporate networks and some mobile providers do the same thing whether you ask or not, so an
            office laptop may show the company's address in another city. Cloudflare marks traffic leaving
            the Tor network, and this page shows it as the Tor network rather than pretending it belongs to a
            country.
          </p>
        </div>
      </section>

      <FaqSection :items="faq" class="rounded-2xl bg-muted/50 p-6 sm:p-8" />

      <section id="api" aria-labelledby="api-heading" class="rounded-2xl bg-muted/50 p-6 sm:p-8">
        <h2 id="api-heading" class="text-xl font-semibold">
          API — for scripts and agents
        </h2>
        <p class="mt-2 text-sm text-muted-foreground">
          The page reads your address from a free REST endpoint, and you can call it too. No API key, no sign-up.
          It returns JSON with the address, its version and the same details as above, any of which may be
          <code class="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">null</code> when the request did not carry
          them.
        </p>
        <CodeBlock :code="apiSnippet" lang="bash" />
        <p class="mt-3 text-sm text-muted-foreground">
          Open <a href="/api/v1/ip" class="font-medium text-primary underline-offset-4 hover:underline">/api/v1/ip</a>
          in a browser to see your own response. The answer is always about whoever made the request, so it
          reports the address of the machine that runs the command — which is also why there is no MCP tool for
          this: called through an AI assistant, it would describe the assistant's server, not you.
        </p>
      </section>

      <ZealPromise />
    </ToolContents>
  </div>
</template>
