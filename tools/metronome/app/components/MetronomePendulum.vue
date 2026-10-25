<script setup lang="ts">
import { MAX_BPM, MIN_BPM } from '../../core'

const props = defineProps<{
  bpm: number
  /** Fractional beats since Start on the audio clock, or null when stopped. */
  beatPosition: () => number | null
}>()

/** Furthest the arm swings either side, in degrees. */
const AMPLITUDE = 24
const PIVOT = { x: 60, y: 132 }

const angle = ref(0)
let frame = 0
let still = false

/**
 * The arm is at an extreme on every click, and passes the middle halfway
 * between — so the eye reads the beat where the motion turns, the way it
 * reads a conductor's beat. A cosine gives the pendulum's own easing for
 * free: slow at the ends, fastest through the middle.
 */
function swing() {
  const position = props.beatPosition()
  angle.value = position === null || still ? 0 : -AMPLITUDE * Math.cos(Math.PI * position)
  frame = requestAnimationFrame(swing)
}

/**
 * Like a real metronome, the weight sits high for a slow tempo and low for a
 * fast one — a longer pendulum swings more slowly.
 */
const weightDistance = computed(() => {
  const t = (props.bpm - MIN_BPM) / (MAX_BPM - MIN_BPM)
  return 44 + (1 - t) * 62
})

onMounted(() => {
  // Reduced motion: the arm stays upright and the notation strip below
  // carries the beat on its own.
  still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  frame = requestAnimationFrame(swing)
})
onUnmounted(() => cancelAnimationFrame(frame))
</script>

<template>
  <!-- Decorative: the live region already says whether it is playing. -->
  <svg viewBox="0 0 120 160" aria-hidden="true">
    <!-- Case: the classic pyramid, with a slot for the arm. -->
    <path d="M24 152 L96 152 L76 12 Q60 4 44 12 Z" class="fill-muted stroke-border" stroke-width="2" stroke-linejoin="round" />
    <path d="M52 22 L68 22 L71 128 L49 128 Z" class="fill-background/60 stroke-border dark:fill-input/30" stroke-width="1" />
    <!-- Scale lines in the slot, like the engraved card behind the arm. -->
    <g class="stroke-muted-foreground/40" stroke-width="1">
      <line v-for="i in 10" :key="i" :x1="55" :x2="65" :y1="22 + i * 10" :y2="22 + i * 10" />
    </g>
    <line x1="18" x2="102" y1="152" y2="152" class="stroke-border" stroke-width="3" stroke-linecap="round" />

    <g :transform="`rotate(${angle} ${PIVOT.x} ${PIVOT.y})`">
      <line :x1="PIVOT.x" :y1="PIVOT.y" :x2="PIVOT.x" y2="14" class="stroke-foreground" stroke-width="2.5" stroke-linecap="round" />
      <!-- The sliding weight. -->
      <path
        :d="`M${PIVOT.x - 9} ${PIVOT.y - weightDistance + 7} L${PIVOT.x + 9} ${PIVOT.y - weightDistance + 7} L${PIVOT.x + 6} ${PIVOT.y - weightDistance - 7} L${PIVOT.x - 6} ${PIVOT.y - weightDistance - 7} Z`"
        class="fill-primary"
      />
    </g>
    <circle :cx="PIVOT.x" :cy="PIVOT.y" r="4" class="fill-foreground" />
  </svg>
</template>
