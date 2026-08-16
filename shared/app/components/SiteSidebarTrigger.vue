<script setup lang="ts">
import { PanelLeft } from 'lucide-vue-next'

const { toggle } = useSidebar()
</script>

<template>
  <Button
    variant="ghost"
    size="icon"
    class="shrink-0 text-muted-foreground lg:hidden"
    aria-label="Open navigation"
    @click="toggle()"
  >
    <PanelLeft class="size-4" />
  </Button>
</template>
