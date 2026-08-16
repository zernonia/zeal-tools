<script setup lang="ts">
const { message, reading } = useStageTimer('stage')

// The stage screen is a display, not a document — keep it out of search results
// and give it no chrome.
useSeoMeta({ title: 'Stage view — Stage Timer', robots: 'noindex' })
definePageMeta({ layout: false })
</script>

<template>
  <div class="flex min-h-screen flex-col items-center justify-center bg-background p-6 text-foreground">
    <StageTimerDisplay :reading="reading" :message="message" stage />
    <p class="mt-8 text-center text-sm text-muted-foreground">
      Stage view — controlled from the presenter window.
    </p>
  </div>
</template>
