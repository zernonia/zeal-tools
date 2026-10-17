<script setup lang="ts">
import { getTool } from '#registry'

const props = defineProps<{
  slug: string
  /** A variant page to link to instead of the tool's own, e.g. `/tools/name-picker/classroom`. */
  to?: string
}>()

const tool = getTool(props.slug)
if (!tool)
  throw createError({ statusCode: 500, statusMessage: `BlogToolCard: no tool named ${props.slug}` })

const href = props.to ?? `/tools/${props.slug}`
</script>

<template>
  <!--
    Screenshots come from scripts/capture-tool-screenshots.mjs, one per theme.
    Both are in the page and CSS shows one, because dark mode is a class on
    <html>, which a <picture> media query cannot see. The hidden one is
    display:none, so it is neither fetched eagerly nor read out.

    A fixed aspect ratio rather than per-image dimensions: every card is the
    same shape whatever height the tool happened to be, and the space is
    reserved before the lazy image arrives, so nothing shifts.
  -->
  <figure class="blog-card overflow-hidden rounded-2xl border bg-card shadow-sm">
    <NuxtLink :to="href" tabindex="-1" aria-hidden="true" class="block aspect-[16/10] overflow-hidden border-b bg-muted">
      <img
        :src="`/blog/tools/${slug}-light.jpg`"
        alt=""
        width="982"
        height="614"
        loading="lazy"
        decoding="async"
        class="size-full object-cover object-top dark:hidden"
      >
      <img
        :src="`/blog/tools/${slug}-dark.jpg`"
        alt=""
        width="982"
        height="614"
        loading="lazy"
        decoding="async"
        class="hidden size-full object-cover object-top dark:block"
      >
    </NuxtLink>
    <figcaption class="flex flex-wrap items-center gap-x-4 gap-y-3 p-4">
      <span class="grid size-10 shrink-0 place-items-center rounded-xl border bg-muted/50" aria-hidden="true">
        <SiteToolIcon :slug="slug" class="size-5" />
      </span>
      <span class="min-w-0 flex-1 basis-48">
        <span class="block font-medium text-foreground">{{ tool!.name }}</span>
        <span class="block text-sm text-muted-foreground">{{ tool!.tagline }}</span>
      </span>
      <Button as-child variant="outline" class="min-h-11">
        <NuxtLink :to="href">
          Open {{ tool!.name.toLowerCase() }} →
        </NuxtLink>
      </Button>
    </figcaption>
  </figure>
</template>
