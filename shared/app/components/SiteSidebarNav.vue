<script setup lang="ts">
import { ChevronRight } from 'lucide-vue-next'
import { registry, variantLabel } from '#registry'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible'
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

/** A tool's own page, listed first so the parent stays reachable as a trigger. */
function pagesFor(tool: typeof registry[number]) {
  return [
    { to: `/tools/${tool.slug}`, label: 'Overview' },
    ...(tool.variants ?? []).map(variant => ({
      to: `/tools/${tool.slug}/${variant}`,
      label: variantLabel(variant),
    })),
  ]
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
        <!-- Tools without variants are a plain link, per the docs. -->
        <SidebarMenuItem v-if="!tool.variants?.length">
          <SidebarMenuButton as-child :is-active="isActive(`/tools/${tool.slug}`)">
            <NuxtLink
              :to="`/tools/${tool.slug}`"
              :aria-current="isActive(`/tools/${tool.slug}`) ? 'page' : undefined"
            >
              <span aria-hidden="true">{{ tool.icon ?? '⚙' }}</span>
              <span>{{ tool.name }}</span>
            </NuxtLink>
          </SidebarMenuButton>
        </SidebarMenuItem>

        <SidebarMenuItem v-else>
          <!--
            unmount-on-hide keeps every sub-page link in the HTML while
            collapsed, so they stay crawlable — without it a closed group is
            invisible to search engines as well as to people.
          -->
          <Collapsible
            :default-open="startsOpen(tool)"
            :unmount-on-hide="false"
            class="group/collapsible"
          >
            <CollapsibleTrigger as-child>
              <SidebarMenuButton>
                <span aria-hidden="true">{{ tool.icon ?? '⚙' }}</span>
                <span>{{ tool.name }}</span>
                <ChevronRight class="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-90" />
              </SidebarMenuButton>
            </CollapsibleTrigger>

            <CollapsibleContent class="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
              <SidebarMenuSub>
                <SidebarMenuSubItem v-for="page in pagesFor(tool)" :key="page.to">
                  <SidebarMenuSubButton as-child :is-active="isActive(page.to)">
                    <NuxtLink :to="page.to" :aria-current="isActive(page.to) ? 'page' : undefined">
                      <span>{{ page.label }}</span>
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
