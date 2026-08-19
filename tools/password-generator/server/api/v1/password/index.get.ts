import type { PasswordOptions } from '../../../../core'
import {
  buildAlphabet,
  crackTime,
  createRandomInt,
  DEFAULT_OPTIONS,
  entropyBits,
  generatePassword,
  strength,
} from '../../../../core'

/**
 * GET /api/v1/password?length=24&symbols=false&count=5
 *
 * For scripts and agents. A password made here does travel the wire, unlike
 * one made in the browser — the docs say so plainly rather than pretending
 * otherwise. Nothing is stored or logged either way.
 */
export default defineEventHandler((event) => {
  enforceRateLimit(event)
  const query = getQuery(event)

  const flag = (key: keyof PasswordOptions, fallback: boolean) => {
    const raw = query[key]
    if (raw === undefined)
      return fallback
    return raw !== 'false' && raw !== '0'
  }

  const length = query.length ? Number(query.length) : DEFAULT_OPTIONS.length
  if (!Number.isFinite(length) || length < 1 || length > 256)
    badRequest('length must be a whole number between 1 and 256')

  const count = query.count ? Number(query.count) : 1
  if (!Number.isFinite(count) || count < 1 || count > 50)
    badRequest('count must be between 1 and 50')

  const options: PasswordOptions = {
    length: Math.round(length),
    lowercase: flag('lowercase', true),
    uppercase: flag('uppercase', true),
    digits: flag('digits', true),
    symbols: flag('symbols', true),
    excludeAmbiguous: flag('excludeAmbiguous', false),
    requireEach: flag('requireEach', true),
  }

  const randomInt = createRandomInt(bytes => crypto.getRandomValues(bytes))

  try {
    const passwords = Array.from({ length: Math.round(count) }, () => generatePassword(options, randomInt))
    const bits = entropyBits(options)
    return {
      passwords,
      password: passwords[0],
      length: options.length,
      alphabetSize: buildAlphabet(options).length,
      entropyBits: Math.round(bits * 10) / 10,
      strength: strength(bits),
      crackTime: crackTime(bits),
      note: 'Generated on the server and sent over TLS. Never stored. For a secret that never leaves your machine, use the browser tool.',
    }
  }
  catch (error) {
    badRequest(error instanceof Error ? error.message : 'Could not generate a password')
  }
})
