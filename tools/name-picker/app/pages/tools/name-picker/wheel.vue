<script setup lang="ts">
import meta from '../../../../meta'

const { public: { siteUrl } } = useRuntimeConfig()

useSeoMeta({
  title: 'Wheel of Names — Free Online Picker Wheel, No Sign-Up',
  description: 'A free wheel of names you can use straight away. Type your list, spin the picker wheel, get one answer. Nothing to install, no account, and your names stay in your browser.',
  ogTitle: 'Wheel of Names — decide it in five seconds',
  ogDescription: 'A free spinner wheel for names, options and decisions. Spin it, and the answer is drawn fairly. No sign-up, nothing uploaded.',
  ogUrl: `${siteUrl}/tools/${meta.slug}/wheel`,
  twitterCard: 'summary_large_image',
})

defineOgImage('Default', { title: 'Wheel of Names', description: 'A free spinner wheel for names, options and decisions.' })

useToolJsonLd(meta, {
  variant: 'wheel',
  name: 'Wheel of Names',
  description: 'A free spinning wheel of names and options. Type your list, click the picker wheel, get one answer. No sign-up, and your list stays in your browser.',
  featureList: ['Spinning wheel with one slice per option', 'Works on a projector, laptop or phone', 'Nothing installed and nothing uploaded', 'Weighted slices for uneven odds'],
})

const contents = [
  { id: 'why-heading', label: 'Why a wheel' },
  { id: 'faq-heading', label: 'Questions' },
  { id: 'promise', label: 'The Zeal Promise' },
]

const faq = [
  { q: 'How do I spin it?', a: 'Click the wheel, or tab to it and press space. It turns for about five seconds and stops on one slice. That slice is the answer — it was drawn the instant you clicked, and the spin is there so everyone in the room watches the same thing happen at the same time.' },
  { q: 'Can I put options on it instead of names?', a: 'Yes, and it is one of the better uses for it. Lunch spots, which bug to pick up, who buys the coffee, which board game. Anything that goes on a line goes on the wheel, and a group that has been going round in circles for ten minutes will usually accept a wheel without arguing.' },
  { q: 'Can I make some slices bigger than others?', a: 'Put ×3 after an option and it takes three slices. Useful for weighting a decision that is not meant to be an even coin flip — a shortlist where one candidate is the favourite, or a chore rota where somebody owes a couple of turns.' },
  { q: 'Does it work on a projector or a big screen?', a: 'Yes. The wheel scales to whatever space it has and the winner appears underneath in large type. It works from a phone too, which is how it usually gets used at a table rather than in a meeting room.' },
  { q: 'Will it pick the same thing twice?', a: 'It can, unless you tell it not to. Each spin is an independent draw, so a genuinely random wheel will occasionally land on the same slice twice running — that is what random looks like, not a bug. If you want every spin to give something new, tick "take the winner off the wheel".' },
  { q: 'Is this the same as a picker wheel or a wheel spinner?', a: 'Yes — wheel of names, name wheel, picker wheel, wheel spinner, random wheel and decision wheel are all the same idea, and this does the job of any of them. Put names, options, chores, restaurants or prizes on it, spin, and take the one it lands on. The only differences between the tools that go by those names are what they ask of you first; this one asks for nothing at all.' },
  { q: 'Is the spin rigged towards anything?', a: 'No, and the way it is built rules out the usual ways that happens by accident. The winner is chosen by the browser\'s cryptographic random number generator before the wheel moves, using a technique that discards values which would favour the start of the list. Where you clicked, how fast you clicked, and how the animation eases all have no input.' },
]
</script>

<template>
  <div class="container-page py-10">
    <ToolPageHeader
      title="Wheel of Names"
      description="Type your names or options, spin the wheel, get one answer. Nothing to install, no account, and your list stays in this browser."
    />

    <ClientOnly>
      <NamePickerTool />
      <template #fallback>
        <div class="grid tool-frame place-items-center rounded-2xl border border-border text-sm text-muted-foreground">
          Loading the wheel…
        </div>
      </template>
    </ClientOnly>

    <ToolContents :items="contents">
      <section aria-labelledby="why-heading" class="rounded-2xl bg-muted/50 p-6 sm:p-8">
        <h2 id="why-heading" class="text-xl font-semibold">
          Why a wheel beats picking a number
        </h2>
        <div class="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground">
          <p>A random number and a spinning wheel give exactly the same answer, and they are not the same tool. The difference is that everyone watches the wheel. A number that appears on screen is something one person made happen; a wheel that slows down over five seconds in front of the room is something the room saw. When the point of drawing lots is to settle an argument, being watched is most of the job.</p>
          <p><strong class="text-foreground">This is also why the deceleration is long.</strong> A wheel that snaps to its answer is just a number with extra steps. A wheel that is quick at first and then creeps the last few degrees between two slices makes a close result worth watching, and it is the reason nobody asks whether the wheel was fair — they were looking at it the whole time.</p>
          <p>The other half is that a wheel shows the odds. A hundred names in a text box are a hundred names; a hundred names on a wheel are visibly a hundred equal chances. And if someone has three slices because they earned three entries, everyone can see it without being told. That is much harder to argue with than a claim about what a program did.</p>
          <p>What a wheel does not give you is a record. If you need to prove afterwards who won and when, screenshot the list of draws beside the wheel — or use something built for prize compliance. This is a tool for settling things in the room, not for satisfying a regulator.</p>
        </div>
      </section>

      <FaqSection :items="faq" class="rounded-2xl bg-muted/50 p-6 sm:p-8" />

      <ZealPromise />
    </ToolContents>
  </div>
</template>
