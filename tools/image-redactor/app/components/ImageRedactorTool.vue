<script setup lang="ts">
import { Brush, Check, Copy, Download, Eraser, ImageUp, Maximize, Redo2, Trash2, Undo2, X } from 'lucide-vue-next'
import { REDACT_MODES } from '../../core'
import { useImageRedactor } from '../composables/useImageRedactor'

const {
  name,
  loaded,
  loading,
  error,
  width,
  height,
  mode,
  strength,
  erasing,
  brushSize,
  painted,
  canUndo,
  canRedo,
  filename,
  attach,
  load,
  reset,
  strokeStart,
  strokeMove,
  strokeEnd,
  coverAll,
  undo,
  redo,
  clear,
  toBlob,
} = useImageRedactor()

const { track } = useAnalytics()

const dragging = ref(false)
const copied = ref(false)
const canvas = ref<HTMLCanvasElement | null>(null)
const stage = ref<HTMLElement | null>(null)
const cursor = ref<{ x: number, y: number } | null>(null)
let drawing = false

// A template ref, watched, rather than a function ref: Vue calls function
// refs on every re-render, and each call would repaint the whole picture —
// on every pointer move, since the brush ring is reactive.
watch(canvas, element => attach(element))

/** Screen pixels → image pixels. The stage hugs the canvas, so no letterboxing. */
function scale() {
  const rect = canvas.value?.getBoundingClientRect()
  if (!canvas.value || !rect?.width)
    return 1
  return canvas.value.width / rect.width
}

function toImagePoint(event: PointerEvent) {
  const rect = canvas.value?.getBoundingClientRect()
  if (!rect?.width)
    return null
  const s = scale()
  return { x: (event.clientX - rect.left) * s, y: (event.clientY - rect.top) * s }
}

/**
 * Relative to the stage rather than the viewport: the app shell's `scale`
 * makes it a containing block for fixed descendants, so a viewport-positioned
 * ring drifts from the pointer by the width of the sidebar.
 */
function toStagePoint(event: PointerEvent) {
  const rect = stage.value?.getBoundingClientRect()
  return rect ? { x: event.clientX - rect.left, y: event.clientY - rect.top } : null
}

function onPointerDown(event: PointerEvent) {
  if (event.button !== 0)
    return
  const point = toImagePoint(event)
  if (!point) {
    return
  }(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
  drawing = true
  strokeStart(point, (brushSize.value / 2) * scale())
}

function onPointerMove(event: PointerEvent) {
  cursor.value = event.pointerType === 'touch' ? null : toStagePoint(event)
  if (!drawing)
    return
  const point = toImagePoint(event)
  if (point)
    strokeMove(point)
}

function onPointerUp() {
  if (!drawing)
    return
  drawing = false
  strokeEnd()
}

function onDrop(event: DragEvent) {
  dragging.value = false
  void load(event.dataTransfer?.files?.[0])
}

/**
 * Pasting is how most screenshots arrive — the redaction this tool gets used
 * for most is a name or an email address in a capture that is about to be
 * posted somewhere.
 */
function onPaste(event: ClipboardEvent) {
  const file = Array.from(event.clipboardData?.files ?? []).find(f => f.type.startsWith('image/'))
  if (!file)
    return
  event.preventDefault()
  void load(file)
}

function onKeydown(event: KeyboardEvent) {
  if (!loaded.value)
    return
  const target = event.target as HTMLElement | null
  if (target?.closest('input, textarea, [contenteditable="true"]'))
    return
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') {
    event.preventDefault()
    if (event.shiftKey)
      redo()
    else
      undo()
    return
  }
  if (event.key === '[')
    brushSize.value = Math.max(8, brushSize.value - 8)
  else if (event.key === ']')
    brushSize.value = Math.min(160, brushSize.value + 8)
}

onMounted(() => {
  window.addEventListener('paste', onPaste)
  window.addEventListener('keydown', onKeydown)
})
onBeforeUnmount(() => {
  window.removeEventListener('paste', onPaste)
  window.removeEventListener('keydown', onKeydown)
})

async function download() {
  const blob = await toBlob()
  if (!blob)
    return
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename.value
  link.click()
  // Revoking in the same tick can cancel the download before the browser has
  // taken its own reference to the blob.
  setTimeout(() => URL.revokeObjectURL(url), 0)
  track('tool_completed', { tool: 'image-redactor', format: blob.type.replace('image/', '') })
}

async function copyImage() {
  // The clipboard only reliably takes PNG, whatever the download format is.
  const blob = await toBlob('image/png')
  if (!blob)
    return
  await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
  copied.value = true
  setTimeout(() => copied.value = false, 1600)
  track('tool_completed', { tool: 'image-redactor', format: 'clipboard' })
}

const status = computed(() => {
  if (loading.value)
    return 'Opening image.'
  if (!loaded.value)
    return ''
  return painted.value
    ? `${REDACT_MODES.find(m => m.value === mode.value)?.label} applied. Ready to download.`
    : `${name.value} loaded, ${width.value} by ${height.value} pixels. Paint over anything to hide it.`
})
</script>

<template>
  <div class="tool-frame flex flex-col gap-5">
    <p class="sr-only" aria-live="polite">
      {{ status }}
    </p>

    <!-- ── Nothing loaded yet ───────────────────────────────────────── -->
    <div
      v-if="!loaded"
      class="relative flex grow rounded-2xl border border-dashed transition-colors"
      :class="dragging ? 'border-primary bg-muted/40' : 'border-border'"
      @dragover.prevent="dragging = true"
      @dragleave.prevent="dragging = false"
      @drop.prevent="onDrop"
    >
      <input
        id="redactor-file"
        type="file"
        class="sr-only"
        accept="image/jpeg,image/png,image/webp,image/gif,image/bmp,image/avif"
        @change="load(($event.target as HTMLInputElement).files?.[0])"
      >
      <label for="redactor-file" class="flex min-h-72 grow cursor-pointer flex-col items-center justify-center gap-2 px-6 py-8 text-center">
        <ImageUp class="size-7 text-muted-foreground" />
        <span class="font-medium">{{ loading ? 'Opening…' : 'Drop an image here, choose a file, or paste a screenshot' }}</span>
        <span class="text-sm text-muted-foreground">
          JPEG, PNG, WebP, GIF, BMP or AVIF — it stays on your device
        </span>
      </label>
    </div>

    <p v-if="error" class="text-sm text-destructive" role="alert">
      {{ error }}
    </p>

    <template v-if="loaded">
      <!-- ── Controls ─────────────────────────────────────────────────── -->
      <div class="grid gap-5 rounded-2xl border bg-background p-5 dark:bg-input/30 sm:grid-cols-2 lg:grid-cols-[auto_1fr_1fr_auto]">
        <div class="flex flex-col gap-2">
          <span id="redactor-effect" class="text-sm font-medium">Effect</span>
          <div class="flex flex-wrap gap-1.5" role="group" aria-labelledby="redactor-effect">
            <Button
              v-for="option in REDACT_MODES"
              :key="option.value"
              size="sm"
              :variant="mode === option.value ? 'default' : 'outline'"
              :aria-pressed="mode === option.value"
              @click="mode = option.value"
            >
              {{ option.label }}
            </Button>
          </div>
        </div>

        <div class="flex flex-col gap-2">
          <div class="flex items-center justify-between">
            <span class="text-sm font-medium">Strength</span>
            <span class="text-sm tabular-nums text-muted-foreground">{{ mode === 'solid' ? 'full' : strength }}</span>
          </div>
          <Slider
            :model-value="[strength]"
            :min="1"
            :max="10"
            :step="1"
            :disabled="mode === 'solid'"
            aria-label="Effect strength"
            @update:model-value="value => strength = value?.[0] ?? 6"
          />
        </div>

        <div class="flex flex-col gap-2">
          <div class="flex items-center justify-between">
            <span class="text-sm font-medium">Brush size</span>
            <span class="text-sm tabular-nums text-muted-foreground">{{ brushSize }}px</span>
          </div>
          <Slider
            :model-value="[brushSize]"
            :min="8"
            :max="160"
            :step="4"
            aria-label="Brush size"
            @update:model-value="value => brushSize = value?.[0] ?? 48"
          />
        </div>

        <div class="flex flex-col gap-2">
          <span id="redactor-brush" class="text-sm font-medium">Brush</span>
          <div class="flex gap-1.5" role="group" aria-labelledby="redactor-brush">
            <Button size="sm" :variant="erasing ? 'outline' : 'default'" :aria-pressed="!erasing" @click="erasing = false">
              <Brush class="size-4" /> Hide
            </Button>
            <Button size="sm" :variant="erasing ? 'default' : 'outline'" :aria-pressed="erasing" @click="erasing = true">
              <Eraser class="size-4" /> Restore
            </Button>
          </div>
        </div>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="outline" :disabled="!canUndo" aria-keyshortcuts="Control+Z Meta+Z" @click="undo">
          <Undo2 class="size-4" /> Undo
        </Button>
        <Button size="sm" variant="outline" :disabled="!canRedo" aria-keyshortcuts="Control+Shift+Z Meta+Shift+Z" @click="redo">
          <Redo2 class="size-4" /> Redo
        </Button>
        <Button size="sm" variant="outline" @click="coverAll">
          <Maximize class="size-4" /> Whole image
        </Button>
        <Button size="sm" variant="outline" :disabled="!canUndo" @click="clear">
          <Trash2 class="size-4" /> Clear
        </Button>
        <span class="ml-auto hidden text-xs text-muted-foreground sm:inline">
          <kbd>[</kbd> <kbd>]</kbd> brush size · <kbd>Ctrl</kbd>/<kbd>⌘</kbd> <kbd>Z</kbd> undo
        </span>
      </div>

      <!-- ── The picture ──────────────────────────────────────────────── -->
      <div class="flex justify-center rounded-2xl border bg-muted/40 p-3">
        <div
          ref="stage"
          class="relative w-fit touch-none select-none overflow-hidden"
          :class="cursor ? 'cursor-none' : 'cursor-crosshair'"
          @pointerdown="onPointerDown"
          @pointermove="onPointerMove"
          @pointerup="onPointerUp"
          @pointercancel="onPointerUp"
          @pointerleave="cursor = null"
        >
          <canvas
            ref="canvas"
            class="block h-auto max-h-[70vh] w-auto max-w-full"
            role="img"
            :aria-label="`${name}, with the painted areas redacted`"
          />
          <!--
            Ring showing exactly what the next dab will cover. Plain left/top,
            no transform, so no Tailwind translate can stack onto it.
          -->
          <div
            v-if="cursor"
            class="pointer-events-none absolute rounded-full border-2 shadow-[0_0_0_1px_rgba(0,0,0,0.4)]"
            :class="erasing ? 'border-white border-dashed' : 'border-white'"
            :style="{
              left: `${cursor.x - brushSize / 2}px`,
              top: `${cursor.y - brushSize / 2}px`,
              width: `${brushSize}px`,
              height: `${brushSize}px`,
            }"
            aria-hidden="true"
          />
        </div>
      </div>

      <!-- ── Save ─────────────────────────────────────────────────────── -->
      <div class="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-background px-4 py-3 dark:bg-input/30">
        <span class="min-w-0">
          <span class="block truncate font-medium">{{ filename }}</span>
          <span class="block text-xs tabular-nums text-muted-foreground">{{ width }}×{{ height }} · no metadata</span>
        </span>
        <div class="flex flex-wrap gap-2">
          <Button variant="outline" @click="reset">
            <X class="size-4" /> Choose another
          </Button>
          <Button variant="outline" @click="copyImage">
            <component :is="copied ? Check : Copy" class="size-4" /> {{ copied ? 'Copied' : 'Copy' }}
          </Button>
          <Button @click="download">
            <Download class="size-4" /> Download
          </Button>
        </div>
      </div>
    </template>
  </div>
</template>
