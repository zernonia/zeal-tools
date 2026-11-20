<script setup lang="ts">
import { ArrowLeftRight, AudioLines, AudioWaveform, Barcode, Cake, CalendarClock, Dices, EyeOff, FerrisWheel, FileArchive, Globe, ImageMinus, Keyboard, KeyRound, MapPin, MessageSquareQuote, Metronome, MonitorCheck, MonitorPlay, Music, QrCode, ReceiptText, ScanQrCode, ScanSearch, SlidersVertical, Star, Tags, Timer, WholeWord, Wrench } from 'lucide-vue-next'

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
  'name-picker': FerrisWheel,
  'meta-tag-checker': Tags,
  'stem-splitter': SlidersVertical,
  'image-redactor': EyeOff,
  'metronome': Metronome,
  'whois-lookup': Globe,
  'x-post-downloader': MessageSquareQuote,
  'what-is-my-ip': MapPin,
  'age-calculator': Cake,
  'screen-recorder': MonitorPlay,
  'typing-test': Keyboard,
  'word-counter': WholeWord,
  'random-number-generator': Dices,
  'qr-code-scanner': ScanQrCode,
  'device-test': MonitorCheck,
  'barcode-generator': Barcode,
}

const icon = computed(() => ICONS[props.slug] ?? Wrench)
</script>

<template>
  <component :is="icon" />
</template>
