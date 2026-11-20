/**
 * Unbiased integer draws over an injected byte source.
 *
 * Written here rather than taken from `shared/core/random` because that one
 * draws 32 bits, and this tool promises ranges up to 2^53 — the whole span of
 * integers a JavaScript number can hold exactly. The method is the same idea,
 * rejection sampling, done by masking instead of by a limit:
 *
 *   1. Find the smallest number of bits `b` that can express n − 1.
 *   2. Read that many random bits. The value is uniform over [0, 2^b).
 *   3. If it is n or more, throw it away and read again.
 *
 * Every value below n is reached by exactly one bit pattern, so each is
 * exactly equally likely. 2^b < 2n, so more than half of all draws are kept
 * and the expected number of reads is under two. Taking `value % n` instead
 * would be faster and wrong: unless n is a power of two, the low values get
 * one more bit pattern each than the high ones.
 */

/** Fills the array with random bytes — `crypto.getRandomValues` in practice. */
export type ByteSource = (bytes: Uint8Array) => void

/** Draws an integer in [0, n). */
export type RandomBelow = (n: number) => number

/** 2^53 — the largest number of outcomes a draw may have. */
export const MAX_OUTCOMES = 2 ** 53

function bitLength(value: number): number {
  let bits = 0
  let rest = value
  while (rest >= 1) {
    rest = Math.floor(rest / 2)
    bits++
  }
  return bits
}

export function createRandomBelow(fill: ByteSource): RandomBelow {
  const buffer = new Uint8Array(7)
  return (n: number) => {
    if (!Number.isInteger(n) || n < 1 || n > MAX_OUTCOMES)
      throw new RangeError(`n must be a whole number from 1 to 2^53, not ${n}`)
    if (n === 1)
      return 0

    const bits = bitLength(n - 1)
    const length = Math.ceil(bits / 8)
    // Bits in the first byte beyond the ones we need, masked off.
    const mask = 0xFF >> (length * 8 - bits)
    const bytes = buffer.subarray(0, length)

    for (;;) {
      fill(bytes)
      // Every partial sum stays below 2^bits ≤ 2^53, so this is exact.
      let value = bytes[0]! & mask
      for (let i = 1; i < length; i++)
        value = value * 256 + bytes[i]!
      if (value < n)
        return value
    }
  }
}
