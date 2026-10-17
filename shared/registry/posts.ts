/**
 * The blog: long-form guides that answer the questions people search before
 * they reach for a tool. Like the tool registry, this list is the only way a
 * post exists — the blog index, sitemap, llms.txt and breadcrumbs all read it,
 * and `posts.test.ts` checks it against the pages on disk in both directions.
 *
 * The prose lives in `app/pages/blog/<slug>.vue`, wrapped in `BlogArticle`,
 * which reads its title and dates from here so they cannot drift apart.
 */
export interface Post {
  slug: string
  /** The h1 and the <title>. */
  title: string
  /** Meta description, the index card's summary and the social card. */
  description: string
  /** ISO dates. `updatedAt` only when the content materially changed. */
  publishedAt: string
  updatedAt?: string
  /** Rough reading time, shown on the index and the article. */
  minutes: number
  /** Tool slugs the post is about, in order — the cover's icons and the "try it" links. */
  tools: string[]
}

export const posts: Post[] = []

export function getPost(slug: string): Post | undefined {
  return posts.find(post => post.slug === slug)
}
