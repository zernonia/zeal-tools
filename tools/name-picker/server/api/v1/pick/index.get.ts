import { createRandomInt } from '../../../../../../shared/core/random'
import { MAX_ENTRIES, parseEntries, pickIndex, totalWeight, without } from '../../../../core'

/**
 * GET /api/v1/pick?names=Ada,Grace,Linus&count=1
 *
 * Exists because a language model cannot do this. Asked to "pick one at
 * random" a model returns whatever its sampling makes likely, which is
 * reproducibly biased towards the first item, the last, and whatever it has
 * seen most often — not a draw. This endpoint calls the platform CSPRNG and
 * rejects out-of-range values rather than taking a modulo, so every entry has
 * genuinely equal odds. Nothing is stored or logged.
 */
export default defineEventHandler((event) => {
  enforceRateLimit(event)
  const query = getQuery(event)

  const raw = typeof query.names === 'string' ? query.names : ''
  if (!raw.trim())
    badRequest('names is required — a comma or newline separated list, e.g. names=Ada,Grace,Linus')

  // Commas are what fits in a URL; newlines are what fits in a POST body one
  // day. Both mean "next entry", so both are accepted.
  const entries = parseEntries(raw.replace(/,/g, '\n'))
  if (entries.length === 0)
    badRequest('names contained no usable entries')

  const count = query.count ? Number(query.count) : 1
  if (!Number.isFinite(count) || count < 1 || count > MAX_ENTRIES)
    badRequest(`count must be between 1 and ${MAX_ENTRIES}`)

  // Drawing without replacement is the raffle case and the far more common
  // one; `replace=true` asks for a die roll instead, where a repeat is fine.
  const replace = query.replace === 'true' || query.replace === '1'
  const wanted = Math.min(Math.round(count), replace ? MAX_ENTRIES : entries.length)

  const randomInt = createRandomInt(bytes => crypto.getRandomValues(bytes))
  const picked: string[] = []
  let pool = entries

  for (let i = 0; i < wanted; i++) {
    const index = pickIndex(pool, randomInt)
    if (index < 0)
      break
    picked.push(pool[index]!.label)
    if (!replace)
      pool = without(pool, index)
  }

  return {
    picked,
    winner: picked[0],
    entries: entries.length,
    totalWeight: totalWeight(entries),
    replace,
    note: 'Drawn with crypto.getRandomValues and rejection sampling, so every entry has equal odds. Nothing is stored or logged.',
  }
})
