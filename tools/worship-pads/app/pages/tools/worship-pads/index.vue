<script setup lang="ts">
import meta from '../../../../meta'

const { public: { siteUrl } } = useRuntimeConfig()
const pageUrl = `${siteUrl}/tools/${meta.slug}`

useSeoMeta({
  title: 'Worship Pads — Ambient Pads in Every Key, Free',
  description: 'Sustained ambient pads in any key, generated live in your browser. Nothing to download, nothing to buffer. Switch key with one keypress. Free, no sign-up, open source.',
  ogTitle: 'Worship Pads — ambient pads in every key',
  ogDescription: 'Pads generated live in the browser. No downloads, no buffering, one keypress per key change.',
  ogImage: `${siteUrl}/og.png`,
  ogUrl: pageUrl,
  twitterCard: 'summary_large_image',
})

const faq = [
  { q: 'Do I need to download anything?', a: 'No. The pads are synthesised in your browser using the Web Audio API rather than streamed from a file, so there is nothing to download, nothing to buffer and nothing to run out of. That also means it keeps working if the wifi at your venue does not.' },
  { q: 'How do I change key mid-set?', a: 'Press the number or letter shown on the key you want. The new pad fades in while the old one fades out, so there is never a gap. Every key has a single-character shortcut, so you can change without looking at the screen.' },
  { q: 'What is the crossfade for?', a: 'It sets how long one key takes to become the next. A long crossfade hides the change; a short one is more decisive. Four seconds suits most transitions between songs, and you can go up to twelve if you want the change to be genuinely invisible.' },
  { q: 'Why does the pad sound thin compared to the ones I bought?', a: 'This is a synthesised pad, not a recorded one. It is six detuned oscillator pairs through a lowpass filter, deliberately simple so it sits under a band rather than competing with it. If you want lush recorded textures, buy them — this is for the times you need something usable immediately and free.' },
  { q: 'Can I use it in a service or a stream?', a: 'Yes. Everything here is MIT licensed and there is no watermark, no attribution requirement and no rights holder to clear. Route your laptop output to the desk as you would any other source.' },
  { q: 'Does it work on a phone or tablet?', a: 'Yes, though you have to tap a key rather than use a keyboard shortcut. Browsers require a tap before any audio can start, which is why the first key press is what actually starts the sound.' },
  { q: 'Why do major and minor sound so similar?', a: 'Only the third changes, and the pad deliberately keeps it quiet. A pad sits underneath whatever the band is playing, so the more strongly it asserts a third, the more often it clashes with a passing chord. If you are unsure, major is the safer choice.' },
  { q: 'Is there a version that works offline?', a: 'It already does. Once the page has loaded, everything runs locally — no requests are made while you play. Load the page before the service and you can safely disconnect.' },
]
</script>

<template>
  <div class="container-page py-10">
    <ToolPageHeader
      title="Worship Pads"
      description="Sustained ambient pads in every key, generated live in your browser. Nothing to download, nothing to buffer, one keypress per change."
    />

    <ClientOnly>
      <WorshipPadsTool />
      <template #fallback>
        <div class="grid h-[620px] place-items-center rounded-2xl border border-border text-sm text-muted-foreground sm:h-[560px]">
          Loading the pads…
        </div>
      </template>
    </ClientOnly>

    <section class="mt-12 flex flex-wrap gap-2 text-sm" aria-label="Related tools">
      <NuxtLink to="/tools/chord-transposer" class="rounded-full border border-border px-4 py-1.5 transition-colors hover:border-primary/40 hover:text-primary">
        Chord transposer →
      </NuxtLink>
      <NuxtLink to="/tools/stage-timer" class="rounded-full border border-border px-4 py-1.5 transition-colors hover:border-primary/40 hover:text-primary">
        Stage timer →
      </NuxtLink>
    </section>

    <div class="mx-auto mt-16 space-y-12">
      <section aria-labelledby="use-heading" class="rounded-2xl bg-muted/50 p-6 sm:p-8">
        <h2 id="use-heading" class="text-xl font-semibold">
          Using pads without getting in the way
        </h2>
        <div class="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground">
          <p>
            A pad is a sustained chord that sits underneath everything else. Its job is to remove silence —
            the gap between a song ending and someone starting to speak, the moment while a band changes
            key, the space under a prayer. Done well nobody notices it at all, which is the entire measure
            of success.
          </p>
          <p>
            <strong class="text-foreground">Set the level once, low.</strong> A pad that people can
            identify is too loud. It should be felt more than heard — if someone can hum along to it, pull
            it down. Set the volume here rather than on the desk so the balance survives being unplugged
            and plugged back in.
          </p>
          <p>
            <strong class="text-foreground">Change key before the band does, not after.</strong> Start the
            crossfade a bar or two early. Because the new pad rises while the old one falls, the two
            overlap harmonically for a moment, and that overlap is what makes the change sound intentional
            rather than like a mistake being corrected.
          </p>
          <p>
            <strong class="text-foreground">Match the key, not the chord.</strong> Pads follow the key of
            the song, not each chord within it. Switching pad on every chord change produces mud. If a song
            genuinely modulates, change then — otherwise leave it alone for the whole song.
          </p>
          <p>
            <strong class="text-foreground">Learn the shortcuts.</strong> Every key has a single character:
            1 through 0 then a and b, running C upward. During a service you want to change key without
            looking down, and a keyboard shortcut is far more reliable than finding a small button on a
            trackpad in a dark room. Space or Escape stops everything.
          </p>
          <p>
            One honest note on what this is: the sound is synthesised from oscillators rather than sampled
            from real instruments, so it is cleaner and plainer than a commercial pad library. That is a
            deliberate trade. It means the whole thing loads instantly, works with no network, costs
            nothing, and can be audited — and for filling a gap under a spoken word, plain is usually
            exactly what you want.
          </p>
        </div>
      </section>

      <FaqSection :items="faq" class="rounded-2xl bg-muted/50 p-6 sm:p-8" />

      <ZealPromise />
    </div>
  </div>
</template>
