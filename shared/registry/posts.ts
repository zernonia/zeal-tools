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

export const posts: Post[] = [
  {
    slug: 'free-online-tools-no-sign-up',
    title: '16 free online tools that never ask you to sign up',
    description: 'QR codes, background removal, stem splitting, invoices, timers and more — sixteen free tools with no account, no watermark and, for almost all of them, no upload.',
    publishedAt: '2026-10-17',
    minutes: 9,
    tools: ['qr-code-generator', 'background-remover', 'stem-splitter', 'image-compressor', 'send-to-device', 'invoice-maker'],
  },
  {
    slug: 'free-tools-for-worship-teams',
    title: '7 free tools every worship team should know',
    description: 'Transpose chord charts, run pads between songs, time the service, make practice tracks and tune up — seven free tools for worship leaders and church musicians.',
    publishedAt: '2026-10-17',
    minutes: 8,
    tools: ['chord-transposer', 'worship-pads', 'stem-splitter', 'stage-timer', 'countdown-timer', 'tuner'],
  },
  {
    slug: 'free-tools-for-teachers',
    title: '8 free classroom tools for teachers — no student accounts needed',
    description: 'A fair random name picker, timers students can read from the back, QR codes for resources and more: eight free classroom tools that need no sign-up for you or your class.',
    publishedAt: '2026-10-17',
    minutes: 8,
    tools: ['name-picker', 'stage-timer', 'countdown-timer', 'qr-code-generator', 'send-to-device', 'tuner'],
  },
  {
    slug: 'website-launch-tools',
    title: 'Launching a website? 6 free tools for the last mile',
    description: 'Favicons, link previews, image weight and the QR code on the flyer: six free tools for the jobs between "it works" and "it is live".',
    publishedAt: '2026-10-17',
    minutes: 7,
    tools: ['favicon-generator', 'meta-tag-checker', 'image-compressor', 'background-remover', 'password-generator', 'qr-code-generator'],
  },
  {
    slug: 'edit-photos-without-uploading',
    title: '5 free photo tools that never upload your images',
    description: 'Strip location data, compress, remove backgrounds and move photos between devices — five free tools that do it all in your browser, so your pictures stay yours.',
    publishedAt: '2026-10-17',
    minutes: 7,
    tools: ['exif-viewer', 'image-compressor', 'background-remover', 'send-to-device', 'favicon-generator'],
  },
]

export function getPost(slug: string): Post | undefined {
  return posts.find(post => post.slug === slug)
}
