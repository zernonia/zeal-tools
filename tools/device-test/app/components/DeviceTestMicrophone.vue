<script setup lang="ts">
import { Circle, Mic, MicOff, Square } from 'lucide-vue-next'
import {
  formatChannels,
  formatDb,
  formatSampleRate,
  frequencyBars,
  meterFraction,
  VERDICT_TEXT,
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
const canvas = ref<HTMLCanvasElement | null>(null)
const BARS = 32

const level = computed(() => meterFraction(rmsDb.value))
const held = computed(() => meterFraction(hold.value.db))
const meterValue = computed(() => Math.round(Math.max(-60, Math.min(0, rmsDb.value))))

const status = computed(() => {
  if (state.value === 'starting')
    return 'Starting the microphone.'
  if (live.value && settings.value)
    return `Microphone on. ${formatSampleRate(settings.value.sampleRate ?? settings.value.contextRate)}, ${formatChannels(settings.value.channelCount)}.`
  return ''
})

let tracked = false
watch(live, (on) => {
  if (on && !tracked) {
    tracked = true
    track('tool_completed', { tool: 'device-test', format: 'microphone' })
  }
})

// Under reduced motion the bars still work — they are a reading, not
// decoration — but redraw four times a second instead of every frame.
let reduced = false
let lastDraw = 0
let colour = ''
onMounted(() => {
  reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
})

onAnalyse((freq) => {
  const el = canvas.value
  if (!el)
    return
  const now = performance.now()
  if (reduced && now - lastDraw < 250)
    return
  lastDraw = now
  const ctx = el.getContext('2d')
  if (!ctx)
    return
  const dpr = window.devicePixelRatio || 1
  const w = Math.round(el.clientWidth * dpr)
  const h = Math.round(el.clientHeight * dpr)
  if (el.width !== w || el.height !== h) {
    el.width = w
    el.height = h
    colour = ''
  }
  // The canvas carries `text-primary`, so its computed colour is the token.
  colour ||= getComputedStyle(el).color
  ctx.clearRect(0, 0, w, h)
  ctx.fillStyle = '#888888'
  ctx.fillStyle = colour
  const bars = frequencyBars(freq, BARS)
  const gap = 2 * dpr
  const bw = (w - gap * (BARS - 1)) / BARS
  bars.forEach((v, i) => {
    const bh = Math.max(dpr, v * h)
    ctx.fillRect(i * (bw + gap), h - bh, bw, bh)
  })
})
</script>

<template>
  <div class="tool-frame flex flex-col gap-5">
    <p class="sr-only" aria-live="polite">
      {{ status }} {{ notice }}
    </p>

    <section class="flex flex-col gap-5 rounded-2xl border bg-background p-5 dark:bg-input/30 sm:p-6">
      <template v-if="live">
        <div class="flex flex-col gap-2">
          <div class="flex items-baseline justify-between gap-3">
            <p class="font-medium" :class="verdict === 'clipping' ? 'text-destructive' : 'text-foreground'" data-testid="mic-verdict">
              {{ VERDICT_TEXT[verdict] }}
            </p>
            <p class="text-sm tabular-nums text-muted-foreground" data-testid="mic-level">
              {{ formatDb(rmsDb) }} <span class="hidden sm:inline">· peak {{ formatDb(hold.db) }}</span>
            </p>
          </div>
          <div
            role="meter"
            aria-label="Microphone level"
            aria-valuemin="-60"
            aria-valuemax="0"
            :aria-valuenow="meterValue"
            :aria-valuetext="formatDb(rmsDb)"
            class="relative h-4 overflow-hidden rounded-full bg-muted"
          >
            <div class="h-full rounded-full bg-primary" :style="{ width: `${level * 100}%` }" />
            <div
              class="absolute inset-y-0 w-0.5"
              :class="hold.db >= -0.5 ? 'bg-destructive' : 'bg-foreground'"
              :style="{ left: `calc(${held * 100}% - 1px)` }"
              aria-hidden="true"
            />
          </div>
          <div class="flex justify-between text-xs tabular-nums text-muted-foreground" aria-hidden="true">
            <span>−60</span><span>−40</span><span>−20</span><span>0 dBFS</span>
          </div>
        </div>

        <canvas ref="canvas" class="h-28 w-full text-primary" aria-hidden="true" />

        <dl class="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
          <div>
            <dt class="text-xs text-muted-foreground">
              Sample rate
            </dt>
            <dd class="tabular-nums" data-testid="mic-rate">
              {{ formatSampleRate(settings?.sampleRate ?? settings?.contextRate) }}
            </dd>
          </div>
          <div>
            <dt class="text-xs text-muted-foreground">
              Channels
            </dt>
            <dd>{{ formatChannels(settings?.channelCount) }}</dd>
          </div>
          <div>
            <dt class="text-xs text-muted-foreground">
              Echo cancellation
            </dt>
            <dd>{{ settings?.echoCancellation === undefined ? 'Not reported' : settings.echoCancellation ? 'On' : 'Off' }}</dd>
          </div>
          <div>
            <dt class="text-xs text-muted-foreground">
              Noise suppression
            </dt>
            <dd>{{ settings?.noiseSuppression === undefined ? 'Not reported' : settings.noiseSuppression ? 'On' : 'Off' }}</dd>
          </div>
        </dl>

        <div class="flex flex-wrap items-center gap-3 border-t pt-5">
          <Button v-if="!recording" class="h-11" @click="record">
            <Circle class="size-4 fill-current" /> Record {{ recordSeconds }} s
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
          <audio v-if="recordingUrl" :src="recordingUrl" controls class="h-11 min-w-0 grow" aria-label="Your recording" />
        </div>
        <p class="text-xs text-muted-foreground">
          The recording stays in this tab's memory. It is never uploaded, and it is gone when you leave the page.
        </p>
      </template>

      <div v-else class="flex flex-col items-center gap-4 py-8 text-center">
        <Mic class="size-10 text-muted-foreground" aria-hidden="true" />
        <div>
          <p class="font-medium">
            Check your microphone in a few seconds
          </p>
          <p class="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
            Your browser will ask for permission. The sound is measured on your device and nothing is sent anywhere.
          </p>
        </div>
        <Button size="lg" :disabled="state === 'starting'" @click="start">
          <Mic class="size-4" /> {{ state === 'starting' ? 'Starting…' : 'Start microphone test' }}
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
        <Label for="mic-device">Microphone</Label>
        <Select v-model="deviceId" :disabled="!devices.length">
          <SelectTrigger id="mic-device" class="h-11">
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

      <fieldset class="flex flex-col gap-2">
        <legend class="mb-2 text-sm font-medium">
          Voice processing
        </legend>
        <div class="flex min-h-11 items-center gap-2">
          <Checkbox id="mic-echo" v-model="echoCancellation" />
          <Label for="mic-echo" class="mb-0 text-sm font-normal">Echo cancellation</Label>
        </div>
        <div class="flex min-h-11 items-center gap-2">
          <Checkbox id="mic-noise" v-model="noiseSuppression" />
          <Label for="mic-noise" class="mb-0 text-sm font-normal">Noise suppression</Label>
        </div>
        <div class="flex min-h-11 items-center gap-2">
          <Checkbox id="mic-gain" v-model="autoGainControl" />
          <Label for="mic-gain" class="mb-0 text-sm font-normal">Automatic gain</Label>
        </div>
        <p class="text-xs text-muted-foreground">
          On is what a video call uses. Turn them off to hear the raw input.
        </p>
      </fieldset>

      <div v-if="live" class="sm:col-span-2">
        <Button variant="outline" class="h-11" @click="stop">
          <MicOff class="size-4" /> Stop microphone
        </Button>
      </div>
    </section>
  </div>
</template>
