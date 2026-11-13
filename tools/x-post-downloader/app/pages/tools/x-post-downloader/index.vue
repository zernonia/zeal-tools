<script setup lang="ts">
import meta from '../../../../meta'

const { public: { siteUrl } } = useRuntimeConfig()

useSeoMeta({
  title: 'X (Twitter) Video Downloader — Read Posts Without Logging In',
  description: 'Paste a link to a post on X to read it without an account and download its videos in the quality you pick, its GIFs as MP4, and its photos at original size. Free, no sign-up, no watermark.',
  ogTitle: 'X Post Downloader — read any post, save its videos and photos',
  ogDescription: 'Read public posts on X without an account. Save videos in your chosen quality, GIFs, and original-size photos. No sign-up.',
  ogUrl: `${siteUrl}/tools/${meta.slug}`,
  twitterCard: 'summary_large_image',
})

defineOgImage('Default', { title: 'X Post Downloader', description: meta.tagline })

const howToSteps = [
  { title: 'Copy the post\'s link', body: 'On X, tap Share on the post and choose Copy link. Links from twitter.com, x.com and the usual embed fixers all work, and so does a bare post number.' },
  { title: 'Paste it and press Read', body: 'The post appears as X would show it — author, date, text with its links expanded, the post it replies to and any post it quotes — with no account and no login wall.' },
  { title: 'Pick a quality and download', body: 'Each video lists every size X stores, best first. Photos download at the size they were uploaded, not the smaller copy X shows in the feed. GIFs save as MP4, which is what X actually keeps.' },
]

useToolJsonLd(meta, {
  description: meta.description,
  featureList: [
    'Read public posts on X without an account',
    'Download videos in every available quality',
    'Download GIFs as MP4',
    'Download photos at original size',
    'Copy a post as text',
    'Media downloads go straight from X to your device',
    'No sign-up and no watermark',
  ],
  howTo: { name: 'How to download a video from X', steps: howToSteps.map(s => ({ name: s.title, text: s.body })) },
})

const faq = [
  { q: 'Do I need an X account?', a: 'No. This reads posts the way an embedded post on a news site does, which works for anyone. You will not be asked to log in, here or on X.' },
  { q: 'Where do the files come from?', a: 'Straight from X. The page asks our server for the post\'s details — the text, the author and the addresses of its videos and photos — because X only lets its own embeds read that from a browser. The files themselves are then downloaded by your browser directly from X\'s media servers, so they never pass through ours. Nothing is stored or logged on either trip.' },
  { q: 'Which video quality should I choose?', a: 'The top of the list is the largest file X keeps, usually 1080p for recent videos. Pick a smaller one to save space on a phone or to send it over a chat app that compresses large files anyway. The sizes are the ones X itself made from the upload; nothing is re-encoded here.' },
  { q: 'Why does a GIF download as MP4?', a: 'Because that is what X stores. When someone posts a GIF, X converts it to a short silent video and plays it on a loop. The MP4 is smaller and sharper than a real GIF would be, and plays on every phone and computer.' },
  { q: 'Why are photos bigger than when I save them from X?', a: 'X shows a resized copy in the feed and in its own save option. This asks for the original — the file as it was uploaded — which can be several times larger and noticeably sharper, especially for photographs and screenshots with text.' },
  { q: 'Why does a long post stop part-way?', a: 'Without an account, X only shares the first 280 characters of posts longer than that. The page says when that has happened and links to the full post on X.' },
  { q: 'Which posts cannot be read?', a: 'Posts from protected accounts, which only approved followers can see; posts X has marked age-restricted; and posts that have been deleted or whose account is suspended. X hides all of these from anyone not logged in, and this tool does not get around that. Live video, Spaces and direct messages are not posts and cannot be read either.' },
  { q: 'Is it legal to download videos from X?', a: 'Saving a public post for yourself is generally fine. Re-posting or reusing someone else\'s video or photo is a different matter: the person who made it owns it, and X\'s rules and copyright law apply. Ask the creator before you use their work, and credit them when you do.' },
  { q: 'Can I use this from code or an AI assistant?', a: 'Yes. GET /api/v1/x-post?url= returns the post as JSON, with every video rendition and original-size photo link, and the MCP tool read_x_post returns it as Markdown for an assistant to read. Both are free and need no key.' },
]

const contents = [
  { id: 'howto-heading', label: 'How to use it' },
  { id: 'how-heading', label: 'How it works' },
  { id: 'limits-heading', label: 'What it cannot do' },
  { id: 'faq-heading', label: 'Questions' },
  { id: 'promise', label: 'The Zeal Promise' },
]
</script>

<template>
  <div class="container-page py-10">
    <ToolPageHeader
      title="X Post Downloader"
      description="Read any public post on X without logging in, and save its videos, GIFs and original-size photos — straight from X to your device."
    />

    <XPostDownloaderTool />

    <section class="mt-12 flex flex-wrap gap-2 text-sm" aria-label="Related tools">
      <NuxtLink to="/tools/image-compressor" class="rounded-full border border-border px-4 py-1.5 transition-colors hover:border-primary/40 hover:text-primary">
        Image compressor →
      </NuxtLink>
      <NuxtLink to="/tools/meta-tag-checker" class="rounded-full border border-border px-4 py-1.5 transition-colors hover:border-primary/40 hover:text-primary">
        Meta tag checker →
      </NuxtLink>
      <NuxtLink to="/tools/image-redactor" class="rounded-full border border-border px-4 py-1.5 transition-colors hover:border-primary/40 hover:text-primary">
        Image redactor →
      </NuxtLink>
    </section>

    <ToolContents :items="contents">
      <section aria-labelledby="howto-heading" class="rounded-2xl bg-muted/50 p-6 sm:p-8">
        <h2 id="howto-heading" class="text-xl font-semibold">
          How to download a video from X
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

      <section aria-labelledby="how-heading" class="rounded-2xl bg-muted/50 p-6 sm:p-8">
        <h2 id="how-heading" class="text-xl font-semibold">
          How it works, and what passes through us
        </h2>
        <div class="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground">
          <p>
            Every time a news site shows a post from X, it is using an endpoint X built for exactly that: give it a
            post's number, and it answers with the post — text, author, and the addresses of its photos and
            videos — to anyone, with no account. That is what this tool reads. It is the public face of a post,
            not a way around a login.
          </p>
          <p>
            <strong class="text-foreground">That endpoint answers only X's own embeds when the request comes from a
              browser</strong>, so the page cannot ask it directly. Instead it asks our server, which asks X and
            passes back the post's details. That is the one thing that reaches us: the link you pasted. It is
            not stored and not logged.
          </p>
          <p>
            The files are a different story. X's media servers do let other sites' pages download from them, so
            when you press Download your browser fetches the video or photo straight from X. It never touches our
            server, which is why there is no size limit, no queue and no watermark — there is nothing in the
            middle to add one.
          </p>
        </div>
      </section>

      <section aria-labelledby="limits-heading" class="rounded-2xl bg-muted/50 p-6 sm:p-8">
        <h2 id="limits-heading" class="text-xl font-semibold">
          What it cannot do, and why
        </h2>
        <div class="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground">
          <p>
            <strong class="text-foreground">Protected and age-restricted posts stay hidden.</strong> X shows them only
            to people who are logged in, and in the case of protected accounts only to approved followers. Getting
            around that would mean using somebody's account, and this tool never asks for yours.
          </p>
          <p>
            <strong class="text-foreground">Long posts arrive cut short.</strong> Without an account, X shares only the
            first 280 characters of a longer post. The page says so when it happens and links to the rest, rather
            than pretending the post ends there.
          </p>
          <p>
            <strong class="text-foreground">It reads one post, not an account.</strong> There is no bulk download of
            someone's timeline, by design: a post you were sent a link to is something you have a reason to keep; a
            whole account usually is not.
          </p>
          <p>
            And the video you save still belongs to whoever made it. Keep a copy for yourself, but ask before you
            post it anywhere else, and give credit when you do.
          </p>
        </div>
      </section>

      <FaqSection :items="faq" class="rounded-2xl bg-muted/50 p-6 sm:p-8" />

      <ZealPromise />
    </ToolContents>
  </div>
</template>
