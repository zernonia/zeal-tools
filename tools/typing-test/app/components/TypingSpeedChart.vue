<script setup lang="ts">
import type { SpeedPoint } from '../../core'

const props = defineProps<{ series: SpeedPoint[] }>()

/**
 * A plain SVG line chart — two lines and three gridlines do not need a
 * charting library. The two series differ in dash as well as colour, and the
 * legend draws the same strokes, so neither depends on telling hues apart.
 */
const WIDTH = 600
const HEIGHT = 180
const PAD = { top: 12, right: 12, bottom: 26, left: 40 }

const plotW = WIDTH - PAD.left - PAD.right
const plotH = HEIGHT - PAD.top - PAD.bottom

const max = computed(() => {
  const peak = Math.max(0, ...props.series.flatMap(p => [p.wpm, p.raw]))
  return Math.max(20, Math.ceil(peak / 20) * 20)
})

const lastSecond = computed(() => props.series.at(-1)?.second ?? 1)

function x(second: number): number {
  return PAD.left + (second / lastSecond.value) * plotW
}

function y(value: number): number {
  return PAD.top + plotH - (value / max.value) * plotH
}

function path(key: 'wpm' | 'raw'): string {
  return props.series.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p.second).toFixed(1)},${y(p[key]).toFixed(1)}`).join(' ')
}

const gridlines = computed(() => [0, max.value / 2, max.value])

const xTicks = computed(() => {
  const last = lastSecond.value
  const step = last <= 15 ? 5 : last <= 30 ? 10 : last <= 60 ? 15 : 30
  const ticks: number[] = []
  for (let s = step; s < last; s += step)
    ticks.push(s)
  ticks.push(Math.round(last))
  return ticks
})

const description = computed(() => {
  const points = props.series
  if (!points.length)
    return ''
  const peak = Math.max(...points.map(p => p.raw))
  const final = points.at(-1)!.wpm
  return `Speed over ${Math.round(lastSecond.value)} seconds. Raw speed peaked at ${Math.round(peak)} words per minute; the running WPM finished at ${Math.round(final)}.`
})
</script>

<template>
  <figure class="flex flex-col gap-2">
    <svg
      :viewBox="`0 0 ${WIDTH} ${HEIGHT}`"
      class="h-auto w-full overflow-visible"
      role="img"
      :aria-label="description"
    >
      <g class="text-muted-foreground">
        <template v-for="value in gridlines" :key="value">
          <line
            :x1="PAD.left"
            :x2="WIDTH - PAD.right"
            :y1="y(value)"
            :y2="y(value)"
            stroke="currentColor"
            stroke-opacity="0.25"
          />
          <text :x="PAD.left - 8" :y="y(value) + 4" text-anchor="end" fill="currentColor" font-size="12">{{ value }}</text>
        </template>
        <text
          v-for="tick in xTicks"
          :key="tick"
          :x="x(tick)"
          :y="HEIGHT - 6"
          text-anchor="middle"
          fill="currentColor"
          font-size="12"
        >{{ tick }}s</text>
      </g>
      <path :d="path('raw')" fill="none" class="text-muted-foreground" stroke="currentColor" stroke-width="2" stroke-dasharray="5 4" stroke-linejoin="round" />
      <path :d="path('wpm')" fill="none" class="text-primary" stroke="currentColor" stroke-width="3" stroke-linejoin="round" stroke-linecap="round" />
    </svg>
    <figcaption class="flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-xs text-muted-foreground">
      <span class="inline-flex items-center gap-1.5">
        <svg width="24" height="8" aria-hidden="true" class="text-primary"><line x1="0" x2="24" y1="4" y2="4" stroke="currentColor" stroke-width="3" /></svg>
        WPM so far
      </span>
      <span class="inline-flex items-center gap-1.5">
        <svg width="24" height="8" aria-hidden="true"><line x1="0" x2="24" y1="4" y2="4" stroke="currentColor" stroke-width="2" stroke-dasharray="5 4" /></svg>
        Raw speed each second
      </span>
      <span>Words per minute against seconds</span>
    </figcaption>
  </figure>
</template>
