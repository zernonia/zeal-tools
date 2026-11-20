import type { RandomBelow } from './random'
import { MAX_OUTCOMES } from './random'

/**
 * Random numbers in an inclusive range.
 *
 * Decimals are handled as integers on a finer grid rather than by scaling a
 * random fraction: 1.00 to 2.00 to two places is the 101 integers 100–200,
 * divided by 100. That keeps both ends reachable and every value equally
 * likely, which "random() × (max − min) + min" does not — it can never return
 * max, and floating-point rounding makes some values fractionally more common.
 */

export const MAX_COUNT = 1000
export const MAX_DECIMALS = 10

export type SortOrder = 'none' | 'asc' | 'desc'

export interface NumberOptions {
  min: number
  max: number
  /** How many numbers to draw, 1–1000. */
  count: number
  /** No number appears twice. */
  unique: boolean
  sort: SortOrder
  /** Fixed decimal places, 0–10. */
  decimals: number
}

export const DEFAULT_NUMBER_OPTIONS: NumberOptions = {
  min: 1,
  max: 100,
  count: 1,
  unique: false,
  sort: 'none',
  decimals: 0,
}

export interface NumberResult {
  numbers: number[]
  /** The same numbers to exactly `decimals` places, ready to show or copy. */
  formatted: string[]
  /** How many different values the range holds at this precision. */
  possible: number
}

/** The integer grid a range covers at a given precision. */
export function numberGrid(min: number, max: number, decimals: number) {
  if (!Number.isFinite(min) || !Number.isFinite(max))
    throw new RangeError('Minimum and maximum must be numbers.')
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > MAX_DECIMALS)
    throw new RangeError(`Decimal places must be a whole number from 0 to ${MAX_DECIMALS}.`)
  if (min > max)
    throw new RangeError('The minimum is larger than the maximum.')

  const scale = 10 ** decimals
  // Rounded rather than ceil/floor: 0.1 × 10 is 1.0000000000000002 in binary
  // floating point, and the user typed 0.1, not something just above it.
  const low = Math.round(min * scale)
  const high = Math.round(max * scale)
  if (!Number.isSafeInteger(low) || !Number.isSafeInteger(high)) {
    throw new RangeError(decimals > 0
      ? 'That range is too large for this many decimal places. Use fewer places or a smaller range.'
      : 'Minimum and maximum must be between −9,007,199,254,740,991 and 9,007,199,254,740,991.')
  }

  // Compared as `span >= 2^53`, not `span + 1 > 2^53`: 2^53 + 1 is not a
  // double, rounds down to 2^53, and would slip through.
  const span = high - low
  if (span >= MAX_OUTCOMES)
    throw new RangeError('The range is too wide: it can hold at most 2^53 different values.')

  return { low, high, scale, possible: span + 1 }
}

/**
 * Draws `count` distinct offsets from [0, n), in random order.
 *
 * A Fisher–Yates shuffle that only ever touches the positions it swaps,
 * keeping them in a map — so drawing 1,000 unique numbers from a range of a
 * trillion costs 1,000 steps, not a trillion-entry array. Each ordered
 * selection is equally likely, exactly as with a full shuffle.
 */
function sampleWithoutReplacement(n: number, count: number, below: RandomBelow): number[] {
  const swapped = new Map<number, number>()
  const out: number[] = []
  for (let i = 0; i < count; i++) {
    const j = i + below(n - i)
    const atJ = swapped.get(j) ?? j
    const atI = swapped.get(i) ?? i
    swapped.set(j, atI)
    out.push(atJ)
  }
  return out
}

export function generateNumbers(options: NumberOptions, below: RandomBelow): NumberResult {
  const { min, max, count, unique, sort, decimals } = options
  if (!Number.isInteger(count) || count < 1 || count > MAX_COUNT)
    throw new RangeError(`Count must be a whole number from 1 to ${MAX_COUNT.toLocaleString('en')}.`)

  const { low, scale, possible } = numberGrid(min, max, decimals)
  if (unique && count > possible) {
    const unit = decimals > 0 ? `values to ${decimals} decimal place${decimals === 1 ? '' : 's'}` : 'whole numbers'
    throw new RangeError(
      `There are only ${possible.toLocaleString('en')} ${unit} from ${format(min, decimals)} to ${format(max, decimals)}, `
      + `so ${count.toLocaleString('en')} cannot all be different. Widen the range, lower the count or allow repeats.`,
    )
  }

  const offsets = unique
    ? sampleWithoutReplacement(possible, count, below)
    : Array.from({ length: count }, () => below(possible))

  let integers = offsets.map(offset => low + offset)
  if (sort === 'asc')
    integers = integers.sort((a, b) => a - b)
  else if (sort === 'desc')
    integers = integers.sort((a, b) => b - a)

  const numbers = integers.map(value => (decimals === 0 ? value : value / scale))
  return { numbers, formatted: numbers.map(value => format(value, decimals)), possible }
}

/** Exactly `decimals` places, trailing zeros kept: 2.50 reads as a two-place result, 2.5 does not. */
export function format(value: number, decimals: number): string {
  return decimals === 0 ? String(Math.round(value)) : value.toFixed(decimals)
}
