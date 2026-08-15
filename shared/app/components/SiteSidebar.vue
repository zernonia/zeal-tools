<script setup lang="ts">
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from './ui/sidebar'

/**
 * The app shell's navigation, built on shadcn-vue's Sidebar. `variant="inset"`
 * is what gives the floating-card look the layout already had; the provider in
 * the layout owns open/collapsed state and the mobile sheet.
 */
</script>

<template>
  <Sidebar variant="inset" collapsible="offcanvas">
    <SidebarHeader>
      <SiteBrand class="px-2 py-1.5" />
    </SidebarHeader>

    <SidebarContent>
      <SiteSidebarNav />
    </SidebarContent>

    <SidebarFooter>
      <a
        href="/api/v1"
        class="rounded-lg px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
      >
        API reference
      </a>
    </SidebarFooter>

    <SidebarRail />
  </Sidebar>
</template>
