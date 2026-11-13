import type { StateSchema } from '../../../../shared/core/url-state'
import type { Post, PostMedia } from '../../core'
import { mediaFilename, parsePostRef } from '../../core'

const schema = {
  url: { type: 'string', default: '' },
} satisfies StateSchema

/** A NASA post with a video, for the example button: public, and theirs to share. */
export const EXAMPLE_URL = 'https://x.com/NASA/status/2119833829389041896'

export function useXPost() {
  const state = useToolState(schema)
  const { track } = useAnalytics()

  const post = ref<Post | null>(null)
  const loading = ref(false)
  const error = ref('')
  /** Download progress per media index, 0–1; absent when idle. */
  const progress = ref<Record<number, number>>({})
  /** The rendition chosen per video, by index into its renditions. */
  const choice = ref<Record<number, number>>({})

  const parsed = computed(() => parsePostRef(state.url))
  const inputError = computed(() => (state.url.trim() && 'error' in parsed.value ? parsed.value.error : ''))

  /** The only request to our server: the post's data. Media never comes here. */
  async function read() {
    const ref = parsed.value
    if ('error' in ref || loading.value)
      return
    loading.value = true
    error.value = ''
    try {
      const response = await $fetch<{ post: Post }>('/api/v1/x-post', { query: { url: ref.id } })
      post.value = response.post
      choice.value = {}
      progress.value = {}
    }
    catch (cause: unknown) {
      post.value = null
      error.value = (cause as { data?: { message?: string } })?.data?.message ?? 'That post could not be read. Try again in a moment.'
    }
    finally {
      loading.value = false
    }
  }

  function sourceFor(media: PostMedia, index: number): string {
    if (media.type === 'photo')
      return media.url
    return media.renditions[choice.value[index] ?? 0]?.url ?? media.url
  }

  /**
   * Fetch the file straight from X's media server and save it under a useful
   * name. X's media hosts allow this page to read them, so the bytes go from
   * X to the visitor without touching us. Streamed, so a long video shows
   * progress instead of a frozen button.
   *
   * If the fetch fails anyway — an extension, a network that strips the CORS
   * header — the file opens in a new tab, where the browser's own save works.
   */
  async function download(index: number) {
    const current = post.value
    const media = current?.media[index]
    if (!current || !media || progress.value[index] !== undefined)
      return
    const url = sourceFor(media, index)
    progress.value = { ...progress.value, [index]: 0 }
    try {
      const response = await fetch(url, { referrerPolicy: 'no-referrer' })
      if (!response.ok || !response.body)
        throw new Error(String(response.status))
      const total = Number(response.headers.get('content-length')) || 0
      const reader = response.body.getReader()
      const chunks: Uint8Array[] = []
      let received = 0
      for (;;) {
        const { done, value } = await reader.read()
        if (done)
          break
        chunks.push(value)
        received += value.length
        if (total)
          progress.value = { ...progress.value, [index]: received / total }
      }
      const blob = new Blob(chunks as BlobPart[], { type: response.headers.get('content-type') ?? undefined })
      const href = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = href
      link.download = mediaFilename(current, index)
      link.click()
      setTimeout(() => URL.revokeObjectURL(href), 10_000)
      track('tool_completed', { tool: 'x-post-downloader', format: media.type })
    }
    catch {
      window.open(url, '_blank', 'noopener,noreferrer')
    }
    finally {
      const { [index]: _, ...rest } = progress.value
      progress.value = rest
    }
  }

  async function downloadAll() {
    const count = post.value?.media.length ?? 0
    for (let index = 0; index < count; index++)
      await download(index)
  }

  // A shared link opens straight onto its post.
  onMounted(() => {
    if (state.url.trim())
      void read()
  })

  return {
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
    track,
  }
}
