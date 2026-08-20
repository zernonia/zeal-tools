<script setup lang="ts">
import meta from '../../../../meta'

const { public: { siteUrl } } = useRuntimeConfig()

useSeoMeta({
  title: 'Classroom Name Picker — Random Student Selector, Free',
  description: 'A random student picker for the classroom. Paste your register, spin, and work through the class without asking anyone twice. Free, no sign-up, and the names stay on your device.',
  ogTitle: 'Classroom Name Picker — nobody thinks you chose them',
  ogDescription: 'A random student selector that works through the register without repeats. No sign-up, names never uploaded.',
  ogUrl: `${siteUrl}/tools/${meta.slug}/classroom`,
  twitterCard: 'summary_large_image',
})

defineOgImage('Default', { title: 'Classroom Name Picker', description: 'A random student selector that works through the register without repeats.' })

useToolJsonLd(meta, {
  variant: 'classroom',
  name: 'Classroom Name Picker',
  description: 'A random student picker for the classroom. Paste your register, spin, and work through the class without asking anyone twice. Free, and the names stay on the device.',
  featureList: ['Works through a register without repeats', 'Saved on the device, so the class list is there next lesson', 'Names are never uploaded', 'Readable from the back of the room'],
})

const contents = [
  { id: 'use-heading', label: 'Using it well' },
  { id: 'faq-heading', label: 'Questions' },
  { id: 'promise', label: 'The Zeal Promise' },
]

const faq = [
  { q: 'How do I stop it picking the same child repeatedly?', a: 'Tick "take the winner off the wheel". Each spin removes whoever was picked, so the wheel works its way through the class and everybody gets asked exactly once before anyone is asked twice. At the end of the lesson, paste the register back in — or reload the page, since the saved list is the full one.' },
  { q: 'Will it remember my class between lessons?', a: 'Yes, in this browser on this device. The list is saved locally so it is waiting for you next time, which is the point — retyping thirty names every lesson is how a tool like this stops being used. It is not synced to another device, and it is not on a server anywhere.' },
  { q: 'Are the children\'s names sent anywhere?', a: 'No, and this is worth being precise about because it is other people\'s children. The page draws the name itself; there is no request to make and none is made. The saved copy is in your browser\'s local storage on that machine, and the tool has a button that erases it. Nothing is uploaded, nothing is logged, and there is no account that could be breached.' },
  { q: 'Should I use full names?', a: 'First names and an initial are usually plenty, and they read better from the back of the room. It also means a shared or projected screen is not displaying a full class list of identifiable names, which matters if the projector stays on between lessons.' },
  { q: 'Is cold-calling with a wheel actually a good idea?', a: 'The evidence on cold-calling is that it raises participation, mostly because everybody has to be ready rather than only the volunteers. Randomising it removes the two things that make it uncomfortable: the suspicion that the teacher is targeting someone, and the same three hands going up every time. What it does not do is help a child who genuinely cannot answer — pair it with thinking time and the option to pass.' },
  { q: 'Can I use it for groups or teams?', a: 'Yes. With the winner removed after each spin, spinning six times gives you six names for the first group, six for the next, and so on. It is slower than a group generator but everyone sees it happen, which is the difference between teams that get accepted and teams that get argued with.' },
  { q: 'Can I give a quiet child better odds?', a: 'You can — write ×2 after their name and they come up twice as often. Use it sparingly and privately; the weights are visible on the wheel as bigger slices, and a child noticing their own name has a larger slice is a conversation you may not want.' },
  { q: 'Does it need internet in the classroom?', a: 'Only to load the page the first time. After that it runs entirely in the browser, so a flaky school network will not interrupt a lesson. It works on an interactive whiteboard, a laptop plugged into a projector, or a phone.' },
]
</script>

<template>
  <div class="container-page py-10">
    <ToolPageHeader
      title="Classroom Name Picker"
      description="Paste your register once and it is there every lesson. Spin to pick a student, and work through the whole class without asking anyone twice — with the names never leaving the device."
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
      <section aria-labelledby="use-heading" class="rounded-2xl bg-muted/50 p-6 sm:p-8">
        <h2 id="use-heading" class="text-xl font-semibold">
          Getting the most out of a random picker
        </h2>
        <div class="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground">
          <p><strong class="text-foreground">Ask the question before you spin.</strong> Pose it to the room, leave thinking time, and only then turn the wheel. Spin first and everyone else stops thinking the moment a name appears — which loses you the main benefit of cold-calling, that the whole class prepares an answer.</p>
          <p><strong class="text-foreground">Turn on remove-after-picking and leave it on.</strong> Without it the wheel is memoryless, and a memoryless draw will pick the same child twice in a row often enough to look deliberate. With it, the class is worked through in a random order and nobody is asked a second time until everybody has been asked once. That is what children mean when they say a picker is fair.</p>
          <p><strong class="text-foreground">Let people pass.</strong> A random picker removes the perception that you targeted someone; it does not remove the risk of putting a child on the spot when they genuinely have nothing. An explicit "you can pass, I'll come back to you" makes the whole thing safe enough to use every lesson rather than a few times before it becomes dreaded.</p>
          <p>On the practical side: first names read better from the back of the room than full names, and they keep a projected screen from displaying a complete identifiable class list. The list lives in the browser on that machine, so a shared classroom computer will hold the register between lessons — which is convenient, and worth knowing if the machine is shared with other staff. The tool has a button to erase it.</p>
        </div>
      </section>

      <FaqSection :items="faq" class="rounded-2xl bg-muted/50 p-6 sm:p-8" />

      <ZealPromise />
    </ToolContents>
  </div>
</template>
