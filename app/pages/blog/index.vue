<script setup lang="ts">
import { posts } from '#registry/posts'

const { public: { siteUrl } } = useRuntimeConfig()

useSeoMeta({
  title: 'Blog — Free Tool Roundups for Teams, Teachers and Makers',
  description: 'Roundups and guides from zeal.tools: free tools for worship teams, teachers and website launches, and how to edit photos without uploading them. No sign-up, ever.',
  ogTitle: 'The zeal.tools blog',
  ogDescription: 'Guides to the jobs our free tools do, and how they do them without uploading your files.',
  ogUrl: `${siteUrl}/blog`,
  twitterCard: 'summary_large_image',
})

defineOgImage('Default', { title: 'The zeal.tools blog', description: 'Guides to the jobs our free tools do — and how they do them in your browser.' })

useHead({
  script: [{
    type: 'application/ld+json',
    innerHTML: JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Blog',
      'name': 'The zeal.tools blog',
      'url': `${siteUrl}/blog`,
      'blogPost': posts.map(post => ({
        '@type': 'BlogPosting',
        'headline': post.title,
        'url': `${siteUrl}/blog/${post.slug}`,
        'datePublished': post.publishedAt,
      })),
    }),
  }],
})

function formatDate(iso: string) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
}
</script>

<template>
  <div class="container-page py-10">
    <div class="mx-auto max-w-2xl">
      <header class="mb-10">
        <h1 class="font-heading text-3xl sm:text-4xl">
          Blog
        </h1>
        <p class="mt-2 text-lg text-muted-foreground">
          Guides to the jobs these tools do, and notes on how they do them without your files leaving your device.
        </p>
      </header>

      <ul class="divide-y divide-border">
        <li v-for="post in posts" :key="post.slug">
          <NuxtLink :to="`/blog/${post.slug}`" class="group grid gap-4 py-6 sm:grid-cols-[11rem_minmax(0,1fr)] sm:gap-6">
            <BlogCover :tools="post.tools" size="sm" class="transition-colors group-hover:border-primary/40" />
            <div>
              <h2 class="text-lg font-semibold group-hover:text-primary group-hover:underline">
                {{ post.title }}
              </h2>
              <p class="mt-2 text-sm leading-relaxed text-muted-foreground">
                {{ post.description }}
              </p>
              <p class="mt-2 text-xs text-muted-foreground">
                <time :datetime="post.publishedAt">{{ formatDate(post.publishedAt) }}</time> · {{ post.minutes }} min read
              </p>
            </div>
          </NuxtLink>
        </li>
      </ul>
    </div>
  </div>
</template>
