/**
 * Reading a post on X without an account.
 *
 * The data comes from the endpoint X built for embedded posts — the one every
 * "embed this post" card on the web calls, needing no login and no API key.
 * Its response is a loose, embed-shaped object; everything here turns it into
 * one predictable shape that the page, the REST route and MCP all share, so
 * the quirks are handled once:
 *
 * - Text arrives with `t.co` short links and a trailing link to the post's own
 *   media. Links are expanded, the media link is cut, and the reply-to
 *   mentions X hides in its own UI are cut too, all via `display_text_range`.
 * - The units are inconsistent, and measured: in this endpoint's responses
 *   `display_text_range` counts UTF-16 units while entity `indices` count
 *   code points — a post ending in 🇺🇸🚀 has a range of 93 and a media link
 *   at 91–114 in a 117-unit string. So the range is sliced as UTF-16, and
 *   links are replaced by matching their text, never by index.
 * - Video comes as several MP4 renditions plus an HLS playlist. Only MP4 can
 *   be saved as a file, so the playlist is dropped and the rest sorted.
 * - Photos are served downsized unless `name=orig` is asked for.
 */

export interface PostRef { id: string }

export interface VideoRendition {
  url: string
  /** Bits per second; 0 for a GIF, which X stores as a single silent MP4. */
  bitrate: number
  width?: number
  height?: number
}

export interface PostMedia {
  type: 'photo' | 'video' | 'gif'
  /** Full-size photo, or the poster frame for a video. */
  url: string
  width: number
  height: number
  /** MP4 renditions, best first. Empty for photos. */
  renditions: VideoRendition[]
  durationMs?: number
  /** Alternative text, if the author wrote any. */
  alt?: string
}

export interface PostAuthor {
  name: string
  handle: string
  avatar: string
  verified: boolean
  /**
   * Which check X draws: blue for a subscriber, grey for a government or
   * multilateral account, gold for a verified organisation. `null` when there
   * is none. Organisations also get a square avatar rather than a round one.
   */
  badge: 'blue' | 'government' | 'business' | null
  avatarShape: 'circle' | 'square'
}

export interface Post {
  id: string
  url: string
  author: PostAuthor
  text: string
  /** True when X gave us the first 280 characters of a longer post. */
  truncated: boolean
  createdAt: string
  lang?: string
  likes: number
  replies: number
  sensitive: boolean
  media: PostMedia[]
  /** The post this one replies to, when it is a reply. */
  replyTo?: { handle: string, id: string }
  quoted?: Post
}

/** Hosts a post link can come from, including the popular embed fixers. */
const POST_HOSTS = new Set([
  'x.com',
  'twitter.com',
  'mobile.twitter.com',
  'mobile.x.com',
  'fxtwitter.com',
  'vxtwitter.com',
  'fixupx.com',
  'fixvx.com',
  'nitter.net',
])

/** Post IDs are snowflakes: up to 19 digits, never zero. */
const ID = /^[1-9]\d{0,18}$/

/**
 * Pull a post ID out of whatever was pasted: a full link from any of the
 * hosts above, with or without `www.`, a scheme, a query string or a
 * `/photo/1` suffix — or a bare ID.
 */
export function parsePostRef(input: string): PostRef | { error: string } {
  const value = input.trim()
  if (!value)
    return { error: 'Paste a link to a post on X.' }
  if (ID.test(value))
    return { id: value }

  let url: URL
  try {
    url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`)
  }
  catch {
    return { error: 'That does not look like a link.' }
  }

  const host = url.hostname.toLowerCase().replace(/^www\./, '')
  if (!POST_HOSTS.has(host))
    return { error: 'That link is not on X. Paste a link that looks like x.com/name/status/123…' }

  // /name/status/123, /i/web/status/123, /i/status/123 — and the older
  // /name/statuses/123.
  const parts = url.pathname.split('/').filter(Boolean)
  const marker = parts.findIndex(part => part === 'status' || part === 'statuses')
  const id = marker === -1 ? undefined : parts[marker + 1]
  if (!id || !ID.test(id))
    return { error: 'That link is to X but not to a post. Open the post itself and copy its link.' }
  return { id }
}

/**
 * The token the embed endpoint expects beside the ID. It is not a secret —
 * every embedded post on the web computes it in the browser, and this is the
 * same arithmetic. Precision is lost converting a 19-digit ID to a double,
 * and that is deliberate: X computes it the same lossy way.
 */
export function syndicationToken(id: string): string {
  return ((Number(id) / 1e15) * Math.PI).toString(6 ** 2).replace(/(0+|\.)/g, '')
}

export function syndicationUrl(id: string): string {
  return `https://cdn.syndication.twimg.com/tweet-result?id=${id}&token=${syndicationToken(id)}&lang=en`
}

/* ── Normalising ───────────────────────────────────────────────────────── */

type Raw = Record<string, any>

const ENTITIES: Record<string, string> = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': '\'' }

function decodeEntities(text: string): string {
  return text.replace(/&(?:amp|lt|gt|quot|#39);/g, match => ENTITIES[match] ?? match)
}

/**
 * The visible text: the part inside `display_text_range`, with every short
 * link replaced by where it really goes. Media links fall outside the range,
 * so they disappear without a special case.
 */
export function postText(raw: Raw): string {
  const full = String(raw.text ?? '')
  const [start, end] = Array.isArray(raw.display_text_range) ? raw.display_text_range : [0, full.length]
  let text = full.slice(start, end)

  for (const link of raw.entities?.urls ?? []) {
    if (link?.url && link?.expanded_url)
      text = text.split(link.url).join(link.expanded_url)
  }
  for (const media of raw.entities?.media ?? []) {
    if (media?.url)
      text = text.split(media.url).join('')
  }
  return decodeEntities(text).trim()
}

/** Width and height from a rendition URL such as `/vid/avc1/720x1280/…mp4`. */
function dimensions(url: string): { width?: number, height?: number } {
  const match = /\/(\d{2,5})x(\d{2,5})\//.exec(url)
  return match ? { width: Number(match[1]), height: Number(match[2]) } : {}
}

/**
 * The full-size photo URL. X serves a downsized copy at the plain URL;
 * `name=orig` returns the file as uploaded.
 */
export function originalPhotoUrl(url: string): string {
  const match = /^(https:\/\/pbs\.twimg\.com\/media\/[\w-]+)\.(jpg|jpeg|png|webp)(?:\?.*)?$/i.exec(url)
  if (!match)
    return url
  return `${match[1]}?format=${match[2]!.toLowerCase()}&name=orig`
}

function normaliseMedia(item: Raw): PostMedia | null {
  const type = item.type === 'photo' ? 'photo' : item.type === 'video' ? 'video' : item.type === 'animated_gif' ? 'gif' : null
  if (!type || typeof item.media_url_https !== 'string')
    return null

  const renditions: VideoRendition[] = type === 'photo'
    ? []
    : (item.video_info?.variants ?? [])
        .filter((variant: Raw) => variant?.content_type === 'video/mp4' && typeof variant.url === 'string')
        .map((variant: Raw) => ({ url: variant.url as string, bitrate: Number(variant.bitrate) || 0, ...dimensions(variant.url) }))
        .sort((a: VideoRendition, b: VideoRendition) => b.bitrate - a.bitrate)

  // A video with nothing downloadable is not worth offering as one.
  if (type !== 'photo' && renditions.length === 0)
    return null

  return {
    type,
    url: type === 'photo' ? originalPhotoUrl(item.media_url_https) : item.media_url_https,
    width: Number(item.original_info?.width) || 0,
    height: Number(item.original_info?.height) || 0,
    renditions,
    ...(item.video_info?.duration_millis ? { durationMs: Number(item.video_info.duration_millis) } : {}),
    ...(typeof item.ext_alt_text === 'string' && item.ext_alt_text ? { alt: item.ext_alt_text } : {}),
  }
}

function badge(user: Raw): PostAuthor['badge'] {
  if (user.verified_type === 'Government')
    return 'government'
  if (user.verified_type === 'Business')
    return 'business'
  return user.is_blue_verified || user.verified ? 'blue' : null
}

/** X's small avatar is 48px; `_bigger` is 73px, enough for a 2x display. */
function avatar(url: unknown): string {
  return typeof url === 'string' ? url.replace('_normal.', '_bigger.') : ''
}

export type FetchFailure = 'not-found' | 'unavailable' | 'rate-limited' | 'upstream'

export class PostError extends Error {
  constructor(readonly kind: FetchFailure, message: string) {
    super(message)
  }
}

/**
 * Turn an embed response into a `Post`, or throw a `PostError` with a message
 * fit to show a person. `depth` stops at one quoted post, as X does.
 */
export function normalisePost(raw: Raw, depth = 0): Post {
  if (raw?.__typename === 'TweetTombstone') {
    const reason = raw.tombstone?.text?.text
    throw new PostError('unavailable', typeof reason === 'string' && reason
      ? `${reason.replace(/\s*Learn more\.?$/, '')} X does not show it to people who are not logged in — it may be age-restricted, or from a protected or suspended account.`
      : 'X does not show this post to people who are not logged in.')
  }
  if (!raw || typeof raw.id_str !== 'string' || !raw.user?.screen_name)
    throw new PostError('upstream', 'X sent back something that is not a post.')

  const handle = String(raw.user.screen_name)
  const post: Post = {
    id: raw.id_str,
    url: `https://x.com/${handle}/status/${raw.id_str}`,
    author: {
      name: String(raw.user.name ?? handle),
      handle,
      avatar: avatar(raw.user.profile_image_url_https),
      verified: Boolean(raw.user.is_blue_verified || raw.user.verified || raw.user.verified_type),
      badge: badge(raw.user),
      avatarShape: raw.user.profile_image_shape === 'Square' ? 'square' : 'circle',
    },
    text: postText(raw),
    truncated: Boolean(raw.note_tweet),
    createdAt: String(raw.created_at ?? ''),
    likes: Number(raw.favorite_count) || 0,
    replies: Number(raw.conversation_count ?? raw.reply_count) || 0,
    sensitive: Boolean(raw.possibly_sensitive),
    media: (raw.mediaDetails ?? []).map(normaliseMedia).filter((m: PostMedia | null): m is PostMedia => m !== null),
  }
  if (typeof raw.lang === 'string' && raw.lang !== 'und' && raw.lang !== 'zxx')
    post.lang = raw.lang
  if (raw.in_reply_to_status_id_str && raw.in_reply_to_screen_name)
    post.replyTo = { handle: String(raw.in_reply_to_screen_name), id: String(raw.in_reply_to_status_id_str) }
  if (depth === 0 && raw.quoted_tweet) {
    try {
      post.quoted = normalisePost(raw.quoted_tweet, depth + 1)
    }
    catch {
      // A quoted post that is itself unavailable leaves the outer one intact.
    }
  }
  return post
}

/* ── Output ────────────────────────────────────────────────────────────── */

function extension(media: PostMedia): string {
  if (media.type !== 'photo')
    return 'mp4'
  const match = /format=(\w+)/.exec(media.url) ?? /\.(jpg|jpeg|png|webp)(?:\?|$)/i.exec(media.url)
  const ext = match?.[1]?.toLowerCase() ?? 'jpg'
  return ext === 'jpeg' ? 'jpg' : ext
}

/**
 * `NASA-2119833829389041896.mp4`, or `…-2.jpg` for the second of several —
 * names that sort together and say where they came from.
 */
export function mediaFilename(post: Post, index: number): string {
  const media = post.media[index]
  const suffix = post.media.length > 1 ? `-${index + 1}` : ''
  const safeHandle = post.author.handle.replace(/\W/g, '')
  return `${safeHandle}-${post.id}${suffix}.${media ? extension(media) : 'bin'}`
}

/** "720p · 2.2 Mbps" — what a person picks a rendition by. */
export function renditionLabel(rendition: VideoRendition): string {
  const short = rendition.width && rendition.height ? Math.min(rendition.width, rendition.height) : undefined
  const parts = [short ? `${short}p` : 'MP4']
  if (rendition.bitrate)
    parts.push(rendition.bitrate >= 1_000_000 ? `${(rendition.bitrate / 1_000_000).toFixed(1)} Mbps` : `${Math.round(rendition.bitrate / 1000)} kbps`)
  return parts.join(' · ')
}

/**
 * The post as Markdown — what an agent reading it over MCP wants, and what
 * "Copy as text" puts on the clipboard.
 */
export function postMarkdown(post: Post): string {
  const lines = [`**${post.author.name}** (@${post.author.handle}) · ${post.createdAt.slice(0, 10)}`]
  if (post.replyTo)
    lines.push(`Replying to @${post.replyTo.handle}`)
  lines.push('', post.text || '(no text)')
  if (post.truncated)
    lines.push('', `_This is the first part of a longer post. The rest is at ${post.url}_`)
  if (post.media.length)
    lines.push('')
  post.media.forEach((media, index) => {
    const best = media.renditions[0]
    const label = media.type === 'photo' ? 'Photo' : media.type === 'gif' ? 'GIF' : 'Video'
    lines.push(`- ${label} ${index + 1}: ${best ? best.url : media.url}${media.alt ? ` — ${media.alt}` : ''}`)
  })
  if (post.quoted)
    lines.push('', 'Quoting:', ...postMarkdown(post.quoted).split('\n').map(line => `> ${line}`))
  lines.push('', post.url)
  return lines.join('\n')
}

/* ── Display ───────────────────────────────────────────────────────────── */

export type TextToken
  = | { type: 'text', text: string }
    | { type: 'link' | 'mention' | 'hashtag', text: string, href: string }

/**
 * A link as X prints it: no scheme, no `www.`, cut at 25 characters with an
 * ellipsis. The href keeps the full address.
 */
export function displayUrl(url: string): string {
  const bare = url.replace(/^https?:\/\//, '').replace(/^www\./, '')
  return bare.length > 26 ? `${bare.slice(0, 25)}…` : bare
}

const TOKEN = /https?:\/\/\S+|@\w{1,15}|#[\p{L}\p{N}_]+/gu

/**
 * Split post text into plain runs and the parts X colours: links, @mentions
 * and #hashtags. A single pass with no nested quantifiers, so it cannot
 * backtrack on a hostile post. An `@` inside a word (an email address) and
 * trailing punctuation after a link stay plain text, as on X.
 */
export function postTokens(text: string): TextToken[] {
  const tokens: TextToken[] = []
  const plain = (value: string) => {
    if (!value)
      return
    const last = tokens.at(-1)
    if (last?.type === 'text')
      last.text += value
    else
      tokens.push({ type: 'text', text: value })
  }

  let cursor = 0
  for (const match of text.matchAll(TOKEN)) {
    const start = match.index ?? 0
    let value = match[0]
    plain(text.slice(cursor, start))
    cursor = start + value.length

    const before = start > 0 ? text[start - 1]! : ''
    if (value[0] !== 'h' && /\w/.test(before)) {
      plain(value)
      continue
    }
    if (value.startsWith('http')) {
      const trail = /[.,!?;:)'"]+$/.exec(value)?.[0] ?? ''
      value = value.slice(0, value.length - trail.length)
      tokens.push({ type: 'link', text: displayUrl(value), href: value })
      plain(trail)
    }
    else if (value[0] === '@') {
      tokens.push({ type: 'mention', text: value, href: `https://x.com/${value.slice(1)}` })
    }
    else {
      tokens.push({ type: 'hashtag', text: value, href: `https://x.com/hashtag/${encodeURIComponent(value.slice(1))}` })
    }
  }
  plain(text.slice(cursor))
  return tokens
}
