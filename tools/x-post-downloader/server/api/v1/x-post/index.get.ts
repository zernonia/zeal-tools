import { parsePostRef, PostError } from '../../../../core'
import { fetchPost } from '../../../../core/fetch'

/**
 * GET /api/v1/x-post?url=https://x.com/NASA/status/2119833829389041896
 *
 * Reads a public post through X's embed endpoint, which answers browsers only
 * when they are X's own embed frame — so the page has to ask here. Only the
 * post's data comes through: its videos and photos are fetched by the
 * browser straight from X's media servers, which do allow it, so no file
 * ever passes through this server.
 */
const STATUS: Record<PostError['kind'], number> = {
  'not-found': 404,
  'unavailable': 404,
  'rate-limited': 503,
  'upstream': 502,
}

export default defineEventHandler(async (event) => {
  enforceRateLimit(event)
  const query = getQuery(event)
  const input = typeof query.url === 'string' ? query.url : typeof query.id === 'string' ? query.id : ''
  const ref = parsePostRef(input)
  if ('error' in ref)
    badRequest(`${ref.error} Example: /api/v1/x-post?url=https://x.com/NASA/status/2119833829389041896`)

  try {
    const post = await fetchPost(ref.id)
    // Public posts change rarely and are public anyway; a few minutes of
    // browser caching saves X and us a repeat for the same link.
    setResponseHeader(event, 'cache-control', 'public, max-age=300')
    return {
      post,
      note: 'Read through our server because X only lets its own embeds read posts from a browser. Nothing is stored or logged; media URLs point at X.',
    }
  }
  catch (error) {
    if (error instanceof PostError)
      throw createError({ statusCode: STATUS[error.kind], statusMessage: error.kind, message: error.message })
    throw error
  }
})
