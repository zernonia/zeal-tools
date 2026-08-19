<script setup lang="ts">
import type { BrushMode, Rgba } from '../../core'

const props = defineProps<{
  original: Rgba
  cutout: Rgba
  position: number
  /** When set, pointers paint instead of dragging the divider. */
  brush: BrushMode | null
  /** When set, a click selects the object under it instead of painting. */
  magic: 'add' | 'remove' | null
  brushSize: number
}>()

const emit = defineEmits<{
  'update:position': [value: number]
  'strokeStart': [x: number, y: number]
  'strokeMove': [x: number, y: number]
  'strokeEnd': []
  'pick': [x: number, y: number]
}>()

const frame = ref<HTMLElement | null>(null)
const box = ref<HTMLElement | null>(null)

/**
 * Fit the picture to whatever room the panel has.
 *
 * Measured rather than done with `max-height: 100%`, because that resolves
 * against a parent with no definite height and is silently dropped — which
 * rendered the canvas at full intrinsic size and burst out of the card.
 *
 * Sizing the box to the image's exact aspect also keeps the pointer maths
 * honest: with letterboxing inside the element, client→image coordinates
 * would be wrong for both the divider and the brush.
 */
const available = ref({ width: 0, height: 0 })

onMounted(() => {
  if (!frame.value)
    return
  const observer = new ResizeObserver(([entry]) => {
    const r = entry!.contentRect
    available.value = { width: r.width, height: r.height }
  })
  observer.observe(frame.value)
  onScopeDispose(() => observer.disconnect())
})

const fitted = computed(() => {
  const { width: aw, height: ah } = available.value
  const iw = props.cutout.width
  const ih = props.cutout.height
  if (!aw || !ah || !iw || !ih)
    return { width: 0, height: 0 }
  // Never magnify past the real pixels — a soft, upscaled preview would
  // misrepresent the edge quality being judged here.
  const scale = Math.min(aw / iw, ah / ih, 1)
  return { width: Math.round(iw * scale), height: Math.round(ih * scale) }
})
const base = ref<HTMLCanvasElement | null>(null)
const overlay = ref<HTMLCanvasElement | null>(null)
const cursor = ref<{ x: number, y: number } | null>(null)

/**
 * Paint pixels straight onto the canvas. `putImageData` ignores the canvas
 * transform and any CSS scaling, which is exactly what we want: the canvas
 * keeps the image's intrinsic size and CSS handles the fitting.
 */
function paintTo(canvas: HTMLCanvasElement | null, image: Rgba | null) {
  if (!canvas || !image)
    return
  if (canvas.width !== image.width || canvas.height !== image.height) {
    canvas.width = image.width
    canvas.height = image.height
  }
  canvas.getContext('2d')?.putImageData(new ImageData(image.data, image.width, image.height), 0, 0)
}

watchEffect(() => paintTo(base.value, props.cutout))
watchEffect(() => paintTo(overlay.value, props.original))

const dragging = ref(false)
const painting = ref(false)

/**
 * Distance between where the handle sits and where it was grabbed, so taking
 * hold of its edge does not snap it under the pointer. Zero when the drag
 * started from the picture itself, where jumping to the pointer is what you
 * want.
 */
let grabOffset = 0

const clip = computed(() => ({
  // Reveals the left `position`% of the original over the cutout beneath.
  clipPath: `inset(0 ${100 - props.position}% 0 0)`,
}))

/**
 * Client point → preview-pixel point.
 *
 * Safe because the wrapper hugs the image (`w-fit`), so the rendered box and
 * the image share an aspect ratio and there is no letterboxing to correct for.
 */
function toImagePoint(event: PointerEvent) {
  const canvas = base.value
  const rect = canvas?.getBoundingClientRect()
  if (!canvas || !rect || !rect.width || !rect.height)
    return null
  return {
    x: ((event.clientX - rect.left) / rect.width) * canvas.width,
    y: ((event.clientY - rect.top) / rect.height) * canvas.height,
  }
}

/**
 * Pointer position relative to the picture's own box.
 *
 * Deliberately not `clientX`/`clientY` with a fixed-position ring: the app
 * shell carries `scale-100`, and in Tailwind v4 that is the standalone `scale`
 * property. Any non-`none` scale makes the element a containing block for
 * fixed descendants, so a `fixed` ring is laid out against the content card
 * while viewport coordinates describe the window — the brush ring drifted from
 * the pointer by the sidebar width plus the shell padding.
 */
function toBoxPoint(event: PointerEvent) {
  const rect = box.value?.getBoundingClientRect()
  if (!rect)
    return null
  return { x: event.clientX - rect.left, y: event.clientY - rect.top }
}

function positionFrom(event: PointerEvent) {
  const rect = box.value?.getBoundingClientRect()
  if (!rect?.width)
    return props.position
  return Math.min(100, Math.max(0, ((event.clientX - rect.left) / rect.width) * 100))
}

/**
 * Grabbing the handle drags it, even while a retouch tool is active.
 *
 * Kept separate from the picture's own handler so the two never compete: with
 * a brush or the magic wand on, the picture paints and only this handle
 * drags, which is what lets you keep comparing mid-retouch.
 */
function onHandleDown(event: PointerEvent) {
  event.stopPropagation()
  ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
  grabOffset = props.position - positionFrom(event)
  dragging.value = true
}

function onPointerDown(event: PointerEvent) {
  ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
  grabOffset = 0

  // A magic click is a single point, not a drag — emit and stop.
  if (props.magic) {
    const point = toImagePoint(event)
    if (point)
      emit('pick', point.x, point.y)
    return
  }

  if (props.brush) {
    const point = toImagePoint(event)
    if (!point)
      return
    painting.value = true
    emit('strokeStart', point.x, point.y)
    return
  }

  dragging.value = true
  emit('update:position', positionFrom(event))
}

function onPointerMove(event: PointerEvent) {
  if (props.brush)
    cursor.value = toBoxPoint(event)

  if (painting.value) {
    const point = toImagePoint(event)
    if (point)
      emit('strokeMove', point.x, point.y)
    return
  }

  if (dragging.value)
    emit('update:position', Math.min(100, Math.max(0, positionFrom(event) + grabOffset)))
}

function onPointerUp() {
  if (painting.value) {
    painting.value = false
    emit('strokeEnd')
  }
  dragging.value = false
}

/** The divider is a real slider, so it works without a pointer at all. */
function onKeydown(event: KeyboardEvent) {
  const step = event.shiftKey ? 10 : 2
  const moves: Record<string, number> = {
    ArrowLeft: -step,
    ArrowRight: step,
    ArrowDown: -step,
    ArrowUp: step,
  }
  if (event.key === 'Home')
    return emit('update:position', 0)
  if (event.key === 'End')
    return emit('update:position', 100)
  const delta = moves[event.key]
  if (delta === undefined)
    return
  event.preventDefault()
  emit('update:position', Math.min(100, Math.max(0, props.position + delta)))
}

/** Rendered brush size, so the ring matches what will actually be painted. */
const cursorSize = computed(() => {
  const canvas = base.value
  const rect = canvas?.getBoundingClientRect()
  if (!canvas || !rect?.width || !canvas.width)
    return props.brushSize
  return props.brushSize * (rect.width / canvas.width)
})
</script>

<template>
  <div ref="frame" class="relative size-full">
    <div
      ref="box"
      :style="{ width: `${fitted.width}px`, height: `${fitted.height}px` }"
      class="checkerboard absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 touch-none select-none overflow-hidden rounded-xl border border-border"
      :class="magic ? 'cursor-crosshair' : brush ? 'cursor-none' : 'cursor-ew-resize'"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
      @pointerleave="cursor = null"
    >
      <canvas
        ref="base"
        class="absolute inset-0 size-full"
        aria-label="Your image with the background removed"
        role="img"
      />
      <canvas
        ref="overlay"
        class="pointer-events-none absolute inset-0 size-full"
        :style="clip"
        aria-hidden="true"
      />

      <!--
        Ring showing exactly what the next dab will cover. Positioned inside
        the picture with plain left/top offsets — no transform, so nothing can
        stack on it, and no dependency on where the page happens to sit.
      -->
      <div
        v-if="brush && !magic && cursor"
        class="pointer-events-none absolute z-20 rounded-full border-2"
        :class="brush === 'restore' ? 'border-primary' : 'border-destructive'"
        :style="{
          left: `${cursor.x - cursorSize / 2}px`,
          top: `${cursor.y - cursorSize / 2}px`,
          width: `${cursorSize}px`,
          height: `${cursorSize}px`,
        }"
        aria-hidden="true"
      />

      <!--
        The divider stays available while retouching — comparing mid-correction
        is half the point — but only the handle itself takes a drag, so the
        picture is free to receive paint and clicks.
      -->
      <div
        class="pointer-events-none absolute inset-y-0 w-0.5 bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.35)]"
        :style="{ left: `${position}%` }"
        aria-hidden="true"
      />
      <button
        type="button"
        role="slider"
        :aria-valuenow="Math.round(position)"
        aria-valuemin="0"
        aria-valuemax="100"
        aria-label="Reveal the original image"
        class="absolute top-1/2 grid size-11 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize touch-none place-items-center rounded-full border-2 border-white bg-white/20 backdrop-blur-sm transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        :style="{ left: `${position}%` }"
        @keydown="onKeydown"
        @pointerdown="onHandleDown"
        @pointermove="onPointerMove"
        @pointerup="onPointerUp"
        @pointercancel="onPointerUp"
      >
        <span class="text-xs font-semibold text-white drop-shadow" aria-hidden="true">⟺</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
/* Transparency has to look like transparency, not like white. */
.checkerboard {
  --square: 12px;
  background-image:
    linear-gradient(45deg, var(--muted) 25%, transparent 25%),
    linear-gradient(-45deg, var(--muted) 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, var(--muted) 75%),
    linear-gradient(-45deg, transparent 75%, var(--muted) 75%);
  background-size: calc(var(--square) * 2) calc(var(--square) * 2);
  background-position: 0 0, 0 var(--square), var(--square) calc(var(--square) * -1), calc(var(--square) * -1) 0;
}
</style>
