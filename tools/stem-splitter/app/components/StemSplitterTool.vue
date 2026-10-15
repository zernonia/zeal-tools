<script setup lang="ts">
import type { ModelId, Stem } from '../../core'
import { Check, Download, Drum, FileArchive, FileAudio, Guitar, Headphones, MicVocal, Music4, Pause, Piano, Play, RotateCcw, Speaker, X } from 'lucide-vue-next'
import { AUDIO, MODELS, STEM_LABELS, stemFileName } from '../../core'
import { useStemSplitter } from '../composables/useStemSplitter'

const props = defineProps<{
  /**
   * The vocal remover page is this tool with the karaoke mix preselected and
   * the instrumental as its headline download. Same model, same stems.
   */
  variant?: 'vocal-remover'
}>()

const isVocalRemover = props.variant === 'vocal-remover'

const {
  model,
  stemList,
  presets,
  status,
  error,
  fileName,
  duration,
  downloadProgress,
  progress,
  backend,
  fellBack,
  remaining,
  hasResult,
  busy,
  peaks,
  silent,
  on,
  volume,
  solo,
  activePreset,
  playing,
  position,
  mixPart,
  process,
  cancel,
  toggle,
  seek,
  applyPreset,
  gainOf,
  stemBlob,
  mixBlob,
  zipBlob,
  reset,
} = useStemSplitter({ preset: isVocalRemover ? 'karaoke' : 'all' })

const { track } = useAnalytics()
const TOOL = 'stem-splitter'

const ICONS: Record<Stem, Component> = { vocals: MicVocal, drums: Drum, bass: Speaker, guitar: Guitar, piano: Piano, other: Music4 }

/**
 * The upstream authors say the six-stem model's piano "doesn't work so well";
 * saying so beside the lane beats letting someone think the tool is broken.
 */
const EXPERIMENTAL: Partial<Record<Stem, string>> = { piano: 'Rough' }

/**
 * Chosen before the song goes in, in one place: a segmented toggle rather
 * than two cards, so the choice reads as a setting of the drop zone and not
 * as a separate step.
 */
const MODEL_CHOICES: { id: ModelId, label: string, cost: string }[] = [
  { id: 'four', label: '4 stems', cost: `${MODELS.four.megabytes} MB download · fastest` },
  { id: 'six', label: '6 stems', cost: `${MODELS.six.megabytes} MB download · about twice as slow` },
]
const modelCost = computed(() => MODEL_CHOICES.find(c => c.id === model.value)!.cost)

/**
 * What the chosen model will hand back, shown as instruments rather than
 * described. Unicode has no bass guitar, so bass borrows the double bass;
 * the label beside each one carries the meaning, the emoji only the glance.
 */
const STEM_EMOJI: Record<Stem, string> = { vocals: '🎤', drums: '🥁', bass: '🎻', guitar: '🎸', piano: '🎹', other: '🎶' }

/** The stems six adds over four, picked out so the difference is visible. */
const isExtra = (stem: Stem) => model.value === 'six' && !MODELS.four.stems.includes(stem)

const dragging = ref(false)
const saved = ref<string | null>(null)

function onFiles(files: FileList | null) {
  const file = files?.[0]
  if (!file)
    return
  // Some systems report FLAC and friends with no MIME type at all, so only
  // refuse what is plainly something else; the decoder has the final say.
  if (file.type && !file.type.startsWith('audio/') && !file.type.startsWith('video/')) {
    error.value = 'That is not an audio file. MP3, WAV, M4A, FLAC and OGG all work.'
    status.value = 'error'
    return
  }
  void process(file)
}

function onDrop(event: DragEvent) {
  dragging.value = false
  onFiles(event.dataTransfer?.files ?? null)
}

function save(blob: Blob | null, name: string, format: string) {
  if (!blob)
    return
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = name
  link.click()
  // Revoking in the same tick can cancel the download before the browser has
  // taken its own reference to the blob.
  setTimeout(() => URL.revokeObjectURL(url), 0)
  saved.value = name
  setTimeout(() => saved.value = null, 1600)
  track('tool_completed', { tool: TOOL, format })
}

const downloadStem = (stem: Stem) => save(stemBlob(stem), stemFileName(fileName.value, stem), 'wav')
const downloadMix = () => save(mixBlob(), stemFileName(fileName.value, mixPart.value), 'mix')
function downloadAll() {
  return save(
    zipBlob(stem => stemFileName(fileName.value, stem)),
    stemFileName(fileName.value, 'stems').replace(/\.wav$/, '.zip'),
    'zip',
  )
}

function toggleSolo(stem: Stem) {
  solo.value = solo.value === stem ? null : stem
}

/** Seek by clicking a waveform; the slider above is the keyboard route. */
function seekFromWaveform(event: MouseEvent) {
  const box = (event.currentTarget as HTMLElement).getBoundingClientRect()
  seek(((event.clientX - box.left) / box.width) * duration.value)
}

function clock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

function eta(seconds: number): string {
  if (seconds < 60)
    return `about ${Math.max(5, Math.ceil(seconds / 5) * 5)} seconds left`
  const minutes = Math.round(seconds / 60)
  return `about ${minutes} minute${minutes === 1 ? '' : 's'} left`
}

const statusLabel = computed(() => ({
  decoding: 'Reading your track…',
  downloading: `Downloading the ${MODELS[model.value].stems.length}-stem model — ${MODELS[model.value].megabytes} MB, once per browser`,
  starting: backend.value === 'webgpu' ? 'Starting the model on your graphics card…' : 'Starting the model…',
  separating: 'Separating the stems…',
}[status.value as string] ?? ''))

const backendNote = computed(() => {
  if (backend.value === 'webgpu')
    return 'Running on your graphics card through WebGPU.'
  if (fellBack.value)
    return 'Your graphics card could not run the model, so it is running on the processor instead — the same result, several times slower.'
  return 'This browser has no WebGPU, so the model runs on the processor — the same result, several times slower.'
})

const separationShare = computed(() => progress.value.total ? progress.value.done / progress.value.total : 0)

const announcement = computed(() => {
  if (status.value === 'error')
    return `Splitting failed. ${error.value}`
  if (hasResult.value)
    return isVocalRemover ? 'Done. The instrumental is ready to download.' : `Done. ${stemList.value.length} stems are ready to play and download.`
  // Stages only, not every window: thirty "percent" announcements in a row
  // would drown out everything else a screen reader has to say.
  return statusLabel.value
})

const mixLabel = computed(() => {
  if (solo.value)
    return `${STEM_LABELS[solo.value]} only`
  return activePreset.value?.label ?? 'Custom mix'
})

/**
 * One shared scale for every lane, set by the loudest stem. Scaling each lane
 * to its own peak would draw a whisper of a bass line as large as the drums,
 * and the point of four lanes is to see how the song divides up.
 */
const loudest = computed(() => Math.max(0.05, ...peaks.value.map(p => Math.max(...p))))

/** SVG path for one stem's waveform, mirrored about the centre line. */
function wavePath(values: Float32Array): string {
  const n = values.length
  let d = ''
  for (let i = 0; i < n; i++) {
    const h = Math.max(0.03, values[i]! / loudest.value) * 18
    d += `M${i + 0.5} ${20 - h}V${20 + h}`
  }
  return d
}
const paths = computed(() => peaks.value.map(wavePath))
const bars = computed(() => peaks.value[0]?.length ?? 160)
const playedBars = computed(() => (duration.value ? (position.value / duration.value) * bars.value : 0))
</script>

<template>
  <div class="tool-frame space-y-5">
    <!-- ── Nothing loaded yet ──────────────────────────────────────────── -->
    <template v-if="!hasResult && !busy">
      <!--
        `relative` matters here as it does on the app shell: the file input is
        .sr-only, which is position:absolute, and without a positioned
        ancestor it escapes the card and stretches the document.
      -->
      <section class="relative rounded-2xl border border-border p-5">
        <!--
          A setting of the drop zone, so it sits above it as a header row
          rather than inside it: inside, it competed with the drop target
          for being the thing to look at first.
        -->
        <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div class="min-w-0">
            <p id="stem-splitter-count" class="text-sm font-medium">
              Split into
            </p>
            <ul class="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs" aria-label="Stems you will get">
              <li
                v-for="stem in MODELS[model].stems"
                :key="stem"
                class="inline-flex items-center gap-1"
                :class="isExtra(stem) ? 'font-medium text-foreground' : 'text-muted-foreground'"
              >
                <span aria-hidden="true">{{ STEM_EMOJI[stem] }}</span>{{ STEM_LABELS[stem] }}
              </li>
            </ul>
            <p class="mt-1 text-xs text-muted-foreground">
              {{ modelCost }}
            </p>
          </div>
          <div
            class="flex w-full shrink-0 items-center gap-1 rounded-lg bg-muted p-1 sm:w-auto"
            role="group"
            aria-labelledby="stem-splitter-count"
          >
            <button
              v-for="choice in MODEL_CHOICES"
              :key="choice.id"
              type="button"
              class="h-9 flex-1 rounded-md px-3 text-sm font-medium transition-colors sm:flex-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              :class="model === choice.id ? 'bg-background text-foreground shadow-sm dark:bg-input/50' : 'text-muted-foreground hover:text-foreground'"
              :aria-pressed="model === choice.id"
              @click="model = choice.id"
            >
              {{ choice.label }}
            </button>
          </div>
        </div>

        <div
          class="rounded-xl border-2 border-dashed p-10 text-center transition-colors"
          :class="dragging ? 'border-primary bg-primary/5' : 'border-input'"
          @dragover.prevent="dragging = true"
          @dragleave.prevent="dragging = false"
          @drop.prevent="onDrop"
        >
          <FileAudio class="mx-auto size-8 text-muted-foreground" aria-hidden="true" />
          <p class="mt-3 text-sm font-medium">
            Drop a song here
          </p>
          <p class="mt-1 text-xs text-muted-foreground">
            MP3, WAV, M4A, FLAC or OGG, up to {{ Math.floor(MODELS[model].maxSeconds / 60) }} minutes. It never leaves your device.
          </p>

          <input
            id="stem-splitter-file"
            type="file"
            accept="audio/*,.flac,.m4a"
            class="sr-only"
            @change="onFiles(($event.target as HTMLInputElement).files)"
          >
          <Label
            for="stem-splitter-file"
            class="mt-5 inline-flex min-h-11 cursor-pointer items-center rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2"
          >
            Choose a song
          </Label>
        </div>

        <p v-if="status === 'error'" class="mt-4 text-sm text-destructive" role="alert">
          {{ error }}
        </p>
      </section>

      <p class="rounded-2xl border border-border p-5 text-xs text-muted-foreground">
        Your song stays in this browser and is never uploaded. The model ({{ AUDIO.credit }}, {{ AUDIO.licence }})
        downloads from Hugging Face, and its runtime from jsDelivr, the first time you use it. Both see your IP
        address — the audio is not sent. With WebGPU a three-minute song takes about a minute with 4 stems and
        two with 6; without it, several times that. With 6 stems, guitar means acoustic and electric together,
        and synths stay in "other".
      </p>
    </template>

    <!-- ── Working ────────────────────────────────────────────────────── -->
    <section v-if="busy" class="space-y-4 rounded-2xl border border-border p-5" aria-label="Progress">
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <p class="text-sm font-medium">
            {{ statusLabel }}
          </p>
          <p class="mt-1 truncate text-xs text-muted-foreground">
            {{ fileName }}
          </p>
        </div>
        <Button variant="ghost" size="sm" class="min-h-11 shrink-0" @click="cancel()">
          <X class="size-3.5" />
          Cancel
        </Button>
      </div>

      <div
        v-if="status === 'downloading' || status === 'separating'"
        class="h-2 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        :aria-valuenow="Math.round((status === 'downloading' ? downloadProgress : separationShare) * 100)"
        aria-valuemin="0"
        aria-valuemax="100"
        :aria-label="status === 'downloading' ? 'Model download progress' : 'Separation progress'"
      >
        <div
          class="h-full rounded-full bg-primary transition-[width] duration-200"
          :style="{ width: `${(status === 'downloading' ? downloadProgress : separationShare) * 100}%` }"
        />
      </div>

      <p v-if="status === 'separating'" class="text-xs text-muted-foreground">
        <span class="tabular-nums">{{ progress.done }} / {{ progress.total }}</span> sections
        <template v-if="remaining !== null">
          · {{ eta(remaining) }}
        </template>
        <br>
        {{ backendNote }}
      </p>
      <p v-else class="text-xs text-muted-foreground">
        Running on your own machine, so this depends on your hardware rather than our servers.
      </p>
    </section>

    <!-- ── Result: a four-track mixer ─────────────────────────────────── -->
    <div v-if="hasResult" class="space-y-4">
      <section class="rounded-2xl border border-border p-4 sm:p-5" aria-label="Player">
        <div class="flex items-center gap-3">
          <Button
            size="icon"
            class="size-11 shrink-0 rounded-full"
            :aria-label="playing ? 'Pause' : 'Play'"
            @click="toggle()"
          >
            <component :is="playing ? Pause : Play" class="size-5" />
          </Button>
          <div class="min-w-0 flex-1">
            <div class="flex items-baseline justify-between gap-3">
              <p class="truncate text-sm font-medium">
                {{ fileName }}
              </p>
              <p class="shrink-0 text-xs tabular-nums text-muted-foreground">
                {{ clock(position) }} / {{ clock(duration) }}
              </p>
            </div>
            <Slider
              :model-value="[position]"
              :min="0"
              :max="Math.max(duration, 0.01)"
              :step="0.1"
              aria-label="Playback position"
              @update:model-value="value => seek(value?.[0] ?? 0)"
            />
          </div>
          <Button variant="ghost" size="sm" class="min-h-11 shrink-0" @click="reset()">
            <RotateCcw class="size-3.5" />
            <span class="hidden sm:inline">New song</span>
            <span class="sr-only sm:hidden">New song</span>
          </Button>
        </div>

        <div class="mt-4 flex flex-wrap items-center gap-2" role="group" aria-label="Mix presets">
          <Button
            v-for="preset in presets"
            :key="preset.id"
            :variant="activePreset?.id === preset.id ? 'default' : 'outline'"
            size="sm"
            class="min-h-11"
            :aria-pressed="activePreset?.id === preset.id"
            @click="applyPreset(preset)"
          >
            {{ preset.label }}
          </Button>
        </div>
      </section>

      <section class="divide-y divide-border overflow-hidden rounded-2xl border border-border" aria-labelledby="stem-splitter-stems">
        <h2 id="stem-splitter-stems" class="sr-only">
          Stems
        </h2>
        <div
          v-for="(stem, k) in stemList"
          :key="stem"
          class="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-2 p-3 sm:grid-cols-[9rem_minmax(0,1fr)_auto] sm:p-4"
          :class="gainOf(stem) === 0 ? 'opacity-60' : ''"
        >
          <div class="flex items-center gap-2">
            <component :is="ICONS[stem]" class="size-4 text-muted-foreground" aria-hidden="true" />
            <h3 class="text-sm font-medium">
              {{ STEM_LABELS[stem] }}
            </h3>
            <span
              v-if="EXPERIMENTAL[stem]"
              class="rounded-full border border-border px-1.5 py-px text-[10px] font-medium uppercase tracking-wide text-muted-foreground"
              title="This model's piano separation is the least reliable of its six stems."
            >
              {{ EXPERIMENTAL[stem] }}
            </span>
          </div>

          <!--
            Pointer-only seek; the position slider above is the keyboard and
            screen-reader route to the same thing, so this stays aria-hidden.
          -->
          <div class="relative h-10 cursor-pointer" aria-hidden="true" @click="seekFromWaveform">
            <svg :viewBox="`0 0 ${bars} 40`" preserveAspectRatio="none" class="size-full">
              <defs>
                <clipPath :id="`stem-played-${stem}`">
                  <rect x="0" y="0" :width="playedBars" height="40" />
                </clipPath>
              </defs>
              <path :d="paths[k]" class="stroke-muted-foreground/40" stroke-width="0.65" />
              <path :d="paths[k]" class="stroke-primary" stroke-width="0.65" :clip-path="`url(#stem-played-${stem})`" />
            </svg>
            <span v-if="silent[stem]" class="absolute inset-0 grid place-items-center text-xs text-muted-foreground">
              Almost nothing here
            </span>
          </div>

          <div class="col-span-2 flex flex-wrap items-center gap-2 sm:col-span-1 sm:flex-nowrap">
            <Button
              :variant="on[stem] ? 'default' : 'outline'"
              size="sm"
              class="min-h-11 w-20"
              :aria-pressed="on[stem]"
              :aria-label="`${STEM_LABELS[stem]} in the mix`"
              @click="on[stem] = !on[stem]"
            >
              {{ on[stem] ? 'On' : 'Off' }}
            </Button>
            <Button
              :variant="solo === stem ? 'default' : 'outline'"
              size="sm"
              class="min-h-11"
              :aria-pressed="solo === stem"
              :aria-label="`Solo ${STEM_LABELS[stem]}`"
              @click="toggleSolo(stem)"
            >
              <Headphones class="size-3.5" />
              Solo
            </Button>
            <Slider
              class="w-24"
              :model-value="[Math.round(volume[stem] * 100)]"
              :min="0"
              :max="150"
              :step="1"
              :aria-label="`${STEM_LABELS[stem]} volume, percent`"
              @update:model-value="value => volume[stem] = (value?.[0] ?? 100) / 100"
            />
            <Button
              variant="ghost"
              size="icon"
              class="size-11"
              :aria-label="`Download ${STEM_LABELS[stem]} as WAV`"
              @click="downloadStem(stem)"
            >
              <component :is="saved === stemFileName(fileName, stem) ? Check : Download" class="size-4" />
            </Button>
          </div>
        </div>
      </section>

      <!--
        The download area spans the workspace and stays in normal flow, so
        nothing ever overlays it.
      -->
      <section class="flex flex-col items-center gap-3 rounded-2xl border border-border p-4" aria-label="Download">
        <div class="flex flex-wrap justify-center gap-2">
          <template v-if="isVocalRemover">
            <Button size="lg" class="min-h-11" @click="downloadMix()">
              <Download class="size-4" />
              Download {{ mixPart === 'instrumental' ? 'instrumental' : mixLabel.toLowerCase() }} (WAV)
            </Button>
            <Button variant="outline" size="lg" class="min-h-11" @click="downloadAll()">
              <FileArchive class="size-4" />
              All {{ stemList.length }} stems (.zip)
            </Button>
          </template>
          <template v-else>
            <Button size="lg" class="min-h-11" @click="downloadAll()">
              <FileArchive class="size-4" />
              Download all stems (.zip)
            </Button>
            <Button variant="outline" size="lg" class="min-h-11" @click="downloadMix()">
              <Download class="size-4" />
              This mix: {{ mixLabel }} (WAV)
            </Button>
          </template>
        </div>
        <p class="text-center text-xs text-muted-foreground">
          16-bit WAV at 44.1 kHz. The mix download is exactly what you hear, with mutes and volumes applied.
        </p>
        <ShareBar :tool="TOOL" class="justify-center" />
      </section>
    </div>

    <!--
      Outside the result block on purpose: decoding, the download and every
      stage of separation need announcing, and a live region that only exists
      once there is a result would announce none of them.
    -->
    <div aria-live="polite" class="sr-only">
      {{ announcement }}
    </div>
  </div>
</template>
