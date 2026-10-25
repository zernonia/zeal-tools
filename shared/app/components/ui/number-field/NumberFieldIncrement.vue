<script setup lang="ts">
import type { NumberFieldIncrementProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { Plus } from 'lucide-vue-next'
import { NumberFieldIncrement, useForwardProps } from 'reka-ui'
import { computed } from 'vue'

const props = defineProps<NumberFieldIncrementProps & { class?: HTMLAttributes['class'] }>()

const delegatedProps = computed(() => {
  const { class: _, ...delegated } = props
  return delegated
})
const forwarded = useForwardProps(delegatedProps)
</script>

<!--
  44px square, not shadcn's padded icon: these are touch targets, and the
  field is often used on a phone held in one hand.
-->
<template>
  <NumberFieldIncrement
    data-slot="increment"
    v-bind="forwarded"
    :class="cn('absolute top-1/2 right-0 grid size-11 -translate-y-1/2 place-items-center rounded-lg text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-20', props.class)"
  >
    <slot>
      <Plus class="size-4" />
    </slot>
  </NumberFieldIncrement>
</template>
