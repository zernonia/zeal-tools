import type { Post } from './index'
import { normalisePost, PostError, syndicationUrl } from './index'

export const USER_AGENT = 'Mozilla/5.0 (compatible; zeal.tools; +https://zeal.tools/tools/x-post-downloader)'

/**
 * Ask X's embed endpoint for one post.
 *
 * The URL is built from a numeric ID and nothing else, so unlike the meta tag
 * checker there is no stranger's address to guard: this can only ever reach
 * one host. `fetchImpl` is injectable so the failure paths are testable
 * without the network.
 */
export async function fetchPost(id: string, fetchImpl: typeof fetch = fetch): Promise<Post> {
  let response: Response
  try {
    response = await fetchImpl(syndicationUrl(id), {
      // X answers 400 to a request with no User-Agent, and a Worker's fetch
      // sends none. Measured: no UA → 400, any UA → 200. This one says who
      // is asking rather than impersonating a browser.
      headers: { 'accept': 'application/json', 'user-agent': USER_AGENT },
      signal: AbortSignal.timeout(10_000),
    })
  }
  catch {
    throw new PostError('upstream', 'X did not answer in time. Try again in a moment.')
  }

  if (response.status === 404)
    throw new PostError('not-found', 'There is no post at that link. It may have been deleted, or it is from a protected account, which only its approved followers can see.')
  if (response.status === 429)
    throw new PostError('rate-limited', 'X is turning away requests from our server right now. Try again in a minute.')
  if (!response.ok)
    throw new PostError('upstream', `X answered with an error (${response.status}). Try again in a moment.`)

  let raw: unknown
  try {
    raw = await response.json()
  }
  catch {
    throw new PostError('upstream', 'X sent back something that is not a post.')
  }
  // An empty object is how the endpoint says "no such post" with a 200.
  if (!raw || typeof raw !== 'object' || Object.keys(raw).length === 0)
    throw new PostError('not-found', 'There is no post at that link. It may have been deleted, or it is from a protected account.')
  return normalisePost(raw as Record<string, unknown>)
}
