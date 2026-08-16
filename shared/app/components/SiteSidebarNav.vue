<script setup lang="ts">
import { ChevronRight } from 'lucide-vue-next'
import { registry, variantLabel } from '#registry'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible'

const route = useRoute()

/**
 * Prerendered routes are served with a trailing slash, so a verbatim compare
 * matched nothing on a real page load and no nav item was ever marked current.
 */
function samePath(a: string, b: string) {
  return a.replace(/\/$/, '') === b.replace(/\/$/, '')
}

function isActive(path: string) {
  return samePath(route.path, path)
}

/**
 * The tool whose sub-page you are actually on, matched against its registered
 * variants rather than a `/tools/<slug>/` prefix — the prefix also matches the
 * overview page, which has no active sub-item worth revealing.
 */
function toolOfVariantPage(path: string) {
  return registry.find(tool =>
    tool.variants?.some(v => samePath(path, `/tools/${tool.slug}/${v}`)),
  )
}

/**
 * Groups start closed, except the one holding the page you are on — otherwise
 * landing on `/tools/countdown-timer/christmas` hides the very item that is
 * current. Open state is held here rather than passed as `defaultOpen` so it
 * also follows client-side navigation, and so collapsing a group by hand
 * sticks until you navigate into it again.
 */
const openGroups = reactive(Object.fromEntries(
  registry.filter(tool => tool.variants?.length)
    .map(tool => [tool.slug, toolOfVariantPage(route.path)?.slug === tool.slug]),
))

watch(() => route.path, (path) => {
  const slug = toolOfVariantPage(path)?.slug
  if (slug)
    openGroups[slug] = true
})

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
      <!-- No sub-pages: the row is just a link. -->
      <NuxtLink
        v-if="!tool.variants?.length"
        :to="`/tools/${tool.slug}`"
        :aria-current="isActive(`/tools/${tool.slug}`) ? 'page' : undefined"
        class="flex items-center gap-2"
        :class="[itemClass, isActive(`/tools/${tool.slug}`) ? activeClass : 'text-muted-foreground']"
      >
        <SiteToolIcon :slug="tool.slug" class="size-4 shrink-0" />
        <span class="truncate">{{ tool.name }}</span>
      </NuxtLink>

      <!--
        With sub-pages the row still links to the tool's own page — that page is
        the overview, so turning the whole row into a toggle would strand it.
        The chevron beside it carries the expand instead.

        Groups start closed apart from the one holding the current sub-page.
      -->
      <Collapsible v-else v-model:open="openGroups[tool.slug]" :unmount-on-hide="false" class="group/collapsible">
        <div class="flex items-center gap-1">
          <NuxtLink
            :to="`/tools/${tool.slug}`"
            :aria-current="isActive(`/tools/${tool.slug}`) ? 'page' : undefined"
            class="flex min-w-0 grow items-center gap-2"
            :class="[itemClass, isActive(`/tools/${tool.slug}`) ? activeClass : 'text-muted-foreground']"
          >
            <SiteToolIcon :slug="tool.slug" class="size-4 shrink-0" />
            <span class="truncate">{{ tool.name }}</span>
          </NuxtLink>

          <CollapsibleTrigger
            :aria-label="`Show ${tool.name} pages`"
            class="grid size-7 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ChevronRight class="size-3.5 transition-transform group-data-[state=open]/collapsible:rotate-90" />
          </CollapsibleTrigger>
        </div>

        <!--
          unmount-on-hide keeps every sub-page link in the HTML while collapsed,
          so they stay crawlable — and reka marks the region `hidden`, so it is
          correctly out of the accessibility tree too. force-mount would bypass
          Presence and kill the collapse animation.
        -->
        <CollapsibleContent class="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
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
        </CollapsibleContent>
      </Collapsible>
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
