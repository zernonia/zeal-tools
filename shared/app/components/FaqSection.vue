<script setup lang="ts">
import { ChevronDown } from 'lucide-vue-next'
import {
  AccordionContent,
  AccordionHeader,
  AccordionItem,
  AccordionRoot,
  AccordionTrigger,
} from 'reka-ui'

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
    <h2 id="faq-heading" class="text-xl font-semibold">
      Frequently asked questions
    </h2>
    <!--
      unmount-on-hide=false keeps every answer in the DOM while collapsed, so
      the copy is crawlable without a click. Unlike force-mount it leaves reka's
      Presence in charge, which is what preserves the collapse animation.
    -->
    <AccordionRoot
      type="multiple"
      :unmount-on-hide="false"
      class="mt-4 divide-y divide-border"
    >
      <AccordionItem v-for="item in items" :key="item.q" :value="item.q">
        <AccordionHeader as="h3">
          <AccordionTrigger class="group flex w-full items-center justify-between gap-4 py-4 text-left font-medium transition-colors hover:text-primary">
            {{ item.q }}
            <ChevronDown class="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
          </AccordionTrigger>
        </AccordionHeader>
        <AccordionContent
          class="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down"
        >
          <p class="pb-4 text-sm leading-relaxed text-muted-foreground">
            {{ item.a }}
          </p>
        </AccordionContent>
      </AccordionItem>
    </AccordionRoot>
  </section>
</template>
