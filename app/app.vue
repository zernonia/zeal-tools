<script setup lang="ts">
useHead({
  titleTemplate: title => (title ? `${title} · zeal.tools` : 'zeal.tools — Free tools, made with zeal.'),
})
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
