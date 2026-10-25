<script setup lang="ts">
import { SliderRoot, SliderThumb, SliderTrack } from 'reka-ui'
import { MAELZEL_SCALE, markingBands, MAX_BPM, MIN_BPM, tempoMarking } from '../../core'

/**
 * The tempo slider, drawn as the face of a mechanical metronome: the Maelzel
 * scale as tick marks, the Italian markings as bands along the track, and a
 * thumb shaped like the sliding weight. Built on reka's slider primitives
 * directly because the shared `Slider` has no room for a ruler.
 */
const bpm = defineModel<number>({ required: true })

function percent(value: number) {
  return `${((value - MIN_BPM) / (MAX_BPM - MIN_BPM)) * 100}%`
}

const bands = markingBands()
const current = computed(() => tempoMarking(bpm.value))

/** Names that fit side by side at phone width; the rest are in the bands. */
const LABELLED = new Set(['Largo', 'Andante', 'Allegro', 'Presto', 'Prestissimo'])
/** Numbers printed under the scale — engraved values, like a real face. */
const NUMBERED = new Set([40, 60, 80, 100, 120, 144, 176, 208])
/** Dropped at phone width, where 80, 100 and 120 would touch. */
const WIDE_ONLY = new Set([60, 100, 144])
</script>

<template>
  <!--
    Padded by half a thumb, with the thumb allowed to overflow the track, so
    its centre sits exactly over the scale value — reka's default keeps the
    thumb inside the track, which would put it off the ruler near the ends.
  -->
  <div class="w-full select-none px-3">
    <!-- Marking names, above the track. -->
    <div class="relative h-5 text-[11px]" aria-hidden="true">
      <span
        v-for="band in bands.filter(b => LABELLED.has(b.name))"
        :key="band.name"
        class="absolute top-0 -translate-x-1/2 whitespace-nowrap italic transition-colors"
        :class="band.name === current ? 'font-semibold text-foreground' : 'text-muted-foreground'"
        :style="{ left: percent((band.from + band.to) / 2) }"
      >
        {{ band.name }}
      </span>
    </div>

    <SliderRoot
      :model-value="[bpm]"
      :min="MIN_BPM"
      :max="MAX_BPM"
      :step="1"
      thumb-alignment="overflow"
      class="relative flex h-9 w-full touch-none items-center"
      @update:model-value="value => bpm = value?.[0] ?? bpm"
    >
      <SliderTrack class="relative h-2.5 w-full grow overflow-hidden rounded-full bg-muted">
        <span
          v-for="(band, index) in bands"
          :key="band.name"
          class="absolute inset-y-0 transition-colors"
          :class="band.name === current ? 'bg-primary/35' : index % 2 ? 'bg-muted-foreground/15' : 'bg-transparent'"
          :style="{ left: percent(band.from), width: `calc(${percent(band.to)} - ${percent(band.from)})` }"
          aria-hidden="true"
        />
      </SliderTrack>
      <!-- The thumb is the metronome's sliding weight. -->
      <SliderThumb
        aria-label="Tempo in beats per minute"
        :aria-valuetext="`${bpm} beats per minute, ${current}`"
        class="block h-7 w-6 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <svg viewBox="0 0 24 28" class="size-full drop-shadow-sm" aria-hidden="true">
          <path d="M2 26 L22 26 L18 2 L6 2 Z" class="fill-primary stroke-background" stroke-width="1.5" stroke-linejoin="round" />
          <line x1="12" x2="12" y1="7" y2="21" class="stroke-primary-foreground" stroke-width="1.5" stroke-linecap="round" />
        </svg>
      </SliderThumb>
    </SliderRoot>

    <!-- The Maelzel scale, as ticks with every few values engraved. -->
    <div class="relative h-7" aria-hidden="true">
      <span
        v-for="value in MAELZEL_SCALE"
        :key="value"
        class="absolute top-0 w-px -translate-x-1/2"
        :class="[NUMBERED.has(value) ? 'h-2.5 bg-muted-foreground' : 'h-1.5 bg-muted-foreground/50']"
        :style="{ left: percent(value) }"
      />
      <span
        v-for="value in NUMBERED"
        :key="`n${value}`"
        class="absolute top-3 -translate-x-1/2 font-mono text-[10px] tabular-nums text-muted-foreground"
        :class="WIDE_ONLY.has(value) ? 'hidden sm:block' : ''"
        :style="{ left: percent(value) }"
      >
        {{ value }}
      </span>
    </div>
  </div>
</template>
