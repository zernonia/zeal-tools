<script setup lang="ts">
import type { TabsListProps } from 'reka-ui'
import { TabsList } from 'reka-ui'
import { computed, type HTMLAttributes } from 'vue'

const props = defineProps<TabsListProps & { class?: HTMLAttributes['class'] }>()

const delegatedProps = computed(() => {
  const { class: _, ...delegated } = props
  return delegated
})
</script>

<template>
  <TabsList
    v-bind="delegatedProps"
    :class="cn('inline-flex flex-wrap items-center gap-1 rounded-xl bg-muted p-1 text-muted-foreground', props.class)"
  >
    <slot />
  </TabsList>
</template>
