<script setup lang="ts">
import type { BeatLevel, Subdivision } from '../../core'

/**
 * One bar of percussion notation: what the metronome is about to play,
 * written the way a drummer would read it. A beat is a note, an accent
 * carries the accent mark (>), a muted beat is a quarter rest, and
 * subdivisions are beamed — two eighths, a triplet, four sixteenths. The
 * note sounding right now lights up.
 *
 * Each beat is also its own button: pressing it cycles accent → normal → mute.
 */
const props = defineProps<{
  levels: readonly BeatLevel[]
  subdivision: Subdivision
  currentBeat: number
  currentSub: number
}>()

const emit = defineEmits<{ cycle: [index: number] }>()

const LEVEL_LABEL: Record<BeatLevel, string> = {
  accent: 'accented',
  normal: 'normal',
  mute: 'muted',
}

/** Horizontal spacing between notes inside a beat, in SVG units. */
const NOTE_GAP = 16
/** Notehead line: the single line of a percussion staff. */
const STAFF_Y = 46
const STEM_TOP = 16

const width = computed(() => 10 + props.subdivision * NOTE_GAP)
const notes = computed(() => Array.from({ length: props.subdivision }, (_, i) => 12 + i * NOTE_GAP))
const beams = computed(() => (props.subdivision === 1 ? 0 : props.subdivision === 4 ? 2 : 1))
const centre = computed(() => width.value / 2)

/** A quarter rest, drawn rather than set in a music font no visitor has installed. */
const REST = 'M-2 -16 L4 -8 Q1 -4 0 -2 L5 5 Q0 3 -1 7 Q-2 10 2 13 Q-6 10 -4 5 Q-3 2 1 3 L-4 -4 Q-1 -7 0 -10 Z'
</script>

<template>
  <div class="flex w-full items-stretch" role="group" aria-label="Beats in the bar">
    <!-- Opening barline and time signature: beats over a quarter-note pulse. -->
    <div class="flex shrink-0 flex-col justify-end pb-5" aria-hidden="true">
      <svg viewBox="0 0 26 64" class="h-16 w-6.5 overflow-visible">
        <line x1="0" x2="26" :y1="STAFF_Y" :y2="STAFF_Y" class="stroke-border" stroke-width="1" />
        <line x1="0.5" x2="0.5" :y1="STAFF_Y - 12" :y2="STAFF_Y + 12" class="stroke-muted-foreground" stroke-width="1" />
        <text x="14" :y="STAFF_Y - 3" text-anchor="middle" class="fill-foreground font-mono text-[15px] font-bold">{{ levels.length }}</text>
        <text x="14" :y="STAFF_Y + 13" text-anchor="middle" class="fill-foreground font-mono text-[15px] font-bold">4</text>
      </svg>
    </div>

    <button
      v-for="(level, index) in levels"
      :key="index"
      type="button"
      class="group relative flex min-h-24 min-w-0 flex-1 flex-col items-center justify-end overflow-hidden rounded-lg pb-1 transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      :class="currentBeat === index ? 'text-foreground' : 'text-muted-foreground'"
      :aria-label="`Beat ${index + 1}, ${LEVEL_LABEL[level]}. Press to change.`"
      @click="emit('cycle', index)"
    >
      <svg
        :viewBox="`0 0 ${width} 64`"
        class="h-16 w-full overflow-visible"
        aria-hidden="true"
      >
        <!--
          Staff line drawn well past the viewBox and clipped by the button, so
          it runs edge to edge however wide the beat is and the beats join
          into one continuous bar.
        -->
        <line x1="-200" :x2="width + 200" :y1="STAFF_Y" :y2="STAFF_Y" class="stroke-border" stroke-width="1" />

        <path
          v-if="level === 'mute'"
          :d="REST"
          :transform="`translate(${centre} ${STAFF_Y - 6})`"
          :class="currentBeat === index ? 'fill-muted-foreground' : 'fill-current opacity-70'"
        />

        <template v-else>
          <!-- Accent mark over the first note. -->
          <polyline
            v-if="level === 'accent'"
            :points="`${notes[0]! - 2},2 ${notes[0]! + 8},6 ${notes[0]! - 2},10`"
            fill="none"
            class="stroke-current"
            stroke-width="1.8"
            stroke-linejoin="round"
            stroke-linecap="round"
          />
          <text
            v-if="subdivision === 3"
            :x="centre + 2"
            y="11"
            text-anchor="middle"
            class="fill-current font-mono text-[9px] italic"
          >3</text>

          <g v-for="(x, sub) in notes" :key="sub">
            <line :x1="x + 4.6" :x2="x + 4.6" :y1="STAFF_Y - 1" :y2="STEM_TOP" class="stroke-current" stroke-width="1.4" />
            <ellipse
              :cx="x"
              :cy="STAFF_Y"
              rx="5.4"
              ry="3.9"
              :transform="`rotate(-22 ${x} ${STAFF_Y})`"
              :class="currentBeat === index && currentSub === sub ? 'fill-primary' : 'fill-current'"
            />
          </g>
          <rect
            v-for="beam in beams"
            :key="`b${beam}`"
            :x="notes[0]! + 3.9"
            :y="STEM_TOP + (beam - 1) * 6"
            :width="notes.at(-1)! - notes[0]! + 1.4"
            height="3.4"
            class="fill-current"
          />
        </template>
      </svg>
      <span class="text-xs tabular-nums" :class="currentBeat === index ? 'font-semibold' : ''">{{ index + 1 }}</span>
      <!-- Under-bar that lights with the beat: a second cue for the eye. -->
      <span
        class="absolute inset-x-2 bottom-0 h-0.5 rounded-full transition-colors duration-75"
        :class="currentBeat === index ? (level === 'mute' ? 'bg-muted-foreground' : 'bg-primary') : 'bg-transparent'"
        aria-hidden="true"
      />
    </button>

    <!-- Final double barline. -->
    <div class="flex shrink-0 flex-col justify-end pb-5" aria-hidden="true">
      <svg viewBox="0 0 8 64" class="h-16 w-2 overflow-visible">
        <line x1="0" x2="2" :y1="STAFF_Y" :y2="STAFF_Y" class="stroke-border" stroke-width="1" />
        <line x1="1.5" x2="1.5" :y1="STAFF_Y - 12" :y2="STAFF_Y + 12" class="stroke-muted-foreground" stroke-width="1" />
        <line x1="5.5" x2="5.5" :y1="STAFF_Y - 12" :y2="STAFF_Y + 12" class="stroke-muted-foreground" stroke-width="3" />
      </svg>
    </div>
  </div>
</template>
