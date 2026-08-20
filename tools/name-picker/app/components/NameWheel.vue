<script setup lang="ts">
import type { Entry } from '../../core'
import { segments, sliceColor, slicePath } from '../../core'

const props = defineProps<{
  entries: Entry[]
  rotation: number
  /** Milliseconds. Zero when the reader has asked for reduced motion. */
  duration: number
  spinning: boolean
  disabled?: boolean
}>()

defineEmits<{ spin: [] }>()

const R = 200
/** Where a label starts, leaving the hub clear. */
const HUB = 52

const slices = computed(() => segments(props.entries))

/**
 * Type shrinks as the wheel fills up, and stops being drawn once a slice is
 * thinner than a line of text. Past that point a wheel of illegible slivers is
 * the honest picture — the names are listed in full beside it.
 */
const fontSize = computed(() => Math.max(9, Math.min(20, 260 / Math.max(1, props.entries.length))))
const showLabels = computed(() => props.entries.length <= 60)

function label(text: string): string {
  // 0.55em is close enough to the average advance width of this face to keep
  // the longest name inside the rim without measuring the text.
  const room = Math.floor((R - HUB - 14) / (fontSize.value * 0.55))
  return text.length > room ? `${text.slice(0, Math.max(1, room - 1))}…` : text
}

const norm = (deg: number) => ((deg % 360) + 360) % 360

/**
 * Where each label sits, and which way up.
 *
 * Labels radiate outward from the hub, so the ones that end up on the left
 * half arrive past vertical and would print upside down. Those are laid out
 * from the opposite side and turned back over.
 *
 * Which half a slice is on depends on the wheel's rotation, not on the slice
 * — so this reads `rotation`, and the labels take their final orientation the
 * instant a spin starts rather than when it ends. That is deliberate: the only
 * moment anyone reads the wheel is when it has stopped, and a label cannot be
 * re-oriented at the end of a CSS transition without visibly snapping.
 */
const placed = computed(() => slices.value.map((slice) => {
  const flipped = norm(slice.mid + props.rotation) > 180
  return {
    id: slice.entry.id,
    text: label(slice.entry.label),
    transform: `rotate(${flipped ? slice.mid + 90 : slice.mid - 90} 200 200)`,
    x: flipped ? 16 : R + R - 16,
    anchor: flipped ? 'start' : 'end',
  }
}))

const wheelStyle = computed(() => ({
  // `rotate` rather than `transform`: it is a standalone property here, so
  // nothing else that positions this group can be knocked out by it.
  rotate: `${props.rotation}deg`,
  transitionProperty: 'rotate',
  transitionDuration: `${props.duration}ms`,
  // A long, decelerating settle — quick at first, then creeping the last few
  // degrees, which is what makes a close slice boundary worth watching.
  transitionTimingFunction: 'cubic-bezier(0.15, 0.9, 0.15, 1)',
}))
</script>

<template>
  <div class="relative mx-auto mt-8 aspect-square w-full max-w-[30rem]">
    <!-- Hidden from assistive tech on purpose: every name it draws is listed
         beside it and the winner is announced in a live region, so exposing
         the slices adds nothing a screen reader could use.

         It is also a sibling of the button rather than its content. axe reads
         the text inside a control to check WCAG 2.5.3 Label in Name and does
         not honour `aria-hidden` while doing so, so a wheel nested in the
         button reports every name as part of the button's own label. Keeping
         the graphic outside leaves the control with no text at all. -->
    <svg viewBox="0 0 400 400" class="size-full overflow-visible" aria-hidden="true" focusable="false">
      <!-- `fill-box` pins the pivot to the group's own bounding box — the
           wheel's centre — rather than to the viewBox origin. -->
      <g :style="wheelStyle" style="transform-box: fill-box; transform-origin: center">
        <path
          v-for="slice in slices"
          :key="slice.entry.id"
          :d="slicePath(R, slice.start, slice.end)"
          :fill="sliceColor(slice.index, entries.length)"
          stroke="#ffffff"
          stroke-width="1"
          stroke-linejoin="round"
        />
        <template v-if="showLabels">
          <text
            v-for="entry in placed"
            :key="`t-${entry.id}`"
            :transform="entry.transform"
            :x="entry.x"
            :y="R"
            :text-anchor="entry.anchor"
            dominant-baseline="central"
            :font-size="fontSize"
            font-weight="600"
            fill="#1c1917"
          >{{ entry.text }}</text>
        </template>
      </g>

      <!-- Rim, drawn over the slices so their edges finish cleanly. -->
      <circle cx="200" cy="200" :r="R - 0.5" stroke-width="1" class="fill-none stroke-border" />

      <!-- Hub: sits still while everything behind it moves. -->
      <circle cx="200" cy="200" :r="HUB - 8" stroke-width="1" class="fill-card stroke-border" />

      <!-- Pointer, biting into the rim so which slice it means is unambiguous.
           It sits above the viewBox, which is why the wheel keeps a square box
           and a margin rather than being drawn into a taller one — a square is
           what makes the focus ring below a circle instead of an ellipse. -->
      <path d="M 200 20 L 182 -18 Q 200 -26 218 -18 Z" class="fill-foreground" />
    </svg>

    <button
      type="button"
      class="absolute inset-0 cursor-pointer rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-background disabled:cursor-not-allowed"
      :disabled="disabled || spinning"
      :aria-label="spinning ? 'Spinning the wheel' : `Spin the wheel — ${entries.length} ${entries.length === 1 ? 'name' : 'names'}`"
      @click="$emit('spin')"
    />

    <!-- The call to action, as text rather than as part of the graphic: it
         picks up the page's own face and scales with the reader's font size. -->
    <span
      class="pointer-events-none absolute inset-0 grid select-none place-items-center text-sm font-bold tracking-widest transition-opacity"
      :class="spinning ? 'opacity-30' : 'opacity-100'"
      aria-hidden="true"
    >{{ spinning ? '···' : 'SPIN' }}</span>
  </div>
</template>
