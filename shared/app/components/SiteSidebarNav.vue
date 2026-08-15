<script setup lang="ts">
import { ChevronDown } from 'lucide-vue-next'
import {
  AccordionContent,
  AccordionHeader,
  AccordionItem,
  AccordionRoot,
  AccordionTrigger,
} from 'reka-ui'
import { registry, variantLabel } from '#registry'

const route = useRoute()

function isActive(path: string) {
  return route.path === path
}

/**
 * Sections start collapsed, except the one you are currently inside — hiding
 * your own location is disorienting, and it is the one group you demonstrably
 * care about.
 */
const openSections = ref<string[]>([])

watch(
  () => route.path,
  (path) => {
    const tool = registry.find(item => path.startsWith(`/tools/${item.slug}/`))
    if (tool && !openSections.value.includes(tool.slug))
      openSections.value = [...openSections.value, tool.slug]
  },
  { immediate: true },
)

const itemClass = 'rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
const activeClass = 'bg-sidebar-accent font-medium text-sidebar-accent-foreground'
</script>

<template>
  <nav aria-label="Tools" class="flex h-full flex-col gap-0.5 overflow-auto text-sidebar-foreground">
    <SiteBrand class="mb-3 px-2 py-1.5" />

    <p class="px-2 py-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
      Tools
    </p>

    <AccordionRoot
      v-model="openSections"
      type="multiple"
      :unmount-on-hide="false"
      class="flex flex-col gap-0.5"
    >
      <AccordionItem v-for="tool in registry" :key="tool.slug" :value="tool.slug">
        <AccordionHeader class="flex items-center gap-0.5">
          <NuxtLink
            :to="`/tools/${tool.slug}`"
            :aria-current="isActive(`/tools/${tool.slug}`) ? 'page' : undefined"
            class="flex min-w-0 flex-1 items-center gap-2"
            :class="[itemClass, isActive(`/tools/${tool.slug}`) ? activeClass : 'text-muted-foreground']"
          >
            <span aria-hidden="true">{{ tool.icon ?? '⚙' }}</span>
            <span class="truncate">{{ tool.name }}</span>
          </NuxtLink>

          <AccordionTrigger
            v-if="tool.variants?.length"
            class="group shrink-0 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            :aria-label="`Show ${tool.name} pages`"
          >
            <ChevronDown class="size-3.5 transition-transform duration-200 group-data-[state=open]:rotate-180" />
          </AccordionTrigger>
        </AccordionHeader>

        <!--
          unmount-on-hide on the root keeps these links in the HTML while
          collapsed, so they stay crawlable — the same reason FaqSection uses
          it. force-mount would break the animation instead.
        -->
        <AccordionContent
          v-if="tool.variants?.length"
          class="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down"
        >
          <ul class="mb-1 ml-4 flex flex-col gap-0.5 border-l pl-2">
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
        </AccordionContent>
      </AccordionItem>
    </AccordionRoot>

    <a
      href="/api/v1"
      class="mt-auto text-muted-foreground"
      :class="itemClass"
    >
      API reference
    </a>
  </nav>
</template>
