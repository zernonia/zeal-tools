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
  ScanQrCode,
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
</script>

<template>
  <div class="tool-frame flex flex-col gap-5">
    <p class="sr-only" aria-live="polite">
      {{ announcement }}
    </p>

    <div class="grid gap-5 lg:grid-cols-2">
      <!-- Inputs: camera, then image -->
      <div class="flex flex-col gap-3">
        <div
          class="relative aspect-square overflow-hidden rounded-2xl border bg-muted sm:aspect-[4/3]"
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

          <div v-if="scanning" class="pointer-events-none absolute inset-0 grid place-items-center" aria-hidden="true">
            <div class="relative aspect-square w-3/5 max-w-72">
              <span class="absolute left-0 top-0 size-8 rounded-tl-xl border-l-4 border-t-4 border-white/90" />
              <span class="absolute right-0 top-0 size-8 rounded-tr-xl border-r-4 border-t-4 border-white/90" />
              <span class="absolute bottom-0 left-0 size-8 rounded-bl-xl border-b-4 border-l-4 border-white/90" />
              <span class="absolute bottom-0 right-0 size-8 rounded-br-xl border-b-4 border-r-4 border-white/90" />
              <span class="scan-line absolute inset-x-3 h-0.5 rounded-full bg-white/80 shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
            </div>
          </div>

          <div v-else class="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center">
            <ScanQrCode class="size-10 text-muted-foreground" aria-hidden="true" />
            <div>
              <p class="font-medium">
                Point your camera at a QR code
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

        <div v-if="scanning" class="flex flex-wrap gap-2">
          <Button variant="outline" size="lg" @click="stopCamera">
            <CameraOff class="size-4" aria-hidden="true" /> Stop camera
          </Button>
          <Button
            v-if="cameras.length > 1"
            variant="outline"
            size="lg"
            :aria-label="`Switch camera. Now using ${cameraLabel || 'the default camera'}`"
            @click="switchCamera"
          >
            <SwitchCamera class="size-4" aria-hidden="true" /> Switch camera
          </Button>
          <Button
            v-if="torchSupported"
            variant="outline"
            size="lg"
            :aria-pressed="torchOn"
            @click="toggleTorch"
          >
            <FlashlightOff v-if="torchOn" class="size-4" aria-hidden="true" />
            <Flashlight v-else class="size-4" aria-hidden="true" />
            Torch
          </Button>
        </div>

        <!-- Image: drop, choose or paste -->
        <div
          class="flex flex-wrap items-center gap-3 rounded-2xl border border-dashed p-4 transition-colors"
          :class="dragging ? 'border-primary bg-muted/40' : 'border-border'"
          @dragover.prevent="dragging = true"
          @dragleave.prevent="dragging = false"
          @drop.prevent="onDrop"
        >
          <input
            id="qr-scan-file"
            type="file"
            class="peer sr-only"
            accept="image/*"
            @change="onFile"
          >
          <label
            for="qr-scan-file"
            class="inline-flex h-11 cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-background px-4 text-sm font-medium transition-colors hover:bg-muted peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring dark:bg-input/30 dark:hover:bg-input/50"
          >
            <LoaderCircle v-if="imageBusy" class="size-4 animate-spin" aria-hidden="true" />
            <ImageUp v-else class="size-4" aria-hidden="true" />
            Scan an image
          </label>
          <Button v-if="canReadClipboard" variant="outline" size="lg" :disabled="imageBusy" @click="pasteFromClipboard">
            <ClipboardPaste class="size-4" aria-hidden="true" /> Paste
          </Button>
          <p class="min-w-48 flex-1 text-sm text-muted-foreground">
            Drop a screenshot or photo here, or paste one with <kbd class="rounded border bg-muted px-1 font-mono text-xs">Ctrl</kbd>+<kbd class="rounded border bg-muted px-1 font-mono text-xs">V</kbd>
            (<kbd class="rounded border bg-muted px-1 font-mono text-xs">⌘</kbd>+<kbd class="rounded border bg-muted px-1 font-mono text-xs">V</kbd> on a Mac).
          </p>
        </div>
        <p v-if="imageMessage" class="text-sm text-destructive" role="alert">
          {{ imageMessage }}
        </p>
      </div>

      <!-- Result -->
      <section
        aria-labelledby="scan-result-heading"
        class="rounded-2xl border bg-background p-5 dark:bg-input/30"
        :class="current && worstSeverity(current.warnings) === 'danger' ? 'border-destructive/50' : ''"
      >
        <QrScanResult v-if="current" :key="current.raw + current.format" :result="current" />
        <div v-else class="flex h-full flex-col gap-3">
          <h2 id="scan-result-heading" class="text-sm font-semibold">
            Result
          </h2>
          <p class="text-sm text-muted-foreground">
            Nothing scanned yet. When a code is read, what it holds appears here — and for a link, the real
            website it leads to, with anything suspicious about it spelt out, before you decide whether to open it.
          </p>
          <ul class="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            <li>Hold the code flat and fill about a third of the frame.</li>
            <li>Tilt away from lamps and windows if glare crosses the code.</li>
            <li>A code on another screen? Take a screenshot and paste it here instead.</li>
          </ul>
        </div>
        <p v-if="current && currentSource" class="mt-4 text-xs text-muted-foreground">
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
            <span class="w-28 shrink-0 text-xs text-muted-foreground">{{ KIND_LABELS[entry.result.kind] }}</span>
            <span class="min-w-0 flex-1 truncate font-medium">{{ summarise(entry.result) }}</span>
            <span v-if="worstSeverity(entry.result.warnings) === 'danger'" class="shrink-0 text-xs font-medium text-destructive">Check</span>
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

/*
 * The global reduced-motion rule shortens animations to 0.01ms, which for an
 * infinite alternating sweep would mean a flickering line. Hold it still.
 */
@media (prefers-reduced-motion: reduce) {
  .scan-line {
    top: 50%;
    animation: none !important;
  }
}
</style>
