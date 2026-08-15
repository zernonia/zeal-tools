<script setup lang="ts">
import { Search } from 'lucide-vue-next'
import {
  DialogContent,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
  ListboxContent,
  ListboxFilter,
  ListboxItem,
  ListboxRoot,
  VisuallyHidden,
} from 'reka-ui'
import { registry } from '#registry'
import { search } from '#zeal/fuzzy'

const { open, hide } = useSearchPalette()
const { track } = useAnalytics()

const query = ref('')

const docs = registry.map(tool => ({
  slug: tool.slug,
  name: tool.name,
  tagline: tool.tagline,
  category: tool.category,
  keywords: tool.keywords,
  icon: tool.icon,
}))

// Our own fuzzy scorer does the filtering — reka's built-in filter is disabled
const results = computed(() => {
  if (!query.value.trim())
    return docs.map(doc => ({ doc, score: 0 }))
  return search(query.value, docs, 8)
})

watch(query, (value) => {
  if (!value.trim())
    return
  track('search_performed', { query_length: value.length })
  if (results.value.length === 0)
    track('search_zero_results', { query: value.slice(0, 80) })
})

watch(open, (isOpen) => {
  if (isOpen)
    query.value = ''
})

function go(slug: unknown) {
  if (typeof slug !== 'string' || !slug)
    return
  hide()
  navigateTo(`/tools/${slug}`)
}

onMounted(() => {
  const handler = (event: KeyboardEvent) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault()
      open.value = !open.value
    }
    else if (event.key === '/' && !open.value) {
      const target = event.target as HTMLElement
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable)
        return
      event.preventDefault()
      open.value = true
    }
  }
  window.addEventListener('keydown', handler)
  onUnmounted(() => window.removeEventListener('keydown', handler))
})
</script>

<template>
  <DialogRoot v-model:open="open">
    <DialogPortal>
      <DialogOverlay class="fixed inset-0 z-50 bg-neutral-950/40 backdrop-blur-sm" />
      <DialogContent
        class="fixed left-1/2 top-[12vh] z-50 w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground shadow-2xl"
        :aria-describedby="undefined"
      >
        <VisuallyHidden as-child>
          <DialogTitle>Search tools</DialogTitle>
        </VisuallyHidden>
        <ListboxRoot highlight-on-hover @update:model-value="go">
          <div class="flex items-center gap-2 border-b border-border px-4">
            <Search class="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <ListboxFilter
              v-model="query"
              auto-focus
              placeholder="Search tools…"
              class="h-12 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            <kbd class="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">esc</kbd>
          </div>
          <ListboxContent class="max-h-72 overflow-y-auto p-2">
            <div v-if="!results.length" class="px-3 py-8 text-center text-sm text-muted-foreground">
              <p>No tools match “{{ query }}” yet.</p>
              <a
                href="https://github.com/zernonia/zeal-tools/issues/new?template=tool-request.md"
                target="_blank"
                rel="noopener"
                class="mt-2 inline-block font-medium text-primary hover:underline"
              >Request a tool →</a>
            </div>
            <ListboxItem
              v-for="result in results"
              :key="result.doc.slug"
              :value="result.doc.slug"
              class="flex w-full cursor-default select-none items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm outline-none data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground"
            >
              <span class="grid size-8 shrink-0 place-items-center rounded-md bg-muted text-base" aria-hidden="true">{{ result.doc.icon ?? '⚙' }}</span>
              <span class="min-w-0">
                <span class="block font-medium">{{ result.doc.name }}</span>
                <span class="block truncate text-xs text-muted-foreground">{{ result.doc.tagline }}</span>
              </span>
            </ListboxItem>
          </ListboxContent>
        </ListboxRoot>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
