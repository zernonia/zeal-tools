import type { ToolMeta } from '../../shared/registry/types'

const meta: ToolMeta = {
  slug: 'meta-tag-checker',
  name: 'Meta Tag Checker',
  tagline: 'See what your page looks like on Google, X, Facebook, LinkedIn and Slack.',
  description:
    'Check a page\'s meta tags and preview the link card exactly as each platform builds it — every one of '
    + 'them uses a different fallback chain. Reports missing tags, lengths that will be truncated and '
    + 'relative image URLs, and generates the tags you are missing. Free, no sign-up.',
  category: 'Web',
  keywords: [
    'meta tag checker',
    'meta tags',
    'open graph checker',
    'og tag checker',
    'og image preview',
    'twitter card validator',
    'social share preview',
    'link preview tester',
    'seo meta checker',
    'og:image tester',
    'meta description length',
    'title tag length',
  ],
  addedAt: '2026-08-26',
  api: true,
  apiPath: 'meta',
  mcp: true,
  variants: ['open-graph', 'twitter-card'],
  shareCopy:
    'Free meta tag checker — see your link exactly as Google, X, Facebook, LinkedIn and Slack will draw it. '
    + 'Each builds its card differently. No sign-up, open source.',
  icon: '🔖',
}

export default meta
