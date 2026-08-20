<script setup lang="ts">
import { ArrowLeftRight, AudioLines, AudioWaveform, CalendarClock, FileArchive, ImageMinus, KeyRound, Music, QrCode, ReceiptText, ScanSearch, Star, Timer, Wrench } from 'lucide-vue-next'

const props = defineProps<{ slug: string }>()

/**
 * One icon set for the whole nav. `meta.icon` stays an emoji because the
 * homepage grid and the ⌘K palette want the colour, but mixed emoji weights
 * look accidental in a dense list — these are all the same stroke family.
 *
 * Keyed by slug rather than stored on ToolMeta so the registry stays plain
 * data with no component imports, and only the icons we use get bundled.
 */
const ICONS: Record<string, Component> = {
  'qr-code-generator': QrCode,
  'chord-transposer': Music,
  'worship-pads': AudioWaveform,
  'stage-timer': Timer,
  'countdown-timer': CalendarClock,
  'background-remover': ImageMinus,
  'password-generator': KeyRound,
  'send-to-device': ArrowLeftRight,
  'image-compressor': FileArchive,
  'exif-viewer': ScanSearch,
  'favicon-generator': Star,
  'tuner': AudioLines,
  'invoice-maker': ReceiptText,
}

const icon = computed(() => ICONS[props.slug] ?? Wrench)
</script>

<template>
  <component :is="icon" />
</template>
