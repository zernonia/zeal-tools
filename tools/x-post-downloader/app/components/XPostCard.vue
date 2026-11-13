<script setup lang="ts">
import type { Post } from '../../core'
import { BadgeCheck, CornerUpLeft, Download, Eye, Film, Heart, Loader2, MessageCircle } from 'lucide-vue-next'
import { renditionLabel } from '../../core'

const props = defineProps<{
  post: Post
  /** A quoted post is shown smaller and without its own download controls. */
  nested?: boolean
  progress?: Record<number, number>
  choice?: Record<number, number>
  sourceFor?: (media: Post['media'][number], index: number) => string
}>()

const emit = defineEmits<{
  download: [index: number]
  choose: [index: number, rendition: number]
  open: [url: string]
}>()

/** Sensitive media stays covered until asked for, as it does on X. */
const revealed = ref(!props.post.sensitive)

/**
 * The text split into plain runs and links. Vue escapes every run, so this
 * never builds HTML from a stranger's post.
 */
const segments = computed(() => props.post.text.split(/(https?:\/\/\S+)/g).filter(Boolean).map(part => ({
  text: part,
  link: /^https?:\/\//.test(part),
})))

const date = computed(() => {
  const value = new Date(props.post.createdAt)
  return Number.isNaN(value.getTime())
    ? ''
    : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(value)
})

const count = new Intl.NumberFormat(undefined, { notation: 'compact' })

function duration(ms?: number) {
  if (!ms)
    return ''
  const seconds = Math.round(ms / 1000)
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}
</script>

<template>
  <article
    class="rounded-2xl border"
    :class="nested ? 'bg-muted/40 p-4' : 'bg-background p-5 dark:bg-input/30'"
    :aria-label="`Post by ${post.author.name}`"
  >
    <header class="flex items-center gap-3">
      <img
        v-if="post.author.avatar"
        :src="post.author.avatar"
        alt=""
        :class="nested ? 'size-8' : 'size-11'"
        class="shrink-0 rounded-full border bg-muted"
        referrerpolicy="no-referrer"
        loading="lazy"
      >
      <div class="min-w-0">
        <p class="flex items-center gap-1 truncate font-semibold">
          {{ post.author.name }}
          <BadgeCheck v-if="post.author.verified" class="size-4 shrink-0 text-primary" aria-label="Verified" />
        </p>
        <p class="truncate text-sm text-muted-foreground">
          @{{ post.author.handle }}<template v-if="date">
            · <time :datetime="post.createdAt">{{ date }}</time>
          </template>
        </p>
      </div>
    </header>

    <p v-if="post.replyTo" class="mt-3 flex items-center gap-1.5 text-sm text-muted-foreground">
      <CornerUpLeft class="size-3.5" aria-hidden="true" />
      Replying to
      <button type="button" class="font-medium text-primary underline-offset-4 hover:underline" @click="emit('open', `https://x.com/${post.replyTo.handle}/status/${post.replyTo.id}`)">
        @{{ post.replyTo.handle }}
      </button>
    </p>

    <p v-if="post.text" class="mt-3 whitespace-pre-line break-words" :class="nested ? 'text-sm' : 'text-[15px] leading-relaxed'" :lang="post.lang">
      <template v-for="(segment, i) in segments" :key="i">
        <a v-if="segment.link" :href="segment.text" target="_blank" rel="noopener noreferrer nofollow" class="text-primary underline-offset-4 hover:underline">{{ segment.text }}</a>
        <template v-else>
          {{ segment.text }}
        </template>
      </template>
    </p>
    <p v-if="post.truncated" class="mt-2 text-sm text-muted-foreground">
      This is the first part of a longer post — X only shares that much without an account.
      <a :href="post.url" target="_blank" rel="noopener noreferrer" class="font-medium text-primary underline-offset-4 hover:underline">Read the rest on X</a>.
    </p>

    <!-- ── media ── -->
    <div v-if="post.media.length" class="mt-4">
      <button
        v-if="!revealed"
        type="button"
        class="flex min-h-32 w-full flex-col items-center justify-center gap-2 rounded-xl border bg-muted text-sm hover:bg-muted/70"
        @click="revealed = true"
      >
        <Eye class="size-5 text-muted-foreground" aria-hidden="true" />
        The author marked this media as sensitive. Show it
      </button>

      <ul v-else class="grid gap-3" :class="post.media.length > 1 ? 'sm:grid-cols-2' : ''">
        <li v-for="(media, index) in post.media" :key="index" class="flex flex-col gap-2">
          <div class="relative overflow-hidden rounded-xl border bg-muted">
            <img
              v-if="media.type === 'photo'"
              :src="media.url"
              :alt="media.alt ?? `Photo ${index + 1} from the post`"
              :width="media.width || undefined"
              :height="media.height || undefined"
              class="h-auto max-h-[28rem] w-full object-contain"
              referrerpolicy="no-referrer"
              loading="lazy"
            >
            <!--
              Played straight from X. preload="none" so a post with four videos
              does not start four downloads before anyone presses play.
            -->
            <video
              v-else
              :src="sourceFor?.(media, index) ?? media.renditions[0]?.url"
              :poster="media.url"
              :loop="media.type === 'gif'"
              :muted="media.type === 'gif'"
              controls
              playsinline
              preload="none"
              class="max-h-[28rem] w-full bg-black"
              :aria-label="media.alt ?? `${media.type === 'gif' ? 'GIF' : 'Video'} ${index + 1} from the post`"
            />
            <span v-if="media.type !== 'photo'" class="pointer-events-none absolute left-2 top-2 inline-flex items-center gap-1 rounded-md bg-black/70 px-1.5 py-0.5 text-xs font-medium text-white">
              <Film class="size-3" aria-hidden="true" />
              {{ media.type === 'gif' ? 'GIF' : duration(media.durationMs) }}
            </span>
          </div>

          <div v-if="!nested" class="flex flex-wrap items-center gap-2">
            <Select
              v-if="media.type === 'video' && media.renditions.length > 1"
              :model-value="String(choice?.[index] ?? 0)"
              @update:model-value="value => emit('choose', index, Number(value))"
            >
              <SelectTrigger class="h-9 w-auto min-w-36" :aria-label="`Quality for video ${index + 1}`">
                {{ renditionLabel(media.renditions[choice?.[index] ?? 0]!) }}
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="(rendition, r) in media.renditions" :key="rendition.url" :value="String(r)">
                  {{ renditionLabel(rendition) }}
                </SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" :disabled="progress?.[index] !== undefined" @click="emit('download', index)">
              <Loader2 v-if="progress?.[index] !== undefined" class="size-4 animate-spin" />
              <Download v-else class="size-4" />
              <template v-if="progress?.[index] !== undefined">
                {{ progress[index] ? `${Math.round(progress[index]! * 100)}%` : 'Starting…' }}
              </template>
              <template v-else>
                Download {{ media.type === 'photo' ? 'photo' : media.type === 'gif' ? 'GIF' : 'video' }}
              </template>
            </Button>
          </div>
        </li>
      </ul>
    </div>

    <div v-if="post.quoted" class="mt-4">
      <XPostCard :post="post.quoted" nested @open="url => emit('open', url)" />
      <button type="button" class="mt-2 text-sm font-medium text-primary underline-offset-4 hover:underline" @click="emit('open', post.quoted.url)">
        Read and download the quoted post
      </button>
    </div>

    <footer v-if="!nested" class="mt-4 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
      <span class="inline-flex items-center gap-1.5"><Heart class="size-4" aria-hidden="true" /> {{ count.format(post.likes) }}<span class="sr-only">likes</span></span>
      <span class="inline-flex items-center gap-1.5"><MessageCircle class="size-4" aria-hidden="true" /> {{ count.format(post.replies) }}<span class="sr-only">replies</span></span>
      <a :href="post.url" target="_blank" rel="noopener noreferrer" class="ml-auto font-medium text-primary underline-offset-4 hover:underline">Open on X</a>
    </footer>
  </article>
</template>
