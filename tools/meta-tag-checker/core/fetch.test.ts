import { describe, expect, it } from 'vitest'
import { fetchHead, MAX_BYTES, USER_AGENT } from './fetch'

const html = (body = '<title>Hi</title>') => `<html><head>${body}</head><body></body></html>`

function reply(body: string, init: { status?: number, headers?: Record<string, string> } = {}) {
  return new Response(body, {
    status: init.status ?? 200,
    headers: { 'content-type': 'text/html', ...init.headers },
  })
}

describe('fetchHead', () => {
  it('refuses a blocked URL before making any request', async () => {
    let called = false
    const result = await fetchHead('http://169.254.169.254/', async () => { called = true; return reply(html()) })
    expect(result.ok).toBe(false)
    expect(called).toBe(false)
  })

  it('identifies itself so a site owner can see who called', async () => {
    let sent: Record<string, string> = {}
    await fetchHead('https://a.test', async (_u, init) => {
      sent = init!.headers as Record<string, string>
      return reply(html())
    })
    expect(sent['user-agent']).toBe(USER_AGENT)
  })

  it('re-checks every redirect hop, not just the first', async () => {
    // The standard way an allowlist gets bypassed: a public URL that bounces
    // to a private one.
    const result = await fetchHead('https://a.test', async (url) => {
      if (url === 'https://a.test/')
        return reply('', { status: 302, headers: { location: 'http://169.254.169.254/' } })
      return reply(html())
    })
    expect(result.ok).toBe(false)
    expect(result.error).toContain('cannot be checked')
  })

  it('follows an ordinary redirect and reports where it landed', async () => {
    const result = await fetchHead('https://a.test', async (url) => {
      if (url === 'https://a.test/')
        return reply('', { status: 301, headers: { location: 'https://b.test/final' } })
      return reply(html('<title>Moved</title>'))
    })
    expect(result.ok).toBe(true)
    expect(result.finalUrl).toBe('https://b.test/final')
  })

  it('gives up on a redirect loop', async () => {
    const result = await fetchHead('https://a.test', async () =>
      reply('', { status: 302, headers: { location: 'https://a.test/again' } }))
    expect(result.ok).toBe(false)
    expect(result.error).toContain('redirected more than')
  })

  it('refuses anything that is not HTML', async () => {
    const result = await fetchHead('https://a.test/x.pdf', async () =>
      reply('%PDF', { headers: { 'content-type': 'application/pdf' } }))
    expect(result.ok).toBe(false)
    expect(result.error).toContain('not an HTML page')
  })

  it('reports an error status rather than parsing the error page', async () => {
    const result = await fetchHead('https://a.test', async () => reply('<h1>nope</h1>', { status: 404 }))
    expect(result.ok).toBe(false)
    expect(result.status).toBe(404)
  })

  it('stops reading at the end of the head', async () => {
    const huge = `${html()}${'<p>padding</p>'.repeat(200_000)}`
    const result = await fetchHead('https://a.test', async () => reply(huge))
    expect(result.ok).toBe(true)
    expect(result.html!.length).toBeLessThan(MAX_BYTES)
    expect(result.html).toContain('</head>')
  })

  it('caps a page that never closes its head', async () => {
    const endless = `<html><head>${'<meta name=x content=y>'.repeat(400_000)}`
    const result = await fetchHead('https://a.test', async () => reply(endless))
    expect(result.ok).toBe(true)
    expect(result.truncated).toBe(true)
    expect(result.html!.length).toBeLessThanOrEqual(MAX_BYTES)
  })

  it('turns a network failure into a sentence', async () => {
    const result = await fetchHead('https://a.test', async () => { throw new Error('ECONNREFUSED') })
    expect(result.ok).toBe(false)
    expect(result.error).toBe('That page could not be reached.')
  })
})

describe('status messages', () => {
  const reply = (status: number) => new Response('x', { status, headers: { 'content-type': 'text/html' } })

  it('explains a status rather than just printing the number', async () => {
    // "The page responded 522" was a real complaint: a Cloudflare code most
    // people have never seen, with no hint about what to do.
    const at = async (status: number) => (await fetchHead('https://a.test', async () => reply(status))).error!
    expect(await at(522)).toContain('did not answer properly')
    expect(await at(404)).toContain('no page at that URL')
    expect(await at(403)).toContain('not public')
    expect(await at(429)).toContain('rate-limiting')
    expect(await at(418)).toContain('418')
  })

  it('still reports the raw status alongside the sentence', async () => {
    const result = await fetchHead('https://a.test', async () => reply(503))
    expect(result.status).toBe(503)
  })
})
