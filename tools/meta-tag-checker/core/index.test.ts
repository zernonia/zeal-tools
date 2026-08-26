import { describe, expect, it } from 'vitest'
import {
  audit,
  buildTags,
  decodeEntities,
  isAbsoluteUrl,
  readMeta,
  resolveCard,
} from './index'

const page = (head: string) => `<!doctype html><html lang="en"><head>${head}</head><body><p>hi</p></body></html>`

describe('the scanner survives real markup', () => {
  it('reads attributes in any order and any quoting', () => {
    const meta = readMeta(page(`
      <meta content="Double" property="og:title">
      <meta name=description content=Bare>
      <meta property='og:type' content='article'>
    `))
    expect(meta.og.title).toBe('Double')
    expect(meta.description).toBe('Bare')
    expect(meta.og.type).toBe('article')
  })

  it('does not care about tag or attribute case', () => {
    const meta = readMeta('<HTML LANG="fr"><HEAD><META PROPERTY="OG:TITLE" CONTENT="Bonjour"><TITLE>Titre</TITLE></HEAD>')
    expect(meta.og.title).toBe('Bonjour')
    expect(meta.title).toBe('Titre')
    expect(meta.lang).toBe('fr')
  })

  it('is not fooled by a closing head tag inside a script', () => {
    // The classic reason a regex-based reader stops early and reports half the
    // tags as missing.
    const meta = readMeta(page(`
      <script>const evil = "</head><meta property='og:title' content='injected'>"</script>
      <meta property="og:title" content="Real">
    `))
    expect(meta.og.title).toBe('Real')
  })

  it('ignores comments, including ones containing tags', () => {
    const meta = readMeta(page(`
      <!-- <meta property="og:title" content="Commented out"> -->
      <meta property="og:title" content="Live">
    `))
    expect(meta.og.title).toBe('Live')
  })

  it('stops at the body, so stray meta in the page is not reported', () => {
    const html = '<html><head><title>Head</title></head><body><meta name="description" content="Not counted"></body></html>'
    expect(readMeta(html).description).toBeNull()
  })

  it('keeps the first of a duplicated tag, which is what crawlers take', () => {
    const meta = readMeta(page(`
      <meta property="og:title" content="First">
      <meta property="og:title" content="Second">
    `))
    expect(meta.og.title).toBe('First')
  })

  it('survives a document that stops mid-tag', () => {
    expect(() => readMeta('<html><head><meta property="og:title" content="cut off')).not.toThrow()
    expect(() => readMeta('<html><head><meta ')).not.toThrow()
    expect(readMeta('').title).toBeNull()
  })

  it('reads a bare head fragment with no document around it', () => {
    // People paste what they copied, which is rarely a whole document.
    const meta = readMeta('<title>Fragment</title><meta name="description" content="Just the head">')
    expect(meta.title).toBe('Fragment')
    expect(meta.description).toBe('Just the head')
  })

  it('accepts og: on name= and description on property=, as crawlers do', () => {
    const meta = readMeta(page(`
      <meta name="og:image" content="https://x.test/a.png">
      <meta property="description" content="Wrong attribute, still read">
    `))
    expect(meta.og.image).toBe('https://x.test/a.png')
    expect(meta.description).toBe('Wrong attribute, still read')
  })

  it('handles a pathological run of markup in linear time', () => {
    const started = performance.now()
    readMeta(`<html><head>${'<meta '.repeat(60_000)}`)
    expect(performance.now() - started).toBeLessThan(400)
  })

  it('collects canonical, icons, alternates and JSON-LD', () => {
    const meta = readMeta(page(`
      <link rel="canonical" href="https://zeal.tools/x">
      <link rel="icon" href="/favicon.svg">
      <link rel="apple-touch-icon" href="/apple.png">
      <link rel="alternate" hreflang="fr" href="https://zeal.tools/fr/x">
      <script type="application/ld+json">{"@type":"WebPage"}</script>
    `))
    expect(meta.canonical).toBe('https://zeal.tools/x')
    expect(meta.icons).toEqual(['/favicon.svg', '/apple.png'])
    expect(meta.alternates).toEqual([{ hreflang: 'fr', href: 'https://zeal.tools/fr/x' }])
    expect(meta.jsonLd).toEqual(['{"@type":"WebPage"}'])
  })

  it('reads charset from either spelling', () => {
    expect(readMeta(page('<meta charset="utf-8">')).charset).toBe('utf-8')
    expect(readMeta(page('<meta http-equiv="content-type" content="text/html; charset=ISO-8859-1">')).charset).toBe('ISO-8859-1')
  })
})

describe('entities', () => {
  it('decodes what a title actually contains', () => {
    expect(decodeEntities('Tips &amp; Tricks')).toBe('Tips & Tricks')
    expect(decodeEntities('&lt;tag&gt; &quot;q&quot; &#39;a&#39;')).toBe('<tag> "q" \'a\'')
    expect(decodeEntities('&#8212; &#x2014;')).toBe('— —')
  })

  it('leaves a bare ampersand alone', () => {
    expect(decodeEntities('Marks & Spencer')).toBe('Marks & Spencer')
    expect(decodeEntities('a=1&b=2')).toBe('a=1&b=2')
  })

  it('measures a decoded title, not the markup', () => {
    // A length warning computed on `&amp;` would be wrong by three characters
    // per ampersand, exactly where the tool claims to be useful.
    expect(readMeta(page('<title>Tips &amp; Tricks</title>')).title).toHaveLength(13)
  })
})

describe('platform fallback chains', () => {
  const full = readMeta(page(`
    <title>Plain title</title>
    <meta name="description" content="Plain description">
    <link rel="canonical" href="https://zeal.tools/c">
    <meta property="og:title" content="OG title">
    <meta property="og:description" content="OG description">
    <meta property="og:image" content="https://zeal.tools/og.png">
    <meta property="og:url" content="https://zeal.tools/og">
    <meta name="twitter:title" content="X title">
    <meta name="twitter:card" content="summary_large_image">
  `))

  it('gives Google the plain tags and never Open Graph', () => {
    const card = resolveCard(full, 'google')
    expect(card.title).toBe('Plain title')
    expect(card.description).toBe('Plain description')
    expect(card.image).toBeNull()
    expect(card.url).toBe('https://zeal.tools/c')
  })

  it('lets X prefer its own tags, then fall back to Open Graph', () => {
    const card = resolveCard(full, 'x')
    expect(card.title).toBe('X title')
    expect(card.description).toBe('OG description')
    expect(card.image).toBe('https://zeal.tools/og.png')
    expect(card.cardType).toBe('summary_large_image')
  })

  it('gives Facebook, LinkedIn and Slack Open Graph', () => {
    for (const platform of ['facebook', 'linkedin', 'slack'] as const) {
      const card = resolveCard(full, platform)
      expect(card.title).toBe('OG title')
      expect(card.url).toBe('https://zeal.tools/og')
    }
  })

  it('falls all the way back to the plain title when Open Graph is absent', () => {
    const bare = readMeta(page('<title>Only this</title><meta name="description" content="And this">'))
    for (const platform of ['x', 'facebook', 'linkedin', 'slack'] as const) {
      expect(resolveCard(bare, platform).title).toBe('Only this')
      expect(resolveCard(bare, platform).description).toBe('And this')
    }
  })

  it('shows the small card on X when no card type is declared', () => {
    const noCard = readMeta(page('<meta property="og:image" content="https://x.test/a.png">'))
    expect(resolveCard(noCard, 'x').cardType).toBe('summary')
  })
})

describe('audit', () => {
  const idsOf = (html: string) => audit(readMeta(html)).map(f => `${f.id}:${f.severity}`)

  it('leads with noindex, because nothing else matters if it is set', () => {
    const found = audit(readMeta(page('<meta name="robots" content="noindex, nofollow">')))
    expect(found[0]!.id).toBe('robots-noindex')
    expect(found[0]!.severity).toBe('error')
  })

  it('flags a missing title and description as errors', () => {
    const ids = idsOf(page(''))
    expect(ids).toContain('title:error')
    expect(ids).toContain('description:error')
    expect(ids).toContain('viewport:error')
  })

  it('warns on lengths at the edges and passes in the middle', () => {
    const long = idsOf(page(`<title>${'a'.repeat(80)}</title>`))
    const short = idsOf(page('<title>Hi</title>'))
    const good = idsOf(page(`<title>${'a'.repeat(45)}</title>`))
    expect(long).toContain('title:warning')
    expect(short).toContain('title:warning')
    expect(good).toContain('title:ok')
  })

  it('treats a relative og:image and canonical as errors, not warnings', () => {
    // A crawler fetches these without the page as context, so relative is not
    // "less good" — it is broken.
    const ids = idsOf(page(`
      <link rel="canonical" href="/relative">
      <meta property="og:image" content="/og.png">
    `))
    expect(ids).toContain('canonical:error')
    expect(ids).toContain('og-image-relative:error')
  })

  it('accepts protocol-relative URLs as absolute', () => {
    expect(isAbsoluteUrl('//cdn.test/a.png')).toBe(true)
    expect(isAbsoluteUrl('https://a.test')).toBe(true)
    expect(isAbsoluteUrl('/a.png')).toBe(false)
    expect(isAbsoluteUrl('a.png')).toBe(false)
  })

  it('nudges towards a large card only when there is an image to show', () => {
    expect(idsOf(page('<meta property="og:image" content="https://a.test/x.png">'))).toContain('twitter-card:warning')
    expect(idsOf(page(''))).not.toContain('twitter-card:warning')
  })

  it('gives a fully tagged page nothing but passes', () => {
    const clean = page(`
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>A title of a perfectly reasonable length for search</title>
      <meta name="description" content="A description that sits comfortably inside the range search engines display, long enough to say something.">
      <link rel="canonical" href="https://zeal.tools/x">
      <link rel="icon" href="/favicon.svg">
      <meta property="og:title" content="A title">
      <meta property="og:description" content="A description">
      <meta property="og:image" content="https://zeal.tools/og.png">
      <meta property="og:url" content="https://zeal.tools/x">
      <meta property="og:type" content="website">
      <meta name="twitter:card" content="summary_large_image">
    `)
    expect(audit(readMeta(clean)).filter(f => f.severity !== 'ok')).toEqual([])
  })
})

describe('buildTags', () => {
  it('emits only what it was given', () => {
    const tags = buildTags({ title: 'T' })
    expect(tags).toContain('<title>T</title>')
    expect(tags).toContain('og:title')
    expect(tags).not.toContain('og:image')
    expect(tags).not.toContain('canonical')
  })

  it('escapes values into attributes', () => {
    expect(buildTags({ title: 'Tips & "Tricks" <b>' }))
      .toContain('content="Tips &amp; &quot;Tricks&quot; &lt;b&gt;"')
  })

  it('picks the card type from whether there is an image', () => {
    expect(buildTags({ image: 'https://a.test/x.png' })).toContain('content="summary_large_image"')
    expect(buildTags({ title: 'T' })).toContain('content="summary"')
  })

  it('round-trips back through the reader', () => {
    const input = { title: 'Round trip', description: 'Back again', url: 'https://zeal.tools/x', image: 'https://zeal.tools/og.png' }
    const meta = readMeta(`<html><head>${buildTags(input)}</head>`)
    expect(meta.title).toBe(input.title)
    expect(meta.og.description).toBe(input.description)
    expect(meta.canonical).toBe(input.url)
    expect(meta.og.image).toBe(input.image)
  })
})
