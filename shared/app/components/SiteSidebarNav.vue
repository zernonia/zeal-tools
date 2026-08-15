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
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from './ui/sidebar'

const route = useRoute()

function isActive(path: string) {
  return route.path === path
}

/**
 * Sections start collapsed, except the one you are currently inside — hiding
 * your own location is disorienting, and it is the one group you demonstrably
 * care about.
 *
 * Accordion rather than shadcn-vue's Collapsible: `unmount-on-hide="false"`
 * keeps every variant link in the HTML for crawlers while collapsed, which
 * Collapsible would not, and it reuses the accordion keyframes already in
 * main.css.
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
</script>

<template>
  <SidebarGroup>
    <SidebarGroupLabel>Tools</SidebarGroupLabel>

    <SidebarMenu>
      <AccordionRoot v-model="openSections" type="multiple" :unmount-on-hide="false">
        <AccordionItem v-for="tool in registry" :key="tool.slug" :value="tool.slug">
          <SidebarMenuItem>
            <AccordionHeader class="flex items-center gap-0.5">
              <SidebarMenuButton
                as-child
                :is-active="isActive(`/tools/${tool.slug}`)"
                class="flex-1"
              >
                <NuxtLink
                  :to="`/tools/${tool.slug}`"
                  :aria-current="isActive(`/tools/${tool.slug}`) ? 'page' : undefined"
                >
                  <span aria-hidden="true">{{ tool.icon ?? '⚙' }}</span>
                  <span class="truncate">{{ tool.name }}</span>
                </NuxtLink>
              </SidebarMenuButton>

              <AccordionTrigger
                v-if="tool.variants?.length"
                class="group shrink-0 rounded-md p-1.5 text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                :aria-label="`Show ${tool.name} pages`"
              >
                <ChevronDown class="size-3.5 transition-transform duration-200 group-data-[state=open]:rotate-180" />
              </AccordionTrigger>
            </AccordionHeader>

            <AccordionContent
              v-if="tool.variants?.length"
              class="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down"
            >
              <SidebarMenuSub>
                <SidebarMenuSubItem v-for="variant in tool.variants" :key="variant">
                  <SidebarMenuSubButton
                    as-child
                    :is-active="isActive(`/tools/${tool.slug}/${variant}`)"
                  >
                    <NuxtLink
                      :to="`/tools/${tool.slug}/${variant}`"
                      :aria-current="isActive(`/tools/${tool.slug}/${variant}`) ? 'page' : undefined"
                    >
                      {{ variantLabel(variant) }}
                    </NuxtLink>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              </SidebarMenuSub>
            </AccordionContent>
          </SidebarMenuItem>
        </AccordionItem>
      </AccordionRoot>
    </SidebarMenu>
  </SidebarGroup>
</template>
