<script setup lang="ts">
import {
  Camera,
  CameraOff,
  ClipboardPaste,
  Flashlight,
  FlashlightOff,
  History,
  ImageUp,
  LoaderCircle,
  Maximize,
  MonitorSmartphone,
  ScanQrCode,
  ShieldCheck,
  SunDim,
  SwitchCamera,
  Trash2,
} from 'lucide-vue-next'
import { formatLabel, KIND_LABELS, summarise, worstSeverity } from '../../core'
import { useQrScanner } from '../composables/useQrScanner'

const video = ref<HTMLVideoElement | null>(null)

const {
  cameraState,
  cameraError,
  cameras,
  cameraLabel,
  torchSupported,
  torchOn,
  current,
  currentSource,
  history,
  announcement,
  imageBusy,
  imageMessage,
  engineKind,
  engineFormats,
  canReadClipboard,
  startCamera,
  stopCamera,
  switchCamera,
  toggleTorch,
  scanImage,
  pasteFromClipboard,
  show,
  clearHistory,
} = useQrScanner(video)

const scanning = computed(() => cameraState.value === 'scanning')
const starting = computed(() => cameraState.value === 'starting')
const dragging = ref(false)

function onDrop(event: DragEvent) {
  dragging.value = false
  const file = event.dataTransfer?.files?.[0]
  void scanImage(file, 'image', file?.name)
}

function onFile(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  void scanImage(file, 'image', file?.name)
  // Choosing the same file again should scan it again.
  input.value = ''
}

const engineNote = computed(() => {
  if (engineKind.value === 'native') {
    const others = engineFormats.value.filter(f => f !== 'qr_code').map(formatLabel)
    return others.length
      ? `Reading with your browser’s built-in barcode detector: QR codes, plus ${others.join(', ')}.`
      : 'Reading with your browser’s built-in barcode detector.'
  }
  if (engineKind.value === 'jsqr')
    return 'Your browser has no built-in barcode detector, so QR codes are read by jsQR, loaded just now. Product barcodes (EAN, UPC) need a browser that has one, such as Chrome on Android or a Mac.'
  return ''
})

const sourceLabel: Record<string, string> = { camera: 'Camera', image: 'Image', paste: 'Pasted' }

const TIPS = [
  { icon: Maximize, text: 'Hold the code flat and fill about a third of the frame.' },
  { icon: SunDim, text: 'Tilt away from lamps and windows if glare crosses it.' },
  { icon: MonitorSmartphone, text: 'On another screen? Screenshot it and paste it here.' },
]

/** Controls laid over the video: legible on any picture, whatever the theme. */
const overlayButton = 'border-white/25 bg-black/55 text-white backdrop-blur hover:bg-black/75 hover:text-white dark:bg-black/55 dark:hover:bg-black/75'
</script>

<template>
  <div class="tool-frame flex flex-col gap-5">
    <p class="sr-only" aria-live="polite">
      {{ announcement }}
    </p>

    <div class="grid gap-5 lg:grid-cols-2">
      <!-- Inputs: camera, then image -->
      <div class="flex flex-col gap-4">
        <div
          class="relative aspect-square overflow-hidden rounded-2xl border sm:aspect-[4/3]"
          :class="scanning ? 'bg-black' : 'bg-muted/50'"
          @dragover.prevent="dragging = true"
          @dragleave.prevent="dragging = false"
          @drop.prevent="onDrop"
        >
          <!-- Always in the DOM so the stream has somewhere to go; hidden until it plays. -->
          <video
            ref="video"
            class="absolute inset-0 size-full object-cover"
            :class="scanning ? '' : 'invisible'"
            muted
            playsinline
            autoplay
            aria-hidden="true"
          />

          <template v-if="scanning">
            <!-- The target, with everything outside it dimmed so it is obvious where the code goes. -->
            <div class="pointer-events-none absolute inset-0 grid place-items-center pb-12" aria-hidden="true">
              <div class="relative aspect-square w-3/5 max-w-64 rounded-2xl" style="box-shadow: 0 0 0 100vmax rgb(0 0 0 / 0.45)">
                <span class="absolute -left-1 -top-1 size-9 rounded-tl-2xl border-l-4 border-t-4 border-white" />
                <span class="absolute -right-1 -top-1 size-9 rounded-tr-2xl border-r-4 border-t-4 border-white" />
                <span class="absolute -bottom-1 -left-1 size-9 rounded-bl-2xl border-b-4 border-l-4 border-white" />
                <span class="absolute -bottom-1 -right-1 size-9 rounded-br-2xl border-b-4 border-r-4 border-white" />
                <span class="scan-line absolute inset-x-4 h-0.5 rounded-full bg-white shadow-[0_0_12px_2px_rgb(255_255_255/0.7)]" />
              </div>
            </div>
            <span class="absolute left-3 top-3 inline-flex items-center gap-2 rounded-full bg-black/60 px-3 py-1.5 text-xs font-medium text-white backdrop-blur" aria-hidden="true">
              <span class="live-dot size-2 rounded-full bg-white" />
              Scanning
            </span>
            <div class="absolute inset-x-0 bottom-0 flex flex-wrap justify-center gap-2 p-3">
              <Button size="lg" variant="outline" :class="overlayButton" @click="stopCamera">
                <CameraOff class="size-4" aria-hidden="true" /> Stop camera
              </Button>
              <Button
                v-if="cameras.length > 1"
                variant="outline"
                size="lg"
                :class="overlayButton"
                :aria-label="`Switch camera. Now using ${cameraLabel || 'the default camera'}`"
                @click="switchCamera"
              >
                <SwitchCamera class="size-4" aria-hidden="true" /> Switch
              </Button>
              <Button
                v-if="torchSupported"
                variant="outline"
                size="lg"
                :class="overlayButton"
                :aria-pressed="torchOn"
                @click="toggleTorch"
              >
                <FlashlightOff v-if="torchOn" class="size-4" aria-hidden="true" />
                <Flashlight v-else class="size-4" aria-hidden="true" />
                Torch
              </Button>
            </div>
          </template>

          <div v-else class="absolute inset-0 flex flex-col items-center justify-center gap-5 p-6 text-center">
            <!-- A code in a viewfinder, drawn in the theme's own colours. -->
            <svg viewBox="0 0 120 120" class="size-24 sm:size-28" aria-hidden="true">
              <path
                d="M6 28V14a8 8 0 0 1 8-8h14M92 6h14a8 8 0 0 1 8 8v14M114 92v14a8 8 0 0 1-8 8H92M28 114H14a8 8 0 0 1-8-8V92"
                fill="none"
                stroke="currentColor"
                stroke-width="4"
                stroke-linecap="round"
                class="text-foreground"
              />
              <g class="text-muted-foreground" fill="currentColor">
                <path fill-rule="evenodd" d="M24 24h22v22H24zm5 5v12h12V29z" />
                <rect x="32" y="32" width="6" height="6" />
                <path fill-rule="evenodd" d="M74 24h22v22H74zm5 5v12h12V29z" />
                <rect x="82" y="32" width="6" height="6" />
                <path fill-rule="evenodd" d="M24 74h22v22H24zm5 5v12h12V79z" />
                <rect x="32" y="82" width="6" height="6" />
                <rect x="52" y="24" width="6" height="6" /><rect x="62" y="30" width="6" height="6" /><rect x="52" y="40" width="6" height="6" />
                <rect x="24" y="52" width="6" height="6" /><rect x="36" y="58" width="6" height="6" /><rect x="52" y="52" width="6" height="6" />
                <rect x="62" y="58" width="6" height="6" /><rect x="74" y="52" width="6" height="6" /><rect x="86" y="58" width="10" height="6" />
                <rect x="52" y="68" width="6" height="6" /><rect x="62" y="78" width="6" height="6" /><rect x="74" y="74" width="6" height="6" />
                <rect x="86" y="80" width="6" height="6" /><rect x="52" y="86" width="6" height="10" /><rect x="74" y="90" width="10" height="6" />
                <rect x="90" y="90" width="6" height="6" />
              </g>
              <rect class="scan-line-svg text-foreground" x="14" y="58.5" width="92" height="3" rx="1.5" fill="currentColor" />
            </svg>
            <div>
              <p class="text-lg font-semibold">
                Point your camera at a code
              </p>
              <p class="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
                Frames are read on your device and never recorded or uploaded. Links are shown to you first, never opened by themselves.
              </p>
            </div>
            <Button size="lg" :disabled="starting" @click="startCamera()">
              <LoaderCircle v-if="starting" class="size-4 animate-spin" aria-hidden="true" />
              <Camera v-else class="size-4" aria-hidden="true" />
              {{ starting ? 'Starting camera…' : 'Start camera' }}
            </Button>
            <p v-if="cameraError" class="max-w-sm text-sm text-destructive" role="alert">
              {{ cameraError }}
            </p>
          </div>
        </div>

        <!-- Image: drop, choose or paste -->
        <div
          class="flex flex-col gap-4 rounded-2xl border-2 border-dashed p-5 transition-colors"
          :class="dragging ? 'border-primary bg-muted/60' : 'border-border'"
          @dragover.prevent="dragging = true"
          @dragleave.prevent="dragging = false"
          @drop.prevent="onDrop"
        >
          <div class="flex items-center gap-3">
            <span class="grid size-11 shrink-0 place-items-center rounded-xl bg-muted text-muted-foreground" aria-hidden="true">
              <ImageUp class="size-5" />
            </span>
            <div class="min-w-0">
              <p class="text-sm font-medium">
                Or scan a screenshot or photo
              </p>
              <p class="text-xs text-muted-foreground">
                Drop it here, choose a file, or paste it with
                <span class="whitespace-nowrap"><kbd class="rounded border bg-muted px-1 font-mono">Ctrl</kbd>+<kbd class="rounded border bg-muted px-1 font-mono">V</kbd></span>
                or <span class="whitespace-nowrap"><kbd class="rounded border bg-muted px-1 font-mono">⌘</kbd>+<kbd class="rounded border bg-muted px-1 font-mono">V</kbd></span>.
              </p>
            </div>
          </div>
          <div class="flex flex-wrap gap-2">
            <input
              id="qr-scan-file"
              type="file"
              class="peer sr-only"
              accept="image/*"
              @change="onFile"
            >
            <label
              for="qr-scan-file"
              class="inline-flex h-11 flex-1 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-border bg-background px-4 text-sm font-medium transition-colors hover:bg-muted peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring sm:flex-none dark:bg-input/30 dark:hover:bg-input/50"
            >
              <LoaderCircle v-if="imageBusy" class="size-4 animate-spin" aria-hidden="true" />
              <ImageUp v-else class="size-4" aria-hidden="true" />
              Scan an image
            </label>
            <Button v-if="canReadClipboard" variant="outline" size="lg" class="flex-1 sm:flex-none" :disabled="imageBusy" @click="pasteFromClipboard">
              <ClipboardPaste class="size-4" aria-hidden="true" /> Paste
            </Button>
          </div>
          <p v-if="imageMessage" class="text-sm text-destructive" role="alert">
            {{ imageMessage }}
          </p>
        </div>
      </div>

      <!-- Result -->
      <section
        aria-labelledby="scan-result-heading"
        class="flex flex-col rounded-2xl border bg-background p-5 dark:bg-input/30"
        :class="current && worstSeverity(current.warnings) === 'danger' ? 'border-destructive/50' : ''"
      >
        <QrScanResult v-if="current" :key="current.raw + current.format" :result="current" />
        <div v-else class="flex flex-1 flex-col">
          <h2 id="scan-result-heading" class="text-sm font-semibold">
            Result
          </h2>
          <div class="flex flex-1 flex-col items-center justify-center gap-3 py-8 text-center">
            <span class="relative grid size-20 place-items-center rounded-2xl border-2 border-dashed text-muted-foreground" aria-hidden="true">
              <ScanQrCode class="size-9" />
              <span class="absolute -right-2.5 -top-2.5 grid size-8 place-items-center rounded-full bg-primary text-primary-foreground ring-4 ring-background dark:ring-card">
                <ShieldCheck class="size-4" />
              </span>
            </span>
            <p class="mt-2 font-medium">
              Nothing scanned yet
            </p>
            <p class="max-w-xs text-sm text-muted-foreground">
              What a code holds appears here. For a link, the real website it leads to — and anything suspicious about it — before you open it.
            </p>
          </div>
          <ul class="grid gap-2.5 border-t pt-4 text-sm">
            <li v-for="tip in TIPS" :key="tip.text" class="flex items-center gap-3">
              <span class="grid size-9 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground" aria-hidden="true">
                <component :is="tip.icon" class="size-4" />
              </span>
              <span class="text-muted-foreground">{{ tip.text }}</span>
            </li>
          </ul>
        </div>
        <p v-if="current && currentSource" class="mt-auto pt-4 text-xs text-muted-foreground">
          From: {{ sourceLabel[currentSource] }}
        </p>
      </section>
    </div>

    <!-- History, in memory only -->
    <section v-if="history.length" aria-labelledby="scan-history-heading" class="rounded-2xl border bg-background p-5 dark:bg-input/30">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <h2 id="scan-history-heading" class="flex items-center gap-2 text-sm font-semibold">
          <History class="size-4" aria-hidden="true" /> This session’s scans
        </h2>
        <Button variant="ghost" size="sm" class="h-11" @click="clearHistory">
          <Trash2 class="size-4" aria-hidden="true" /> Clear
        </Button>
      </div>
      <p class="mt-1 text-xs text-muted-foreground">
        Kept in this tab only. Nothing is saved, and the list is gone when you close or reload the page.
      </p>
      <ul class="mt-3 flex flex-col gap-1">
        <li v-for="entry in history" :key="entry.id">
          <button
            type="button"
            class="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            :class="current === entry.result ? 'bg-muted' : ''"
            :aria-current="current === entry.result ? 'true' : undefined"
            @click="show(entry)"
          >
            <span class="hidden w-28 shrink-0 text-xs sm:block text-muted-foreground">{{ KIND_LABELS[entry.result.kind] }}</span>
            <span class="min-w-0 flex-1 truncate font-medium">{{ summarise(entry.result) }}</span>
            <span v-if="worstSeverity(entry.result.warnings) === 'danger'" class="shrink-0 rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">Check</span>
            <span class="shrink-0 text-xs tabular-nums text-muted-foreground">{{ entry.at.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) }}</span>
          </button>
        </li>
      </ul>
    </section>

    <p v-if="engineNote" class="text-xs text-muted-foreground">
      {{ engineNote }}
    </p>
  </div>
</template>

<style scoped>
.scan-line {
  top: 12%;
  animation: scan-sweep 2.2s ease-in-out infinite alternate;
}

@keyframes scan-sweep {
  to {
    top: 88%;
  }
}

.scan-line-svg {
  opacity: 0.85;
  animation: scan-svg 2.4s ease-in-out infinite alternate;
}

@keyframes scan-svg {
  from {
    transform: translateY(-36px);
  }
  to {
    transform: translateY(36px);
  }
}

.live-dot {
  animation: live 1s ease-in-out infinite alternate;
}

@keyframes live {
  to {
    opacity: 0.25;
  }
}

/*
 * The global reduced-motion rule shortens animations to 0.01ms, which for an
 * infinite alternating sweep would mean a flickering line. Hold it still.
 */
@media (prefers-reduced-motion: reduce) {
  .scan-line {
    top: 50%;
    animation: none !important;
  }

  .scan-line-svg,
  .live-dot {
    animation: none !important;
  }
}
</style>
