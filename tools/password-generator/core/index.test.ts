import type { PasswordOptions } from './index'
import { describe, expect, it } from 'vitest'
import {
  AMBIGUOUS,
  buildAlphabet,
  CHARSETS,
  crackTime,
  createRandomInt,
  DEFAULT_OPTIONS,
  entropyBits,
  generatePassword,
  shuffle,
  strength,
} from './index'

const opts = (over: Partial<PasswordOptions> = {}): PasswordOptions => ({ ...DEFAULT_OPTIONS, ...over })

/** Deterministic byte source: a counter, so draws are reproducible. */
function counterFill(start = 0) {
  let n = start
  return (bytes: Uint8Array) => {
    n += 2654435761 // knuth multiplier, just to move the low bits around
    bytes[0] = (n >>> 24) & 0xFF
    bytes[1] = (n >>> 16) & 0xFF
    bytes[2] = (n >>> 8) & 0xFF
    bytes[3] = n & 0xFF
  }
}

describe('buildAlphabet', () => {
  it('joins only the selected sets', () => {
    expect(buildAlphabet(opts({ uppercase: false, digits: false, symbols: false })))
      .toBe(CHARSETS.lowercase)
    expect(buildAlphabet(opts({ symbols: false })))
      .toBe(CHARSETS.lowercase + CHARSETS.uppercase + CHARSETS.digits)
  })

  it('is empty when nothing is selected', () => {
    expect(buildAlphabet(opts({ lowercase: false, uppercase: false, digits: false, symbols: false }))).toBe('')
  })

  it('removes every look-alike when asked', () => {
    const pool = buildAlphabet(opts({ excludeAmbiguous: true }))
    for (const char of AMBIGUOUS)
      expect(pool).not.toContain(char)
    expect(pool).toContain('a')
    expect(pool).toContain('7')
  })

  it('keeps look-alikes by default', () => {
    expect(buildAlphabet(opts())).toContain('O')
  })
})

describe('createRandomInt', () => {
  it('stays inside the requested range', () => {
    const draw = createRandomInt(counterFill())
    for (let i = 0; i < 500; i++) {
      const v = draw(7)
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(7)
    }
  })

  it('rejects the values that would skew the result, instead of taking a modulo', () => {
    // For max=3 the acceptable range stops at 4294967295, so 0xFFFFFFFF must be
    // discarded and a fresh draw taken. Using `% max` on it would return 0
    // slightly too often — small, real, and free to avoid.
    const sequence = [[255, 255, 255, 255], [0, 0, 0, 7]]
    let calls = 0
    const draw = createRandomInt((bytes) => {
      bytes.set(sequence[Math.min(calls, sequence.length - 1)]!)
      calls++
    })
    expect(draw(3)).toBe(7 % 3)
    expect(calls).toBe(2)
  })

  it('covers the whole range roughly evenly', () => {
    const draw = createRandomInt(counterFill(12345))
    const counts = Array.from({ length: 10 }).fill(0)
    for (let i = 0; i < 20_000; i++) counts[draw(10)]++
    // A uniform draw puts 2000 in each bucket; allow generous slack so this
    // catches a broken generator without being flaky.
    for (const count of counts) {
      expect(count).toBeGreaterThan(1500)
      expect(count).toBeLessThan(2500)
    }
  })

  it('refuses a non-positive range', () => {
    expect(() => createRandomInt(counterFill())(0)).toThrow()
  })
})

describe('shuffle', () => {
  it('keeps every element, changing only the order', () => {
    const input = [...'abcdefghij']
    const out = shuffle(input, createRandomInt(counterFill()))
    expect(out).toHaveLength(input.length)
    expect([...out].sort()).toEqual([...input].sort())
  })

  it('does not mutate its input', () => {
    const input = [...'abcdef']
    const copy = [...input]
    shuffle(input, createRandomInt(counterFill()))
    expect(input).toEqual(copy)
  })

  it('actually reorders', () => {
    const input = [...'abcdefghijklmnopqrst']
    expect(shuffle(input, createRandomInt(counterFill(9))).join('')).not.toBe(input.join(''))
  })
})

describe('generatePassword', () => {
  const draw = () => createRandomInt(counterFill(7))

  it('produces the requested length', () => {
    for (const length of [1, 8, 20, 64, 128])
      expect(generatePassword(opts({ length, requireEach: false }), draw())).toHaveLength(length)
  })

  it('only uses characters from the selected sets', () => {
    const options = opts({ symbols: false, length: 200 })
    const pool = buildAlphabet(options)
    for (const char of generatePassword(options, draw()))
      expect(pool).toContain(char)
  })

  it('never emits a look-alike when they are excluded', () => {
    const password = generatePassword(opts({ excludeAmbiguous: true, length: 300 }), draw())
    for (const char of AMBIGUOUS)
      expect(password).not.toContain(char)
  })

  it('includes at least one from every selected set when required', () => {
    // The interesting case is a short password, where a naive fill would often
    // miss a set entirely.
    for (let seed = 0; seed < 40; seed++) {
      const password = generatePassword(opts({ length: 4, requireEach: true }), createRandomInt(counterFill(seed)))
      expect(password).toHaveLength(4)
      expect([...password].some(c => CHARSETS.lowercase.includes(c))).toBe(true)
      expect([...password].some(c => CHARSETS.uppercase.includes(c))).toBe(true)
      expect([...password].some(c => CHARSETS.digits.includes(c))).toBe(true)
      expect([...password].some(c => CHARSETS.symbols.includes(c))).toBe(true)
    }
  })

  it('does not park the required characters at the front', () => {
    // Placing one of each and stopping there would make the first four
    // positions predictable by set. They must be shuffled through.
    const firsts = new Set<string>()
    for (let seed = 0; seed < 30; seed++)
      firsts.add(generatePassword(opts({ length: 12 }), createRandomInt(counterFill(seed)))[0]!)
    expect(firsts.size).toBeGreaterThan(3)
  })

  it('refuses when no set is selected', () => {
    expect(() => generatePassword(opts({ lowercase: false, uppercase: false, digits: false, symbols: false }), draw()))
      .toThrow(/at least one character set/i)
  })

  it('refuses a length too short to hold every required set', () => {
    expect(() => generatePassword(opts({ length: 3, requireEach: true }), draw()))
      .toThrow(/at least 4/)
  })

  it('gives a different password each time', () => {
    const seen = new Set<string>()
    for (let seed = 0; seed < 25; seed++)
      seen.add(generatePassword(opts({ length: 16 }), createRandomInt(counterFill(seed))))
    expect(seen.size).toBe(25)
  })
})

describe('entropyBits', () => {
  it('is length times log2 of the pool', () => {
    const options = opts({ uppercase: false, digits: false, symbols: false, length: 10 })
    expect(entropyBits(options)).toBeCloseTo(10 * Math.log2(26), 6)
  })

  it('rises with both length and pool size', () => {
    expect(entropyBits(opts({ length: 20 }))).toBeGreaterThan(entropyBits(opts({ length: 10 })))
    expect(entropyBits(opts({ length: 16 }))).toBeGreaterThan(entropyBits(opts({ length: 16, symbols: false })))
  })

  it('is zero with nothing to draw from', () => {
    expect(entropyBits(opts({ lowercase: false, uppercase: false, digits: false, symbols: false }))).toBe(0)
    expect(entropyBits(opts({ length: 0 }))).toBe(0)
  })
})

describe('strength', () => {
  it('bands the usual figures the way guidance does', () => {
    expect(strength(30)).toBe('weak')
    expect(strength(60)).toBe('fair')
    expect(strength(80)).toBe('strong')
    expect(strength(128)).toBe('excellent')
  })

  it('is monotonic across its boundaries', () => {
    const order = ['weak', 'fair', 'strong', 'excellent']
    let last = -1
    for (const bits of [10, 49, 50, 69, 70, 99, 100, 200]) {
      const index = order.indexOf(strength(bits))
      expect(index).toBeGreaterThanOrEqual(last)
      last = index
    }
  })
})

describe('crackTime', () => {
  it('calls a tiny space instant', () => {
    expect(crackTime(0)).toBe('instantly')
    expect(crackTime(10)).toBe('instantly')
  })

  it('grows with entropy', () => {
    expect(crackTime(40)).not.toBe(crackTime(80))
    expect(crackTime(128)).toMatch(/years|universe/)
  })

  it('tops out with something honest rather than a silly number', () => {
    expect(crackTime(512)).toBe('longer than the universe has existed')
  })

  it('respects the assumed guess rate', () => {
    // A slower attacker takes longer for the same password.
    expect(crackTime(60, 1e6)).not.toBe(crackTime(60, 1e12))
  })
})
