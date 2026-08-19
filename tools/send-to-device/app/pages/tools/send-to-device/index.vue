<script setup lang="ts">
import meta from '../../../../meta'

const { public: { siteUrl } } = useRuntimeConfig()

useSeoMeta({
  title: 'Send a File Between Your Devices — Direct Over WiFi, No Upload',
  description: 'Move a file from your phone to your laptop, or back, straight across your own WiFi. Nothing is uploaded, there is no account and no size limit from us. Free, open source.',
  ogTitle: 'Send to Device — straight across your own WiFi',
  ogDescription: 'Phone to laptop and back, directly over your network. No upload, no account, no expiry link.',
  ogUrl: `${siteUrl}/tools/${meta.slug}`,
  twitterCard: 'summary_large_image',
})

defineOgImage('Default', {
  title: 'Send to Device',
  description: meta.tagline,
})

const howToSteps = [
  { title: 'On the device that will receive, choose "Receive a file"', body: 'It shows a code. This is usually the laptop, because it is the easier place to save a file once it arrives.' },
  { title: 'Point the other device\'s camera at that code', body: 'The normal camera app is enough — the code is an ordinary link, so it just opens this page on that device. Nothing to install and no permission to grant.' },
  { title: 'Pick the file to send', body: 'That device then shows a code of its own. This is the reply that finishes the introduction between the two.' },
  { title: 'Show that second code back to the first device', body: 'Use its camera, or paste the code across if it has none. The two connect directly and the file starts moving.' },
]

useToolJsonLd(meta, {
  description: meta.description,
  featureList: [
    'File travels directly between your devices over your own network',
    'Nothing is uploaded and no copy is kept anywhere',
    'No account, no pairing code to register, no expiring link',
    'No size limit imposed by us',
    'Works between any two devices with a modern browser',
  ],
  howTo: { name: 'How to send a file between your devices', steps: howToSteps.map(s => ({ name: s.title, text: s.body })) },
})

const faq = [
  { q: 'Does my file get uploaded to your server?', a: 'No, and this is not a policy — it is how the tool is built. The two devices open a direct connection to each other and the bytes travel over that connection across your own network. There is no server in the path that could hold the file, which is also why we cannot offer a "resume later" or a download link: nothing exists anywhere except on your two devices.' },
  { q: 'What is the size limit?', a: 'None from us, because we never touch the file. In practice the limit is patience and the receiving device\'s memory — the file is reassembled in the browser before you save it, so something in the tens of gigabytes may struggle on a phone. Over a decent WiFi network the transfer runs at network speed, which is usually far quicker than uploading somewhere and downloading again.' },
  { q: 'Why do I have to scan two codes?', a: 'Because introducing two devices takes a word from each of them. The first code carries an invitation that describes how to reach this device; the reply carries the same information back the other way, plus the keys that encrypt the connection. Neither side can guess the other\'s, so both have to travel. The first leg is a plain link, so a normal camera app handles it — only the reply needs reading back.' },
  { q: 'It says the devices could not reach each other. Why?', a: 'Almost always because the network will not let them. Public, hotel and guest WiFi commonly enable client isolation, which stops devices on the same network from talking to each other at all — it is a sensible default for a network full of strangers, and it defeats this tool completely. A home network or a phone hotspot will work. The two devices also have to be on the same network: this cannot reach across the internet, by design.' },
  { q: 'Is the transfer encrypted?', a: 'Yes. The connection uses DTLS, the same family of encryption as HTTPS, and the keys are exchanged in the two codes rather than through any server. Someone watching your WiFi sees an encrypted stream between two devices and not the contents.' },
  { q: 'Do you use a relay or a STUN server?', a: 'Neither, deliberately. The connection is configured with no ICE servers at all, so your browser only ever offers the addresses your device holds on the local network. That means no third party is asked where you are, and there is no relay the file could pass through. The cost of that choice is the honest one: it only works between devices on the same network.' },
  { q: 'Can I send to someone else, not my own device?', a: 'If you are in the same room and on the same network, yes — the tool does not know or care whose devices they are. Across the internet, no. That is a different tool with different problems: it would need servers to relay the bytes, which means storing other people\'s files, which without a sign-up is an abuse magnet. We would rather do the local case properly.' },
  { q: 'Why does my browser not offer to use the camera?', a: 'Reading a code needs a QR decoder, and Safari and Firefox do not yet provide the one built into the browser that Chrome and Edge do. Rather than make everyone download a decoding library for one step, the tool falls back to pasting the code across — every screen that asks for a scan also accepts a paste. The sending device never needs a scanner at all, because the invitation is an ordinary link its camera app already understands.' },
  { q: 'Does anything stay behind afterwards?', a: 'No. The connection closes when you leave the page and nothing is written to storage on either device beyond the file you chose to save. Reload and there is no history, no list of past transfers and nothing to clear.' },
  { q: 'How is this different from AirDrop?', a: 'AirDrop is better when both devices are Apple ones — it is built in and needs no codes. This works between anything with a modern browser, so a phone to a Windows laptop, an Android to a Mac, a work machine you cannot install software on. It is the fallback for when the built-in option does not cover both ends.' },
]
</script>

<template>
  <div class="container-page py-10">
    <ToolPageHeader
      title="Send to Device"
      description="Move a file between your own devices over your WiFi. It goes straight from one to the other — never uploaded, never stored, no account."
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

    <div class="mx-auto mt-16 space-y-12">
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
            This tool takes the short way. The two devices find each other on the network they are both
            already on, open an encrypted connection directly between themselves, and the bytes cross
            your router and nothing else. It is faster because a local network is faster than the
            internet, and it is private because there is no third machine involved to be private
            <em>from</em>.
          </p>
        </div>
      </section>

      <section aria-labelledby="how-heading" class="rounded-2xl bg-muted/50 p-6 sm:p-8">
        <h2 id="how-heading" class="text-xl font-semibold">
          Why two codes, and what is in them
        </h2>
        <div class="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground">
          <p>
            Two devices that have never met cannot simply start talking. Each has to learn where the other
            can be reached and agree on keys to encrypt what follows. Normally a signalling server sits in
            the middle and passes those introductions along — which works, and which means a server that
            knows both devices exist and when they connected.
          </p>
          <p>
            <strong class="text-foreground">The codes replace that server with your eyes.</strong> The
            first one contains this device's addresses on the local network and its half of the encryption
            handshake, wrapped in an ordinary link so a camera app can open it. The second carries the
            same in reverse. Once both halves have crossed, the devices connect to each other directly and
            the codes are worthless — they describe a connection that already exists.
          </p>
          <p>
            One detail is worth stating plainly, because it decides what this tool can and cannot do. The
            connection is set up with no STUN or TURN servers whatsoever, so your browser only ever
            advertises addresses on your local network. Nothing asks a third party what your public
            address is, and no relay exists that could carry the file. The price is that both devices must
            be on the same network — this cannot reach across the internet, and that limitation is the
            same decision as the privacy guarantee, not a separate shortcoming.
          </p>
        </div>
      </section>

      <FaqSection :items="faq" class="rounded-2xl bg-muted/50 p-6 sm:p-8" />

      <ZealPromise />
    </div>
  </div>
</template>
