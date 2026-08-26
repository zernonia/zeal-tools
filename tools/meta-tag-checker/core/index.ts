import type { Tag } from './parse'
import { scanHead } from './parse'

export type { Tag } from './parse'
export { decodeEntities, scanHead } from './parse'

/**
 * Meta tag checker — the pure part.
 *
 * Two jobs, and the second is the one worth getting right. Reading the tags is
 * bookkeeping. Working out what each platform will *show* is not: every one of
 * them has its own fallback chain, and a tool that renders one preview and
 * calls it "the" preview is guessing. Those chains live in `resolveCard` and
 * are individually tested, because they are the whole reason to trust the
 * pictures the tool draws.
 */

export interface HeadMeta {
  title: string | null
  description: string | null
  canonical: string | null
  robots: string | null
  lang: string | null
  charset: string | null
  viewport: string | null
  themeColor: string | null
  /** Keyed without the `og:` prefix — `title`, `image`, `site_name`. */
  og: Record<string, string>
  /** Keyed without the `twitter:` prefix. */
  twitter: Record<string, string>
  icons: string[]
  /** Raw JSON-LD bodies, in document order. */
  jsonLd: string[]
  alternates: { hreflang: string, href: string }[]
}

function empty(): HeadMeta {
  return {
    title: null,
    description: null,
    canonical: null,
    robots: null,
    lang: null,
    charset: null,
    viewport: null,
    themeColor: null,
    og: {},
    twitter: {},
    icons: [],
    jsonLd: [],
    alternates: [],
  }
}

const ICON_RELS = new Set(['icon', 'shortcut icon', 'apple-touch-icon', 'apple-touch-icon-precomposed', 'mask-icon'])

export function readMeta(html: string): HeadMeta {
  const { tags, title } = scanHead(String(html ?? ''))
  const meta = empty()
  meta.title = title

  for (const tag of tags) {
    if (tag.name === 'html')
      meta.lang ??= tag.attrs.lang ?? null

    if (tag.name === 'meta') {
      readMetaTag(meta, tag)
      continue
    }

    if (tag.name === 'link') {
      const rel = (tag.attrs.rel ?? '').toLowerCase().trim()
      const href = tag.attrs.href ?? ''
      if (!href)
        continue
      if (rel === 'canonical')
        meta.canonical ??= href
      else if (ICON_RELS.has(rel))
        meta.icons.push(href)
      else if (rel === 'alternate' && tag.attrs.hreflang)
        meta.alternates.push({ hreflang: tag.attrs.hreflang, href })
      continue
    }

    if (tag.name === 'script' && (tag.attrs.type ?? '').toLowerCase() === 'application/ld+json') {
      const body = (tag.attrs.__text ?? '').trim()
      if (body)
        meta.jsonLd.push(body)
    }
  }

  return meta
}

function readMetaTag(meta: HeadMeta, tag: Tag) {
  if (tag.attrs.charset !== undefined && tag.attrs.charset !== '') {
    meta.charset ??= tag.attrs.charset
    return
  }

  // `property` is Open Graph's spelling and `name` is HTML's, but plenty of
  // pages use the wrong one for the wrong family. Both are read either way,
  // because a crawler is lenient here and a checker that is not would report
  // a tag as missing when the platform can see it perfectly well.
  const key = (tag.attrs.property ?? tag.attrs.name ?? tag.attrs['http-equiv'] ?? '').toLowerCase().trim()
  const content = tag.attrs.content
  if (!key || content === undefined)
    return

  if (key.startsWith('og:')) {
    const short = key.slice(3)
    if (!(short in meta.og))
      meta.og[short] = content
    return
  }
  if (key.startsWith('twitter:')) {
    const short = key.slice(8)
    if (!(short in meta.twitter))
      meta.twitter[short] = content
    return
  }

  switch (key) {
    case 'description': meta.description ??= content; break
    case 'robots': meta.robots ??= content; break
    case 'viewport': meta.viewport ??= content; break
    case 'theme-color': meta.themeColor ??= content; break
    case 'content-type':
      if (!meta.charset) {
        const match = /charset=\s*([\w-]+)/i.exec(content)
        if (match)
          meta.charset = match[1]!
      }
      break
  }
}

// ─────────────────────────────────────────────────────────── platform cards

export type Platform = 'google' | 'x' | 'facebook' | 'linkedin' | 'slack'

export interface Card {
  title: string | null
  description: string | null
  image: string | null
  url: string | null
  siteName: string | null
  /** X only: `summary` or `summary_large_image`. */
  cardType: string | null
}

/**
 * What a given platform will actually render.
 *
 * The chains are not interchangeable, which is exactly why this is worth
 * testing rather than eyeballing:
 *
 * - **Google** reads `<title>` and `meta[description]` and ignores Open Graph
 *   entirely. A page with a perfect og:title and no `<title>` looks fine when
 *   shared and blank in search.
 * - **X** prefers its own `twitter:*` and falls back to Open Graph, so a page
 *   can show one thing on X and another everywhere else.
 * - **Facebook, LinkedIn and Slack** read Open Graph, but fall back to the
 *   plain title and description rather than showing nothing.
 */
export function resolveCard(meta: HeadMeta, platform: Platform): Card {
  const url = meta.og.url ?? meta.canonical ?? null
  const siteName = meta.og.site_name ?? null

  if (platform === 'google') {
    return {
      title: meta.title ?? null,
      description: meta.description ?? null,
      image: null,
      url: meta.canonical ?? meta.og.url ?? null,
      siteName,
      cardType: null,
    }
  }

  if (platform === 'x') {
    const image = meta.twitter.image ?? meta.og.image ?? null
    return {
      title: meta.twitter.title ?? meta.og.title ?? meta.title ?? null,
      description: meta.twitter.description ?? meta.og.description ?? meta.description ?? null,
      image,
      url,
      siteName,
      // X defaults to the small card when nothing is declared; a large image
      // only appears if the page asks for it by name.
      cardType: meta.twitter.card ?? (image ? 'summary' : 'summary'),
    }
  }

  return {
    title: meta.og.title ?? meta.title ?? null,
    description: meta.og.description ?? meta.description ?? null,
    image: meta.og.image ?? null,
    url,
    siteName,
    cardType: null,
  }
}

// ───────────────────────────────────────────────────────────────── the audit

export type Severity = 'error' | 'warning' | 'ok'

export interface Finding {
  id: string
  severity: Severity
  label: string
  message: string
  value?: string
}

/**
 * Lengths at which each field starts getting cut.
 *
 * Google truncates on pixel width rather than characters — about 600px — so
 * these are the conventional character proxies, and the tool says "around"
 * rather than pretending to a precision it does not have.
 */
export const TITLE_MIN = 30
export const TITLE_MAX = 60
export const DESC_MIN = 70
export const DESC_MAX = 160

/** True for `https://…`, `http://…` and protocol-relative `//…`. */
export function isAbsoluteUrl(value: string): boolean {
  return /^(?:https?:)?\/\//i.test(value.trim())
}

export function audit(meta: HeadMeta): Finding[] {
  const out: Finding[] = []
  const add = (id: string, severity: Severity, label: string, message: string, value?: string) =>
    out.push({ id, severity, label, message, value })

  // ── the one that silently costs you everything ──
  const robots = (meta.robots ?? '').toLowerCase()
  if (robots.includes('noindex'))
    add('robots-noindex', 'error', 'Robots', 'This page asks search engines not to index it. If that is not deliberate, nothing else here matters.', meta.robots!)
  else if (robots.includes('nofollow'))
    add('robots-nofollow', 'warning', 'Robots', 'Links on this page are marked nofollow.', meta.robots!)

  const title = meta.title?.trim() ?? ''
  if (!title)
    add('title', 'error', 'Title', 'No <title>. This is the headline in every search result and most link previews.')
  else if (title.length > TITLE_MAX)
    add('title', 'warning', 'Title', `${title.length} characters — Google usually cuts around ${TITLE_MAX}.`, title)
  else if (title.length < TITLE_MIN)
    add('title', 'warning', 'Title', `${title.length} characters — short enough that you are leaving room unused.`, title)
  else
    add('title', 'ok', 'Title', `${title.length} characters.`, title)

  const desc = meta.description?.trim() ?? ''
  if (!desc)
    add('description', 'error', 'Description', 'No meta description. Search engines will invent one from the page text.')
  else if (desc.length > DESC_MAX)
    add('description', 'warning', 'Description', `${desc.length} characters — usually cut around ${DESC_MAX}.`, desc)
  else if (desc.length < DESC_MIN)
    add('description', 'warning', 'Description', `${desc.length} characters — there is room for more.`, desc)
  else
    add('description', 'ok', 'Description', `${desc.length} characters.`, desc)

  if (!meta.canonical)
    add('canonical', 'warning', 'Canonical', 'No canonical URL. Without one, the same page reachable at two URLs can split its ranking.')
  else if (!isAbsoluteUrl(meta.canonical))
    add('canonical', 'error', 'Canonical', 'The canonical URL is relative. It has to be absolute to mean anything.', meta.canonical)
  else
    add('canonical', 'ok', 'Canonical', meta.canonical, meta.canonical)

  // ── social ──
  for (const [key, label] of [['title', 'og:title'], ['description', 'og:description'], ['image', 'og:image']] as const) {
    if (!meta.og[key])
      add(`og-${key}`, 'warning', label, `Missing. Shared links fall back to the page ${key === 'image' ? 'having no image at all' : key}.`)
  }
  if (meta.og.image && !isAbsoluteUrl(meta.og.image))
    add('og-image-relative', 'error', 'og:image', 'The image URL is relative. Crawlers fetch it without your page as context, so it must be absolute.', meta.og.image)
  if (!meta.og.url)
    add('og-url', 'warning', 'og:url', 'Missing. Shares of the same page with different query strings will not be counted together.')
  if (!meta.og.type)
    add('og-type', 'warning', 'og:type', 'Missing. Defaults to `website`, which is usually what you want — declare it anyway.')

  const card = meta.twitter.card
  if (!card && meta.og.image)
    add('twitter-card', 'warning', 'twitter:card', 'Missing, so X shows the small square card. Set `summary_large_image` to use the whole image.')
  else if (card && card !== 'summary' && card !== 'summary_large_image' && card !== 'player' && card !== 'app')
    add('twitter-card', 'warning', 'twitter:card', `"${card}" is not a card type X recognises.`, card)

  // ── the basics that break mobile and encoding ──
  if (!meta.viewport)
    add('viewport', 'error', 'Viewport', 'No viewport meta. Mobile browsers will render this at desktop width and zoom out.')
  if (!meta.charset)
    add('charset', 'warning', 'Charset', 'No charset declared. Browsers will guess, and get it wrong for anything non-ASCII.')
  if (!meta.lang)
    add('lang', 'warning', 'Language', 'No lang attribute on <html>. Screen readers use it to pick a voice.')
  if (meta.icons.length === 0)
    add('icon', 'warning', 'Favicon', 'No icon link found.')

  return out
}

export const countBy = (findings: Finding[], severity: Severity) => findings.filter(f => f.severity === severity).length

// ─────────────────────────────────────────────────────────── tag generation

export interface TagInput {
  title?: string
  description?: string
  url?: string
  image?: string
  siteName?: string
  type?: string
  largeImage?: boolean
}

function escapeAttr(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

/** Copy-ready tags. Emits only what it was given, never empty placeholders. */
export function buildTags(input: TagInput): string {
  const lines: string[] = []
  const push = (tag: string) => lines.push(tag)
  const { title, description, url, image, siteName, type = 'website', largeImage = true } = input

  if (title) {
    push(`<title>${escapeAttr(title)}</title>`)
    push(`<meta property="og:title" content="${escapeAttr(title)}">`)
  }
  if (description) {
    push(`<meta name="description" content="${escapeAttr(description)}">`)
    push(`<meta property="og:description" content="${escapeAttr(description)}">`)
  }
  if (url) {
    push(`<link rel="canonical" href="${escapeAttr(url)}">`)
    push(`<meta property="og:url" content="${escapeAttr(url)}">`)
  }
  push(`<meta property="og:type" content="${escapeAttr(type)}">`)
  if (siteName)
    push(`<meta property="og:site_name" content="${escapeAttr(siteName)}">`)
  if (image) {
    push(`<meta property="og:image" content="${escapeAttr(image)}">`)
    push(`<meta name="twitter:image" content="${escapeAttr(image)}">`)
  }
  push(`<meta name="twitter:card" content="${image && largeImage ? 'summary_large_image' : 'summary'}">`)
  return lines.join('\n')
}
