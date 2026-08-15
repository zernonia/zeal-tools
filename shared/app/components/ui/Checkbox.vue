<script setup lang="ts">
import type { CheckboxRootEmits, CheckboxRootProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { Check } from 'lucide-vue-next'
import { CheckboxIndicator, CheckboxRoot, useForwardPropsEmits } from 'reka-ui'
import { computed } from 'vue'

const props = defineProps<CheckboxRootProps & { class?: HTMLAttributes['class'] }>()
const emits = defineEmits<CheckboxRootEmits>()

const delegatedProps = computed(() => {
  const { class: _, ...delegated } = props
  return delegated
})
const forwarded = useForwardPropsEmits(delegatedProps, emits)
</script>

<template>
  <CheckboxRoot
    v-bind="forwarded"
    :class="cn(
      // `dark:data-[state=checked]:bg-primary` is not redundant: Tailwind emits
      // `dark:bg-input/30` after `data-[state=checked]:bg-primary`, so without a
      // dark-scoped checked rule the box keeps the input fill when checked.
      'peer size-5 shrink-0 rounded-md border border-input bg-transparent transition-colors dark:bg-input/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:border-primary data-[state=checked]:bg-primary dark:data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground',
      props.class,
    )"
  >
    <CheckboxIndicator class="flex size-full items-center justify-center text-current">
      <Check class="size-3.5" stroke-width="3" />
    </CheckboxIndicator>
  </CheckboxRoot>
</template>
