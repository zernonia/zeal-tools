<script setup lang="ts">
import { registry, variantLabel } from '#registry'

const route = useRoute()

function isActive(path: string) {
  return route.path === path
}

const itemClass = 'rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
const activeClass = 'bg-sidebar-accent font-medium text-sidebar-accent-foreground'
</script>

<template>
  <nav aria-label="Tools" class="flex h-full flex-col gap-0.5 overflow-auto text-sidebar-foreground">
    <SiteBrand class="mb-3 px-2 py-1.5" />

    <p class="px-2 py-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
      Tools
    </p>

    <template v-for="tool in registry" :key="tool.slug">
      <NuxtLink
        :to="`/tools/${tool.slug}`"
        :aria-current="isActive(`/tools/${tool.slug}`) ? 'page' : undefined"
        class="flex items-center gap-2"
        :class="[itemClass, isActive(`/tools/${tool.slug}`) ? activeClass : 'text-muted-foreground']"
      >
        <span aria-hidden="true">{{ tool.icon ?? '⚙' }}</span>
        <span class="truncate">{{ tool.name }}</span>
      </NuxtLink>

      <ul v-if="tool.variants?.length" class="mb-1 ml-4 flex flex-col gap-0.5 border-l pl-2">
        <li v-for="variant in tool.variants" :key="variant">
          <NuxtLink
            :to="`/tools/${tool.slug}/${variant}`"
            :aria-current="isActive(`/tools/${tool.slug}/${variant}`) ? 'page' : undefined"
            class="block truncate"
            :class="[itemClass, isActive(`/tools/${tool.slug}/${variant}`) ? activeClass : 'text-muted-foreground']"
          >
            {{ variantLabel(variant) }}
          </NuxtLink>
        </li>
      </ul>
    </template>

    <a
      href="/api/v1"
      class="mt-auto text-muted-foreground"
      :class="itemClass"
    >
      API reference
    </a>
  </nav>
</template>
