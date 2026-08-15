<script setup lang="ts">
import { registry, variantLabel } from '#registry'

const route = useRoute()

interface Crumb {
  label: string
  /** Omitted for the final crumb — the current page isn't a link. */
  to?: string
}

/**
 * Derived from the path rather than a per-page prop, so new tools and variants
 * pick up a breadcrumb without touching their pages. The homepage IS the tool
 * index, hence "All tools" pointing at "/".
 */
const crumbs = computed<Crumb[]>(() => {
  const root: Crumb = { label: 'All tools', to: '/' }
  const [section, slug, variant] = route.path.split('/').filter(Boolean)

  if (section !== 'tools' || !slug)
    return [root]

  const tool = registry.find(item => item.slug === slug)
  if (!tool)
    return [root]

  if (!variant)
    return [root, { label: tool.name }]

  return [
    root,
    { label: tool.name, to: `/tools/${tool.slug}` },
    { label: variantLabel(variant) },
  ]
})
</script>

<template>
  <nav aria-label="Breadcrumb" class="min-w-0">
    <ol class="flex items-center gap-1.5 text-sm">
      <li v-for="(crumb, index) in crumbs" :key="crumb.label" class="flex min-w-0 items-center gap-1.5">
        <span v-if="index > 0" class="text-muted-foreground" aria-hidden="true">/</span>
        <NuxtLink
          v-if="crumb.to"
          :to="crumb.to"
          class="truncate text-muted-foreground transition-colors hover:text-foreground"
        >
          {{ crumb.label }}
        </NuxtLink>
        <span v-else class="truncate font-medium" aria-current="page">
          {{ crumb.label }}
        </span>
      </li>
    </ol>
  </nav>
</template>
