<script setup lang="ts">
import {
  DialogContent,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
  VisuallyHidden,
} from 'reka-ui'

const route = useRoute()
const { open: drawerOpen } = useSidebar()

/**
 * Wayfinding for tool pages only — the homepage is already a full tool index,
 * so a sidebar there would just duplicate the grid.
 */
const visible = computed(() => route.path !== '/')

// A drawer that survived navigation would cover the page you just opened.
watch(() => route.fullPath, () => { drawerOpen.value = false })
</script>

<template>
  <aside
    class="hidden shrink-0 overflow-hidden transition-[width,opacity] duration-300 ease-out lg:block"
    :class="visible ? 'lg:w-64 lg:opacity-100' : 'lg:w-0 lg:opacity-0'"
    :inert="!visible"
  >
    <div class="h-full w-64 pr-5">
      <SiteSidebarNav />
    </div>
  </aside>

  <DialogRoot v-model:open="drawerOpen">
    <DialogPortal>
      <DialogOverlay class="drawer-scrim fixed inset-0 z-50 bg-neutral-950/40 data-[state=closed]:animate-overlay-out data-[state=open]:animate-overlay-in lg:hidden" />
      <DialogContent
        class="fixed inset-y-3 left-3 z-50 w-72 rounded-xl border border-sidebar-border bg-sidebar p-4 shadow-2xl duration-200 data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left lg:hidden"
        :aria-describedby="undefined"
      >
        <VisuallyHidden as-child>
          <DialogTitle>Navigation</DialogTitle>
        </VisuallyHidden>
        <SiteSidebarNav />
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
