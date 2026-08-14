<script setup lang="ts">
import { Image, Link2, Share2 } from 'lucide-vue-next'

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
    <Button variant="outline" size="sm" @click="copyLink">
      <Link2 class="size-3.5" />
      {{ copied === 'link' ? 'Copied!' : 'Copy link' }}
    </Button>
    <Button v-if="getImageBlob" variant="outline" size="sm" @click="copyImage">
      <Image class="size-3.5" />
      {{ copied === 'image' ? 'Copied!' : 'Copy image' }}
    </Button>
    <Button variant="outline" size="sm" @click="shareOnX">
      <svg class="size-3" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18.9 1.2h3.7l-8.1 9.3L24 22.8h-7.5l-5.9-7.7-6.7 7.7H.2l8.7-9.9L0 1.2h7.7l5.3 7 6-7Zm-1.3 19.4h2L6.6 3.3H4.4l13.2 17.3Z" /></svg>
      Post on X
    </Button>
    <Button v-if="canShare" variant="outline" size="sm" @click="webShare">
      <Share2 class="size-3.5" />
      Share
    </Button>
  </div>
</template>
