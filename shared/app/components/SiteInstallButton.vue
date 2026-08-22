<script setup lang="ts">
import { Download } from 'lucide-vue-next'

/**
 * Lives in the header rather than the sidebar, because the sidebar is
 * deliberately collapsed to zero width and inert on the homepage — which is
 * both the page most people land on and the one where installing makes most
 * sense.
 *
 * Renders nothing at all unless the browser has volunteered a prompt, so
 * Safari and iOS never see a control that cannot do anything. iOS installs
 * through Share → Add to Home Screen, which no page can trigger or detect.
 */
const { available, install } = useInstall()
</script>

<template>
  <Button
    v-if="available"
    variant="outline"
    size="icon"
    aria-label="Install zeal.tools as an app"
    class="shrink-0 text-muted-foreground"
    @click="install()"
  >
    <Download class="size-4" aria-hidden="true" />
  </Button>
</template>
