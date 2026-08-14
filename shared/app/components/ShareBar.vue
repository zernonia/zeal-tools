<script setup lang="ts">
const props = defineProps<{
  tool: string
  shareCopy?: string
  /** Returns a PNG blob of the current output, used by Copy image / Web Share. */
  getImageBlob?: () => Promise<Blob | null>
}>()

const { track } = useAnalytics()
const copied = ref<'link' | 'image' | null>(null)
const canShare = ref(false)
onMounted(() => { canShare.value = typeof navigator.share === 'function' })

async function copyLink() {
  await navigator.clipboard.writeText(window.location.href)
  copied.value = 'link'
  setTimeout(() => copied.value = null, 1600)
  track('share_clicked', { tool: props.tool, channel: 'copy_link' })
}

function shareOnX() {
  const text = props.shareCopy ?? 'Free tools, made with zeal.'
  const url = `https://x.com/intent/post?text=${encodeURIComponent(text)}&url=${encodeURIComponent(window.location.href)}`
  window.open(url, '_blank', 'noopener,width=600,height=500')
  track('share_clicked', { tool: props.tool, channel: 'x' })
}

async function copyImage() {
  const blob = await props.getImageBlob?.()
  if (!blob) return
  await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })])
  copied.value = 'image'
  setTimeout(() => copied.value = null, 1600)
  track('share_clicked', { tool: props.tool, channel: 'copy_image' })
}

async function webShare() {
  const blob = await props.getImageBlob?.()
  const data: ShareData = { title: 'zeal.tools', url: window.location.href }
  if (blob) {
    const file = new File([blob], `${props.tool}.png`, { type: 'image/png' })
    if (navigator.canShare?.({ files: [file] })) data.files = [file]
  }
  try {
    await navigator.share(data)
    track('share_clicked', { tool: props.tool, channel: 'web_share' })
  }
  catch { /* user dismissed */ }
}
</script>

<template>
  <div class="flex flex-wrap items-center gap-2" role="group" aria-label="Share">
    <button type="button" class="inline-flex h-9 items-center gap-1.5 rounded-lg border border-neutral-200 px-3 text-xs font-medium transition-colors hover:border-neutral-300 hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800" @click="copyLink">
      <svg class="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7" /><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" /></svg>
      {{ copied === 'link' ? 'Copied!' : 'Copy link' }}
    </button>
    <button v-if="getImageBlob" type="button" class="inline-flex h-9 items-center gap-1.5 rounded-lg border border-neutral-200 px-3 text-xs font-medium transition-colors hover:border-neutral-300 hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800" @click="copyImage">
      <svg class="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-4.4-4.4a2 2 0 0 0-2.8 0L4 20" /></svg>
      {{ copied === 'image' ? 'Copied!' : 'Copy image' }}
    </button>
    <button type="button" class="inline-flex h-9 items-center gap-1.5 rounded-lg border border-neutral-200 px-3 text-xs font-medium transition-colors hover:border-neutral-300 hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800" @click="shareOnX">
      <svg class="size-3" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18.9 1.2h3.7l-8.1 9.3L24 22.8h-7.5l-5.9-7.7-6.7 7.7H.2l8.7-9.9L0 1.2h7.7l5.3 7 6-7Zm-1.3 19.4h2L6.6 3.3H4.4l13.2 17.3Z" /></svg>
      Post on X
    </button>
    <button v-if="canShare" type="button" class="inline-flex h-9 items-center gap-1.5 rounded-lg border border-neutral-200 px-3 text-xs font-medium transition-colors hover:border-neutral-300 hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800" @click="webShare">
      <svg class="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4" /></svg>
      Share
    </button>
  </div>
</template>
