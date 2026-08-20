/**
 * Randomness primitives.
 *
 * Shared because two tools now rest on the same property: a password is only
 * as unguessable as its draw, and a wheel that picks a winner is only fair if
 * every name is equally likely. Both fail in the same quiet way — a modulo
 * that looks uniform and is not.
 *
 * The byte source is injected rather than reached for, so these stay pure and
 * a test can feed them a known sequence.
 */

/** Draws an integer in [0, max). */
export type RandomInt = (max: number) => number

/**
 * Unbiased integer draw over a byte source.
 *
 * Rejection sampling rather than `% max`: the modulo of a uniform 32-bit value
 * is *not* uniform unless max divides 2^32, which for an alphabet of 26 or 94
 * it does not. The bias is small but it is real, and it is free to avoid.
 */
export function createRandomInt(fill: (bytes: Uint8Array) => void): RandomInt {
  const bytes = new Uint8Array(4)
  return (max: number) => {
    if (max <= 0)
      throw new Error('max must be positive')
    // Largest multiple of `max` that fits in 2^32; anything above it is
    // rejected so every remaining value maps to exactly one outcome.
    const limit = Math.floor(0x100000000 / max) * max
    for (;;) {
      fill(bytes)
      const value = ((bytes[0]! << 24) >>> 0) + (bytes[1]! << 16) + (bytes[2]! << 8) + bytes[3]!
      if (value < limit)
        return value % max
    }
  }
}

/** The pool a given set of options draws from. */

/** Fisher–Yates, drawing each swap from the injected source. */
export function shuffle<T>(items: T[], randomInt: RandomInt): T[] {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = randomInt(i + 1)
    ;[out[i], out[j]] = [out[j]!, out[i]!]
  }
  return out
}
