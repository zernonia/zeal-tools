<script setup lang="ts">
import { d6Pips, dieFacets, dieLabelY, dieOutline, dieShape } from '../../core'

/**
 * One die, drawn as the solid it is: pips on a d6, the number on the face of
 * every other shape. Purely a picture — the caller announces the value — so
 * the SVG is hidden from assistive tech.
 *
 * `solid` is a die in play, `dropped` one a keep rule set aside, `outline`
 * the bare silhouette used as an icon on the die picker.
 */
const props = withDefaults(defineProps<{
  sides: number
  value?: number
  variant?: 'solid' | 'dropped' | 'outline'
}>(), { variant: 'solid' })

const shape = computed(() => dieShape(props.sides))
const outline = computed(() => dieOutline(shape.value))
const facets = computed(() => dieFacets(shape.value))
const pips = computed(() => (shape.value === 'd6' && props.variant !== 'outline' && props.value !== undefined ? d6Pips(props.value) : []))

const text = computed(() => (props.value === undefined || pips.value.length ? '' : String(props.value)))
/** Long numbers shrink to stay inside the face; the triangle has least room. */
const fontSize = computed(() => {
  const base = shape.value === 'd4' ? 30 : shape.value === 'd12' || shape.value === 'd20' ? 34 : 40
  const length = text.value.length
  return length <= 2 ? base : length === 3 ? base * 0.78 : base * 0.6
})

const bodyClass = computed(() => {
  switch (props.variant) {
    case 'dropped': return 'fill-transparent stroke-muted-foreground/70 [stroke-dasharray:7_6]'
    case 'outline': return 'fill-transparent stroke-current'
    default: return 'fill-primary stroke-primary'
  }
})
const inkClass = computed(() => (props.variant === 'dropped' ? 'fill-muted-foreground' : 'fill-primary-foreground'))
const facetClass = computed(() => (props.variant === 'solid' ? 'stroke-primary-foreground/25' : 'stroke-current opacity-35'))
</script>

<template>
  <svg viewBox="0 0 100 100" aria-hidden="true" class="overflow-visible">
    <rect
      v-if="!outline"
      x="5"
      y="5"
      width="90"
      height="90"
      rx="20"
      :class="bodyClass"
      :stroke-width="variant === 'outline' ? 8 : 4"
    />
    <polygon
      v-else
      :points="outline"
      stroke-linejoin="round"
      :class="bodyClass"
      :stroke-width="variant === 'outline' ? 8 : 4"
    />
    <!-- The inner face of a d12 or d20 is a closed ring; the d8 and d10 edges are open lines. -->
    <component
      :is="shape === 'd12' || shape === 'd20' ? 'polygon' : 'polyline'"
      v-for="facet in facets"
      :key="facet"
      :points="facet"
      fill="none"
      stroke-linejoin="round"
      :stroke-width="variant === 'outline' ? 5 : 2.5"
      :class="facetClass"
    />
    <circle
      v-for="([x, y], index) in pips"
      :key="index"
      :cx="26 + x * 24"
      :cy="26 + y * 24"
      r="9"
      :class="inkClass"
    />
    <text
      v-if="text"
      x="50"
      :y="dieLabelY(shape)"
      text-anchor="middle"
      dominant-baseline="central"
      class="font-mono font-bold"
      :class="inkClass"
      :font-size="fontSize"
    >{{ text }}</text>
  </svg>
</template>
