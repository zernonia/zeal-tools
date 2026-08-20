<script setup lang="ts">
import { Brush, Check, Copy, Download, Eraser, ImageUp, Loader2, Redo2, RotateCcw, Undo2, Wand2 } from 'lucide-vue-next'
import { MODEL, SAM_MODEL } from '../../core'
import { BACKGROUNDS, useBackgroundRemover } from '../composables/useBackgroundRemover'

const {
  status,
  error,
  downloadProgress,
  fileName,
  hasResult,
  previewImage,
  originalImage,
  subjectCoverage,
  softness,
  strength,
  backgroundId,
  customColor,
  useCustomColor,
  trim,
  brushMode,
  brushSize,
  canUndo,
  canRedo,
  undo,
  redo,
  clearEdits,
  magicStatus,
  magicProgress,
  magicError,
  armMagic,
  magicPick,
  beginStroke,
  extendStroke,
  endStroke,
  process,
  toBlob,
  reset,
} = useBackgroundRemover()

const { track } = useAnalytics()

const dragging = ref(false)
const copied = ref(false)

/** Divider position, 0–100. Starts centred so both halves are visible. */
const compare = ref(50)

/** null means pointers drag the compare divider rather than paint. */
const activeBrush = ref<'restore' | 'erase' | null>(null)

/** The magic brush selects whole objects from a click; it owns the pointer. */
const activeMagic = ref<'add' | 'remove' | null>(null)

/** Which correction method is on show. Only one tool can own the pointer. */
const retouchTab = ref<'magic' | 'brush'>('magic')

watch(retouchTab, (tab) => {
  if (tab === 'magic')
    activeBrush.value = null
  else
    activeMagic.value = null
})

const magicBusy = computed(() => ['loading', 'encoding', 'thinking'].includes(magicStatus.value))

/** Shown in the button tooltips so the shortcut matches the actual platform. */
const modifierLabel = ref('Ctrl+')
onMounted(() => {
  if (/Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent))
    modifierLabel.value = '\u2318'
})

/**
 * Undo/redo from the keyboard.
 *
 * Bound on window rather than on the workspace so it works wherever focus
 * happens to be after a click on the picture, but it steps aside for text
 * fields — otherwise it would hijack undo inside the hex colour input.
 */
function onKeydown(event: KeyboardEvent) {
  if (!hasResult.value || magicBusy.value)
    return
  const target = event.target as HTMLElement | null
  if (target?.closest('input, textarea, [contenteditable=""], [contenteditable="true"]'))
    return

  const modifier = event.metaKey || event.ctrlKey
  if (!modifier)
    return

  const key = event.key.toLowerCase()
  // Ctrl+Y is the other redo convention, and Windows users reach for it.
  if (key === 'y' || (key === 'z' && event.shiftKey)) {
    event.preventDefault()
    redo()
  }
  else if (key === 'z') {
    event.preventDefault()
    undo()
  }
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
const magicLabel = computed(() => ({
  loading: `Fetching the magic brush — ${SAM_MODEL.megabytes} MB, once per browser`,
  encoding: 'Reading this picture — once per image',
  thinking: 'Finding that object…',
}[magicStatus.value] ?? ''))

async function pickMagic(mode: 'add' | 'remove') {
  if (activeMagic.value === mode) {
    activeMagic.value = null
    return
  }
  activeMagic.value = mode
  await armMagic()
}

watch(activeBrush, (brush) => {
  if (brush)
    brushMode.value = brush
})

const busy = computed(() => ['decoding', 'downloading', 'starting', 'removing'].includes(status.value))

const statusLabel = computed(() => ({
  decoding: 'Reading your image…',
  downloading: `Downloading the model — ${MODEL.megabytes} MB, once per browser`,
  starting: 'Starting the model…',
  removing: `Finding the subject — about ${MODEL.seconds} seconds`,
}[status.value] ?? ''))

/**
 * Announced rather than shown: a very low coverage almost always means the
 * model found no clear subject, and saying so beats leaving someone staring
 * at an empty canvas wondering whether it worked.
 */
const weakResult = computed(() => hasResult.value && subjectCoverage.value < 0.01)

const announcement = computed(() => {
  if (status.value === 'error')
    return `Background removal failed. ${error.value}`
  if (weakResult.value)
    return 'Finished, but no clear subject was found in this image.'
  if (hasResult.value)
    return 'Background removed. The cutout is ready to download.'
  return statusLabel.value
})

function onFiles(files: FileList | null) {
  const file = files?.[0]
  if (!file)
    return
  if (!file.type.startsWith('image/')) {
    error.value = 'That is not an image file. PNG, JPEG, WebP and AVIF all work.'
    status.value = 'error'
    return
  }
  compare.value = 50
  activeBrush.value = null
  activeMagic.value = null
  retouchTab.value = 'magic'
  void process(file)
}

function onDrop(event: DragEvent) {
  dragging.value = false
  onFiles(event.dataTransfer?.files ?? null)
}

async function download() {
  const blob = await toBlob()
  if (!blob)
    return
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${fileName.value.replace(/\.[^.]+$/, '') || 'cutout'}-no-background.png`
  link.click()
  // Revoking in the same tick can cancel the download before the browser has
  // taken its own reference to the blob.
  setTimeout(() => URL.revokeObjectURL(url), 0)
  track('tool_completed', { tool: 'background-remover', format: 'png' })
}

async function copyImage() {
  const blob = await toBlob()
  if (!blob)
    return
  await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
  copied.value = true
  setTimeout(() => copied.value = false, 1600)
  track('tool_completed', { tool: 'background-remover', format: 'clipboard' })
}

/** Rail sections share one card, separated by rules rather than gaps. */
const railSection = 'space-y-3 px-4 py-4'
const railHeading = 'text-xs font-semibold uppercase tracking-wide text-muted-foreground'
</script>

<template>
  <div class="tool-frame space-y-5">
    <!-- ── Nothing loaded yet: choose a picture and a quality ─────────── -->
    <template v-if="!hasResult && !busy">
      <!--
        `relative` matters here as it does on the app shell: the file input is
        .sr-only, which is position:absolute, and an overflow container only
        clips absolutely-positioned descendants whose containing block is
        inside it. Without it the input escapes and stretches the document.
      -->
      <section class="relative rounded-2xl border border-border p-5">
        <div
          class="rounded-xl border-2 border-dashed p-10 text-center transition-colors"
          :class="dragging ? 'border-primary bg-primary/5' : 'border-input'"
          @dragover.prevent="dragging = true"
          @dragleave.prevent="dragging = false"
          @drop.prevent="onDrop"
        >
          <ImageUp class="mx-auto size-8 text-muted-foreground" aria-hidden="true" />
          <p class="mt-3 text-sm font-medium">
            Drop an image here
          </p>
          <p class="mt-1 text-xs text-muted-foreground">
            PNG, JPEG, WebP or AVIF. It never leaves your device.
          </p>

          <input
            id="background-remover-file"
            type="file"
            accept="image/*"
            class="sr-only"
            @change="onFiles(($event.target as HTMLInputElement).files)"
          >
          <Label
            for="background-remover-file"
            class="mt-5 inline-flex min-h-11 cursor-pointer items-center rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2"
          >
            Choose an image
          </Label>
        </div>

        <p v-if="status === 'error'" class="mt-4 text-sm text-destructive" role="alert">
          {{ error }}
        </p>
      </section>

      <!--
        Not a picker any more — one model ships. Kept as a note because a
        94 MB download deserves warning before someone drops a photo in and
        waits, and because where the weights come from is worth stating.
      -->
      <p class="rounded-2xl border border-border p-5 text-xs text-muted-foreground">
        Your picture stays in this browser and is never uploaded. The model itself
        ({{ MODEL.credit }}, {{ MODEL.licence }}, {{ MODEL.megabytes }} MB) downloads from Hugging Face the
        first time you use the tool and is then cached, so they see your IP address — the picture is not sent.
      </p>
    </template>

    <!-- ── Working ────────────────────────────────────────────────────── -->
    <section v-if="busy" class="space-y-4 rounded-2xl border border-border p-5">
      <p class="text-sm font-medium">
        {{ statusLabel }}
      </p>
      <div
        v-if="downloadProgress !== null"
        class="h-2 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        :aria-valuenow="Math.round(downloadProgress * 100)"
        aria-valuemin="0"
        aria-valuemax="100"
        aria-label="Model download progress"
      >
        <div class="h-full rounded-full bg-primary transition-[width] duration-200" :style="{ width: `${downloadProgress * 100}%` }" />
      </div>
      <p v-else class="text-xs text-muted-foreground">
        Running on your own machine, so this depends on your hardware rather than our servers.
      </p>
    </section>

    <!-- ── Workspace: picture stays put, controls sit beside it ───────── -->
    <div v-if="hasResult && previewImage && originalImage" class="space-y-4">
      <div class="lg:grid lg:grid-cols-[minmax(0,1fr)_21rem] lg:items-start lg:gap-5">
        <!--
        Sticky matters on small screens, where the panes stack and the picture
        needs to stay put while the controls scroll under it. At `lg` the two
        panes are the same fixed height, so the grid row is exactly as tall as
        this element and sticky has nowhere to travel — the workspace is simply
        a self-contained block sized to the space below the page heading.
      -->
        <div class="sticky top-0 z-10 mb-4 bg-card/85 pb-3 pt-1 backdrop-blur lg:static lg:mb-0 lg:bg-transparent lg:py-0 lg:backdrop-blur-none">
          <div class="flex flex-col rounded-2xl border border-border p-3 sm:p-4 lg:h-[calc(100vh-17.5rem)] lg:min-h-[26rem]">
            <div class="flex shrink-0 items-center justify-between gap-3 pb-3">
              <h2 class="text-sm font-semibold">
                Cutout
              </h2>
              <Button variant="ghost" size="sm" @click="reset()">
                <RotateCcw class="size-3.5" />
                New image
              </Button>
            </div>

            <!--
            A definite height is required, not `flex-1` alone: the pane fits
            the picture by measuring this box, and at small sizes the panel has
            no height of its own, so a percentage would resolve to zero and the
            canvas would vanish.
          -->
            <div class="relative h-[44vh] min-h-0 lg:h-auto lg:flex-1">
              <!--
                Deliberately small. The rail already carries the wording and
                the live region announces it, so the picture only needs a sign
                that something is running — with the percentage while a 13 MB
                download is in flight, which is too long to leave unexplained.

                No click blocker behind it: armMagic and magicPick both refuse
                to start while one is already running, so a stray click is
                ignored rather than queued.
              -->
              <div
                v-if="magicBusy"
                class="pointer-events-none absolute left-3 top-3 z-30 flex items-center gap-2 rounded-full border border-border bg-card/90 px-2.5 py-1.5 shadow-sm backdrop-blur"
              >
                <Loader2 class="size-3.5 animate-spin text-muted-foreground" aria-hidden="true" />
                <span v-if="magicProgress !== null" class="text-[11px] font-medium tabular-nums text-muted-foreground">
                  {{ Math.round(magicProgress * 100) }}%
                </span>
              </div>

              <BackgroundRemoverCompare
                v-model:position="compare"
                :original="originalImage"
                :cutout="previewImage"
                :brush="activeBrush"
                :magic="activeMagic"
                :brush-size="brushSize"
                @stroke-start="beginStroke"
                @stroke-move="extendStroke"
                @stroke-end="endStroke"
                @pick="(x, y) => magicPick(x, y, activeMagic!)"
              />
            </div>

            <p class="shrink-0 pt-3 text-xs text-muted-foreground">
              <template v-if="activeMagic">
                Click an object to {{ activeMagic === 'add' ? 'add it' : 'cut it away' }}. Drag the round
                handle to compare as you go.
              </template>
              <template v-else-if="activeBrush">
                Paint to {{ activeBrush === 'restore' ? 'bring the subject back' : 'cut more away' }}. Drag
                the round handle to compare as you go.
              </template>
              <template v-else>
                Drag the handle across the picture to compare with the original. Arrow keys work too.
              </template>
            </p>
          </div>
        </div>

        <div class="divide-y divide-border overflow-hidden rounded-2xl border border-border lg:h-[calc(100vh-17.5rem)] lg:min-h-[26rem] lg:overflow-y-auto">
          <section :class="railSection" aria-label="Retouch">
            <div class="flex items-center justify-between gap-2">
              <h2 :class="railHeading">
                Retouch
              </h2>
              <div class="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  class="size-8"
                  :disabled="!canUndo || magicBusy"
                  :title="`Undo (${modifierLabel}Z)`"
                  aria-label="Undo the last change"
                  @click="undo()"
                >
                  <Undo2 class="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  class="size-8"
                  :disabled="!canRedo || magicBusy"
                  :title="`Redo (${modifierLabel}\u21E7Z)`"
                  aria-label="Redo the last undone change"
                  @click="redo()"
                >
                  <Redo2 class="size-4" />
                </Button>
              </div>
            </div>

            <!--
              Two ways to correct the same thing, so they belong in one place
              with one shared history rather than as two panels each with their
              own undo.
            -->
            <Tabs v-model="retouchTab">
              <TabsList aria-label="Retouch method" class="grid w-full grid-cols-2">
                <TabsTrigger value="magic">
                  Magic
                </TabsTrigger>
                <TabsTrigger value="brush">
                  By hand
                </TabsTrigger>
              </TabsList>

              <TabsContent value="magic" class="mt-3 space-y-3">
                <div class="grid grid-cols-2 gap-2">
                  <Button
                    :variant="activeMagic === 'add' ? 'default' : 'outline'"
                    size="sm"
                    class="min-h-11"
                    :disabled="magicBusy"
                    :aria-pressed="activeMagic === 'add'"
                    @click="pickMagic('add')"
                  >
                    <Wand2 class="size-3.5" />
                    Add area
                  </Button>
                  <Button
                    :variant="activeMagic === 'remove' ? 'default' : 'outline'"
                    size="sm"
                    class="min-h-11"
                    :disabled="magicBusy"
                    :aria-pressed="activeMagic === 'remove'"
                    @click="pickMagic('remove')"
                  >
                    <Wand2 class="size-3.5" />
                    Remove area
                  </Button>
                </div>

                <p v-if="magicError" class="text-xs text-destructive" role="alert">
                  {{ magicError }}
                </p>
                <p v-else class="text-xs text-muted-foreground">
                  <template v-if="magicBusy">
                    {{ magicLabel }}
                  </template>
                  <template v-else-if="activeMagic">
                    Click an object in the picture to {{ activeMagic === 'add' ? 'add it to' : 'cut it from' }}
                    the cutout. The model finds its edges for you.
                  </template>
                  <template v-else>
                    Click a whole object to add or remove it — the model works out where its edges are. Uses
                    a second, smaller model, fetched once.
                  </template>
                </p>
              </TabsContent>

              <TabsContent value="brush" class="mt-3 space-y-3">
                <div class="grid grid-cols-2 gap-2">
                  <Button
                    :variant="activeBrush === 'restore' ? 'default' : 'outline'"
                    size="sm"
                    class="min-h-11"
                    :aria-pressed="activeBrush === 'restore'"
                    @click="activeBrush = activeBrush === 'restore' ? null : 'restore'"
                  >
                    <Brush class="size-3.5" />
                    Bring back
                  </Button>
                  <Button
                    :variant="activeBrush === 'erase' ? 'default' : 'outline'"
                    size="sm"
                    class="min-h-11"
                    :aria-pressed="activeBrush === 'erase'"
                    @click="activeBrush = activeBrush === 'erase' ? null : 'erase'"
                  >
                    <Eraser class="size-3.5" />
                    Remove
                  </Button>
                </div>

                <div>
                  <Label for="background-remover-brush" class="text-xs">Brush size: {{ brushSize }} px</Label>
                  <Slider
                    id="background-remover-brush"
                    :model-value="[brushSize]"
                    :min="6"
                    :max="160"
                    :step="2"
                    aria-label="Brush size in pixels"
                    @update:model-value="value => brushSize = value?.[0] ?? 28"
                  />
                </div>

                <p class="text-xs text-muted-foreground">
                  Paint freehand where the magic brush cannot help — a stray wisp, a shadow it kept.
                </p>
              </TabsContent>
            </Tabs>

            <Button
              v-if="canUndo"
              variant="ghost"
              size="sm"
              class="w-full"
              :disabled="magicBusy"
              @click="clearEdits(); activeBrush = null; activeMagic = null"
            >
              Clear all corrections
            </Button>
          </section>

          <section :class="railSection" aria-label="Edges">
            <h2 :class="railHeading">
              Edges
            </h2>
            <div>
              <Label for="background-remover-strength" class="text-xs">Cut tightness: {{ strength }}</Label>
              <Slider
                id="background-remover-strength"
                :model-value="[strength]"
                :min="0"
                :max="100"
                :step="1"
                aria-label="How tightly to cut around the subject"
                @update:model-value="value => strength = value?.[0] ?? 50"
              />
            </div>
            <div>
              <Label for="background-remover-softness" class="text-xs">Edge softness: {{ softness }}</Label>
              <Slider
                id="background-remover-softness"
                :model-value="[softness]"
                :min="0"
                :max="20"
                :step="1"
                aria-label="How soft the cut edge should be"
                @update:model-value="value => softness = value?.[0] ?? 2"
              />
            </div>
            <p class="text-xs text-muted-foreground">
              Lower tightness keeps more of the soft edge — better for hair, worse for a hard-edged product.
            </p>
            <div class="flex items-center gap-2">
              <Checkbox id="background-remover-trim" v-model="trim" />
              <Label for="background-remover-trim" class="mb-0 text-xs">Trim empty space</Label>
            </div>
          </section>

          <section :class="railSection" aria-label="Background">
            <h2 :class="railHeading">
              Background
            </h2>
            <div class="flex flex-wrap gap-2">
              <Button
                v-for="option in BACKGROUNDS"
                :key="option.id"
                :variant="!useCustomColor && backgroundId === option.id ? 'default' : 'outline'"
                size="sm"
                :aria-pressed="!useCustomColor && backgroundId === option.id"
                @click="useCustomColor = false; backgroundId = option.id"
              >
                {{ option.label }}
              </Button>
              <Button
                :variant="useCustomColor ? 'default' : 'outline'"
                size="sm"
                :aria-pressed="useCustomColor"
                @click="useCustomColor = true"
              >
                Custom
              </Button>
            </div>
            <div v-if="useCustomColor" class="flex items-center gap-2">
              <ColorPicker v-model="customColor" aria-label="Background colour" />
              <Input v-model="customColor" aria-label="Background colour hex value" class="max-w-28 font-mono text-xs" />
            </div>
          </section>
        </div>
      </div>

      <p v-if="weakResult" class="rounded-lg border border-border bg-muted/50 p-3 text-xs text-muted-foreground">
        Almost nothing was kept, which usually means the model could not find a distinct subject. It is
        strongest on a single clear subject against a background — a person, a product, an animal.
      </p>

      <!--
        The download area spans the whole workspace rather than sitting in the
        settings column: it acts on the finished result, not on one pane. Kept
        in normal flow, so nothing ever overlays it.
      -->
      <section class="flex flex-col items-center gap-3 rounded-2xl border border-border p-4" aria-label="Download">
        <div class="flex flex-wrap justify-center gap-2">
          <Button size="lg" class="min-h-11" @click="download()">
            <Download class="size-4" />
            Download PNG
          </Button>
          <Button variant="outline" size="lg" class="min-h-11" @click="copyImage()">
            <component :is="copied ? Check : Copy" class="size-4" />
            {{ copied ? 'Copied' : 'Copy image' }}
          </Button>
        </div>
        <ShareBar tool="background-remover" :get-image-blob="toBlob" class="justify-center" />
      </section>
    </div>

    <!--
      Deliberately outside the result block: decoding, model download and
      inference all need announcing, and a live region that only exists once
      there is a result would never announce any of them.
    -->
    <div aria-live="polite" class="sr-only">
      {{ magicBusy ? magicLabel : announcement }}
    </div>
  </div>
</template>
