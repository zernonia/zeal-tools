<script setup lang="ts">
import type { VerdictTone } from '../../core'
import { AudioLines, AudioWaveform, Circle, CircleCheck, Mic, MicOff, MicVocal, Radio, ShieldAlert, Square, TriangleAlert, Waves } from 'lucide-vue-next'
import {
  formatChannels,
  formatDb,
  formatSampleRate,
  frequencyBars,
  HOT_DB,
  meterFraction,
  meterTicks,
  OVER_DB,
  pushLevel,
  VERDICT_SHORT,
  VERDICT_TEXT,
  VERDICT_TONE,
} from '../../core'
import { useMicrophoneTest } from '../composables/useMicrophoneTest'

const {
  state,
  error,
  notice,
  devices,
  label,
  deviceId,
  echoCancellation,
  noiseSuppression,
  autoGainControl,
  rmsDb,
  hold,
  verdict,
  settings,
  recording,
  recordSeconds,
  recordLeft,
  recordingUrl,
  start,
  stop,
  record,
  stopRecording,
  onAnalyse,
} = useMicrophoneTest()

const { track } = useAnalytics()
const live = computed(() => state.value === 'live')
const spectrum = ref<HTMLCanvasElement | null>(null)
const waveform = ref<HTMLCanvasElement | null>(null)
const BARS = 40
/** Twenty readings a second for eight seconds. */
const HISTORY = 160
const HISTORY_STEP_MS = 50

const level = computed(() => meterFraction(rmsDb.value))
const held = computed(() => meterFraction(hold.value.db))
const meterValue = computed(() => Math.round(Math.max(-60, Math.min(0, rmsDb.value))))
const ticks = meterTicks()
const hotAt = meterFraction(HOT_DB)
const overAt = meterFraction(OVER_DB)
const tone = computed(() => VERDICT_TONE[verdict.value])

/**
 * Status colours. The palette has no green or amber token, so these are the
 * one place raw hues appear — each checked for AA on its tinted ground in
 * both themes.
 */
const TONE: Record<VerdictTone, string> = {
  muted: 'border-border bg-muted text-muted-foreground',
  clear: 'border-emerald-600/25 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300',
  caution: 'border-amber-600/30 bg-amber-500/10 text-amber-800 dark:text-amber-300',
  danger: 'border-destructive/40 bg-destructive/10 text-destructive',
}

const status = computed(() => {
  if (state.value === 'starting')
    return 'Starting the microphone.'
  if (live.value && settings.value)
    return `Microphone on. ${formatSampleRate(settings.value.sampleRate ?? settings.value.contextRate)}, ${formatChannels(settings.value.channelCount)}.`
  return ''
})

/** The reading, announced only when it changes category — not sixty times a second. */
const verdictAnnouncement = ref('')
watch(verdict, (v) => {
  if (live.value)
    verdictAnnouncement.value = VERDICT_SHORT[v]
})

let tracked = false
watch(live, (on) => {
  if (on && !tracked) {
    tracked = true
    track('tool_completed', { tool: 'device-test', format: 'microphone' })
  }
})

const onOff = (value: boolean | undefined) => (value === undefined ? 'Not reported' : value ? 'On' : 'Off')
const specs = computed(() => [
  { icon: AudioWaveform, label: 'Sample rate', value: formatSampleRate(settings.value?.sampleRate ?? settings.value?.contextRate), testid: 'mic-rate' },
  { icon: Radio, label: 'Channels', value: formatChannels(settings.value?.channelCount), testid: undefined },
  { icon: MicVocal, label: 'Echo cancellation', value: onOff(settings.value?.echoCancellation), testid: undefined },
  { icon: Waves, label: 'Noise suppression', value: onOff(settings.value?.noiseSuppression), testid: undefined },
])

// Under reduced motion the drawings still work — they are a reading, not
// decoration — but redraw four times a second instead of every frame.
let reduced = false
let lastDraw = 0
let lastSample = 0
const history: number[] = []
const colours = { primary: '', danger: '', faint: '' }
onMounted(() => {
  reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
})
watch(live, (on) => {
  if (on)
    history.length = 0
})

/** Size a canvas to its box at the screen's density; true when it was resized. */
function fit(el: HTMLCanvasElement, dpr: number) {
  const w = Math.round(el.clientWidth * dpr)
  const h = Math.round(el.clientHeight * dpr)
  if (el.width === w && el.height === h)
    return false
  el.width = w
  el.height = h
  return true
}

function readColours(el: HTMLCanvasElement) {
  // The canvases carry `text-primary`, so their computed colour is the token;
  // the danger colour is read from a hidden swatch the same way.
  colours.primary = getComputedStyle(el).color
  const swatch = el.parentElement?.querySelector<HTMLElement>('[data-swatch="danger"]')
  colours.danger = swatch ? getComputedStyle(swatch).color : colours.primary
}

onAnalyse((freq) => {
  const now = performance.now()
  if (now - lastSample >= HISTORY_STEP_MS) {
    lastSample = now
    pushLevel(history, rmsDb.value, HISTORY)
  }
  if (reduced && now - lastDraw < 250)
    return
  lastDraw = now
  const dpr = window.devicePixelRatio || 1

  const spec = spectrum.value
  const specCtx = spec?.getContext('2d')
  if (spec && specCtx) {
    if (fit(spec, dpr) || !colours.primary)
      readColours(spec)
    const { width: w, height: h } = spec
    specCtx.clearRect(0, 0, w, h)
    specCtx.fillStyle = colours.primary
    const bars = frequencyBars(freq, BARS)
    const gap = 3 * dpr
    const bw = (w - gap * (BARS - 1)) / BARS
    const r = Math.min(bw / 2, 3 * dpr)
    bars.forEach((v, i) => {
      const bh = Math.max(2 * dpr, v * h)
      specCtx.globalAlpha = 0.35 + 0.65 * v
      specCtx.beginPath()
      specCtx.roundRect(i * (bw + gap), h - bh, bw, bh, [r, r, 0, 0])
      specCtx.fill()
    })
    specCtx.globalAlpha = 1
  }

  const wave = waveform.value
  const waveCtx = wave?.getContext('2d')
  if (wave && waveCtx) {
    if (fit(wave, dpr) && !colours.primary)
      readColours(wave)
    const { width: w, height: h } = wave
    waveCtx.clearRect(0, 0, w, h)
    const step = w / HISTORY
    const bw = Math.max(dpr, step - dpr)
    const mid = h / 2
    // Newest on the right, scrolling left, mirrored about the centre line.
    const offset = HISTORY - history.length
    history.forEach((db, i) => {
      const half = Math.max(dpr / 2, meterFraction(db) * mid)
      waveCtx.fillStyle = db >= OVER_DB ? colours.danger : colours.primary
      waveCtx.globalAlpha = db >= HOT_DB ? 1 : 0.75
      waveCtx.fillRect((offset + i) * step, mid - half, bw, half * 2)
    })
    waveCtx.globalAlpha = 1
  }
})
</script>

<template>
  <div class="tool-frame flex flex-col gap-5">
    <p class="sr-only" aria-live="polite">
      {{ status }} {{ notice }} {{ verdictAnnouncement }}
    </p>

    <section class="flex flex-col gap-5 rounded-2xl border bg-background p-5 dark:bg-input/30 sm:p-6">
      <template v-if="live">
        <!-- The verdict, then the meter it comes from -->
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div class="flex min-w-0 items-center gap-3">
            <span class="inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium" :class="TONE[tone]">
              <ShieldAlert v-if="tone === 'danger'" class="size-4" aria-hidden="true" />
              <TriangleAlert v-else-if="tone === 'caution'" class="size-4" aria-hidden="true" />
              <CircleCheck v-else-if="tone === 'clear'" class="size-4" aria-hidden="true" />
              <MicOff v-else class="size-4" aria-hidden="true" />
              {{ VERDICT_SHORT[verdict] }}
            </span>
            <p class="min-w-0 text-sm text-muted-foreground" data-testid="mic-verdict">
              {{ VERDICT_TEXT[verdict] }}
            </p>
          </div>
          <p class="font-mono text-sm tabular-nums" data-testid="mic-level">
            <span class="text-lg font-semibold text-foreground">{{ formatDb(rmsDb) }}</span>
            <span class="ml-2 text-muted-foreground">peak {{ formatDb(hold.db) }}</span>
          </p>
        </div>

        <div class="flex flex-col gap-1.5">
          <div
            role="meter"
            aria-label="Microphone level"
            aria-valuemin="-60"
            aria-valuemax="0"
            :aria-valuenow="meterValue"
            :aria-valuetext="formatDb(rmsDb)"
            class="relative h-6"
          >
            <div class="meter absolute inset-0 overflow-hidden rounded-md bg-muted" aria-hidden="true">
              <!-- The three zones, faint, so the scale reads before anything is said. -->
              <div class="meter-zones absolute inset-0 opacity-20" :style="{ '--hot': `${hotAt * 100}%`, '--over': `${overAt * 100}%` }" />
              <div class="absolute inset-y-0 left-0 overflow-hidden" :style="{ width: `${level * 100}%` }">
                <div
                  class="meter-zones h-full"
                  :style="{ 'width': level > 0 ? `${100 / level}%` : '100%', '--hot': `${hotAt * 100}%`, '--over': `${overAt * 100}%` }"
                />
              </div>
            </div>
            <!-- Peak hold, outside the segment mask so it is never cut in two. -->
            <div
              class="absolute -inset-y-1 w-1 rounded-full"
              :class="hold.db >= OVER_DB ? 'bg-destructive' : 'bg-foreground'"
              :style="{ left: `calc(${held * 100}% - ${held * 4}px)` }"
              aria-hidden="true"
            />
          </div>
          <div class="relative h-4 text-[11px] tabular-nums text-muted-foreground" aria-hidden="true">
            <span
              v-for="t in ticks"
              :key="t.db"
              class="absolute top-0 whitespace-nowrap"
              :class="[t.at === 0 ? '' : t.at === 1 ? '-translate-x-full' : '-translate-x-1/2', [-48, -36, -6].includes(t.db) ? 'hidden sm:inline' : '']"
              :style="{ left: `${t.at * 100}%` }"
            >{{ t.db === 0 ? '0 dB' : `−${-t.db}` }}</span>
          </div>
        </div>

        <!-- Two pictures of the same sound: over time, and by pitch -->
        <div class="grid gap-3 md:grid-cols-2">
          <figure class="relative flex flex-col gap-2 rounded-xl border bg-muted/30 p-3">
            <figcaption class="flex items-center justify-between text-xs text-muted-foreground">
              <span class="flex items-center gap-1.5"><AudioLines class="size-3.5" aria-hidden="true" /> Level, last 8 seconds</span>
              <span>now →</span>
            </figcaption>
            <canvas ref="waveform" class="h-24 w-full text-primary" aria-hidden="true" />
            <span data-swatch="danger" class="hidden text-destructive" />
          </figure>
          <figure class="relative flex flex-col gap-2 rounded-xl border bg-muted/30 p-3">
            <figcaption class="flex items-center justify-between text-xs text-muted-foreground">
              <span class="flex items-center gap-1.5"><Waves class="size-3.5" aria-hidden="true" /> Frequencies</span>
              <span>low → high</span>
            </figcaption>
            <canvas ref="spectrum" class="h-24 w-full text-primary" aria-hidden="true" />
            <span data-swatch="danger" class="hidden text-destructive" />
          </figure>
        </div>

        <dl class="grid grid-cols-2 gap-2 sm:grid-cols-4">
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

        <!-- Hear yourself back -->
        <div class="flex flex-col gap-3 rounded-xl border p-4">
          <div class="flex flex-wrap items-center gap-3">
            <Button v-if="!recording" class="h-11" @click="record">
              <Circle class="size-4 fill-current text-destructive" /> Record {{ recordSeconds }} s
            </Button>
            <Button v-else class="h-11" variant="secondary" @click="stopRecording">
              <Square class="size-4 fill-current" /> Stop ({{ recordLeft }} s)
            </Button>
            <Select :model-value="String(recordSeconds)" :disabled="recording" @update:model-value="v => recordSeconds = Number(v)">
              <SelectTrigger class="h-11 w-auto" aria-label="Recording length">
                {{ recordSeconds }} seconds
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">
                  5 seconds
                </SelectItem>
                <SelectItem value="10">
                  10 seconds
                </SelectItem>
              </SelectContent>
            </Select>
            <span v-if="recording" class="inline-flex items-center gap-2 text-sm font-medium text-destructive" aria-hidden="true">
              <span class="rec-dot size-2.5 rounded-full bg-destructive" /> Recording
            </span>
            <audio v-if="recordingUrl && !recording" :src="recordingUrl" controls class="h-11 min-w-0 grow" aria-label="Your recording" />
          </div>
          <p class="text-xs text-muted-foreground">
            Record a few words and play them back to hear what others will. The recording stays in this tab's memory — never uploaded, gone when you leave.
          </p>
        </div>
      </template>

      <DeviceTestIdle
        v-else
        :icon="Mic"
        title="Check your microphone in a few seconds"
        text="Your browser will ask for permission. The sound is measured on your device and nothing is sent anywhere."
      >
        <Button size="lg" :disabled="state === 'starting'" @click="start">
          <Mic class="size-4" /> {{ state === 'starting' ? 'Starting…' : 'Start microphone test' }}
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
        <Label for="mic-device" class="mb-0">Microphone</Label>
        <Select v-model="deviceId" :disabled="!devices.length">
          <SelectTrigger id="mic-device" class="h-11 w-full">
            <span class="truncate">
              {{ devices.length ? label(devices.find(d => d.deviceId === deviceId) ?? devices[0]!, Math.max(0, devices.findIndex(d => d.deviceId === deviceId))) : 'Default microphone' }}
            </span>
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

      <div class="flex flex-col gap-2" role="group" aria-labelledby="mic-processing">
        <p id="mic-processing" class="text-xs font-medium text-muted-foreground">
          Voice processing
        </p>
        <div class="grid gap-1 rounded-lg border p-1">
          <div class="flex min-h-11 items-center gap-2.5 rounded-md px-2.5">
            <Checkbox id="mic-echo" v-model="echoCancellation" />
            <Label for="mic-echo" class="mb-0 flex-1 text-sm font-normal">Echo cancellation</Label>
          </div>
          <div class="flex min-h-11 items-center gap-2.5 rounded-md px-2.5">
            <Checkbox id="mic-noise" v-model="noiseSuppression" />
            <Label for="mic-noise" class="mb-0 flex-1 text-sm font-normal">Noise suppression</Label>
          </div>
          <div class="flex min-h-11 items-center gap-2.5 rounded-md px-2.5">
            <Checkbox id="mic-gain" v-model="autoGainControl" />
            <Label for="mic-gain" class="mb-0 flex-1 text-sm font-normal">Automatic gain</Label>
          </div>
        </div>
        <p class="text-xs text-muted-foreground">
          On is what a video call uses. Turn them off to hear the raw input.
        </p>
      </div>

      <div v-if="live" class="border-t pt-5 sm:col-span-2">
        <Button variant="outline" class="h-11" @click="stop">
          <MicOff class="size-4" /> Stop microphone
        </Button>
      </div>
    </section>
  </div>
</template>

<style scoped>
/* Status hues: the token palette has none, and a level meter without green and red is not one. */
.meter-zones {
  background: linear-gradient(
    to right,
    #10b981 0,
    #10b981 var(--hot),
    #f59e0b var(--hot),
    #f59e0b var(--over),
    #ef4444 var(--over),
    #ef4444 100%
  );
}

/* LED segments: a gap every 8px, cut from the fill and the zones alike. */
.meter {
  mask-image: repeating-linear-gradient(to right, #000 0 6px, transparent 6px 8px);
}

.rec-dot {
  animation: rec 1s ease-in-out infinite alternate;
}

@keyframes rec {
  to {
    opacity: 0.25;
  }
}

@media (prefers-reduced-motion: reduce) {
  .rec-dot {
    animation: none !important;
  }
}
</style>
