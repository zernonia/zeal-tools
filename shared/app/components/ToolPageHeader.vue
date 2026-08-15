<script setup lang="ts">
defineProps<{ title: string, description: string }>()
</script>

<template>
  <header class="mb-8 max-w-2xl">
    <h1 class="text-3xl font-bold tracking-tight sm:text-4xl">
      {{ title }}
    </h1>
    <p class="mt-2 text-lg text-muted-foreground">
      {{ description }}
    </p>
  </header>
</template>
