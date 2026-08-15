<script setup lang="ts">
import type { SliderRootEmits, SliderRootProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { SliderRange, SliderRoot, SliderThumb, SliderTrack, useForwardPropsEmits } from 'reka-ui'
import { computed, useAttrs } from 'vue'

const props = defineProps<SliderRootProps & { class?: HTMLAttributes['class'] }>()
const emits = defineEmits<SliderRootEmits>()

const delegatedProps = computed(() => {
  const { class: _, ...delegated } = props
  return delegated
})
const forwarded = useForwardPropsEmits(delegatedProps, emits)

// aria-label falls through to SliderRoot, but the thumb is the element with
// role="slider" — without this it has no accessible name.
const attrs = useAttrs()
const thumbLabel = computed(() => attrs['aria-label'] as string | undefined)
</script>

<template>
  <SliderRoot
    v-bind="forwarded"
    :class="cn(
      'relative flex w-full touch-none select-none items-center py-2 data-[disabled]:opacity-50',
      props.class,
    )"
  >
    <SliderTrack class="relative h-1.5 w-full grow overflow-hidden rounded-full bg-muted">
      <SliderRange class="absolute h-full bg-primary" />
    </SliderTrack>
    <SliderThumb
      v-for="(_, index) in (props.modelValue ?? [0])"
      :key="index"
      :aria-label="thumbLabel"
      class="block size-4.5 rounded-full border-2 border-primary bg-white shadow transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none"
    />
  </SliderRoot>
</template>
