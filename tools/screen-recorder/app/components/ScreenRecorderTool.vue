<script setup lang="ts">
import { Clock, Download, FileVideo, HardDrive, Mic, Pause, Play, RotateCcw, ScreenShare, Smartphone, Square, Timer, TriangleAlert, Volume2, VolumeX, X } from 'lucide-vue-next'
import { bytesPerMinute, describeElapsed, formatBytes, formatElapsed } from '../../core'
import { useScreenRecorder } from '../composables/useScreenRecorder'

const {
  settings,
  support,
  state,
  error,
  errorIsCancel,
  notes,
  countdown,
  elapsed,
  bytes,
  hasAudio,
  preview,
  result,
  downloaded,
  preset,
  quality,
  presets,
  memory,
  perHour,
  capturing,
  busy,
  start,
  begin,
  pause,
  resume,
  finish,
  cancel,
  discard,
} = useScreenRecorder()

const { track } = useAnalytics()

const previewEl = ref<HTMLVideoElement | null>(null)
watch([preview, previewEl], ([stream, el]) => {
  if (el)
    el.srcObject = stream
})

function onDownload() {
  if (!result.value)
    return
  downloaded.value = true
  track('tool_completed', { tool: 'screen-recorder', format: result.value.container })
}

const unsupported = computed(() => support.value !== 'ok' && support.value !== 'unknown')

const presetOf = (id: string) => presets.find(p => p.id === id)!
const perMinute = (id: string) => formatBytes(bytesPerMinute(presetOf(id)))

const announcement = computed(() => {
  switch (state.value) {
    case 'picking': return 'Choose a screen, window or tab to share in the browser\'s picker.'
    case 'countdown': return countdown.value ? `Recording in ${countdown.value}` : ''
    case 'recording': return elapsed.value < 1500 ? 'Recording.' : ''
    case 'paused': return `Paused at ${describeElapsed(elapsed.value)}.`
    case 'finishing': return 'Finishing the file.'
    case 'done': return result.value ? `Recording ready: ${describeElapsed(result.value.durationMs)}, ${formatBytes(result.value.size)}. Press Download to save it.` : ''
    default: return error.value
  }
})

const memoryMessage = computed(() => {
  if (memory.value === 'warn')
    return `This recording is ${formatBytes(bytes.value)} and is held in the browser until you download it. Stop and save soon — some browsers run out of room past this size and the recording would be lost.`
  if (memory.value === 'notice')
    return `This recording is past ${formatBytes(bytes.value)}. It is held in the browser until you download it, so for a very long session it is worth stopping, saving and starting a new one.`
  return ''
})
</script>

<template>
  <div class="tool-frame flex flex-col gap-5">
    <p class="sr-only" aria-live="polite">
      {{ announcement }}
    </p>

    <section class="flex min-h-[22rem] flex-col items-center justify-center gap-5 rounded-2xl border bg-background p-5 dark:bg-input/30 sm:p-6">
      <!-- Honest about what this browser cannot do, and what to use instead. -->
      <div v-if="unsupported" class="flex max-w-md flex-col items-center gap-3 text-center" data-testid="recorder-unsupported">
        <template v-if="support === 'mobile'">
          <Smartphone class="size-8 text-muted-foreground" aria-hidden="true" />
          <p class="font-medium">
            Phone browsers cannot record the screen
          </p>
          <p class="text-sm text-muted-foreground">
            Neither iOS nor Android lets a web page capture the screen — no browser there has the feature, so no website can do it. Your phone already has a screen recorder built in: on an iPhone or iPad, add Screen Recording to Control Centre; on Android, swipe down twice and tap Screen record. To record a computer screen, open this page on the computer.
          </p>
        </template>
        <template v-else-if="support === 'insecure'">
          <TriangleAlert class="size-8 text-muted-foreground" aria-hidden="true" />
          <p class="font-medium">
            Screen recording needs a secure page
          </p>
          <p class="text-sm text-muted-foreground">
            Browsers only offer screen capture on pages served over https. Open this page at its https address and it will work.
          </p>
        </template>
        <template v-else-if="support === 'no-recorder'">
          <TriangleAlert class="size-8 text-muted-foreground" aria-hidden="true" />
          <p class="font-medium">
            This browser can share the screen but not record it
          </p>
          <p class="text-sm text-muted-foreground">
            It has no MediaRecorder, the part that turns a live capture into a video file. Current versions of Chrome, Edge, Firefox and Safari all have it.
          </p>
        </template>
        <template v-else>
          <TriangleAlert class="size-8 text-muted-foreground" aria-hidden="true" />
          <p class="font-medium">
            This browser does not offer screen capture
          </p>
          <p class="text-sm text-muted-foreground">
            Try a current version of Chrome, Edge, Firefox or Safari on a computer. Embedded browsers inside other apps often leave the feature out.
          </p>
        </template>
      </div>

      <!-- Ready -->
      <div v-else-if="state === 'idle'" class="flex flex-col items-center gap-5 py-4 text-center">
        <!-- A screen being recorded, drawn in the theme's own colours. -->
        <svg viewBox="0 0 200 128" class="w-48 sm:w-56" aria-hidden="true">
          <rect x="2" y="2" width="196" height="112" rx="10" class="fill-muted stroke-border" stroke-width="2" />
          <path d="M2 12a10 10 0 0 1 10-10h176a10 10 0 0 1 10 10v8H2z" class="fill-border" />
          <circle cx="13" cy="11" r="2.5" class="fill-muted-foreground/50" />
          <circle cx="22" cy="11" r="2.5" class="fill-muted-foreground/50" />
          <circle cx="31" cy="11" r="2.5" class="fill-muted-foreground/50" />
          <rect x="14" y="32" width="70" height="8" rx="4" class="fill-muted-foreground/40" />
          <rect x="14" y="46" width="110" height="5" rx="2.5" class="fill-muted-foreground/25" />
          <rect x="14" y="56" width="96" height="5" rx="2.5" class="fill-muted-foreground/25" />
          <rect x="14" y="70" width="80" height="32" rx="5" class="fill-background stroke-border" stroke-width="1.5" />
          <rect x="102" y="70" width="80" height="32" rx="5" class="fill-background stroke-border" stroke-width="1.5" />
          <path d="M130 54l18 7-8 2.5-2.5 8z" class="fill-foreground stroke-background" stroke-width="1.5" stroke-linejoin="round" />
          <rect x="146" y="26" width="40" height="16" rx="8" class="fill-destructive" />
          <circle cx="156" cy="34" r="3" class="rec-dot fill-white" />
          <text x="164" y="37.5" font-size="9" font-weight="700" class="fill-white" font-family="ui-sans-serif, system-ui">REC</text>
          <rect x="80" y="114" width="40" height="8" class="fill-border" />
          <rect x="62" y="122" width="76" height="4" rx="2" class="fill-border" />
        </svg>
        <div>
          <p class="text-lg font-semibold">
            Record your screen, a window or a tab
          </p>
          <p class="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
            The video is recorded on your device and saved straight to it. Nothing is uploaded — there is nowhere for it to go.
          </p>
        </div>
        <Button size="lg" data-testid="recorder-start" @click="start">
          <ScreenShare class="size-4" aria-hidden="true" /> Start recording
        </Button>
        <p v-if="error" class="max-w-md text-sm" :class="errorIsCancel ? 'text-muted-foreground' : 'text-destructive'" role="alert">
          {{ error }}
        </p>
      </div>

      <!-- The browser's picker is open -->
      <div v-else-if="state === 'picking'" class="flex flex-col items-center gap-3 py-4 text-center">
        <ScreenShare class="size-10 text-muted-foreground" aria-hidden="true" />
        <p class="font-medium">
          Choose what to share
        </p>
        <p class="max-w-sm text-sm text-muted-foreground">
          Your browser is asking which screen, window or tab to record. For sound from a tab, tick “Share tab audio” in that picker.
        </p>
      </div>

      <!-- Live: countdown, recording, paused -->
      <div v-else-if="state === 'countdown' || capturing || state === 'finishing'" class="flex w-full flex-col items-center gap-4">
        <div class="relative w-full overflow-hidden rounded-xl border bg-muted">
          <video
            ref="previewEl"
            class="aspect-video w-full bg-black object-contain"
            autoplay
            muted
            playsinline
            aria-label="Live preview of what is being recorded"
          />
          <div
            v-if="state === 'countdown'"
            class="absolute inset-0 grid place-items-center bg-background/80 backdrop-blur-sm"
          >
            <span class="grid size-32 place-items-center rounded-full border-4 border-destructive bg-background shadow-lg" aria-hidden="true">
              <span :key="countdown" class="count-pop font-heading text-6xl font-semibold tabular-nums">{{ countdown }}</span>
            </span>
          </div>
          <!-- On the picture itself, like a camera's viewfinder. -->
          <div v-if="state !== 'countdown'" class="pointer-events-none absolute inset-x-0 top-0 flex flex-wrap items-start justify-between gap-2 p-3" aria-hidden="true">
            <span
              class="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold tracking-wide text-white"
              :class="state === 'recording' ? 'bg-red-600' : 'bg-black/65 backdrop-blur'"
            >
              <span class="size-2 rounded-full bg-white" :class="state === 'recording' ? 'rec-dot' : ''" />
              {{ state === 'paused' ? 'PAUSED' : state === 'finishing' ? 'SAVING' : 'REC' }}
              <span class="font-mono font-medium tabular-nums">{{ formatElapsed(elapsed) }}</span>
            </span>
            <span class="inline-flex items-center gap-1.5 rounded-full bg-black/65 px-3 py-1.5 text-xs font-medium text-white backdrop-blur">
              <component :is="hasAudio ? Volume2 : VolumeX" class="size-3.5" />
              {{ hasAudio ? 'Sound on' : 'No sound' }}
            </span>
          </div>
        </div>

        <template v-if="state === 'countdown'">
          <p class="text-sm text-muted-foreground">
            Recording starts in {{ countdown }} — switch to what you want to record.
          </p>
          <div class="flex flex-wrap justify-center gap-3">
            <Button size="lg" @click="begin">
              <Play class="size-4" aria-hidden="true" /> Start now
            </Button>
            <Button size="lg" variant="outline" @click="cancel">
              <X class="size-4" aria-hidden="true" /> Cancel
            </Button>
          </div>
        </template>

        <template v-else>
          <div class="flex w-full flex-wrap items-center justify-between gap-x-6 gap-y-3 rounded-xl bg-muted/50 px-4 py-3">
            <div class="flex items-center gap-3">
              <span
                class="size-3 rounded-full"
                :class="state === 'recording' ? 'rec-dot bg-destructive' : 'bg-muted-foreground'"
                aria-hidden="true"
              />
              <div>
                <p class="text-xs font-medium text-muted-foreground">
                  {{ state === 'paused' ? 'Paused' : state === 'finishing' ? 'Finishing' : 'Recording' }}
                </p>
                <p class="font-mono text-3xl font-semibold leading-none tabular-nums" data-testid="recorder-elapsed">
                  <span class="sr-only">Recorded time: </span>{{ formatElapsed(elapsed) }}
                </p>
              </div>
            </div>
            <dl class="flex flex-wrap gap-2 text-xs">
              <div class="rounded-lg border bg-background px-3 py-1.5 dark:bg-input/30">
                <dt class="text-muted-foreground">
                  So far
                </dt>
                <dd class="font-medium tabular-nums">
                  {{ formatBytes(bytes) }}
                </dd>
              </div>
              <div class="rounded-lg border bg-background px-3 py-1.5 dark:bg-input/30">
                <dt class="text-muted-foreground">
                  An hour would be
                </dt>
                <dd class="font-medium tabular-nums">
                  about {{ formatBytes(perHour) }}
                </dd>
              </div>
              <div class="rounded-lg border bg-background px-3 py-1.5 dark:bg-input/30">
                <dt class="text-muted-foreground">
                  Sound
                </dt>
                <dd class="font-medium">
                  {{ hasAudio ? 'With sound' : 'None' }}
                </dd>
              </div>
            </dl>
          </div>

          <div class="flex flex-wrap justify-center gap-3">
            <Button v-if="state === 'recording'" size="lg" variant="outline" @click="pause">
              <Pause class="size-4" aria-hidden="true" /> Pause
            </Button>
            <Button v-else-if="state === 'paused'" size="lg" variant="outline" @click="resume">
              <Play class="size-4" aria-hidden="true" /> Resume
            </Button>
            <Button size="lg" :disabled="state === 'finishing'" data-testid="recorder-stop" @click="finish">
              <Square class="size-4" aria-hidden="true" /> Stop
            </Button>
          </div>

          <p v-if="memoryMessage" class="flex max-w-lg items-start gap-2 text-sm" :class="memory === 'warn' ? 'text-destructive' : 'text-muted-foreground'" role="status">
            <TriangleAlert class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            {{ memoryMessage }}
          </p>
          <p class="text-center text-xs text-muted-foreground">
            Ending the share from your browser’s own “Stop sharing” bar stops and keeps the recording too.
          </p>
        </template>
      </div>

      <!-- Result -->
      <div v-else-if="state === 'done' && result" class="flex w-full flex-col gap-4">
        <video
          :src="result.url"
          class="aspect-video w-full rounded-xl border bg-black object-contain"
          controls
          playsinline
          preload="metadata"
          aria-label="Your recording"
        />

        <dl class="grid grid-cols-3 gap-2 text-sm">
          <div
            v-for="fact in [
              { icon: Clock, label: 'Length', value: formatElapsed(result.durationMs) },
              { icon: HardDrive, label: 'Size', value: formatBytes(result.size) },
              { icon: FileVideo, label: 'Format', value: result.container.toUpperCase() },
            ]" :key="fact.label" class="flex items-center gap-2.5 rounded-xl bg-muted/50 p-3"
          >
            <component :is="fact.icon" class="hidden size-4 shrink-0 text-muted-foreground sm:block" aria-hidden="true" />
            <div class="min-w-0">
              <dt class="text-xs text-muted-foreground">
                {{ fact.label }}
              </dt>
              <dd class="font-medium tabular-nums">
                {{ fact.value }}
              </dd>
            </div>
          </div>
        </dl>

        <!-- The download area: nothing else competes with it. -->
        <div class="flex flex-wrap items-center justify-center gap-3">
          <Button
            as="a"
            size="lg"
            :href="result.url"
            :download="result.fileName"
            data-testid="recorder-download"
            @click="onDownload"
          >
            <Download class="size-4" aria-hidden="true" /> Download {{ result.container.toUpperCase() }}
          </Button>
          <Button size="lg" variant="outline" @click="discard">
            <RotateCcw class="size-4" aria-hidden="true" /> Record again
          </Button>
        </div>

        <p v-if="!downloaded" class="text-center text-xs text-muted-foreground">
          The recording exists only in this tab until you download it.
        </p>
        <p v-if="result.container === 'webm'" class="text-center text-xs text-muted-foreground">
          This browser records WebM, which plays in Chrome, Firefox, Edge, VLC and YouTube. If you need MP4 for an editor or an older player, see “WebM or MP4?” below.
        </p>
        <p v-if="!result.seekable" class="text-center text-xs text-muted-foreground">
          The length could not be written into this file, so some players may not let you skip around in it. It still plays from start to finish.
        </p>
      </div>

      <ul v-if="notes.length && !unsupported" class="flex max-w-lg flex-col gap-1 text-sm text-muted-foreground" role="status">
        <li v-for="note in notes" :key="note" class="flex items-start gap-2">
          <TriangleAlert class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {{ note }}
        </li>
      </ul>
      <p v-if="error && state !== 'idle' && !unsupported" class="max-w-md text-center text-sm text-destructive" role="alert">
        {{ error }}
      </p>
    </section>

    <!-- Settings: fixed while a capture is live, because they shape it. -->
    <section class="grid gap-x-6 gap-y-5 rounded-2xl border bg-background p-5 dark:bg-input/30 sm:grid-cols-2">
      <div class="flex flex-col gap-2">
        <Label for="recorder-quality" class="mb-0">Quality</Label>
        <Select v-model="quality" :disabled="busy || unsupported">
          <SelectTrigger id="recorder-quality" class="min-h-11 w-full" aria-label="Recording quality">
            {{ preset.label }} · up to {{ perMinute(preset.id) }} a minute
          </SelectTrigger>
          <SelectContent>
            <SelectItem v-for="p in presets" :key="p.id" :value="p.id">
              {{ p.label }} — up to {{ perMinute(p.id) }} a minute
            </SelectItem>
          </SelectContent>
        </Select>
        <p class="text-xs text-muted-foreground">
          {{ preset.hint }} A still screen comes in well under the figure; it is the most the encoder will spend.
        </p>
      </div>

      <div class="flex flex-col gap-2" role="group" aria-labelledby="recorder-options">
        <p id="recorder-options" class="text-xs font-medium text-muted-foreground">
          Sound and start
        </p>
        <div class="grid gap-1 rounded-lg border p-1">
          <div class="flex min-h-11 items-center gap-3 px-2.5">
            <Checkbox id="recorder-system-audio" v-model="settings.systemAudio" :disabled="busy || unsupported" />
            <Label for="recorder-system-audio" class="mb-0 flex items-center gap-1.5 text-sm font-normal">
              <Volume2 class="size-4 text-muted-foreground" aria-hidden="true" /> Record tab or system sound
            </Label>
          </div>
          <div class="flex min-h-11 items-center gap-3 px-2.5">
            <Checkbox id="recorder-microphone" v-model="settings.microphone" :disabled="busy || unsupported" />
            <Label for="recorder-microphone" class="mb-0 flex items-center gap-1.5 text-sm font-normal">
              <Mic class="size-4 text-muted-foreground" aria-hidden="true" /> Add my microphone
            </Label>
          </div>
          <div class="flex min-h-11 items-center gap-3 px-2.5">
            <Checkbox id="recorder-countdown" v-model="settings.countdown" :disabled="busy || unsupported" />
            <Label for="recorder-countdown" class="mb-0 flex items-center gap-1.5 text-sm font-normal">
              <Timer class="size-4 text-muted-foreground" aria-hidden="true" /> Count down 3, 2, 1 before recording
            </Label>
          </div>
        </div>
        <p class="text-xs text-muted-foreground">
          The microphone is asked for only when you start, and only if this is ticked. A webcam bubble is not offered.
        </p>
      </div>
    </section>
  </div>
</template>

<style scoped>
.rec-dot {
  animation: rec 1s ease-in-out infinite alternate;
}

@keyframes rec {
  to {
    opacity: 0.25;
  }
}

.count-pop {
  animation: pop 0.35s ease-out;
}

@keyframes pop {
  from {
    opacity: 0;
    scale: 1.6;
  }
}

@media (prefers-reduced-motion: reduce) {
  .rec-dot,
  .count-pop {
    animation: none !important;
  }
}
</style>
