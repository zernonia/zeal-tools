<script setup lang="ts">
import { Monitor, Moon, Sun } from 'lucide-vue-next'

const { mode, cycle } = useColorMode()

const icon = computed(() => (mode.value === 'light' ? Sun : mode.value === 'dark' ? Moon : Monitor))
const label = computed(() => `Theme: ${mode.value}. Click to switch.`)

// Rendered client-only: the server can't know the stored preference, so an
// SSR'd icon would hydrate to the wrong one. The fallback holds the same
// footprint to avoid a layout shift.
</script>

<template>
  <ClientOnly>
    <Button
      variant="outline"
      size="icon"
      :aria-label="label"
      :title="label"
      class="shrink-0 text-muted-foreground"
      @click="cycle()"
    >
      <component :is="icon" class="size-4" />
    </Button>
    <template #fallback>
      <div class="size-9 shrink-0" aria-hidden="true" />
    </template>
  </ClientOnly>
</template>
