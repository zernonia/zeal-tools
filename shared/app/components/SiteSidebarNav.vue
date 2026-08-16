<script setup lang="ts">
import { ChevronRight } from 'lucide-vue-next'
import { registry, variantLabel } from '#registry'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible'
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
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

/** Open the group you are currently inside; everything else starts closed. */
function startsOpen(tool: typeof registry[number]) {
  return route.path.startsWith(`/tools/${tool.slug}`)
}
</script>

<template>
  <SidebarGroup>
    <SidebarGroupLabel>Tools</SidebarGroupLabel>

    <SidebarMenu>
      <template v-for="tool in registry" :key="tool.slug">
        <!-- No sub-pages: a plain link, per the shadcn-vue docs. -->
        <SidebarMenuItem v-if="!tool.variants?.length">
          <SidebarMenuButton as-child :is-active="isActive(`/tools/${tool.slug}`)">
            <NuxtLink
              :to="`/tools/${tool.slug}`"
              :aria-current="isActive(`/tools/${tool.slug}`) ? 'page' : undefined"
            >
              <SiteToolIcon :slug="tool.slug" />
              <span>{{ tool.name }}</span>
            </NuxtLink>
          </SidebarMenuButton>
        </SidebarMenuItem>

        <!--
          With sub-pages the row stays a link to the tool's own page — that page
          is the overview, and making the parent a pure trigger would strand it.
          SidebarMenuAction carries the expand control instead, which is the
          shadcn-vue pattern for a menu row that both navigates and expands.
        -->
        <SidebarMenuItem v-else>
          <Collapsible
            :default-open="startsOpen(tool)"
            :unmount-on-hide="false"
            class="group/collapsible"
          >
            <SidebarMenuButton as-child :is-active="isActive(`/tools/${tool.slug}`)">
              <NuxtLink
                :to="`/tools/${tool.slug}`"
                :aria-current="isActive(`/tools/${tool.slug}`) ? 'page' : undefined"
              >
                <SiteToolIcon :slug="tool.slug" />
                <span>{{ tool.name }}</span>
              </NuxtLink>
            </SidebarMenuButton>

            <CollapsibleTrigger as-child>
              <SidebarMenuAction :aria-label="`Show ${tool.name} pages`">
                <ChevronRight class="transition-transform group-data-[state=open]/collapsible:rotate-90" />
              </SidebarMenuAction>
            </CollapsibleTrigger>

            <!--
              unmount-on-hide keeps every sub-page link in the HTML while
              collapsed, so they stay crawlable — without it a closed group is
              invisible to search engines as well as to people.
            -->
            <CollapsibleContent class="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
              <SidebarMenuSub>
                <SidebarMenuSubItem v-for="variant in tool.variants" :key="variant">
                  <SidebarMenuSubButton as-child :is-active="isActive(`/tools/${tool.slug}/${variant}`)">
                    <NuxtLink
                      :to="`/tools/${tool.slug}/${variant}`"
                      :aria-current="isActive(`/tools/${tool.slug}/${variant}`) ? 'page' : undefined"
                    >
                      <span>{{ variantLabel(variant) }}</span>
                    </NuxtLink>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              </SidebarMenuSub>
            </CollapsibleContent>
          </Collapsible>
        </SidebarMenuItem>
      </template>
    </SidebarMenu>
  </SidebarGroup>
</template>
