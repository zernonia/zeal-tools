<script setup lang="ts">
import type { TabsContentProps } from 'reka-ui'
import { TabsContent } from 'reka-ui'
import { computed, type HTMLAttributes } from 'vue'

const props = defineProps<TabsContentProps & { class?: HTMLAttributes['class'] }>()

const delegatedProps = computed(() => {
  const { class: _, ...delegated } = props
  return delegated
})
</script>

<template>
  <TabsContent
    v-bind="delegatedProps"
    :class="cn('mt-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring', props.class)"
  >
    <slot />
  </TabsContent>
</template>
