<script setup lang="ts">
import { Search } from 'lucide-vue-next'

const { show } = useSearchPalette()
</script>

<template>
  <!-- Lives at the top of SiteSidebar, so it stacks in a 16rem column. -->
  <header class="flex flex-col gap-2">
    <SiteBrand class="px-2 py-1.5" />
    <div class="flex items-center gap-2">
      <!-- bg overrides the outline variant's bg-background — tailwind-merge keeps the later one. -->
      <Button variant="outline" size="sm" class="flex-1 justify-start bg-transparent text-muted-foreground dark:bg-input/30" @click="show()">
        <Search class="size-4" />
        <span>Search tools…</span>
        <kbd class="ml-auto rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">⌘K</kbd>
        <span class="sr-only">Search tools</span>
      </Button>
      <SiteGithubButton />
    </div>
  </header>
</template>
