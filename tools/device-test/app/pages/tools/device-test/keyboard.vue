<script setup lang="ts">
import meta from '../../../../meta'

const { public: { siteUrl } } = useRuntimeConfig()

useSeoMeta({
  title: 'Keyboard Tester — Check Every Key, Rollover and Chatter Online',
  description: 'A free online keyboard tester: press keys and watch them light up on a full-size ANSI or ISO layout, with event.key and event.code, the most keys held at once, and a warning when a key registers twice. Nothing you type is stored.',
  ogTitle: 'Keyboard Tester — every key, rollover and chatter',
  ogDescription: 'Full-size ANSI and ISO layouts, n-key rollover count and chatter detection, in the browser.',
  ogUrl: `${siteUrl}/tools/${meta.slug}/keyboard`,
  twitterCard: 'summary_large_image',
})

defineOgImage('Default', { title: 'Keyboard Tester', description: 'Every key, rollover and chatter — in the browser.' })

const howToSteps = [
  { title: 'Focus the test area', body: 'Click the drawing of the keyboard, press Start typing, or Tab to it. A solid border means it is listening. Keys only count while it has focus, so nothing you type elsewhere on the page is read.' },
  { title: 'Press every key', body: 'Each key turns solid while it is held and stays tinted once it has worked, so a key that never lights up is the one to worry about. The coverage count tells you how many of the drawn keys you have reached.' },
  { title: 'Hold several at once', body: 'Press and hold as many keys as you can — or the combination you use in a game. The rollover box shows how many are held now and the most you reached. If a key you are holding does not light, the keyboard blocked it.' },
  { title: 'Press Esc to finish', body: 'Escape hands focus back to the page, so Tab works normally again. Reset clears the results for another run.' },
]

useToolJsonLd(meta, {
  variant: 'keyboard',
  name: 'Keyboard Tester',
  description: 'Test every key of a keyboard in the browser, with rollover, ghosting and chatter detection, on full-size ANSI and ISO layouts.',
  featureList: [
    'Full-size ANSI and ISO layouts, with numpad, navigation cluster and function row',
    'Shows event.key, event.code, location and auto-repeat for every press',
    'Counts keys held at once and the maximum rollover reached',
    'Flags chatter: a key registering twice within 30 ms',
    'Lists keys the drawing does not have, such as media keys',
    'Nothing typed is stored or sent',
  ],
  howTo: { name: 'How to test a keyboard online', steps: howToSteps.map(s => ({ name: s.title, text: s.body })) },
})

const faq = [
  { q: 'What is the difference between key and code?', a: 'code names the physical key — the one in the position of Q on a US keyboard is KeyQ on every keyboard, including a French one where it prints A. key is what your operating system\'s layout made of it: a, A, é or Shift. A hardware test cares about code, which is why the drawing is keyed by it; key is shown beside it so you can check your layout setting too.' },
  { q: 'What is n-key rollover?', a: 'How many keys a keyboard can report at once. Cheaper keyboards share wires between keys, so certain combinations of three or four cannot all be read. Many USB keyboards report up to six ordinary keys plus the modifiers, which is the limit of the basic USB keyboard protocol; gaming keyboards advertising n-key rollover report every key. Hold keys down one at a time and watch the count: where it stops rising is your keyboard\'s limit for that combination.' },
  { q: 'What is ghosting, and how is it different from blocking?', a: 'On a keyboard wired as a grid, pressing three keys at the corners of a rectangle can make the fourth corner look pressed too — a ghost key you never touched. Most keyboards now prevent that by blocking the third or fourth key instead, which is what you will usually see here: you hold a key and it simply does not light. Both mean that combination is beyond the keyboard\'s matrix.' },
  { q: 'What does chatter mean?', a: 'A key that registers two presses for one. Mechanical switches bounce for a few milliseconds when they close, and the keyboard is supposed to filter that out; a worn, dirty or faulty switch can bounce for longer than the filter allows, so one press types two letters. This tester flags any key that registers twice within 30 ms, which is faster than anyone can deliberately press a key twice.' },
  { q: 'Why does my Fn key do nothing?', a: 'Fn is handled inside the keyboard itself and never sent to the computer, so no web page or program can see it. Test it by what it changes: hold Fn and press a function key, and you should see a different code arrive — a media key, for instance, or F1 instead of a brightness key.' },
  { q: 'Some shortcuts close the tab or do not register. Why?', a: 'The browser and the operating system keep some combinations for themselves before a page sees them: Ctrl or ⌘ with W, T, N or Q, Alt+Tab, the Windows key, Ctrl+Alt+Delete. A page cannot stop those, and it should not be able to. Test those keys on their own instead.' },
  { q: 'Is what I type recorded?', a: 'No. The page keeps counts — which keys have been pressed and how often — and the last key\'s details for the readout. There is no text box and nothing is stored or sent. Reload the page and it is all gone.' },
]

const contents = [
  { id: 'howto-heading', label: 'How to use it' },
  { id: 'reading-heading', label: 'Reading the results' },
  { id: 'trouble-heading', label: 'When a key does not work' },
  { id: 'faq-heading', label: 'Questions' },
  { id: 'promise', label: 'The Zeal Promise' },
]
</script>

<template>
  <div class="container-page py-10">
    <ToolPageHeader
      title="Keyboard Tester"
      description="Press any key and watch it light up on a full-size layout — with the key code, how many keys you can hold at once, and a flag for keys that register twice."
    />

    <DeviceTestKeyboard />

    <section class="mt-12 flex flex-wrap gap-2 text-sm" aria-label="Related tools">
      <NuxtLink to="/tools/device-test" class="rounded-full border border-border px-4 py-1.5 transition-colors hover:border-primary/40 hover:text-primary">
        All device tests →
      </NuxtLink>
      <NuxtLink to="/tools/device-test/dead-pixel" class="rounded-full border border-border px-4 py-1.5 transition-colors hover:border-primary/40 hover:text-primary">
        Dead pixel test →
      </NuxtLink>
      <NuxtLink to="/tools/password-generator" class="rounded-full border border-border px-4 py-1.5 transition-colors hover:border-primary/40 hover:text-primary">
        Password generator →
      </NuxtLink>
    </section>

    <ToolContents :items="contents">
      <section aria-labelledby="howto-heading" class="rounded-2xl bg-muted/50 p-6 sm:p-8">
        <h2 id="howto-heading" class="text-xl font-semibold">
          How to test a keyboard online
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

      <section aria-labelledby="reading-heading" class="rounded-2xl bg-muted/50 p-6 sm:p-8">
        <h2 id="reading-heading" class="text-xl font-semibold">
          Reading the results
        </h2>
        <div class="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground">
          <p>
            <strong class="text-foreground">Last key</strong> shows the four things the browser reports for
            every press. <em>key</em> is the character or name your layout produced; <em>code</em> is the
            physical position; <em>location</em> tells the left Shift from the right one and the numpad Enter
            from the main one; and <em>repeat</em> says whether this was the key auto-repeating because you held
            it down. Auto-repeats are counted separately and never treated as new presses.
          </p>
          <p>
            <strong class="text-foreground">Rollover</strong> is the number of keys held right now and the
            most you have held at once. It is the honest way to check a keyboard&rsquo;s anti-ghosting claim:
            hold W, A, S and D, add Shift and Space, and see whether every one lights. A keyboard that stops at
            six on one combination may manage more on another, because the limit depends on how the keys are
            wired, so test the combinations you actually use.
          </p>
          <p>
            <strong class="text-foreground">Chatter</strong> lists keys that registered twice within 30
            milliseconds. One flag after hundreds of presses can be a fluke; a key that flags again and again
            has a switch that needs cleaning or replacing. Type a word with the suspect letter in it a dozen
            times and watch the count.
          </p>
          <p>
            <strong class="text-foreground">Coverage</strong> counts how many of the drawn keys have worked
            at least once. Keys your keyboard has that the drawing does not — media keys, F13 and above,
            Japanese and Korean input keys — are listed by code underneath instead of being silently ignored.
            If your board is a UK or European one, switch the layout to ISO; pressing the extra key beside
            left Shift switches it for you.
          </p>
        </div>
      </section>

      <section aria-labelledby="trouble-heading" class="rounded-2xl bg-muted/50 p-6 sm:p-8">
        <h2 id="trouble-heading" class="text-xl font-semibold">
          When a key does not work
        </h2>
        <div class="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground">
          <p>
            <strong class="text-foreground">Rule out the software first.</strong> On Windows, Filter Keys
            (Settings &rarr; Accessibility &rarr; Keyboard) ignores brief or repeated presses and can make a
            working key look dead; turn it off while testing. Gaming keyboards with a &ldquo;game mode&rdquo;
            often disable the Windows key on purpose. Some laptops swap the function row for media keys,
            often toggled by Fn+Esc or a setting in the manufacturer&rsquo;s app.
          </p>
          <p>
            <strong class="text-foreground">On a Mac, ⌘ swallows key releases.</strong> While ⌘ is held,
            macOS does not tell the browser when other keys are let go. The tester knows this and clears
            those keys when ⌘ is released, so a combination with ⌘ in it will show correctly once you let
            go of ⌘ last. On Windows, Print Screen is usually taken by the screenshot tool, so only its
            release reaches the page; it still counts.
          </p>
          <p>
            <strong class="text-foreground">Then the connection.</strong> Try another USB port, plugging in
            directly rather than through a hub, or a fresh battery for a wireless keyboard. A Bluetooth
            keyboard that drops presses when held near a USB 3 port or a Wi-Fi router is suffering
            interference, not a fault. If a whole row or column of keys fails together, the problem is the
            keyboard&rsquo;s circuit rather than individual switches.
          </p>
          <p>
            <strong class="text-foreground">Then the switch.</strong> A single key that is dead, sticky or
            chattering on a mechanical keyboard is very often dust or a spill. Remove the keycap, blow the
            switch out and press it twenty or thirty times. Hot-swappable boards let you replace the switch
            outright; on a laptop, the keyboard is usually one part and the fix is the manufacturer&rsquo;s.
          </p>
        </div>
      </section>

      <FaqSection :items="faq" class="rounded-2xl bg-muted/50 p-6 sm:p-8" />

      <ZealPromise />
    </ToolContents>
  </div>
</template>
