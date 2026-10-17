<script setup lang="ts">
import meta from '../../../../meta'

const { public: { siteUrl } } = useRuntimeConfig()

useSeoMeta({
  title: 'Worship Practice Tracks — Make Rehearsal Stems from Any Song, Free',
  description: 'Turn any worship song into rehearsal tracks for your team: mute the parts your musicians play live and download the rest as WAV. Runs in your browser, nothing is uploaded. Free, no sign-up, no subscription.',
  ogTitle: 'Worship Practice Tracks — rehearsal stems for your team, free',
  ogDescription: 'Separate a worship song into vocals, drums, bass and the rest, then mute what your team plays live. Runs in your browser.',
  ogUrl: `${siteUrl}/tools/${meta.slug}/worship-practice-tracks`,
  twitterCard: 'summary_large_image',
})

defineOgImage('Default', { title: 'Worship Practice Tracks', description: 'Rehearsal stems for your worship team, from any song — free, in your browser.' })

useToolJsonLd(meta, {
  variant: 'worship-practice-tracks',
  name: 'Worship Practice Tracks',
  description: 'Separate a worship song into vocals, drums, bass and other — or six stems with guitar and piano — so each musician can rehearse with the original recording minus their own part. Runs in the browser.',
  featureList: [
    'Practice tracks from the original recording',
    'Mute, solo and rebalance each stem',
    'Six stems with guitar and piano (beta)',
    'Runs in the browser — no upload, no subscription',
  ],
  howTo: {
    name: 'How to make a worship practice track',
    steps: [
      { name: 'Choose the stems', text: 'Pick four stems, or six if your team needs guitar and piano on their own.' },
      { name: 'Drop the song in', text: 'Drop the recording your team is learning. It is separated on your own machine and never uploaded.' },
      { name: 'Mute what you will play live', text: 'Switch off the stems your musicians cover, or turn them down to keep a quiet guide.' },
      { name: 'Download and share with the team', text: 'Save the mix you hear as a WAV, or every stem as a zip for each musician to build their own.' },
    ],
  },
})

const contents = [
  { id: 'why-heading', label: 'Why practice tracks' },
  { id: 'roles-heading', label: 'A track for each musician' },
  { id: 'week-heading', label: 'A rehearsal week' },
  { id: 'faq-heading', label: 'Questions' },
  { id: 'promise', label: 'The Zeal Promise' },
]

const faq = [
  { q: 'Is this a replacement for paid multitracks?', a: 'For rehearsal, often yes; for Sunday, not quite. Official multitracks are the actual studio stems, split many ways, with click and cues. These are separated from the finished recording, so there is some bleed between stems and fewer of them. They are made for learning parts at home, which is where most teams cannot justify a per-song purchase.' },
  { q: 'Can I play these stems in the service as tracks?', a: 'You can, but think about two things first. Quality: a separated stem has a little bleed that a practice session hides and a PA reveals. Rights: a church licence to sing a song and project its lyrics usually does not cover playing the recording itself, which is a separate right. Check what your licence includes.' },
  { q: 'Which stems will I get?', a: 'Four stems gives vocals, drums, bass and other — other being keys, guitars, pads and strings together. Six stems adds guitar and piano as their own tracks. Six is marked beta: dense worship mixes, with delay-heavy electric guitar and layered pads, are the hardest case for it, and some guitar or keys can stay in "other".' },
  { q: 'Can I change the key to suit our worship leader?', a: 'Not in this tool. Pitch-shifting a full mix well is a hard problem of its own, and a poor one ruins the track. Download the WAV and shift it in a DAW or a practice app. For your chord charts, the chord transposer moves them to any key, with a capo suggestion.' },
  { q: 'How do I share the tracks with the team?', a: 'Download the stems as a zip, or the mixes you want, and send them through whatever your team already uses — a shared drive or your planning software. Nothing is hosted here, by design: there are no accounts, so there is nowhere for us to keep them. Copying a commercial recording to the team is itself a use of that recording, and some church licensing schemes offer a rehearsal licence for exactly this; your own recordings need nothing.' },
  { q: 'Is the song uploaded?', a: 'No. The model runs in your browser, on your own computer. That also means it works on a church office laptop with nothing installed; a recent laptop with Chrome or Edge is fastest.' },
  { q: 'Does it cost anything?', a: 'No. There is no subscription, no per-song credit and no watermark, and there will not be. Small churches are exactly who those models price out.' },
]
</script>

<template>
  <div class="container-page py-10">
    <ToolPageHeader
      title="Worship Practice Tracks"
      description="Turn the recording your team is learning into rehearsal tracks — mute the parts your musicians play live and keep the rest of the band. Separated in your browser, free, with nothing uploaded."
    />

    <StemSplitterTool />

    <section class="mt-12 flex flex-wrap gap-2 text-sm" aria-label="Related pages">
      <NuxtLink to="/blog/free-tools-for-worship-teams" class="rounded-full border border-border px-4 py-1.5 transition-colors hover:border-primary/40 hover:text-primary">
        7 free tools for worship teams →
      </NuxtLink>
      <NuxtLink to="/tools/chord-transposer" class="rounded-full border border-border px-4 py-1.5 transition-colors hover:border-primary/40 hover:text-primary">
        Chord transposer →
      </NuxtLink>
      <NuxtLink to="/tools/worship-pads" class="rounded-full border border-border px-4 py-1.5 transition-colors hover:border-primary/40 hover:text-primary">
        Worship pads →
      </NuxtLink>
      <NuxtLink to="/tools/stage-timer" class="rounded-full border border-border px-4 py-1.5 transition-colors hover:border-primary/40 hover:text-primary">
        Stage timer →
      </NuxtLink>
    </section>

    <ToolContents :items="contents">
      <section aria-labelledby="why-heading" class="rounded-2xl bg-muted/50 p-6 sm:p-8">
        <h2 id="why-heading" class="text-xl font-semibold">
          Why your team should practise to the record
        </h2>
        <div class="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground">
          <p>
            Most worship teams rehearse once a week, often for an hour before a run-through, and that hour goes
            on the things only a full band can fix: transitions, dynamics, who comes in where. Learning the parts
            themselves has to happen at home, alone — and alone is where it goes wrong. Playing along to the
            original recording, your bass line is buried under the recorded one; you cannot tell whether you have
            it right until Thursday night.
          </p>
          <p>
            A practice track takes your part out and leaves everyone else's in. The bassist hears the drums,
            the keys and the vocal from the record, and an empty space where the bass was. Whatever they play
            in that space is exactly what the band will hear. It is how professional players prepare, and the
            stems that make it possible have usually been sold per song, by subscription.
          </p>
          <p>
            This page makes them from the recording itself. An AI model separates the song into its parts on
            your own computer — nothing is uploaded and nothing is charged — and you choose what to mute.
          </p>
        </div>
      </section>

      <section aria-labelledby="roles-heading" class="rounded-2xl bg-muted/50 p-6 sm:p-8">
        <h2 id="roles-heading" class="text-xl font-semibold">
          A track for each musician
        </h2>
        <div class="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground">
          <p>
            Split once, then save a different mix for each person. Every change is just a volume, so making
            five mixes takes seconds, not five separations.
          </p>
          <ul class="list-disc space-y-2 pl-5">
            <li><strong class="text-foreground">Drummer:</strong> "No drums". Keep the drum stem at around 15% while learning fills, then take it out.</li>
            <li><strong class="text-foreground">Bassist:</strong> mute the bass. Solo it first — hearing the bass alone shows which notes are actually played under each chord, which a chart rarely says.</li>
            <li><strong class="text-foreground">Worship leader and vocalists:</strong> "No vocals" for a backing track to sing over; "Vocals only" to learn harmonies, which are much easier to pick out without the band.</li>
            <li><strong class="text-foreground">Keys and guitar:</strong> with four stems these share "other", so turn it down rather than off. With six stems, mute guitar or piano directly — and expect some pad and ambient guitar to stay in "other".</li>
            <li><strong class="text-foreground">Sound team:</strong> the full set of stems is a good way to practise mixing a song you know, before you do it live.</li>
          </ul>
        </div>
      </section>

      <section aria-labelledby="week-heading" class="rounded-2xl bg-muted/50 p-6 sm:p-8">
        <h2 id="week-heading" class="text-xl font-semibold">
          A rehearsal week, with tracks
        </h2>
        <div class="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground">
          <p>
            <strong class="text-foreground">Early in the week:</strong> the worship leader picks the set, chooses
            the recording each song should follow, and decides the keys. If a key changes, transpose the chart
            with the chord transposer and tell the team which recording to learn the feel from.
          </p>
          <p>
            <strong class="text-foreground">Make and send the tracks:</strong> split each new song once, save
            each musician's mix, and share them in the place your team already plans services. For songs the
            team already knows, the full recording is usually enough.
          </p>
          <p>
            <strong class="text-foreground">During the week:</strong> everyone learns their part against the
            band they will actually be playing with. Arrangement questions — how long is the intro, who plays
            the turnaround — get answered by the record rather than in rehearsal.
          </p>
          <p>
            <strong class="text-foreground">At rehearsal:</strong> the time goes on transitions, dynamics and
            the moments a recording cannot plan for. A pad under the gaps between songs, from the worship pads,
            and a stage timer for the run-through keep the rest of the service on track.
          </p>
          <p>
            Use the best copy of the song you have. A purchased download separates more cleanly than audio ripped
            from a video, because compression throws away detail the model needs.
          </p>
        </div>
      </section>

      <FaqSection :items="faq" class="rounded-2xl bg-muted/50 p-6 sm:p-8" />

      <ZealPromise />
    </ToolContents>
  </div>
</template>
