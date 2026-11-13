<script setup lang="ts">
import { Check, Copy, Download, Loader2, Search } from 'lucide-vue-next'
import { postMarkdown } from '../../core'
import { EXAMPLE_URL, useXPost } from '../composables/useXPost'

/**
 * Nothing here needs a browser at setup — the page renders on the server with
 * an empty form, and a shared link is read on mount.
 */
const {
  state,
  post,
  loading,
  error,
  inputError,
  progress,
  choice,
  read,
  download,
  downloadAll,
  sourceFor,
  track,
} = useXPost()

const copied = ref(false)
async function copyText() {
  if (!post.value)
    return
  try {
    await navigator.clipboard.writeText(postMarkdown(post.value))
    copied.value = true
    setTimeout(() => copied.value = false, 1600)
    track('tool_completed', { tool: 'x-post-downloader', format: 'text' })
  }
  catch { copied.value = false }
}

function open(url: string) {
  state.url = url
  void read()
}

function example() {
  state.url = EXAMPLE_URL
  void read()
}

const summary = computed(() => {
  if (loading.value)
    return 'Reading the post.'
  if (error.value)
    return error.value
  if (!post.value)
    return ''
  const media = post.value.media.length
  return `Post by ${post.value.author.name}${media ? ` with ${media} ${media === 1 ? 'file' : 'files'} to download` : ''}.`
})

const sectionClass = 'rounded-2xl border bg-background p-5 dark:bg-input/30'
</script>

<template>
  <div class="tool-frame flex flex-col gap-5">
    <p class="sr-only" aria-live="polite">
      {{ summary }}
    </p>

    <section :class="sectionClass">
      <Label for="x-post-url">Link to a post on X</Label>
      <form class="mt-2 flex gap-2" @submit.prevent="read()">
        <Input
          id="x-post-url"
          v-model="state.url"
          type="url"
          inputmode="url"
          placeholder="https://x.com/NASA/status/2119833829389041896"
          autocomplete="off"
          :aria-invalid="!!inputError || undefined"
          aria-describedby="x-post-note"
        />
        <Button type="submit" :disabled="loading || !state.url.trim() || !!inputError">
          <Loader2 v-if="loading" class="size-4 animate-spin" />
          <Search v-else class="size-4" />
          Read
        </Button>
      </form>
      <!-- Said plainly, like the meta tag checker: what reaches us, and what does not. -->
      <p id="x-post-note" class="mt-2 text-xs text-muted-foreground">
        X only lets its own embeds read a post from a browser, so the link goes through our server to fetch the
        post's text. The videos and photos then come straight from X to your device. Nothing is stored or logged.
      </p>
      <p v-if="inputError || error" class="mt-2 text-sm text-destructive" role="alert">
        {{ inputError || error }}
      </p>
      <button
        v-if="!post && !loading && !state.url.trim()"
        type="button"
        class="mt-3 text-sm font-medium text-primary underline-offset-4 hover:underline"
        @click="example"
      >
        Try it with a NASA post
      </button>
    </section>

    <template v-if="post">
      <XPostCard
        :post="post"
        :progress="progress"
        :choice="choice"
        :source-for="sourceFor"
        @download="download"
        @choose="(index, rendition) => choice = { ...choice, [index]: rendition }"
        @open="open"
      />

      <div class="flex flex-wrap justify-end gap-2">
        <Button variant="outline" @click="copyText">
          <component :is="copied ? Check : Copy" class="size-4" />
          {{ copied ? 'Copied' : 'Copy as text' }}
        </Button>
        <Button v-if="post.media.length > 1" @click="downloadAll">
          <Download class="size-4" />
          Download all {{ post.media.length }}
        </Button>
      </div>
    </template>
  </div>
</template>
