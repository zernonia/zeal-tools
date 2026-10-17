import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { registry } from './index'
import { posts } from './posts'

/**
 * The sitemap, llms.txt and the blog index advertise whatever these lists
 * say, so a list entry without a page is a published 404, and a page without
 * an entry is one nothing links to. Both directions are checked on disk.
 */

const blogDir = fileURLToPath(new URL('../../app/pages/blog', import.meta.url))
const toolsDir = fileURLToPath(new URL('../../tools', import.meta.url))

describe('blog posts', () => {
  const pages = readdirSync(blogDir).filter(file => file.endsWith('.vue') && file !== 'index.vue').map(file => file.slice(0, -4))

  it('has a page for every post and a post for every page', () => {
    expect(pages.sort()).toEqual(posts.map(post => post.slug).sort())
  })

  for (const post of posts) {
    it(`${post.slug}: the page renders its own entry`, () => {
      const source = readFileSync(`${blogDir}/${post.slug}.vue`, 'utf8')
      expect(source).toContain(`<BlogArticle slug="${post.slug}">`)
    })

    it(`${post.slug}: links only to tools that exist`, () => {
      for (const slug of post.tools)
        expect(registry.some(tool => tool.slug === slug), slug).toBe(true)
    })

    it(`${post.slug}: has a description a search result will not truncate badly`, () => {
      expect(post.description.length).toBeLessThanOrEqual(220)
    })
  }

  it('has unique slugs', () => {
    expect(new Set(posts.map(post => post.slug)).size).toBe(posts.length)
  })
})

describe('tool variants', () => {
  for (const tool of registry) {
    for (const variant of tool.variants ?? []) {
      it(`${tool.slug}/${variant} has a page`, () => {
        expect(existsSync(`${toolsDir}/${tool.slug}/app/pages/tools/${tool.slug}/${variant}.vue`)).toBe(true)
      })
    }
  }
})
