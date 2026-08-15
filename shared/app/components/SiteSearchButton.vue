<script setup lang="ts">
import { Search } from 'lucide-vue-next'

const { show } = useSearchPalette()
</script>

<template>
  <Button
    variant="outline"
    size="sm"
    class="justify-start bg-transparent text-muted-foreground dark:bg-input/30"
    @click="show()"
  >
    <Search class="size-4" />
    <span class="hidden sm:inline">Search tools…</span>
    <kbd class="hidden rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:inline">⌘K</kbd>
    <span class="sr-only">Search tools</span>
  </Button>
</template>
