<script setup lang="ts">
import meta from '../../../../meta'

const { public: { siteUrl } } = useRuntimeConfig()

useSeoMeta({
  title: 'Send a File Between Your Devices — Direct, No Upload',
  description: 'Open this page on two devices on the same network and they find each other. The file goes straight from one to the other and is never uploaded. Free, no sign-up, open source.',
  ogTitle: 'Send to Device — your devices find each other',
  ogDescription: 'Phone to laptop and back, directly across your own network. No upload, no account, no expiring link.',
  ogUrl: `${siteUrl}/tools/${meta.slug}`,
  twitterCard: 'summary_large_image',
})

defineOgImage('Default', {
  title: 'Send to Device',
  description: meta.tagline,
})

const howToSteps = [
  { title: 'Open this page on both devices', body: 'Any two devices with a modern browser, on the same network. Each gives itself a short nickname so you can tell them apart.' },
  { title: 'Wait a moment for them to see each other', body: 'They appear under "Devices on your network" by themselves. There is nothing to scan, pair or type.' },
  { title: 'Choose a file, then tap the device you want', body: 'The other device is asked whether it wants the file, and is shown the name and size before it answers.' },
  { title: 'Once it accepts, the file moves', body: 'The two devices connect directly and the file crosses your own network at its full speed. Nothing is uploaded on the way.' },
]

useToolJsonLd(meta, {
  description: meta.description,
  featureList: [
    'Devices on the same network find each other automatically',
    'The file travels directly between devices and is never uploaded',
    'The receiving device must accept before anything is sent',
    'No account, no pairing code, no expiring link',
    'No size limit imposed by us',
  ],
  howTo: { name: 'How to send a file between your devices', steps: howToSteps.map(s => ({ name: s.title, text: s.body })) },
})

const faq = [
  { q: 'Does my file get uploaded to your server?', a: 'No. The two devices open a direct connection to each other and the file travels over that connection across your own network. There is no server in that path that could hold it, which is also why we cannot offer a download link or a "resume later" — no copy exists anywhere but on your two devices.' },
  { q: 'Then what does reach your server?', a: 'Enough to introduce the two devices, and nothing more. Each device tells us it is present, sends the nickname you can see on screen, and sends the technical details two browsers need to find one another. We also see the public address your network uses, because that is how we work out which devices are on the same network — it is hashed before it is used and never written down. The file, its name and its contents never reach us.' },
  { q: 'Why do you need a server at all? LocalSend does not.', a: 'LocalSend is a native app, so it can broadcast on your local network and listen on a port to be found. A web page is not allowed to do either — no browser gives a page access to UDP or lets it open a port, because that is exactly what the sandbox exists to prevent. So a page cannot discover anything by itself, and something has to introduce the two devices. Every browser-based equivalent works this way, including ShareDrop, which uses Google Firebase for it.' },
  { q: 'Do you keep any of it?', a: 'Nothing. The switchboard has no database and never writes to storage — it holds connections in memory and forgets them entirely when they close. Which devices are present is not even known to the server: each device announces itself and the others answer directly, so the list you see was assembled by your own browser.' },
  { q: 'Can someone send me a file without my agreeing?', a: 'No. Every transfer asks first, and you see the sender\'s nickname, the file name and the size before you decide. Nothing is sent until you accept, and dismissing the prompt counts as declining. This matters because devices are grouped by network: on a home network that is your own devices, but on a large office or public network other people can appear in the list, which is exactly why nothing is ever accepted for you.' },
  { q: 'What is the size limit?', a: 'None from us, because we never touch the file. In practice the limit is the receiving device\'s memory — the file is reassembled in the browser before you save it, so something in the tens of gigabytes may struggle on a phone. Over a decent network the transfer runs at network speed, far quicker than uploading somewhere and downloading again.' },
  { q: 'Is the transfer encrypted?', a: 'Yes. The connection uses DTLS, the same family of encryption as HTTPS, and the keys are agreed between the two devices themselves. Someone watching your network sees an encrypted stream between two devices and not its contents. The introduction travels over an encrypted connection too.' },
  { q: 'Can I send to a device on another network?', a: 'No, and that is deliberate. The connection is configured with no STUN or TURN servers at all, so your browser only ever offers the addresses it holds on the local network. There is no relay a file could pass through, which is what keeps the file on your own network even though the introduction did not stay there. Both devices have to be on the same one.' },
  { q: 'My other device is not showing up.', a: 'Both devices need to be on the same network, and some networks stop devices talking to each other at all. Guest, hotel and public WiFi commonly enable client isolation, which is sensible on a network full of strangers and defeats this completely. A home network or a phone hotspot will work. A VPN on one of the devices will also usually hide it, because it changes which network that device appears to be on.' },
  { q: 'How is this different from AirDrop?', a: 'AirDrop is better when both devices are Apple ones — it is built in, needs no page open, and asks nothing of the network. This works between anything with a modern browser: a phone to a Windows laptop, an Android to a Mac, a work machine you cannot install software on. It is the fallback for when the built-in option does not cover both ends.' },
]
const contents = [
  { id: 'howto-heading', label: 'How to use it' },
  { id: 'direct-heading', label: 'Never uploaded' },
  { id: 'introduce-heading', label: 'How discovery works' },
  { id: 'faq-heading', label: 'Questions' },
  { id: 'promise', label: 'The Zeal Promise' },
]
</script>

<template>
  <div class="container-page py-10">
    <ToolPageHeader
      title="Send to Device"
      description="Open this page on two devices on the same network and they find each other. The file goes straight from one to the other — never uploaded, never stored, no account."
    />

    <ClientOnly>
      <SendToDeviceTool />
      <template #fallback>
        <div class="grid h-[320px] place-items-center rounded-2xl border border-border text-sm text-muted-foreground">
          Loading…
        </div>
      </template>
    </ClientOnly>

    <section class="mt-12 flex flex-wrap gap-2 text-sm" aria-label="Related tools">
      <NuxtLink to="/tools/qr-code-generator/wifi" class="rounded-full border border-border px-4 py-1.5 transition-colors hover:border-primary/40 hover:text-primary">
        WiFi QR code →
      </NuxtLink>
      <NuxtLink to="/tools/background-remover" class="rounded-full border border-border px-4 py-1.5 transition-colors hover:border-primary/40 hover:text-primary">
        Background remover →
      </NuxtLink>
    </section>

    <ToolContents :items="contents">
      <section aria-labelledby="howto-heading" class="rounded-2xl bg-muted/50 p-6 sm:p-8">
        <h2 id="howto-heading" class="text-xl font-semibold">
          How to send a file between your devices
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

      <section aria-labelledby="direct-heading" class="rounded-2xl bg-muted/50 p-6 sm:p-8">
        <h2 id="direct-heading" class="text-xl font-semibold">
          The file never goes up and comes back down
        </h2>
        <div class="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground">
          <p>
            The usual way to get a photo off a phone is to send it somewhere else first. Mail it to
            yourself, drop it in cloud storage, paste it into a chat with yourself, upload it to a
            file-sharing site that gives you a link. Every one of those routes takes the same shape: the
            file climbs all the way out to a server and then comes all the way back down to a machine
            sitting on the same desk.
          </p>
          <p>
            <strong class="text-foreground">That round trip is the slow part, and it is the part that
              creates a copy you did not ask for.</strong> The upload runs at your connection's upload
            speed, which on most home lines is several times slower than the download — and when it
            finishes, your file is sitting on somebody else's disk, subject to their retention policy,
            their breach history, and whatever their terms say about scanning it.
          </p>
          <p>
            This tool takes the short way. The two devices connect directly to each other and the bytes
            cross your router and nothing else. It is faster because a local network is faster than the
            internet, and there is no third machine holding a copy afterwards.
          </p>
        </div>
      </section>

      <section aria-labelledby="introduce-heading" class="rounded-2xl bg-muted/50 p-6 sm:p-8">
        <h2 id="introduce-heading" class="text-xl font-semibold">
          How your devices find each other, and what that costs you
        </h2>
        <div class="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground">
          <p>
            Two browsers that have never met cannot simply start talking. Each has to learn where the
            other can be reached and agree on keys to encrypt what follows, and neither can guess the
            other's. A native app like LocalSend solves this by shouting on the local network and
            listening on a port. <strong class="text-foreground">A web page is allowed to do
              neither</strong> — no browser gives a page raw network access, because preventing exactly
            that is what the sandbox is for.
          </p>
          <p>
            So something has to make the introduction, and being straight about it matters more than the
            marketing would like: <strong class="text-foreground">your devices announce themselves to
              us.</strong> What reaches our server is that a device is present, the nickname it shows on
            screen, a hashed form of your network's public address, and the technical details the two
            browsers need to locate each other. The address is used only to work out which devices share a
            network, and none of it is written anywhere — the switchboard holds connections in memory and
            forgets them when they close.
          </p>
          <p>
            <strong class="text-foreground">What never reaches us is the file.</strong> Once the
            introduction is done the devices connect directly, and the connection is built with no STUN or
            TURN servers at all — so the only addresses either browser can offer are the ones it holds on
            your local network. There is no relay for a file to travel through even in principle. That is
            also why both devices must be on the same network: the guarantee and the limitation are the
            same decision.
          </p>
        </div>
      </section>

      <FaqSection :items="faq" class="rounded-2xl bg-muted/50 p-6 sm:p-8" />

      <ZealPromise />
    </ToolContents>
  </div>
</template>
