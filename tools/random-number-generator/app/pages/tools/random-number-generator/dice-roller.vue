<script setup lang="ts">
import meta from '../../../../meta'

const { public: { siteUrl } } = useRuntimeConfig()
const pageUrl = `${siteUrl}/tools/${meta.slug}/dice-roller`

useSeoMeta({
  title: 'Dice Roller — d4 to d100, Notation like 2d6+3 and 4d6kh3',
  description: 'Roll virtual dice online: d4, d6, d8, d10, d12, d20 and d100 in one press, or type standard notation — 2d6+3, 4d6kh3, 2d20kl1 for disadvantage. See every die, the total and the range. Fair cryptographic rolls, free, no sign-up.',
  ogTitle: 'Dice Roller — full dice notation, every die shown',
  ogDescription: 'd4 to d100, 2d6+3, advantage, 4d6 drop lowest. Each die shown, rolled with cryptographic randomness.',
  ogUrl: pageUrl,
  twitterCard: 'summary_large_image',
})

defineOgImage('Default', { title: 'Dice Roller', description: 'd4 to d100 and full notation — 2d6+3, 4d6kh3, advantage.' })

useToolJsonLd(meta, {
  variant: 'dice-roller',
  name: 'Dice Roller',
  description: 'Roll virtual dice in standard notation — d20, 2d6+3, 4d6kh3, advantage and disadvantage — with every die shown and a cryptographically fair roll.',
  featureList: [
    'One-press d4, d6, d8, d10, d12, d20 and d100',
    'Standard notation: 2d6+3, 1d8+2d6-1, d%',
    'Keep highest or lowest: 4d6kh3, 2d20kh1, 2d20kl1',
    'Every die shown, dropped dice marked',
    'Lowest and highest possible total for any roll',
    'History of your last twenty rolls',
  ],
})

const NOTATION = [
  { code: 'd20', meaning: 'One twenty-sided die. The 1 in front is optional.' },
  { code: '3d6', meaning: 'Three six-sided dice, added together.' },
  { code: '2d6+3', meaning: 'Two d6, plus three. Use - to subtract.' },
  { code: '1d8+2d6', meaning: 'Different dice in one roll — a weapon and a bonus, say.' },
  { code: '4d6kh3', meaning: 'Roll four d6 and keep the highest three. k3 means the same.' },
  { code: '2d20kh1', meaning: 'Advantage: roll two d20 and keep the higher.' },
  { code: '2d20kl1', meaning: 'Disadvantage: roll two d20 and keep the lower.' },
  { code: 'd% or d100', meaning: 'Percentile, 1 to 100.' },
]

const faq = [
  { q: 'Are online dice fair?', a: 'These are, exactly. Each die is drawn from crypto.getRandomValues, your operating system\'s cryptographic random source, and turned into a face by rejection sampling: any draw that would land past the last face is thrown away and drawn again, so every face is precisely as likely as every other. The shortcut many rollers use, taking a remainder, makes the low faces of a d6 slightly more common.' },
  { q: 'Are physical dice fair?', a: 'Not entirely. Cheap dice with drilled pips are lighter on the six side, so it lands face up a little more often, and moulded d20s are commonly off-balance enough to show with a few hundred rolls — the reason players float dice in salt water to find the heavy side. Casino dice are precision-made for exactly this reason. A virtual die has no mass to be off.' },
  { q: 'How do I roll with advantage or disadvantage?', a: 'Press Advantage or Disadvantage under Common rolls, or type 2d20kh1 or 2d20kl1. Both dice are shown and the one that does not count is struck through, so everybody at the table can see what happened. Add your modifier on the end — 2d20kh1+5 — and it is added after the higher die is kept.' },
  { q: 'How do I roll ability scores?', a: 'Press Ability score, or type 4d6kh3: four six-sided dice with the lowest dropped. Press it six times, once per ability. Your last twenty rolls are listed underneath with every die, which makes it easy to show your working to the rest of the group.' },
  { q: 'What is the most likely total on 2d6?', a: 'Seven, at one roll in six. There are six ways to make seven from two dice and only one way each to make 2 or 12, which is why the totals cluster in the middle and why board games built on two dice treat 7 as special. A single d12 is the opposite: every number from 1 to 12 is equally likely, and you can never roll a 1 on 2d6.' },
  { q: 'What is the most I can roll at once?', a: 'Up to 100 dice in a group, dice from 2 to 1,000 sides, and up to twelve groups and modifiers in one expression. That covers a fireball\'s 8d6 with plenty to spare, and the 1d1000 tables some games use.' },
  { q: 'Do I need to install anything?', a: 'No. It runs in the browser on a phone, tablet or laptop, works offline once the page has loaded, and has no account. Settings, including the notation in the box, are kept in the page address, so a link to your group opens the same roll ready to go.' },
]

const contents = [
  { id: 'notation-heading', label: 'Dice notation' },
  { id: 'dice-fair-heading', label: 'Fair dice' },
  { id: 'dice-odds-heading', label: 'Reading the odds' },
  { id: 'faq-heading', label: 'Questions' },
  { id: 'promise', label: 'The Zeal Promise' },
]

const code = 'rounded bg-muted px-1.5 py-0.5 font-mono text-xs'
</script>

<template>
  <div class="container-page py-10">
    <ToolPageHeader
      title="Dice Roller"
      description="Roll any dice in one press or in standard notation — 2d6+3, 4d6kh3, advantage and disadvantage — with every die shown and a fair, cryptographic roll."
    />

    <RandomNumberGeneratorTool initial-mode="dice" />

    <section class="mt-12 flex flex-wrap gap-2 text-sm" aria-label="Related tools">
      <NuxtLink to="/tools/random-number-generator/flip-a-coin" class="rounded-full border border-border px-4 py-1.5 transition-colors hover:border-primary/40 hover:text-primary">
        Flip a coin →
      </NuxtLink>
      <NuxtLink to="/tools/random-number-generator" class="rounded-full border border-border px-4 py-1.5 transition-colors hover:border-primary/40 hover:text-primary">
        Random number generator →
      </NuxtLink>
      <NuxtLink to="/tools/name-picker/wheel" class="rounded-full border border-border px-4 py-1.5 transition-colors hover:border-primary/40 hover:text-primary">
        Spin the wheel →
      </NuxtLink>
    </section>

    <ToolContents :items="contents">
      <section aria-labelledby="notation-heading" class="rounded-2xl bg-muted/50 p-6 sm:p-8">
        <h2 id="notation-heading" class="text-xl font-semibold">
          Dice notation, in one table
        </h2>
        <p class="mt-4 text-sm leading-relaxed text-muted-foreground">
          The number before the <strong class="text-foreground">d</strong> is how many dice; the number after
          is how many sides. Everything else is added on. Capitals and spaces do not matter, so
          <code :class="code">2D6 + 3</code> works as well as <code :class="code">2d6+3</code>.
        </p>
        <div class="mt-4 overflow-x-auto">
          <table class="w-full text-left text-sm">
            <thead>
              <tr class="border-b border-border">
                <th scope="col" class="py-2 pr-4 font-semibold">
                  Type
                </th>
                <th scope="col" class="py-2 font-semibold">
                  Means
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in NOTATION" :key="row.code" class="border-b border-border last:border-0">
                <td class="py-2 pr-4 align-top whitespace-nowrap">
                  <code :class="code">{{ row.code }}</code>
                </td>
                <td class="py-2 text-muted-foreground">
                  {{ row.meaning }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p class="mt-4 text-sm leading-relaxed text-muted-foreground">
          A mistake is pointed out as you type — &ldquo;Can only keep between 1 and 4 of 4 dice&rdquo; — rather
          than producing a number that quietly means something else.
        </p>
      </section>

      <section aria-labelledby="dice-fair-heading" class="rounded-2xl bg-muted/50 p-6 sm:p-8">
        <h2 id="dice-fair-heading" class="text-xl font-semibold">
          Fairer than the dice in the box
        </h2>
        <div class="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground">
          <p>
            Physical dice are only as fair as their manufacture. Drilled pips take more material out of the six
            face than the one, moulded dice cool unevenly, and an off-balance d20 can favour a face often enough
            to show up over a session or two. Players test for it by floating dice in salt water and watching
            which side keeps turning up.
          </p>
          <p>
            <strong class="text-foreground">A virtual die is only as fair as its arithmetic</strong>, and there
            is a common mistake there too. Random bytes come in 256 values; a d6 has six faces; 256 does not
            divide by six. Take the remainder and the faces 1 to 4 each get one extra byte value that maps to
            them. This roller reads just enough random bits to cover the faces, discards any value past the
            last face, and draws again — so each face is exactly one in six, one in twenty, one in a hundred.
            The randomness itself comes from <code :class="code">crypto.getRandomValues</code>, your operating
            system&rsquo;s cryptographic source.
          </p>
          <p>
            Every die is shown, not just the total, and dice a keep rule drops are struck through rather than
            hidden. At a table, being able to see the whole roll is what makes a digital die trustworthy.
          </p>
        </div>
      </section>

      <section aria-labelledby="dice-odds-heading" class="rounded-2xl bg-muted/50 p-6 sm:p-8">
        <h2 id="dice-odds-heading" class="text-xl font-semibold">
          Reading the odds
        </h2>
        <div class="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground">
          <p>
            Each result shows the lowest and highest total the roll could have made, which is the quickest
            sanity check on a long expression. Where the total lands inside that range depends on how many
            dice are involved. One die is flat: a d20 gives a 1 exactly as often as a 20. Add dice together and
            the totals pile up in the middle — 3d6 lands on 10 or 11 a quarter of the time and on 3 or 18
            less than once in a hundred rolls.
          </p>
          <p>
            <strong class="text-foreground">Advantage is worth more than it sounds.</strong> Rolling two d20
            and keeping the higher raises the average from 10.5 to about 13.8, and the chance of a natural 20
            from 5% to 9.75%. Disadvantage does the reverse. Keeping the best three of four d6 raises an ability
            score&rsquo;s average from 10.5 to about 12.2.
          </p>
          <p>
            For a bot, a play-by-post game or a spreadsheet, the same roller is an API:
            <a href="/api/v1/random?dice=4d6kh3" class="font-medium text-foreground underline underline-offset-4">/api/v1/random?dice=4d6kh3</a>
            returns every die and the total as JSON.
          </p>
        </div>
      </section>

      <FaqSection :items="faq" class="rounded-2xl bg-muted/50 p-6 sm:p-8" />
      <ZealPromise />
    </ToolContents>
  </div>
</template>
