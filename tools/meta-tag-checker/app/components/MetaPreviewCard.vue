<script setup lang="ts">
import type { Card, Platform } from '../../core'

const props = defineProps<{ platform: Platform, card: Card, sourceUrl?: string }>()

const LABEL: Record<Platform, string> = {
  google: 'Google',
  x: 'X',
  facebook: 'Facebook',
  linkedin: 'LinkedIn',
  slack: 'Slack',
}

/**
 * The image is loaded from wherever the page points it.
 *
 * That request carries the reader's IP to a third party, exactly as the EXIF
 * viewer's map tiles do — but here it is the whole point of the preview and
 * the URL is one the user just asked about, so it loads. It is still worth
 * knowing that this is the one part of the tool that talks to anyone else.
 */
const broken = ref(false)
watch(() => props.card.image, () => { broken.value = false })

const host = computed(() => {
  const raw = props.card.url ?? props.sourceUrl ?? ''
  try {
    return new URL(raw).hostname.replace(/^www\./, '')
  }
  catch {
    return raw.replace(/^https?:\/\//, '').split('/')[0] ?? ''
  }
})

const large = computed(() => props.platform !== 'x' || props.card.cardType === 'summary_large_image')
function clamp(text: string | null, max: number) {
  return !text ? '' : text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text
}
</script>

<template>
  <figure class="min-w-0">
    <figcaption class="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
      {{ LABEL[platform] }}
    </figcaption>

    <!-- Google draws a text result, not a card. -->
    <div v-if="platform === 'google'" class="rounded-xl border bg-background p-4 dark:bg-input/30">
      <p class="truncate text-xs text-muted-foreground">
        {{ host || 'example.com' }}
      </p>
      <p class="mt-0.5 truncate text-lg text-[#1a0dab] dark:text-[#8ab4f8]">
        {{ clamp(card.title, 60) || 'No title' }}
      </p>
      <p class="mt-1 line-clamp-2 text-sm text-muted-foreground">
        {{ clamp(card.description, 160) || 'No description — Google will write one from the page text.' }}
      </p>
    </div>

    <div v-else class="overflow-hidden rounded-xl border bg-background dark:bg-input/30">
      <!-- `summary` shows a small square thumbnail, not a letterboxed strip.
           `aspect-square` on a full-width block gives a square as tall as the
           card is wide, so the small variant is sized explicitly instead. -->
      <div
        class="border-b bg-muted"
        :class="large ? 'aspect-[1.91/1]' : 'grid place-items-center p-3'"
      >
        <img
          v-if="card.image && !broken"
          :src="card.image"
          alt=""
          class="object-cover"
          :class="large ? 'size-full' : 'size-24 rounded-md'"
          @error="broken = true"
        >
        <span v-else class="grid size-full place-items-center px-3 text-center text-xs text-muted-foreground" :class="large ? '' : 'size-24'">
          {{ broken ? 'Image did not load' : 'No image' }}
        </span>
      </div>

      <div class="space-y-1 p-3">
        <p class="truncate text-xs text-muted-foreground">
          {{ host || 'example.com' }}
        </p>
        <p class="truncate text-sm font-semibold">
          {{ clamp(card.title, 70) || 'No title' }}
        </p>
        <p class="line-clamp-2 text-xs text-muted-foreground">
          {{ clamp(card.description, 200) || 'No description' }}
        </p>
      </div>
    </div>
  </figure>
</template>
