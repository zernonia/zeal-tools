import type { RandomBelow } from './random'

/**
 * Coin flips. One random bit each — `below(2)` reads a single byte, masks it
 * to its lowest bit and never has to reject, so there is no way for one side
 * to come up more often than the other.
 */

export const MAX_FLIPS = 10_000

export type CoinSide = 'heads' | 'tails'

export interface Streak {
  side: CoinSide
  length: number
}

export interface CoinResult {
  flips: CoinSide[]
  heads: number
  tails: number
  /** The longest run of one side; the earliest if several tie. Null for no flips. */
  longest: Streak | null
}

export function flipCoins(count: number, below: RandomBelow): CoinResult {
  if (!Number.isInteger(count) || count < 1 || count > MAX_FLIPS)
    throw new RangeError(`Number of flips must be a whole number from 1 to ${MAX_FLIPS.toLocaleString('en')}.`)
  const flips = Array.from({ length: count }, (): CoinSide => (below(2) === 0 ? 'heads' : 'tails'))
  return tally(flips)
}

export function tally(flips: readonly CoinSide[]): CoinResult {
  let heads = 0
  for (const side of flips) {
    if (side === 'heads')
      heads++
  }
  return { flips: [...flips], heads, tails: flips.length - heads, longest: longestStreak(flips) }
}

export function longestStreak(flips: readonly CoinSide[]): Streak | null {
  if (flips.length === 0)
    return null
  let best: Streak = { side: flips[0]!, length: 1 }
  let run = 1
  for (let i = 1; i < flips.length; i++) {
    run = flips[i] === flips[i - 1] ? run + 1 : 1
    if (run > best.length)
      best = { side: flips[i]!, length: run }
  }
  return best
}

/** The run the sequence is currently on — what "five heads in a row" refers to. */
export function currentStreak(flips: readonly CoinSide[]): Streak | null {
  if (flips.length === 0)
    return null
  const side = flips[flips.length - 1]!
  let length = 0
  for (let i = flips.length - 1; i >= 0 && flips[i] === side; i--)
    length++
  return { side, length }
}
