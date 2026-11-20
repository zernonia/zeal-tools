import { createRandomBelow, runRandom } from '../../../../core'

/**
 * GET /api/v1/random?min=1&max=100&count=1&unique=false
 * GET /api/v1/random?coin=10
 * GET /api/v1/random?dice=2d6%2B3
 *
 * Exists because a language model cannot do this. Asked for "a random number
 * between 1 and 100", a model returns a few familiar favourites far more
 * often than chance allows — what is likely to be said, not a draw. This calls the
 * platform CSPRNG and rejects out-of-range values instead of taking a modulo,
 * so every outcome is exactly equally likely. Nothing is stored or logged.
 */
export default defineEventHandler((event) => {
  enforceRateLimit(event)
  const query = getQuery(event)

  // A repeated parameter arrives as an array; the first one is what was meant.
  const params: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(query))
    params[key] = Array.isArray(value) ? value[0] : value

  const randomBelow = createRandomBelow(bytes => crypto.getRandomValues(bytes))
  try {
    return {
      ...runRandom(params, randomBelow),
      note: 'Drawn with crypto.getRandomValues and rejection sampling, so every outcome is equally likely. Nothing is stored or logged.',
    }
  }
  catch (error) {
    badRequest(error instanceof Error ? error.message : 'Could not generate a random result')
  }
})
