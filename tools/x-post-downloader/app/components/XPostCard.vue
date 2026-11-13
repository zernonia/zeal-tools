<script setup lang="ts">
import type { Post, PostMedia } from '../../core'
import { Check, Heart, Info, Link2, MessageCircle, Play } from 'lucide-vue-next'
import { postTokens } from '../../core'

/**
 * A post drawn the way X draws an embedded post, so it reads as the thing it
 * is rather than as another card on this site.
 *
 * The palette is X's, hard-coded the way the meta tag checker's Google
 * preview hard-codes Google's — with two deliberate departures. X's link blue
 * (#1d9bf0) is 3.0:1 on white, under the 4.5:1 this site holds every page to,
 * so light mode uses #0f75c9 (4.8:1); dark mode keeps X's own blue at 7:1.
 * The grey and gold badges are nudged the same way to clear 3:1 as graphics.
 *
 * It is presentation only. Downloads live in their own panel below, so the
 * card stays faithful and the download area stays uncrowded.
 */
const props = defineProps<{
  post: Post
  /** A quoted post: smaller, and one big button that opens it. */
  quoted?: boolean
}>()

const emit = defineEmits<{ open: [url: string] }>()

const revealed = ref(!props.post.sensitive)
const copied = ref(false)

const tokens = computed(() => postTokens(props.post.text))

const when = computed(() => {
  const value = new Date(props.post.createdAt)
  if (Number.isNaN(value.getTime()))
    return { time: '', date: '' }
  return {
    time: new Intl.DateTimeFormat(undefined, { timeStyle: 'short' }).format(value),
    date: new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(value),
  }
})

const compact = new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 })

const BADGE_CLASS: Record<NonNullable<Post['author']['badge']>, string> = {
  blue: 'text-[#0f75c9] dark:text-[#1d9bf0]',
  government: 'text-[#6b8494] dark:text-[#829aab]',
  business: 'text-[#a6840a] dark:text-[#e2b719]',
}
const BADGE_LABEL: Record<NonNullable<Post['author']['badge']>, string> = {
  blue: 'Verified account',
  government: 'Verified government or multilateral organisation account',
  business: 'Verified organisation',
}

/**
 * X's media grid: one item at its own shape, two side by side, three as one
 * tall and two stacked, four as a square of four — all inside a 16:9 frame.
 */
const gridClass = computed(() => {
  switch (props.post.media.length) {
    case 1: return ''
    case 2: return 'grid aspect-video grid-cols-2 gap-0.5'
    case 3: return 'grid aspect-video grid-cols-2 grid-rows-2 gap-0.5'
    default: return 'grid aspect-video grid-cols-2 grid-rows-2 gap-0.5'
  }
})

function tileClass(index: number) {
  return props.post.media.length === 3 && index === 0 ? 'row-span-2' : ''
}

/** A single item keeps its own shape, capped so a tall photo does not run on forever. */
function singleStyle(media: PostMedia) {
  return media.width && media.height ? { aspectRatio: `${media.width} / ${media.height}` } : undefined
}

async function copyLink() {
  try {
    await navigator.clipboard.writeText(props.post.url)
    copied.value = true
    setTimeout(() => copied.value = false, 1600)
  }
  catch { copied.value = false }
}

const linkClass = 'text-[#0f75c9] hover:underline dark:text-[#1d9bf0]'
</script>

<template>
  <!-- ── Quoted post: a compact box that opens the post when pressed ── -->
  <button
    v-if="quoted"
    type="button"
    class="block w-full overflow-hidden rounded-2xl border border-[#cfd9de] text-left transition-colors hover:bg-black/[0.03] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring dark:border-[#2f3336] dark:hover:bg-white/[0.03]"
    :aria-label="`Quoted post by ${post.author.name}. Open it to read and download.`"
    @click="emit('open', post.url)"
  >
    <span class="flex items-center gap-1 px-3 pt-3 text-[15px] leading-5">
      <img :src="post.author.avatar" alt="" class="size-5 shrink-0" :class="post.author.avatarShape === 'square' ? 'rounded-[4px]' : 'rounded-full'" referrerpolicy="no-referrer" loading="lazy">
      <span class="truncate font-bold">{{ post.author.name }}</span>
      <XVerifiedBadge v-if="post.author.badge" class="size-[18px] shrink-0" :class="BADGE_CLASS[post.author.badge]" aria-hidden="true" />
      <span class="truncate text-[#536471] dark:text-[#71767b]">@{{ post.author.handle }} · {{ when.date }}</span>
    </span>
    <span v-if="post.text" class="block whitespace-pre-line break-words px-3 pb-3 pt-1 text-[15px] leading-5">{{ post.text }}</span>
    <span v-if="post.media[0]" class="block border-t border-[#cfd9de] dark:border-[#2f3336]">
      <img :src="post.media[0].url" alt="" class="aspect-video w-full object-cover" referrerpolicy="no-referrer" loading="lazy">
    </span>
  </button>

  <!-- ── The post itself ── -->
  <article
    v-else
    class="mx-auto w-full max-w-[550px] rounded-2xl border border-[#cfd9de] bg-white px-4 pb-1 pt-3 font-[system-ui,-apple-system,'Segoe_UI',Roboto,Helvetica,Arial,sans-serif] text-[#0f1419] dark:border-[#2f3336] dark:bg-black dark:text-[#e7e9ea]"
    :aria-label="`Post by ${post.author.name}`"
  >
    <header class="flex items-start gap-3">
      <a :href="`https://x.com/${post.author.handle}`" target="_blank" rel="noopener noreferrer" class="shrink-0" :aria-label="`${post.author.name} on X`">
        <img
          :src="post.author.avatar"
          alt=""
          class="size-10 bg-[#cfd9de] dark:bg-[#2f3336]"
          :class="post.author.avatarShape === 'square' ? 'rounded-[6px]' : 'rounded-full'"
          referrerpolicy="no-referrer"
          loading="lazy"
        >
      </a>
      <div class="min-w-0 grow leading-5">
        <a :href="`https://x.com/${post.author.handle}`" target="_blank" rel="noopener noreferrer" class="flex items-center gap-0.5 text-[15px] hover:underline">
          <span class="truncate font-bold">{{ post.author.name }}</span>
          <XVerifiedBadge
            v-if="post.author.badge"
            class="size-[18px] shrink-0"
            :class="BADGE_CLASS[post.author.badge]"
            role="img"
            :aria-label="BADGE_LABEL[post.author.badge]"
          />
        </a>
        <p class="truncate text-[15px] text-[#536471] dark:text-[#71767b]">
          @{{ post.author.handle }}
        </p>
      </div>
      <a :href="post.url" target="_blank" rel="noopener noreferrer" class="-m-2.5 shrink-0 p-2.5" aria-label="View this post on X">
        <!-- The X mark, linking to the post: says where it is from. -->
        <svg viewBox="0 0 24 24" class="size-[22px] fill-current" aria-hidden="true"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
      </a>
    </header>

    <p v-if="post.replyTo" class="mt-2 text-[15px] leading-5 text-[#536471] dark:text-[#71767b]">
      Replying to
      <button type="button" :class="linkClass" @click="emit('open', `https://x.com/${post.replyTo.handle}/status/${post.replyTo.id}`)">
        @{{ post.replyTo.handle }}
      </button>
    </p>

    <p v-if="post.text" class="mt-3 whitespace-pre-line break-words text-[17px] leading-6" :lang="post.lang">
      <template v-for="(token, i) in tokens" :key="i">
        <a v-if="token.type !== 'text'" :href="token.href" target="_blank" rel="noopener noreferrer nofollow" :class="linkClass">{{ token.text }}</a>
        <template v-else>
          {{ token.text }}
        </template>
      </template>
    </p>
    <p v-if="post.truncated" class="mt-1 text-[15px]">
      <a :href="post.url" target="_blank" rel="noopener noreferrer" :class="linkClass">Show more on X</a>
      <span class="text-[#536471] dark:text-[#71767b]"> — X shares only the start of long posts without an account.</span>
    </p>

    <!-- ── media ── -->
    <div v-if="post.media.length" class="mt-3 overflow-hidden rounded-2xl border border-[#cfd9de] dark:border-[#2f3336]">
      <div v-if="!revealed" class="flex aspect-video flex-col items-center justify-center gap-3 bg-[#f7f9f9] p-6 text-center dark:bg-[#16181c]">
        <p class="text-[15px] font-bold">
          Content warning
        </p>
        <p class="text-sm text-[#536471] dark:text-[#71767b]">
          The post author flagged this post as showing sensitive content.
        </p>
        <button type="button" class="min-h-9 rounded-full border border-[#cfd9de] px-4 text-sm font-bold hover:bg-black/5 dark:border-[#536471] dark:hover:bg-white/10" @click="revealed = true">
          Show
        </button>
      </div>

      <div v-else :class="gridClass">
        <div
          v-for="(media, index) in post.media"
          :key="index"
          class="relative overflow-hidden bg-[#f7f9f9] dark:bg-[#16181c]"
          :class="[tileClass(index), post.media.length === 1 ? 'max-h-[510px]' : '']"
          :style="post.media.length === 1 ? singleStyle(media) : undefined"
        >
          <img
            v-if="media.type === 'photo'"
            :src="media.url"
            :alt="media.alt ?? ''"
            class="size-full object-cover"
            referrerpolicy="no-referrer"
            loading="lazy"
          >
          <!--
            Played straight from X. preload="none" so a post with four videos
            does not start four downloads before anyone presses play.
          -->
          <video
            v-else
            :src="media.renditions[Math.min(1, media.renditions.length - 1)]?.url"
            :poster="media.url"
            :loop="media.type === 'gif'"
            :muted="media.type === 'gif'"
            :autoplay="media.type === 'gif'"
            controls
            playsinline
            preload="none"
            class="size-full bg-black object-contain"
            :aria-label="media.alt ?? (media.type === 'gif' ? 'GIF from the post' : 'Video from the post')"
          />
          <span v-if="media.type === 'gif'" class="pointer-events-none absolute bottom-2 left-2 rounded bg-black/75 px-1 text-xs font-bold text-white">GIF</span>
          <Play v-if="media.type === 'video' && post.media.length > 1" class="pointer-events-none absolute left-1/2 top-1/2 size-10 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#1d9bf0] p-2.5 text-white" aria-hidden="true" />
        </div>
      </div>
    </div>

    <div v-if="post.quoted" class="mt-3">
      <XPostCard :post="post.quoted" quoted @open="url => emit('open', url)" />
    </div>

    <!-- ── time ── -->
    <p v-if="when.time" class="mt-3 flex items-center gap-1 text-[15px] text-[#536471] dark:text-[#71767b]">
      <a :href="post.url" target="_blank" rel="noopener noreferrer" class="hover:underline">
        <time :datetime="post.createdAt">{{ when.time }} · {{ when.date }}</time>
      </a>
      <Info class="ml-auto size-[18px]" aria-hidden="true" />
    </p>

    <!-- ── actions, as on an embedded post ── -->
    <div class="mt-3 flex items-center gap-1 border-t border-[#cfd9de] py-1 text-sm font-bold text-[#536471] dark:border-[#2f3336] dark:text-[#71767b]">
      <a
        :href="`https://x.com/intent/like?tweet_id=${post.id}`"
        target="_blank"
        rel="noopener noreferrer"
        class="group -ml-2 inline-flex min-h-11 items-center gap-1 rounded-full px-2 hover:text-[#f91880]"
        :aria-label="`${post.likes} likes. Like on X`"
      >
        <Heart class="size-[18px] group-hover:fill-[#f91880]/10" aria-hidden="true" />
        <span class="text-[#0f1419] group-hover:text-[#f91880] dark:text-[#e7e9ea]">{{ compact.format(post.likes) }}</span>
      </a>
      <a
        :href="`https://x.com/intent/tweet?in_reply_to=${post.id}`"
        target="_blank"
        rel="noopener noreferrer"
        class="inline-flex min-h-11 items-center gap-1 rounded-full px-2 hover:text-[#0f75c9] dark:hover:text-[#1d9bf0]"
      >
        <MessageCircle class="size-[18px]" aria-hidden="true" />
        Reply
      </a>
      <button type="button" class="inline-flex min-h-11 items-center gap-1 rounded-full px-2 hover:text-[#00ba7c]" @click="copyLink">
        <component :is="copied ? Check : Link2" class="size-[18px]" aria-hidden="true" />
        {{ copied ? 'Copied' : 'Copy link' }}
      </button>
    </div>

    <a
      v-if="post.replies"
      :href="post.url"
      target="_blank"
      rel="noopener noreferrer"
      class="mb-3 mt-1 flex min-h-9 items-center justify-center rounded-full border border-[#cfd9de] text-[15px] font-bold hover:bg-[#0f75c9]/10 dark:border-[#536471] dark:hover:bg-[#1d9bf0]/10"
      :class="linkClass.replace('hover:underline', '')"
    >
      Read {{ compact.format(post.replies) }} {{ post.replies === 1 ? 'reply' : 'replies' }}
    </a>
  </article>
</template>
