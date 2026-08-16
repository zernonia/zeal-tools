<script setup lang="ts">
import { SidebarInset, useSidebar } from './ui/sidebar'

/**
 * Wraps SidebarInset so it can read the sidebar context — the layout itself
 * renders SidebarProvider, so it cannot call useSidebar in its own setup.
 *
 * Exists to keep the drawer flourish: the content panel eases back slightly
 * while the mobile drawer is open, so the drawer reads as sitting on top of
 * the page rather than beside it.
 */
const { openMobile } = useSidebar()
</script>

<template>
  <SidebarInset
    class="relative overflow-auto transition-transform duration-300 ease-out scrollbar-thumb-muted-foreground/10"
    :class="openMobile ? 'scale-[0.97] lg:scale-100' : 'scale-100'"
  >
    <slot />
  </SidebarInset>
</template>
