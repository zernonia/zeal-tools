<script setup lang="ts">
import type { Tuning, TuningString } from '../../core'
import { closeness, midiToFrequency } from '../../core'

const props = defineProps<{
  tuning: Tuning
  /** The string being measured against, auto-detected or pinned. */
  target: TuningString | null
  /** Label of the string the player has pinned, if any. */
  pinned: string | null
  /** Signed cents from the target, or null when nothing is being heard. */
  cents: number | null
  inTune: boolean
  a4: number
}>()

const emit = defineEmits<{ pin: [string: TuningString] }>()

const strings = computed(() => props.tuning.strings)
const count = computed(() => strings.value.length)

/** Centre of column `i`, as a percentage — shared by the SVG and the buttons. */
const centre = (i: number) => ((i + 0.5) / count.value) * 100

/**
 * The strings fan from the nut, so they converge as they run up the frame.
 * A quarter of the spread at the top is enough to read as perspective without
 * crowding the inner strings together.
 */
const CONVERGE = 0.28

/**
 * The lit string carries the reading, so the ramp has to be legible without
 * relying on hue — this site has one accent and a red-to-green scale would
 * both invent a palette and put the whole message in colour. Instead the live
 * string thickens and firms up from muted towards `primary` as it closes in,
 * and the sentence underneath says the same thing in words.
 */
const lit = computed(() => {
  // Nothing being heard yet: the chosen string is still the chosen string, so
  // it stays fully lit rather than sitting at the bottom of the ramp looking
  // like the ones nobody picked.
  if (props.cents === null)
    return { opacity: 1, width: 3 }
  const near = closeness(props.cents)
  return { opacity: 0.45 + near * 0.55, width: 2 + near * 2.5 }
})

const isTarget = (s: TuningString) => props.target?.label === s.label

function describe(s: TuningString) {
  const held = props.pinned === s.label
  const hz = midiToFrequency(s.midi, props.a4).toFixed(1)
  return `${held ? 'Stop aiming at' : 'Aim at'} string ${s.label}, ${s.note}${s.octave}, ${hz} hertz`
}
</script>

<template>
  <div class="w-full max-w-md">
    <!-- `preserveAspectRatio="none"` maps the viewBox straight onto the row
         below, so every string lands exactly on its own button whatever the
         width. `non-scaling-stroke` is what stops that squash from making the
         outer strings thicker than the inner ones. -->
    <svg viewBox="0 0 100 46" preserveAspectRatio="none" class="h-28 w-full sm:h-36" aria-hidden="true">
      <line
        v-for="(string, i) in strings"
        :key="string.label"
        :x1="50 + (centre(i) - 50) * CONVERGE"
        y1="0"
        :x2="centre(i)"
        y2="46"
        vector-effect="non-scaling-stroke"
        stroke-linecap="round"
        class="transition-[stroke-opacity,stroke-width] duration-100"
        :class="isTarget(string) ? (inTune ? 'stroke-primary' : 'stroke-foreground') : 'stroke-muted-foreground/35'"
        :stroke-width="isTarget(string) ? lit.width : 1.5"
        :stroke-opacity="isTarget(string) ? lit.opacity : 1"
      />
    </svg>

    <ul class="grid gap-1" :style="{ gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))` }">
      <li v-for="string in strings" :key="string.label" class="flex justify-center">
        <button
          type="button"
          class="flex size-11 flex-col items-center justify-center rounded-full border-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          :class="pinned === string.label
            ? 'border-foreground bg-foreground text-background'
            : isTarget(string)
              ? (inTune ? 'border-primary bg-primary/15 text-foreground' : 'border-foreground/60 bg-muted text-foreground')
              : 'border-transparent bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'"
          :aria-pressed="pinned === string.label"
          :aria-label="describe(string)"
          @click="emit('pin', string)"
        >
          <span class="text-sm font-semibold leading-none">{{ string.note }}</span>
          <span class="text-[10px] leading-none opacity-70">{{ string.octave }}</span>
        </button>
      </li>
    </ul>
  </div>
</template>
