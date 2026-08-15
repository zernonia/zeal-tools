<script setup lang="ts">
import type { SidebarMenuButtonProps } from './SidebarMenuButtonChild.vue'
import SidebarMenuButtonChild from './SidebarMenuButtonChild.vue'

/**
 * Ported from shadcn-vue with the tooltip branch removed: tooltips only show
 * when the sidebar is icon-collapsed, which this app does not use, and
 * keeping them would have pulled in the whole Tooltip family.
 */
defineOptions({
  inheritAttrs: false,
})

withDefaults(defineProps<SidebarMenuButtonProps>(), {
  as: 'button',
  variant: 'default',
  size: 'default',
})
</script>

<template>
  <SidebarMenuButtonChild v-bind="{ ...$props, ...$attrs }">
    <slot />
  </SidebarMenuButtonChild>
</template>
