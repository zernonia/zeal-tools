<script setup lang="ts">
export interface FaqItem { q: string, a: string }
const props = defineProps<{ items: FaqItem[] }>()

// FAQPage structured data derives straight from the rendered content
useHead({
  script: [{
    type: 'application/ld+json',
    innerHTML: JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      'mainEntity': props.items.map(item => ({
        '@type': 'Question',
        'name': item.q,
        'acceptedAnswer': { '@type': 'Answer', 'text': item.a },
      })),
    }),
  }],
})
</script>

<template>
  <section aria-labelledby="faq-heading">
    <h2 id="faq-heading" class="text-xl font-semibold">Frequently asked questions</h2>
    <dl class="mt-4 divide-y divide-neutral-200 dark:divide-neutral-800">
      <div v-for="item in items" :key="item.q" class="py-4">
        <dt class="font-medium">{{ item.q }}</dt>
        <dd class="mt-1.5 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">{{ item.a }}</dd>
      </div>
    </dl>
  </section>
</template>
