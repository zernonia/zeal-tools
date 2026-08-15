<script setup lang="ts">
import { registry, variantLabel } from '#registry'

const route = useRoute()

/**
 * Wayfinding for tool pages only — the homepage is already a full tool index,
 * so a sidebar there would just duplicate the grid.
 */
const open = computed(() => route.path !== '/')

function isActive(path: string) {
  return route.path === path
}
</script>

<template>
  <!--
    Width-collapsed rather than v-if so the open/close animates. `inert` is what
    actually takes the closed sidebar out of the tab order and the a11y tree —
    w-0 + overflow-hidden alone would still leave every link focusable.
  -->
  <aside
    class="shrink-0 overflow-hidden transition-[width_opacity] duration-500 ease-in-out"
    :class="open ? 'w-64 opacity-100' : 'w-0 opacity-0'"
    :inert="!open"
  >
    <!-- Fixed inner width so links don't reflow while the aside animates. -->
    <div class="flex h-full w-64 flex-col gap-3 pr-5">
      <SiteHeader />
      <nav
        aria-label="Tools"
        class="flex min-h-0 flex-1 flex-col gap-0.5 overflow-auto text-sidebar-foreground"
      >
        <p class="px-2 py-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          Tools
        </p>

        <template v-for="tool in registry" :key="tool.slug">
          <NuxtLink
            :to="`/tools/${tool.slug}`"
            :aria-current="isActive(`/tools/${tool.slug}`) ? 'page' : undefined"
            class="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            :class="isActive(`/tools/${tool.slug}`) ? 'bg-sidebar-accent font-medium text-sidebar-accent-foreground' : 'text-muted-foreground'"
          >
            <span aria-hidden="true">{{ tool.icon ?? '⚙' }}</span>
            <span class="truncate">{{ tool.name }}</span>
          </NuxtLink>

          <ul v-if="tool.variants?.length" class="mb-1 ml-4 flex flex-col gap-0.5 border-l pl-2">
            <li v-for="variant in tool.variants" :key="variant">
              <NuxtLink
                :to="`/tools/${tool.slug}/${variant}`"
                :aria-current="isActive(`/tools/${tool.slug}/${variant}`) ? 'page' : undefined"
                class="block truncate rounded-lg px-2 py-1 text-sm transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                :class="isActive(`/tools/${tool.slug}/${variant}`) ? 'bg-sidebar-accent font-medium text-sidebar-accent-foreground' : 'text-muted-foreground'"
              >
                {{ variantLabel(variant) }}
              </NuxtLink>
            </li>
          </ul>
        </template>

        <NuxtLink
          to="/api/v1"
          :aria-current="isActive('/api/v1') ? 'page' : undefined"
          class="mt-auto rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          :class="isActive('/api/v1') ? 'bg-sidebar-accent font-medium text-sidebar-accent-foreground' : 'text-muted-foreground'"
        >
          API reference
        </NuxtLink>
      </nav>
    </div>
  </aside>
</template>
