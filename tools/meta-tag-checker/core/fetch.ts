import type { GuardResult } from './url-guard'
import { guardUrl } from './url-guard'

/**
 * Fetching someone else's page, carefully.
 *
 * Shared by the REST route and the MCP tool so there is one set of rules
 * rather than two that drift. `fetchImpl` is a parameter so the whole thing
 * can be exercised without a network.
 */

/** Enough for any real `<head>`, and far too little to proxy a file through. */
export const MAX_BYTES = 256 * 1024
export const TIMEOUT_MS = 8000
export const MAX_REDIRECTS = 4

export interface FetchOutcome {
  ok: boolean
  status?: number
  finalUrl?: string
  html?: string
  error?: string
  truncated?: boolean
}

/**
 * A polite, identifiable agent string.
 *
 * A site owner reading their logs should be able to tell what hit them and
 * go and look at it, rather than finding an anonymous scraper.
 */
export const USER_AGENT = 'zeal.tools meta-tag-checker (+https://zeal.tools/tools/meta-tag-checker)'

export async function fetchHead(
  input: string,
  fetchImpl: typeof fetch = fetch,
): Promise<FetchOutcome> {
  const guard: GuardResult = guardUrl(input)
  if (!guard.ok || !guard.url)
    return { ok: false, error: guard.message ?? 'That URL cannot be checked.' }

  let current = guard.url
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      const response = await fetchImpl(current.href, {
        // Redirects are followed by hand so every hop goes back through the
        // guard. Letting fetch follow them automatically is the standard way
        // an allowlist gets bypassed: the first URL is public and the third
        // is 169.254.169.254.
        redirect: 'manual',
        signal: controller.signal,
        headers: {
          'user-agent': USER_AGENT,
          'accept': 'text/html,application/xhtml+xml',
          'accept-language': 'en',
        },
      })

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('location')
        if (!location)
          return { ok: false, error: `The page redirected with no destination (${response.status}).` }
        const next = guardUrl(new URL(location, current.href).href)
        if (!next.ok || !next.url)
          return { ok: false, error: `It redirected somewhere that cannot be checked: ${next.message}` }
        current = next.url
        continue
      }

      if (!response.ok)
        return { ok: false, status: response.status, finalUrl: current.href, error: describeStatus(response.status) }

      const type = response.headers.get('content-type') ?? ''
      if (type && !/text\/html|application\/xhtml/i.test(type))
        return { ok: false, status: response.status, finalUrl: current.href, error: `That URL served ${type.split(';')[0]}, not an HTML page.` }

      const { text, truncated } = await readCapped(response)
      return { ok: true, status: response.status, finalUrl: current.href, html: text, truncated }
    }

    return { ok: false, error: `It redirected more than ${MAX_REDIRECTS} times.` }
  }
  catch (cause) {
    const aborted = cause instanceof Error && cause.name === 'AbortError'
    return { ok: false, error: aborted ? 'The page took too long to respond.' : 'That page could not be reached.' }
  }
  finally {
    clearTimeout(timer)
  }
}

/**
 * Read at most `MAX_BYTES`, then stop pulling.
 *
 * Streaming rather than `response.text()` is the point: the head is in the
 * first few kilobytes, and refusing to read further is what stops this being
 * a way to pull a large file through our bandwidth.
 */
/**
 * A status code on its own tells the reader nothing.
 *
 * "The page responded 522" was a real complaint: it is a Cloudflare code most
 * people have never seen, and it says nothing about what to do next.
 */
function describeStatus(status: number): string {
  if (status === 401 || status === 403)
    return `That page is not public — it answered ${status}, so there is nothing a crawler could read either.`
  if (status === 404)
    return 'There is no page at that URL (404).'
  if (status === 429)
    return 'That site is rate-limiting us (429). Try again in a minute.'
  if (status >= 500)
    return `That site's server did not answer properly (${status}), so there was nothing to read.`
  return `That page responded ${status}.`
}

async function readCapped(response: Response): Promise<{ text: string, truncated: boolean }> {
  const body = response.body
  if (!body)
    return { text: '', truncated: false }

  const reader = body.getReader()
  const decoder = new TextDecoder('utf-8')
  let text = ''
  let size = 0
  let truncated = false

  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done)
        break
      size += value.byteLength
      if (size >= MAX_BYTES) {
        text += decoder.decode(value.slice(0, Math.max(0, value.byteLength - (size - MAX_BYTES))), { stream: false })
        truncated = true
        break
      }
      text += decoder.decode(value, { stream: true })
      // Everything worth reading is above `</head>`; stopping there means a
      // huge page costs us its head and nothing more.
      if (/<\/head\s*>/i.test(text))
        break
    }
  }
  finally {
    await reader.cancel().catch(() => {})
  }

  // Cut at the end of the head whatever the chunking was. Without this the
  // result depends on how the body happened to arrive: a page delivered in one
  // chunk comes back capped at MAX_BYTES with the whole body attached, while
  // the same page split across chunks stops at the head. Trimming here makes
  // "it only reads the head" true of the output and not just of the reading,
  // and a page that reached the cap without ever closing its head is the only
  // thing still marked truncated.
  const end = /<\/head\s*>/i.exec(text)
  if (end)
    return { text: text.slice(0, end.index + end[0].length), truncated: false }

  return { text, truncated }
}
