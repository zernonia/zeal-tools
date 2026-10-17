<script setup lang="ts">
import { getPost, posts } from '#registry/posts'

const props = defineProps<{ slug: string }>()

const post = getPost(props.slug)
if (!post)
  throw createError({ statusCode: 404, statusMessage: `No post named ${props.slug}` })

const { public: { siteUrl } } = useRuntimeConfig()
const pageUrl = `${siteUrl}/blog/${post.slug}`

useSeoMeta({
  title: post.title,
  description: post.description,
  ogTitle: post.title,
  ogDescription: post.description,
  ogUrl: pageUrl,
  ogType: 'article',
  articlePublishedTime: post.publishedAt,
  articleModifiedTime: post.updatedAt ?? post.publishedAt,
  twitterCard: 'summary_large_image',
})

defineOgImage('Default', { title: post.title, description: post.description })

useHead({
  script: [{
    type: 'application/ld+json',
    innerHTML: JSON.stringify({
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'BlogPosting',
          'headline': post.title,
          'description': post.description,
          'url': pageUrl,
          'mainEntityOfPage': pageUrl,
          'datePublished': post.publishedAt,
          'dateModified': post.updatedAt ?? post.publishedAt,
          'author': { '@type': 'Person', 'name': 'zernonia', 'url': 'https://github.com/zernonia' },
          'publisher': { '@type': 'Organization', 'name': 'zeal.tools', 'url': siteUrl, 'logo': `${siteUrl}/icon-512.png` },
        },
        {
          '@type': 'BreadcrumbList',
          'itemListElement': [
            { '@type': 'ListItem', 'position': 1, 'name': 'zeal.tools', 'item': siteUrl },
            { '@type': 'ListItem', 'position': 2, 'name': 'Blog', 'item': `${siteUrl}/blog` },
            { '@type': 'ListItem', 'position': 3, 'name': post.title, 'item': pageUrl },
          ],
        },
      ],
    }),
  }],
})

const more = posts.filter(other => other.slug !== post.slug).slice(0, 3)

/** Formatted in UTC, so the prerendered date is the same wherever it was built. */
function formatDate(iso: string) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
}
</script>

<template>
  <div class="container-page py-10">
    <article class="mx-auto max-w-2xl">
      <header class="mb-10">
        <NuxtLink to="/blog" class="text-sm text-muted-foreground transition-colors hover:text-foreground">
          ← Blog
        </NuxtLink>
        <h1 class="mt-4 font-heading text-3xl sm:text-4xl">
          {{ post!.title }}
        </h1>
        <p class="mt-4 text-lg text-muted-foreground">
          {{ post!.description }}
        </p>
        <p class="mt-4 text-sm text-muted-foreground">
          <time :datetime="post!.publishedAt">{{ formatDate(post!.publishedAt) }}</time>
          · {{ post!.minutes }} min read · by
          <a href="https://github.com/zernonia" target="_blank" rel="noopener noreferrer" class="underline-offset-4 hover:text-foreground hover:underline">zernonia</a>
        </p>
        <BlogCover :tools="post!.tools" class="mt-8" />
      </header>

      <div class="article">
        <slot />
      </div>
    </article>

    <nav v-if="more.length" class="mx-auto mt-16 max-w-2xl" aria-labelledby="more-heading">
      <h2 id="more-heading" class="text-sm font-medium uppercase tracking-wide text-muted-foreground">
        More from the blog
      </h2>
      <ul class="mt-4 grid gap-6 sm:grid-cols-3">
        <li v-for="other in more" :key="other.slug">
          <NuxtLink :to="`/blog/${other.slug}`" class="group block">
            <BlogCover :tools="other.tools" size="sm" class="transition-colors group-hover:border-primary/40" />
            <span class="mt-3 block font-medium group-hover:text-primary group-hover:underline">{{ other.title }}</span>
            <span class="mt-1 block text-sm text-muted-foreground">{{ other.minutes }} min read</span>
          </NuxtLink>
        </li>
      </ul>
    </nav>
  </div>
</template>
