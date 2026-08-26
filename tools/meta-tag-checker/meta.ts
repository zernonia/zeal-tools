import type { ToolMeta } from '../../shared/registry/types'

const meta: ToolMeta = {
  slug: 'meta-tag-checker',
  name: 'Meta Tag Checker',
  tagline: 'See what your page looks like on Google, X, Facebook, LinkedIn and Slack.',
  description:
    'Check a page\'s meta tags and preview the link card exactly as each platform builds it — every one of '
    + 'them uses a different fallback chain. Paste your HTML and nothing leaves your browser, or check a '
    + 'live URL. Reports missing tags, lengths that will be truncated, and generates the tags you are missing.',
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
    + 'Paste your HTML and it never leaves your browser. No sign-up, open source.',
  icon: '🔖',
}

export default meta
