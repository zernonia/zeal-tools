import { describe, expect, it } from 'vitest'
import { createRandomInt, shuffle } from './random'

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
