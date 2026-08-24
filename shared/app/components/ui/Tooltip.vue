<script setup lang="ts">
/**
 * A hover/focus label, in CSS only.
 *
 * reka ships a Tooltip and it is the better primitive in general — portalled,
 * with real collision detection. It was measured here first and cost **43 KiB
 * and two extra chunks on the shared baseline of every page**, because it
 * drags its positioning engine in with it. These are three fixed buttons in a
 * corner whose placement is known at author time, so none of that is being
 * used. Reach for the reka one the moment a tooltip has to survive being near
 * a viewport edge it does not control.
 *
 * The bubble is `aria-hidden`: every trigger already carries an `aria-label`,
 * so exposing this too would only have assistive tech read the same thing
 * twice. It is decoration for people who can see it.
 */
withDefaults(defineProps<{
  label: string
  /** `end` right-aligns the bubble, for a trigger near the right edge. */
  align?: 'center' | 'end'
}>(), { align: 'center' })
</script>

<template>
  <span class="group relative inline-flex">
    <slot />
    <span
      aria-hidden="true"
      class="pointer-events-none absolute top-full z-50 mt-2 w-max max-w-48 rounded-md bg-foreground px-2.5 py-1.5 text-xs text-background opacity-0 shadow-sm transition-opacity duration-150 group-hover:opacity-100 group-has-[:focus-visible]:opacity-100"
      :class="align === 'end' ? 'right-0' : 'left-1/2 -translate-x-1/2'"
    >{{ label }}</span>
  </span>
</template>
