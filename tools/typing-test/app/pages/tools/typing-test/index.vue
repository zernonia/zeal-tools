<script setup lang="ts">
import meta from '../../../../meta'

const { public: { siteUrl } } = useRuntimeConfig()

useSeoMeta({
  title: 'Typing Test — Check Your Typing Speed in WPM, Free',
  description: 'A free typing speed test: 15, 30, 60 or 120 seconds, or 25, 50 or 100 words, with optional punctuation and numbers. See your WPM, accuracy, raw speed and consistency, scored the standard way. No sign-up, nothing you type leaves your browser.',
  ogTitle: 'Typing Test — how fast do you really type?',
  ogDescription: 'WPM, accuracy that counts the mistakes you fixed, consistency and a speed chart. Personal bests kept on your device. No sign-up.',
  ogUrl: `${siteUrl}/tools/${meta.slug}`,
  twitterCard: 'summary_large_image',
})

defineOgImage('Default', { title: 'Typing Test', description: meta.tagline })

const howToSteps = [
  { title: 'Pick a test', body: 'Choose a timed test of 15, 30, 60 or 120 seconds, or a fixed 25, 50 or 100 words. Add punctuation and numbers if you want the test to look more like real writing. The choice is kept in the page address, so a link opens the same test.' },
  { title: 'Start typing', body: 'Click or tap the words, then type. The clock starts on your first key, not before, so there is no rush to get your hands in place. Press space to move to the next word; Backspace corrects, and steps back into the last word if you got it wrong.' },
  { title: 'Read your result', body: 'When the time is up or the last word is done, you get your words per minute, accuracy, raw speed, consistency and a chart of your pace. Beat your record for that mode and it is saved as a new personal best, on this device only.' },
]

useToolJsonLd(meta, {
  description: meta.description,
  featureList: [
    '15, 30, 60 and 120 second tests',
    '25, 50 and 100 word tests',
    'Optional punctuation and numbers',
    'Standard WPM: five characters to a word',
    'Accuracy that counts corrected mistakes',
    'Raw speed, consistency and a per-second speed chart',
    'Personal best per mode, stored only on your device',
    'Works with on-screen keyboards on phones and tablets',
    'No sign-up, nothing typed leaves the browser',
  ],
  howTo: { name: 'How to take the typing test', steps: howToSteps.map(s => ({ name: s.title, text: s.body })) },
})

const faq = [
  { q: 'How is WPM calculated?', a: 'By the convention typing tests have used since the typewriter: a "word" is any five characters, spaces included. Your score is the number of correct characters divided by five, divided by the minutes the test took. Correct characters are the letters you typed in the right place, plus the space after every word you typed exactly right. Counting characters rather than real words means a test full of short words and one full of long ones measure the same thing.' },
  { q: 'What is the difference between WPM and raw speed?', a: 'Raw speed counts every character you left on the page, right or wrong, so it is how fast your fingers moved. WPM counts only the correct ones, so it is how fast you produced usable text. A big gap between the two means mistakes are costing you, and slowing down slightly will probably raise your WPM.' },
  { q: 'Why is my accuracy lower than it looks?', a: 'Because a mistake you corrected still counts. Accuracy here is correct keystrokes divided by all keystrokes, measured as you type, so a wrong letter you then deleted is one wrong keystroke. The finished text might look perfect, but you still spent time making and fixing the error, and that is exactly the habit worth knowing about. Backspace itself is not counted either way.' },
  { q: 'What does consistency mean?', a: 'How even your pace was. Your raw speed is measured for each second of the test, and consistency is 100 minus the spread of those speeds as a percentage of their average (strictly, 100 × (1 − the coefficient of variation)). Typing at a perfectly steady rate would score 100; bursts and pauses pull it down. It needs at least two seconds of typing to say anything.' },
  { q: 'What is a good typing speed?', a: 'There is no official answer, and published averages vary widely with who was tested and how. As a rough guide: under about 30 WPM is typical of someone who types with a few fingers; 40 to 60 is comfortable everyday typing; 70 and above is fast; and well over 100 is the territory of people who practise for it. Accuracy matters as much as the number — a fast score at 85% accuracy is slower in real use than it looks.' },
  { q: 'Does it work on a phone or tablet?', a: 'Yes. Tap the words and your on-screen keyboard appears. The test reads what changes in the text field rather than relying on key events, which phones do not send reliably, and it turns autocorrect off for the field. If your keyboard still rewrites a word, that is counted as the corrections it really was. Swipe typing will register, but a whole word at once is not what the test is designed to measure.' },
  { q: 'Is anything I type sent anywhere?', a: 'No. The test runs entirely in your browser: the words are generated on the page and your keystrokes are scored on the page. The only thing kept is your personal best for each mode — speed, accuracy and the date — and that stays in this browser\'s storage on this device. There is no account, and clearing your browser data or pressing "Forget my bests" removes it.' },
  { q: 'Why can I not paste the text?', a: 'Because a typing test measures typing. Paste and drag-and-drop are switched off in the test field. There is no other trick to stop — the score is only ever shown to you.' },
  { q: 'Where do the words come from?', a: 'A list of 250 common English words written for this tool, drawn at random for every test, with the same word never appearing twice in a row. There are no passages from books or articles, which means nothing to memorise: every test is new. Punctuation mode shapes the words into sentences with capitals, full stops and commas; numbers mode swaps in a number for about one word in ten.' },
]

const contents = [
  { id: 'howto-heading', label: 'How to use it' },
  { id: 'wpm-heading', label: 'How WPM is worked out' },
  { id: 'good-heading', label: 'What is a good speed' },
  { id: 'improve-heading', label: 'Getting faster' },
  { id: 'faq-heading', label: 'Questions' },
  { id: 'promise', label: 'The Zeal Promise' },
]
</script>

<template>
  <div class="container-page py-10">
    <ToolPageHeader
      title="Typing Test"
      description="How fast do you type? A timed or word-count test with optional punctuation and numbers, scored in standard words per minute — with accuracy that remembers the mistakes you fixed."
    />

    <TypingTestTool />

    <section class="mt-12 flex flex-wrap gap-2 text-sm" aria-label="Related tools">
      <NuxtLink to="/tools/password-generator" class="rounded-full border border-border px-4 py-1.5 transition-colors hover:border-primary/40 hover:text-primary">
        Password generator →
      </NuxtLink>
      <NuxtLink to="/tools/countdown-timer" class="rounded-full border border-border px-4 py-1.5 transition-colors hover:border-primary/40 hover:text-primary">
        Countdown timer →
      </NuxtLink>
      <NuxtLink to="/tools/name-picker" class="rounded-full border border-border px-4 py-1.5 transition-colors hover:border-primary/40 hover:text-primary">
        Name picker →
      </NuxtLink>
    </section>

    <ToolContents :items="contents">
      <section aria-labelledby="howto-heading" class="rounded-2xl bg-muted/50 p-6 sm:p-8">
        <h2 id="howto-heading" class="text-xl font-semibold">
          How to take the typing test
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

      <section aria-labelledby="wpm-heading" class="rounded-2xl bg-muted/50 p-6 sm:p-8">
        <h2 id="wpm-heading" class="text-xl font-semibold">
          How words per minute is worked out
        </h2>
        <div class="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground">
          <p>
            Counting actual words would make a typing score depend on the words. &ldquo;I am at it&rdquo; is
            four words and ten keystrokes; &ldquo;understanding&rdquo; is one word and thirteen. So typing
            tests have long agreed on a fixed unit instead: <strong class="text-foreground">a word is five
              characters</strong>, and the spaces between words count as characters too. Your speed is the
            characters you typed, divided by five, divided by the minutes it took.
          </p>
          <p>
            That gives two speeds from the same test. <strong class="text-foreground">Raw speed</strong>
            counts every character left on the page, right or wrong. <strong class="text-foreground">WPM</strong>,
            the headline number, counts only the correct ones: each letter in the right place, and the space
            after each word that was typed exactly right. Letters typed past the end of a word and letters
            skipped earn nothing, and are listed separately in the result as extra and missed.
          </p>
          <p>
            As a worked example: in a 30-second test you type 160 correct characters, spaces included. That
            is 32 words of five characters, in half a minute — 64 WPM. Had you also typed 15 wrong
            characters, your raw speed would be 175 ÷ 5 ÷ 0.5 = 70.
          </p>
          <p>
            <strong class="text-foreground">Accuracy is measured differently, on purpose.</strong> It is not
            read from the finished text but from every key you pressed as you went: correct keystrokes divided
            by all keystrokes. A typo you noticed and fixed leaves the text clean, but it was still a wrong
            key, and it still cost you the time to press it, delete it and press the right one. Counting it is
            what makes the accuracy figure worth looking at.
          </p>
        </div>
      </section>

      <section aria-labelledby="good-heading" class="rounded-2xl bg-muted/50 p-6 sm:p-8">
        <h2 id="good-heading" class="text-xl font-semibold">
          What counts as a good typing speed
        </h2>
        <div class="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground">
          <p>
            You will find confident-sounding averages quoted all over the web, and they disagree with each
            other, because they come from very different groups of people tested in very different ways. So
            treat the following as rough bands rather than statistics:
          </p>
          <ul class="list-disc space-y-1 pl-5">
            <li><strong class="text-foreground">Below about 30 WPM</strong> — typical of typing with a few fingers while looking at the keys.</li>
            <li><strong class="text-foreground">Around 40 to 60 WPM</strong> — comfortable, everyday touch typing; plenty for most office work.</li>
            <li><strong class="text-foreground">70 WPM and up</strong> — fast; your typing rarely holds your thinking back.</li>
            <li><strong class="text-foreground">Well over 100 WPM</strong> — the range of people who practise typing for its own sake.</li>
          </ul>
          <p>
            The test you choose moves the number too. A 15-second sprint flatters almost everyone, because
            nobody tires or loses focus in fifteen seconds; a two-minute test is closer to how you type for
            real. Punctuation and numbers slow nearly everyone down, which is why each mode keeps its own
            personal best rather than comparing them.
          </p>
        </div>
      </section>

      <section aria-labelledby="improve-heading" class="rounded-2xl bg-muted/50 p-6 sm:p-8">
        <h2 id="improve-heading" class="text-xl font-semibold">
          How to type faster — and why accuracy comes first
        </h2>
        <div class="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground">
          <p>
            <strong class="text-foreground">Accuracy before speed.</strong> Every mistake costs at least three
            keystrokes: the wrong one, Backspace and the right one. A typist at 95% accuracy is making a
            correction every twenty keys, which quietly eats a large share of their speed. If your raw speed
            is well above your WPM, the quickest gain is to slow down a little until the errors stop.
          </p>
          <p>
            <strong class="text-foreground">Stop looking at the keys.</strong> Touch typing — each finger
            responsible for its own keys, resting on the home row — is slower for the first week or two and
            faster ever after. Short daily sessions work better than one long one: ten minutes a day builds
            the habit without tiring your hands.
          </p>
          <p>
            <strong class="text-foreground">Aim for an even rhythm.</strong> The consistency score and the
            dashed line on the speed chart show whether you type in bursts. Bursting through easy words and
            stalling on hard ones is usually slower overall than a steady pace that never stops.
          </p>
          <p>
            <strong class="text-foreground">Practise what you actually type.</strong> If you write code,
            numbers or formal prose, turn on punctuation and numbers — the shift key and the number row are
            where most people&rsquo;s speed falls apart.
          </p>
          <p>
            And look after your hands: keep your wrists level and relaxed, and stop if anything aches.
            Speed comes from practice over weeks, not from pushing through pain today.
          </p>
        </div>
      </section>

      <FaqSection :items="faq" class="rounded-2xl bg-muted/50 p-6 sm:p-8" />

      <ZealPromise />
    </ToolContents>
  </div>
</template>
