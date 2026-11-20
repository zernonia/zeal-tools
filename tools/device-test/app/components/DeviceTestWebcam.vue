<script setup lang="ts">
import { Camera, Download, FlipHorizontal2, Gauge, Proportions, Ratio, ScanEye, Video, VideoOff } from 'lucide-vue-next'
import { aspectRatio, fpsVerdict, qualityGrade, RESOLUTION_REQUESTS, resolutionName } from '../../core'
import { useWebcamTest } from '../composables/useWebcamTest'

const video = ref<HTMLVideoElement | null>(null)

const {
  state,
  error,
  notice,
  devices,
  label,
  deviceId,
  resolution,
  mirror,
  settings,
  capabilities,
  fps,
  fpsMeasurable,
  start,
  stop,
  snapshot,
} = useWebcamTest(video)

const { track } = useAnalytics()
const live = computed(() => state.value === 'live')
const saved = ref('')

const sizeText = computed(() => {
  const s = settings.value
  if (!s?.width)
    return '—'
  const name = resolutionName(s.width, s.height)
  return `${s.width} × ${s.height}${name ? ` (${name})` : ''}`
})

const grade = computed(() => (settings.value?.width ? qualityGrade(settings.value.width, settings.value.height) : ''))
const smoothness = computed(() => (fpsMeasurable.value ? fpsVerdict(fps.value) : null))
const SMOOTHNESS_TEXT = { smooth: 'Smooth', fine: 'A little choppy', choppy: 'Choppy' } as const

const status = computed(() => {
  if (state.value === 'starting')
    return 'Starting the camera.'
  if (live.value && settings.value?.width)
    return `Camera on at ${settings.value.width} by ${settings.value.height}.`
  return ''
})

let tracked = false
watch(live, (on) => {
  if (on && !tracked) {
    tracked = true
    track('tool_completed', { tool: 'device-test', format: 'webcam' })
  }
})

async function save() {
  saved.value = ''
  saved.value = (await snapshot()) ? 'Snapshot saved to your downloads.' : 'The snapshot could not be taken — wait for the picture to appear.'
}

const requestLabel = computed(() => RESOLUTION_REQUESTS.find(r => r.id === resolution.value)?.label ?? '')
const deviceLabel = computed(() => {
  const index = devices.value.findIndex(d => d.deviceId === deviceId.value)
  const device = devices.value[Math.max(0, index)]
  return device ? label(device, Math.max(0, index)) : 'Default camera'
})

const specs = computed(() => [
  { icon: Proportions, label: 'Resolution', value: sizeText.value, testid: 'cam-resolution' },
  { icon: Ratio, label: 'Aspect ratio', value: settings.value?.width ? aspectRatio(settings.value.width, settings.value.height) : '—', testid: undefined },
  { icon: Gauge, label: 'Frame rate (reported)', value: settings.value?.frameRate ? `${Math.round(settings.value.frameRate * 10) / 10} fps` : 'Not reported', testid: undefined },
  {
    icon: ScanEye,
    label: 'Frame rate (measured)',
    value: fpsMeasurable.value ? (fps.value ? `${fps.value.toFixed(1)} fps` : 'Measuring…') : 'Not measurable here',
    testid: 'cam-fps',
  },
])

/** Chips laid over the video: legible on any picture, whatever the theme. */
const chip = 'inline-flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-white backdrop-blur'
const overlayButton = 'border-white/25 bg-black/55 text-white backdrop-blur hover:bg-black/75 hover:text-white dark:bg-black/55 dark:hover:bg-black/75'
</script>

<template>
  <div class="tool-frame flex flex-col gap-5">
    <p class="sr-only" aria-live="polite">
      {{ status }} {{ notice }} {{ saved }}
    </p>

    <section class="flex flex-col gap-5 rounded-2xl border bg-background p-5 dark:bg-input/30 sm:p-6">
      <!--
        Always in the DOM so the stream has somewhere to go the moment it
        opens; hidden until then. Inside the tool frame, video is blocked from
        session replay outright.
      -->
      <div v-show="live" class="relative overflow-hidden rounded-xl bg-black">
        <video
          ref="video"
          class="mx-auto aspect-video max-h-[60vh] w-full object-contain"
          :class="mirror ? '-scale-x-100' : ''"
          autoplay
          muted
          playsinline
          aria-label="Live camera preview"
        />
        <div v-if="live" class="pointer-events-none absolute inset-x-0 top-0 flex flex-wrap items-start justify-between gap-2 p-3" aria-hidden="true">
          <span :class="chip">
            <span class="live-dot size-2 rounded-full bg-red-500" />
            Live<template v-if="grade">
              · {{ grade }}
            </template>
          </span>
          <span v-if="settings?.width" :class="chip" class="font-mono tabular-nums">
            {{ settings.width }}×{{ settings.height }}<template v-if="fps">
              · {{ fps.toFixed(0) }} fps
            </template>
          </span>
        </div>
        <div v-if="live" class="absolute inset-x-0 bottom-0 flex flex-wrap justify-center gap-2 p-3">
          <Button size="lg" variant="outline" :class="overlayButton" @click="save">
            <Download class="size-4" /> Save snapshot
          </Button>
          <Button size="lg" variant="outline" :class="overlayButton" :aria-pressed="mirror" @click="mirror = !mirror">
            <FlipHorizontal2 class="size-4" /> Mirror
          </Button>
        </div>
      </div>

      <template v-if="live">
        <dl class="grid grid-cols-2 gap-2 lg:grid-cols-4">
          <div v-for="spec in specs" :key="spec.label" class="flex items-start gap-2.5 rounded-xl bg-muted/50 p-3">
            <component :is="spec.icon" class="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <div class="min-w-0">
              <dt class="text-xs text-muted-foreground">
                {{ spec.label }}
              </dt>
              <dd class="mt-0.5 text-sm font-medium tabular-nums" :data-testid="spec.testid">
                {{ spec.value }}
              </dd>
            </div>
          </div>
        </dl>
        <p class="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span
            v-if="smoothness"
            class="inline-flex items-center rounded-full border px-2.5 py-0.5 font-medium"
            :class="smoothness === 'smooth'
              ? 'border-emerald-600/25 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300'
              : smoothness === 'fine'
                ? 'border-amber-600/30 bg-amber-500/10 text-amber-800 dark:text-amber-300'
                : 'border-destructive/40 bg-destructive/10 text-destructive'"
          >{{ SMOOTHNESS_TEXT[smoothness] }}</span>
          The snapshot is made in your browser and saved straight to your device, unmirrored. Nothing is uploaded.
        </p>
      </template>

      <DeviceTestIdle
        v-else
        :icon="Camera"
        title="See your camera, and what it really delivers"
        text="Your browser will ask for permission. The picture stays on this page and nothing is recorded or sent."
      >
        <Button size="lg" :disabled="state === 'starting'" @click="start">
          <Video class="size-4" /> {{ state === 'starting' ? 'Starting…' : 'Start webcam test' }}
        </Button>
        <p v-if="error" class="max-w-md text-sm text-destructive" role="alert">
          {{ error }}
        </p>
        <p v-else-if="notice" class="max-w-md text-sm text-muted-foreground">
          {{ notice }}
        </p>
      </DeviceTestIdle>
    </section>

    <section class="grid gap-x-6 gap-y-5 rounded-2xl border bg-background p-5 dark:bg-input/30 sm:grid-cols-2">
      <div class="flex flex-col gap-2">
        <Label for="cam-device" class="mb-0">Camera</Label>
        <Select v-model="deviceId" :disabled="!devices.length">
          <SelectTrigger id="cam-device" class="h-11 w-full">
            <span class="truncate">{{ deviceLabel }}</span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem v-for="(d, i) in devices" :key="d.deviceId" :value="d.deviceId">
              {{ label(d, i) }}
            </SelectItem>
          </SelectContent>
        </Select>
        <p class="text-xs text-muted-foreground">
          The list fills in once access is allowed — browsers hide device names until then.
        </p>
      </div>

      <div class="flex flex-col gap-2">
        <Label for="cam-resolution" class="mb-0">Ask for</Label>
        <Select v-model="resolution">
          <SelectTrigger id="cam-resolution" class="h-11 w-full">
            {{ requestLabel }}
          </SelectTrigger>
          <SelectContent>
            <SelectItem v-for="r in RESOLUTION_REQUESTS" :key="r.id" :value="r.id">
              {{ r.label }}
            </SelectItem>
          </SelectContent>
        </Select>
        <p class="text-xs text-muted-foreground">
          A request, not a guarantee: the camera opens at the nearest size it supports, shown above.
        </p>
      </div>

      <div v-if="capabilities.length" class="border-t pt-5 sm:col-span-2">
        <h2 class="text-sm font-medium">
          What this camera says it can do
        </h2>
        <dl class="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <div v-for="c in capabilities" :key="c.name" class="flex items-baseline justify-between gap-3 rounded-lg bg-muted/50 px-3 py-2 text-sm">
            <dt class="text-muted-foreground">
              {{ c.name }}
            </dt>
            <dd class="text-right font-medium tabular-nums">
              {{ c.value }}
            </dd>
          </div>
        </dl>
      </div>
      <p v-else-if="live" class="text-xs text-muted-foreground sm:col-span-2">
        This browser does not list camera capabilities to web pages, so only the delivered settings are shown.
      </p>

      <div v-if="live" class="border-t pt-5 sm:col-span-2">
        <Button variant="outline" class="h-11" @click="stop">
          <VideoOff class="size-4" /> Stop camera
        </Button>
      </div>
    </section>
  </div>
</template>

<style scoped>
.live-dot {
  animation: live 1s ease-in-out infinite alternate;
}

@keyframes live {
  to {
    opacity: 0.3;
  }
}

@media (prefers-reduced-motion: reduce) {
  .live-dot {
    animation: none !important;
  }
}
</style>
