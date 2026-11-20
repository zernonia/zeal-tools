<script setup lang="ts">
import { Camera, Download, Video, VideoOff } from 'lucide-vue-next'
import { aspectRatio, RESOLUTION_REQUESTS, resolutionName } from '../../core'
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
      </div>

      <template v-if="live">
        <dl class="grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-4">
          <div>
            <dt class="text-xs text-muted-foreground">
              Resolution
            </dt>
            <dd class="tabular-nums" data-testid="cam-resolution">
              {{ sizeText }}
            </dd>
          </div>
          <div>
            <dt class="text-xs text-muted-foreground">
              Aspect ratio
            </dt>
            <dd class="tabular-nums">
              {{ settings?.width ? aspectRatio(settings.width, settings.height) : '—' }}
            </dd>
          </div>
          <div>
            <dt class="text-xs text-muted-foreground">
              Frame rate (reported)
            </dt>
            <dd class="tabular-nums">
              {{ settings?.frameRate ? `${Math.round(settings.frameRate * 10) / 10} fps` : 'Not reported' }}
            </dd>
          </div>
          <div>
            <dt class="text-xs text-muted-foreground">
              Frame rate (measured)
            </dt>
            <dd class="tabular-nums" data-testid="cam-fps">
              {{ fpsMeasurable ? (fps ? `${fps.toFixed(1)} fps` : 'Measuring…') : 'Not measurable here' }}
            </dd>
          </div>
        </dl>

        <div class="flex flex-wrap items-center gap-3 border-t pt-5">
          <Button class="h-11" @click="save">
            <Download class="size-4" /> Save snapshot
          </Button>
          <div class="flex min-h-11 items-center gap-2">
            <Checkbox id="cam-mirror" v-model="mirror" />
            <Label for="cam-mirror" class="mb-0 text-sm font-normal">Mirror preview</Label>
          </div>
        </div>
        <p class="text-xs text-muted-foreground">
          The snapshot is made in your browser and saved straight to your device, unmirrored. Nothing is uploaded.
        </p>
      </template>

      <div v-else class="flex flex-col items-center gap-4 py-8 text-center">
        <Camera class="size-10 text-muted-foreground" aria-hidden="true" />
        <div>
          <p class="font-medium">
            See your camera, and what it really delivers
          </p>
          <p class="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
            Your browser will ask for permission. The picture stays on this page and nothing is recorded or sent.
          </p>
        </div>
        <Button size="lg" :disabled="state === 'starting'" @click="start">
          <Video class="size-4" /> {{ state === 'starting' ? 'Starting…' : 'Start webcam test' }}
        </Button>
        <p v-if="error" class="max-w-md text-sm text-destructive" role="alert">
          {{ error }}
        </p>
        <p v-else-if="notice" class="max-w-md text-sm text-muted-foreground">
          {{ notice }}
        </p>
      </div>
    </section>

    <section class="grid gap-5 rounded-2xl border bg-background p-5 dark:bg-input/30 sm:grid-cols-2">
      <div class="flex flex-col gap-2">
        <Label for="cam-device">Camera</Label>
        <Select v-model="deviceId" :disabled="!devices.length">
          <SelectTrigger id="cam-device" class="h-11">
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
        <Label for="cam-resolution">Ask for</Label>
        <Select v-model="resolution">
          <SelectTrigger id="cam-resolution" class="h-11">
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

      <div v-if="capabilities.length" class="sm:col-span-2">
        <h2 class="text-sm font-medium">
          What this camera says it can do
        </h2>
        <dl class="mt-2 grid gap-x-4 gap-y-1 text-sm sm:grid-cols-2">
          <div v-for="c in capabilities" :key="c.name" class="flex justify-between gap-3 border-b border-border/60 py-1">
            <dt class="text-muted-foreground">
              {{ c.name }}
            </dt>
            <dd class="text-right tabular-nums">
              {{ c.value }}
            </dd>
          </div>
        </dl>
      </div>
      <p v-else-if="live" class="text-xs text-muted-foreground sm:col-span-2">
        This browser does not list camera capabilities to web pages, so only the delivered settings are shown.
      </p>

      <div v-if="live" class="sm:col-span-2">
        <Button variant="outline" class="h-11" @click="stop">
          <VideoOff class="size-4" /> Stop camera
        </Button>
      </div>
    </section>
  </div>
</template>
