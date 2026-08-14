<script setup lang="ts">
import { registry } from '#registry'
import { search } from '#zeal/fuzzy'

const { open, hide, toggle } = useSearchPalette()
const { track } = useAnalytics()

const query = ref('')
const activeIndex = ref(0)
const inputEl = ref<HTMLInputElement>()

const docs = registry.map(tool => ({
  slug: tool.slug,
  name: tool.name,
  tagline: tool.tagline,
  category: tool.category,
  keywords: tool.keywords,
  icon: tool.icon,
}))

const results = computed(() => {
  if (!query.value.trim()) return docs.map(doc => ({ doc, score: 0 }))
  return search(query.value, docs, 8)
})

watch(query, (value) => {
  activeIndex.value = 0
  if (!value.trim()) return
  track('search_performed', { query_length: value.length })
  if (results.value.length === 0) track('search_zero_results', { query: value.slice(0, 80) })
})

watch(open, async (isOpen) => {
  if (isOpen) {
    query.value = ''
    activeIndex.value = 0
    await nextTick()
    inputEl.value?.focus()
  }
})

function go(slug: string) {
  hide()
  navigateTo(`/tools/${slug}`)
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'ArrowDown') {
    event.preventDefault()
    activeIndex.value = Math.min(activeIndex.value + 1, results.value.length - 1)
  }
  else if (event.key === 'ArrowUp') {
    event.preventDefault()
    activeIndex.value = Math.max(activeIndex.value - 1, 0)
  }
  else if (event.key === 'Enter') {
    const hit = results.value[activeIndex.value]
    if (hit) go(hit.doc.slug)
  }
  else if (event.key === 'Escape') {
    hide()
  }
}

onMounted(() => {
  const handler = (event: KeyboardEvent) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault()
      toggle()
    }
    else if (event.key === '/' && !open.value) {
      const target = event.target as HTMLElement
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable) return
      event.preventDefault()
      open.value = true
    }
  }
  window.addEventListener('keydown', handler)
  onUnmounted(() => window.removeEventListener('keydown', handler))
})
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-50 flex items-start justify-center bg-neutral-950/40 p-4 pt-[12vh] backdrop-blur-sm"
      @click.self="hide()"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search tools"
        class="w-full max-w-lg overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-2xl dark:border-neutral-800 dark:bg-neutral-900"
        @keydown="onKeydown"
      >
        <div class="flex items-center gap-2 border-b border-neutral-200 px-4 dark:border-neutral-800">
          <svg class="size-4 text-neutral-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
          <input
            ref="inputEl"
            v-model="query"
            type="text"
            placeholder="Search tools…"
            class="h-12 w-full bg-transparent text-sm outline-none placeholder:text-neutral-400"
            role="combobox"
            aria-expanded="true"
            aria-controls="palette-results"
            :aria-activedescendant="results[activeIndex] ? `palette-item-${results[activeIndex].doc.slug}` : undefined"
          >
          <kbd class="rounded border border-neutral-200 bg-neutral-50 px-1.5 py-0.5 font-mono text-[10px] text-neutral-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400">esc</kbd>
        </div>
        <ul id="palette-results" role="listbox" class="max-h-72 overflow-y-auto p-2">
          <li
            v-for="(result, index) in results"
            :id="`palette-item-${result.doc.slug}`"
            :key="result.doc.slug"
            role="option"
            :aria-selected="index === activeIndex"
          >
            <button
              type="button"
              class="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm"
              :class="index === activeIndex ? 'bg-flame-50 text-flame-900 dark:bg-flame-950/40 dark:text-flame-100' : 'hover:bg-neutral-50 dark:hover:bg-neutral-800'"
              @mouseenter="activeIndex = index"
              @click="go(result.doc.slug)"
            >
              <span class="grid size-8 shrink-0 place-items-center rounded-md bg-neutral-100 text-base dark:bg-neutral-800" aria-hidden="true">{{ (result.doc as any).icon ?? '⚙' }}</span>
              <span class="min-w-0">
                <span class="block font-medium">{{ result.doc.name }}</span>
                <span class="block truncate text-xs text-neutral-500 dark:text-neutral-400">{{ result.doc.tagline }}</span>
              </span>
            </button>
          </li>
          <li v-if="query.trim() && results.length === 0" class="px-3 py-8 text-center text-sm text-neutral-500">
            <p>No tools match “{{ query }}” yet.</p>
            <a
              href="https://github.com/zernonia/zeal-tools/issues/new?template=tool-request.md"
              target="_blank"
              rel="noopener"
              class="mt-2 inline-block font-medium text-flame-600 hover:underline"
            >Request a tool →</a>
          </li>
        </ul>
      </div>
    </div>
  </Teleport>
</template>
