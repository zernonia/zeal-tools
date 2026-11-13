import { describe, expect, it } from 'vitest'
import { fetchPost, USER_AGENT } from './fetch'
import photosLong from './fixtures/photos-long.json'
import replyCard from './fixtures/reply-card.json'
import tombstone from './fixtures/tombstone.json'
import video from './fixtures/video.json'
import {
  mediaFilename,
  normalisePost,
  originalPhotoUrl,
  parsePostRef,
  PostError,
  postMarkdown,
  postText,
  renditionLabel,
  syndicationToken,
} from './index'

/*
 * The fixtures are real responses from X's embed endpoint, all from NASA
 * accounts. The quoted-post and GIF cases are assembled from those real
 * shapes, because no recent organisation post had either.
 */

describe('parsePostRef', () => {
  const ID = '2119833829389041896'

  it.each([
    `https://x.com/NASA/status/${ID}`,
    `https://twitter.com/NASA/status/${ID}?s=20&t=abc`,
    `https://mobile.twitter.com/NASA/status/${ID}`,
    `https://www.x.com/NASA/status/${ID}/video/1`,
    `x.com/NASA/status/${ID}`,
    `https://x.com/i/web/status/${ID}`,
    `https://x.com/i/status/${ID}`,
    `https://fxtwitter.com/NASA/status/${ID}`,
    `https://vxtwitter.com/NASA/status/${ID}`,
    `https://fixupx.com/NASA/status/${ID}`,
    `https://twitter.com/NASA/statuses/${ID}`,
    `  ${ID}  `,
  ])('reads %s', (input) => {
    expect(parsePostRef(input)).toEqual({ id: ID })
  })

  it('refuses a link to anywhere else', () => {
    expect(parsePostRef(`https://instagram.com/p/${ID}`)).toHaveProperty('error')
    expect(parsePostRef(`https://x.com.evil.example/NASA/status/${ID}`)).toHaveProperty('error')
  })

  it('refuses a profile link, with a hint', () => {
    const result = parsePostRef('https://x.com/NASA')
    expect(result).toHaveProperty('error')
    expect((result as { error: string }).error).toMatch(/not to a post/)
  })

  it('refuses IDs that cannot be snowflakes', () => {
    expect(parsePostRef('0123')).toHaveProperty('error')
    expect(parsePostRef('12345678901234567890')).toHaveProperty('error')
    expect(parsePostRef('')).toHaveProperty('error')
  })
})

describe('syndicationToken', () => {
  it('is a short base-36 string with no dots or zeros, as the embed script makes', () => {
    expect(syndicationToken('2119833829389041896')).toMatch(/^[1-9a-z]+$/)
    expect(syndicationToken('2119833829389041896')).not.toContain('.')
  })
})

describe('postText', () => {
  it('cuts the trailing media link, with emoji before the cut', () => {
    // The flag and rocket are 3 code points but 6 UTF-16 units: slicing the
    // range by code points would leave "ht" of the link behind.
    expect(postText(video)).toBe('The weekend ends. The mission keeps going.\n\nThis is what American ambition looks like. 🇺🇸🚀')
  })

  it('expands short links to where they go', () => {
    const text = postText(replyCard)
    expect(text).toContain('https://go.nasa.gov/shinebright')
    expect(text).not.toContain('t.co')
  })

  it('decodes the HTML entities X leaves in text', () => {
    expect(postText({ text: 'Fish &amp; chips &lt;3', display_text_range: [0, 22] })).toBe('Fish & chips <3')
  })
})

describe('normalisePost: video', () => {
  const post = normalisePost(video)

  it('reads the author and the post', () => {
    expect(post.id).toBe('2119833829389041896')
    expect(post.url).toBe('https://x.com/NASA/status/2119833829389041896')
    expect(post.author.handle).toBe('NASA')
    expect(post.author.verified).toBe(true)
    expect(post.author.avatar).toContain('_bigger.')
  })

  it('offers only the MP4 renditions, best first, with their sizes', () => {
    const [media] = post.media
    expect(media?.type).toBe('video')
    expect(media?.renditions.length).toBe(5)
    expect(media?.renditions.every(r => r.url.endsWith('.mp4'))).toBe(true)
    const bitrates = media!.renditions.map(r => r.bitrate)
    expect(bitrates).toEqual([...bitrates].sort((a, b) => b - a))
    expect(media?.renditions[0]?.width).toBeGreaterThan(0)
    expect(media?.durationMs).toBeGreaterThan(0)
  })
})

describe('normalisePost: photos, long post', () => {
  const post = normalisePost(photosLong)

  it('offers every photo at its original size', () => {
    expect(post.media.length).toBe(4)
    expect(post.media.every(m => m.type === 'photo' && m.url.endsWith('name=orig'))).toBe(true)
    expect(post.media[0]?.width).toBe(6720)
  })

  it('says when X sent only the start of a longer post', () => {
    expect(post.truncated).toBe(true)
    expect(postMarkdown(post)).toContain('first part of a longer post')
  })
})

describe('normalisePost: reply', () => {
  it('records what it replies to', () => {
    const post = normalisePost(replyCard)
    expect(post.replyTo).toEqual({ handle: 'NASASolarSystem', id: '2120201873181610199' })
    expect(post.media).toEqual([])
  })
})

describe('normalisePost: quoted post', () => {
  it('nests one level, as X does', () => {
    const post = normalisePost({ ...replyCard, quoted_tweet: { ...video, quoted_tweet: photosLong } })
    expect(post.quoted?.id).toBe('2119833829389041896')
    expect(post.quoted?.media[0]?.type).toBe('video')
    expect(post.quoted?.quoted).toBeUndefined()
    expect(postMarkdown(post)).toContain('> **NASA** (@NASA)')
  })

  it('keeps the outer post when the quoted one is unavailable', () => {
    const post = normalisePost({ ...replyCard, quoted_tweet: tombstone })
    expect(post.quoted).toBeUndefined()
    expect(post.id).toBe('2120201874695692679')
  })
})

describe('normalisePost: GIF', () => {
  it('reads X\'s single silent MP4', () => {
    const gif = {
      ...video,
      mediaDetails: [{
        type: 'animated_gif',
        media_url_https: 'https://pbs.twimg.com/tweet_video_thumb/AbC.jpg',
        original_info: { width: 480, height: 270 },
        video_info: { variants: [{ bitrate: 0, content_type: 'video/mp4', url: 'https://video.twimg.com/tweet_video/AbC.mp4' }] },
      }],
    }
    const [media] = normalisePost(gif).media
    expect(media?.type).toBe('gif')
    expect(media?.renditions).toEqual([{ url: 'https://video.twimg.com/tweet_video/AbC.mp4', bitrate: 0 }])
  })
})

describe('normalisePost: unavailable', () => {
  it('throws a PostError with X\'s reason and an explanation', () => {
    try {
      normalisePost(tombstone)
      expect.unreachable()
    }
    catch (error) {
      expect(error).toBeInstanceOf(PostError)
      expect((error as PostError).kind).toBe('unavailable')
      expect((error as PostError).message).toMatch(/^This Post is unavailable\. X does not show it/)
    }
  })

  it('refuses something that is not a post', () => {
    expect(() => normalisePost({ hello: 'world' })).toThrow(PostError)
  })
})

describe('output', () => {
  it('names files after the account and post, numbered when there are several', () => {
    expect(mediaFilename(normalisePost(video), 0)).toBe('NASA-2119833829389041896.mp4')
    const photos = normalisePost(photosLong)
    expect(mediaFilename(photos, 1)).toBe('NASA-2119846862286930036-2.jpg')
  })

  it('upgrades a photo to its original size', () => {
    expect(originalPhotoUrl('https://pbs.twimg.com/media/HWs1ch3WUAAyaeo.jpg')).toBe('https://pbs.twimg.com/media/HWs1ch3WUAAyaeo?format=jpg&name=orig')
    expect(originalPhotoUrl('https://pbs.twimg.com/media/X.png?name=small')).toBe('https://pbs.twimg.com/media/X?format=png&name=orig')
    expect(originalPhotoUrl('https://pbs.twimg.com/amplify_video_thumb/1/img/a.jpg')).toBe('https://pbs.twimg.com/amplify_video_thumb/1/img/a.jpg')
  })

  it('labels renditions the way people choose them', () => {
    expect(renditionLabel({ url: '', bitrate: 2_176_000, width: 720, height: 1280 })).toBe('720p · 2.2 Mbps')
    expect(renditionLabel({ url: '', bitrate: 256_000, width: 320, height: 568 })).toBe('320p · 256 kbps')
    expect(renditionLabel({ url: '', bitrate: 0 })).toBe('MP4')
  })
})

describe('fetchPost', () => {
  const respond = (status: number, body: unknown) => (async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch

  it('normalises a found post', async () => {
    const post = await fetchPost('2119833829389041896', respond(200, video))
    expect(post.author.handle).toBe('NASA')
  })

  it.each([
    [404, {}, 'not-found'],
    [200, {}, 'not-found'],
    [429, {}, 'rate-limited'],
    [503, {}, 'upstream'],
    [200, tombstone, 'unavailable'],
  ] as const)('maps %i %j to %s', async (status, body, kind) => {
    await expect(fetchPost('1', respond(status, body))).rejects.toMatchObject({ kind })
  })

  it('sends a User-Agent, without which X answers 400', async () => {
    let headers: Headers | undefined
    const capture = (async (_url: string, init: RequestInit) => {
      headers = new Headers(init.headers)
      return new Response(JSON.stringify(video), { status: 200 })
    }) as unknown as typeof fetch
    await fetchPost('2119833829389041896', capture)
    expect(headers?.get('user-agent')).toBe(USER_AGENT)
  })

  it('reports a network failure as upstream, not as a missing post', async () => {
    const failing = (async () => { throw new TypeError('fetch failed') }) as unknown as typeof fetch
    await expect(fetchPost('1', failing)).rejects.toMatchObject({ kind: 'upstream' })
  })
})
