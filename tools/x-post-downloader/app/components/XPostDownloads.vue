<script setup lang="ts">
import type { Post, PostMedia } from '../../core'
import { Check, Copy, Download, Film, Image as ImageIcon, Loader2 } from 'lucide-vue-next'
import { mediaFilename, renditionLabel } from '../../core'

/**
 * The download area, kept apart from the post so the card can look exactly
 * like X's and this can stay plain, uncrowded and keyboard-friendly.
 */
const props = defineProps<{
  post: Post
  progress: Record<number, number>
  choice: Record<number, number>
  copied?: boolean
}>()

const emit = defineEmits<{
  download: [index: number]
  downloadAll: []
  choose: [index: number, rendition: number]
  copyText: []
}>()

function label(media: PostMedia, index: number) {
  const kind = media.type === 'photo' ? 'Photo' : media.type === 'gif' ? 'GIF' : 'Video'
  return props.post.media.length > 1 ? `${kind} ${index + 1}` : kind
}

function detail(media: PostMedia) {
  if (media.type === 'photo')
    return media.width ? `${media.width}×${media.height} · original size` : 'Original size'
  if (media.type === 'gif')
    return 'Saved as MP4, which is what X stores'
  if (!media.durationMs)
    return ''
  const seconds = Math.round(media.durationMs / 1000)
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}
</script>

<template>
  <section class="rounded-2xl border bg-background p-5 dark:bg-input/30" aria-labelledby="x-downloads-heading">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h2 id="x-downloads-heading" class="text-sm font-semibold">
        {{ post.media.length ? 'Download' : 'Nothing to download' }}
      </h2>
      <div class="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" @click="emit('copyText')">
          <component :is="copied ? Check : Copy" class="size-4" />
          {{ copied ? 'Copied' : 'Copy post as text' }}
        </Button>
        <Button v-if="post.media.length > 1" size="sm" @click="emit('downloadAll')">
          <Download class="size-4" />
          Download all {{ post.media.length }}
        </Button>
      </div>
    </div>
    <p v-if="!post.media.length" class="mt-2 text-sm text-muted-foreground">
      This post has no photos or videos. You can still copy its text.
    </p>

    <ul v-else class="mt-4 flex flex-col gap-3">
      <li v-for="(media, index) in post.media" :key="index" class="flex flex-wrap items-center gap-3 rounded-xl border px-3 py-2">
        <span class="relative size-12 shrink-0 overflow-hidden rounded-lg border bg-muted">
          <img :src="media.url" alt="" class="size-full object-cover" referrerpolicy="no-referrer" loading="lazy">
          <Film v-if="media.type !== 'photo'" class="absolute bottom-0.5 right-0.5 size-4 rounded bg-black/70 p-0.5 text-white" aria-hidden="true" />
        </span>
        <span class="min-w-0 grow">
          <span class="flex items-center gap-1.5 text-sm font-medium">
            <ImageIcon v-if="media.type === 'photo'" class="size-3.5 text-muted-foreground" aria-hidden="true" />
            {{ label(media, index) }}
          </span>
          <span class="block truncate text-xs text-muted-foreground">
            {{ detail(media) }}<template v-if="detail(media)"> · </template>{{ mediaFilename(post, index) }}
          </span>
        </span>
        <Select
          v-if="media.type === 'video' && media.renditions.length > 1"
          :model-value="String(choice[index] ?? 0)"
          @update:model-value="value => emit('choose', index, Number(value))"
        >
          <SelectTrigger class="w-auto min-w-40" :aria-label="`Quality for ${label(media, index).toLowerCase()}`">
            {{ renditionLabel(media.renditions[choice[index] ?? 0]!) }}
          </SelectTrigger>
          <SelectContent>
            <SelectItem v-for="(rendition, r) in media.renditions" :key="rendition.url" :value="String(r)">
              {{ renditionLabel(rendition) }}
            </SelectItem>
          </SelectContent>
        </Select>
        <Button :disabled="progress[index] !== undefined" class="min-w-32" @click="emit('download', index)">
          <Loader2 v-if="progress[index] !== undefined" class="size-4 animate-spin" />
          <Download v-else class="size-4" />
          <template v-if="progress[index] !== undefined">
            {{ progress[index] ? `${Math.round(progress[index]! * 100)}%` : 'Starting…' }}
          </template>
          <template v-else>
            Download
          </template>
        </Button>
      </li>
    </ul>
  </section>
</template>
