<script setup lang="ts">
const props = defineProps<{ code: string, lang: CodeLang }>()

const { data: html } = await useAsyncData(
  codeKey(props.code, props.lang),
  () => highlightCode(props.code, props.lang),
  { default: () => '' },
)
</script>

<template>
  <div
    class="mt-4 overflow-x-auto rounded-lg border border-border bg-muted p-4 text-xs leading-relaxed"
    v-html="html"
  />
</template>
