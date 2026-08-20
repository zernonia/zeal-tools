<script setup lang="ts">
import meta from '../../../../meta'

const { public: { siteUrl } } = useRuntimeConfig()

useSeoMeta({
  title: 'Raffle Winner Picker — Free Random Draw for Giveaways',
  description: 'Draw raffle and giveaway winners from a list. Weighted entries, multiple winners drawn without repeats, and a real cryptographic draw. Free, no sign-up, and the entrant list stays in your browser.',
  ogTitle: 'Raffle Winner Picker — a draw you can explain',
  ogDescription: 'Pick giveaway winners fairly: weighted entries, several winners, no repeats, nothing uploaded.',
  ogUrl: `${siteUrl}/tools/${meta.slug}/raffle`,
  twitterCard: 'summary_large_image',
})

defineOgImage('Default', { title: 'Raffle Winner Picker', description: 'Draw giveaway winners fairly — weighted entries, no repeats, nothing uploaded.' })

useToolJsonLd(meta, {
  variant: 'raffle',
  name: 'Raffle Winner Picker',
  description: 'Draw raffle and giveaway winners from a list of entrants. Weighted entries, several winners without repeats, and a cryptographic draw. Free and nothing is uploaded.',
  featureList: ['Draw several winners with no repeats', 'Weighted entries for earned extra chances', 'Cryptographic draw, not Math.random', 'The entrant list never leaves your browser'],
})

const contents = [
  { id: 'run-heading', label: 'Running the draw' },
  { id: 'faq-heading', label: 'Questions' },
  { id: 'promise', label: 'The Zeal Promise' },
]

const faq = [
  { q: 'How do I draw more than one winner?', a: 'Tick "take the winner off the wheel", then spin once per prize. Each winner is removed before the next spin, so nobody can win twice, and the draws build up in order beside the wheel — first spin at the bottom, most recent at the top. Copy that list when you are done; it is your record of the order things were drawn in.' },
  { q: 'Someone earned five entries. How do I handle that?', a: 'Write ×5 after their name rather than pasting them five times. The maths is identical and the wheel stays readable — their slice is simply five times the size, which is also the clearest possible way to show everyone else that the extra entries are there.' },
  { q: 'How do I import entrants from a spreadsheet?', a: 'Copy the column and paste it in. One name per line is exactly what a pasted spreadsheet column looks like, and blank rows are ignored. If your export is comma separated, paste it and replace the commas with line breaks — or use the API endpoint, which accepts commas directly.' },
  { q: 'What about duplicate entries I did not intend?', a: 'They are real extra chances, so check for them. The count beside the box tells you how many entries the wheel has, which you can compare against your own total, and there is a "remove duplicates" button that keeps the first occurrence of each name. Do that before you draw, not after.' },
  { q: 'Can I prove the draw was fair afterwards?', a: 'Honestly: not to a regulator. There is no certificate, no signed log and no third party attesting to anything, because that would need an account and a server, and this tool has neither. What you can do is show your working — publish the entrant list beforehand, record the screen while you draw, and keep the list of winners in order. For most giveaways that is what people expect. For a promotion with legal requirements, use a licensed service.' },
  { q: 'Do the entrant names get uploaded anywhere?', a: 'No. The draw happens in the page. The list is kept in this browser so you do not lose it if you close the tab, and you can erase that copy from the tool. If you are drawing for something sensitive, note that the list sitting in your browser is the only copy — nothing is backed up.' },
  { q: 'How many entrants can it handle?', a: 'Five hundred on the wheel. Beyond about sixty the slices are too thin to fit a name so the wheel shows colour alone, with the full list readable beside it. For a draw from thousands of entrants, the API endpoint takes the list and returns the winners without needing to draw a wheel at all.' },
  { q: 'Is a wheel the right way to run a big giveaway?', a: 'For picking the winners, yes — the draw is sound at any size. For running the giveaway, no: collecting entries, checking eligibility, and contacting winners are the hard parts, and this does none of them. It is the last five seconds of the process, done properly and in public.' },
]
</script>

<template>
  <div class="container-page py-10">
    <ToolPageHeader
      title="Raffle Winner Picker"
      description="Paste the entrants, weight anyone who earned extra chances, and draw as many winners as you have prizes — without repeats, and without the list leaving your browser."
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
      <section aria-labelledby="run-heading" class="rounded-2xl bg-muted/50 p-6 sm:p-8">
        <h2 id="run-heading" class="text-xl font-semibold">
          Running a draw people will accept
        </h2>
        <div class="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground">
          <p><strong class="text-foreground">Publish the entrant list before you draw, not after.</strong> This is the single thing that separates a draw people believe from one they do not, and it costs nothing. A list posted in advance cannot be edited to suit the result; a list posted afterwards has to be taken on trust. Screenshot the wheel with the entry count visible and the entrants readable beside it.</p>
          <p><strong class="text-foreground">Fix the list before the first spin.</strong> Remove duplicates, check the count against your own total, and settle any weighted entries. Once you have drawn, changing the list means starting again — and a draw that got re-run because somebody spotted a problem afterwards is the draw everyone remembers.</p>
          <p><strong class="text-foreground">Draw every prize in one sitting, in order.</strong> With the winner removed after each spin, the sequence beside the wheel is a record of the order — first prize, second, third. Copy it out when you finish. If a winner turns out to be ineligible, drawing a replacement from the reduced wheel is the defensible move; going back and re-running the whole thing is not.</p>
          <p>What this tool deliberately does not do is collect entries or hold your entrant list on a server. That is not an oversight — an anonymous, sign-up-free service holding lists of people's names and handles is a liability with no upside. The list is yours, it stays on your machine, and the draw happens in front of you.</p>
        </div>
      </section>

      <FaqSection :items="faq" class="rounded-2xl bg-muted/50 p-6 sm:p-8" />

      <ZealPromise />
    </ToolContents>
  </div>
</template>
