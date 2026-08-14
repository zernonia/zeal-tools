import type { H3Event } from 'h3'

/**
 * Light per-IP rate limiting — purely to survive abuse, with generous limits
 * and honest errors. In-memory per isolate: approximate on purpose (a real
 * distributed limiter would cost more than the abuse it prevents at this
 * scale).
 */
const buckets = new Map<string, { count: number, resetAt: number }>()
const WINDOW_MS = 60_000
const LIMIT = 120

export function enforceRateLimit(event: H3Event) {
  const ip = getRequestHeader(event, 'cf-connecting-ip')
    ?? getRequestHeader(event, 'x-forwarded-for')?.split(',')[0]?.trim()
    ?? 'unknown'
  const now = Date.now()
  let bucket = buckets.get(ip)
  if (!bucket || bucket.resetAt < now) {
    bucket = { count: 0, resetAt: now + WINDOW_MS }
    buckets.set(ip, bucket)
    if (buckets.size > 10_000) {
      for (const [key, value] of buckets) {
        if (value.resetAt < now) buckets.delete(key)
      }
    }
  }
  bucket.count++
  setResponseHeader(event, 'x-ratelimit-limit', String(LIMIT))
  setResponseHeader(event, 'x-ratelimit-remaining', String(Math.max(0, LIMIT - bucket.count)))
  if (bucket.count > LIMIT) {
    throw createError({
      statusCode: 429,
      statusMessage: 'Too Many Requests',
      message: `Rate limit is ${LIMIT} requests/minute per IP — generous for humans, tight for scrapers. If you need more, self-host us (MIT) or open an issue.`,
    })
  }
}

/** Consistent error shape for tool APIs. */
export function badRequest(message: string): never {
  throw createError({ statusCode: 400, statusMessage: 'Bad Request', message })
}
