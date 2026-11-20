import type { CoinResult } from './coin'
import type { DiceRoll } from './dice'
import type { NumberOptions, NumberResult, SortOrder } from './numbers'
import type { RandomBelow } from './random'
import { flipCoins } from './coin'
import { describeRoll, rollDice } from './dice'
import { DEFAULT_NUMBER_OPTIONS, generateNumbers } from './numbers'

/**
 * One reading of the parameters for both the REST route and the MCP tool.
 *
 * A query string arrives as strings and MCP arguments as JSON, so this
 * accepts either — and having it in one place is what stops the two
 * surfaces quietly disagreeing about what `unique=1` or a missing `max` means.
 */

export type RandomResult
  = | ({ mode: 'numbers' } & NumberResult & NumberOptions)
    | ({ mode: 'coin' } & CoinResult)
    | ({ mode: 'dice', text: string } & DiceRoll)

type Params = Record<string, unknown>

function present(params: Params, key: string): boolean {
  const value = params[key]
  return value !== undefined && value !== null && value !== ''
}

function readNumber(params: Params, key: string, fallback: number): number {
  if (!present(params, key))
    return fallback
  const raw = params[key]
  const value = typeof raw === 'number' ? raw : Number(String(raw).trim())
  if (!Number.isFinite(value))
    throw new RangeError(`${key} must be a number.`)
  return value
}

function readBoolean(params: Params, key: string, fallback: boolean): boolean {
  if (!present(params, key))
    return fallback
  const raw = params[key]
  if (typeof raw === 'boolean')
    return raw
  return raw === 'true' || raw === '1' || raw === 1
}

/**
 * Dice notation from a URL. An unencoded `+` in a query string means a space,
 * so `?dice=2d6+3` arrives as "2d6 3" — silently rolling 2d63 would be the
 * worst possible reading. A space between a number and the next term is put
 * back as the plus it was.
 */
export function restorePlus(notation: string): string {
  return notation.replace(/([\d%])\s+(?=[\dd])/gi, '$1+')
}

export function runRandom(params: Params, below: RandomBelow): RandomResult {
  const wantsDice = present(params, 'dice')
  const wantsCoin = present(params, 'coin')
  if (wantsDice && wantsCoin)
    throw new RangeError('Ask for dice or coin, not both.')

  if (wantsDice) {
    const roll = rollDice(restorePlus(String(params.dice)), below)
    return { mode: 'dice', ...roll, text: describeRoll(roll) }
  }

  if (wantsCoin) {
    const raw = params.coin
    // `coin=true` reads naturally for a single flip.
    const count = raw === true || raw === 'true' ? 1 : readNumber(params, 'coin', 1)
    return { mode: 'coin', ...flipCoins(count, below) }
  }

  const sort = present(params, 'sort') ? String(params.sort) : DEFAULT_NUMBER_OPTIONS.sort
  if (sort !== 'none' && sort !== 'asc' && sort !== 'desc')
    throw new RangeError('sort must be none, asc or desc.')

  const options: NumberOptions = {
    min: readNumber(params, 'min', DEFAULT_NUMBER_OPTIONS.min),
    max: readNumber(params, 'max', DEFAULT_NUMBER_OPTIONS.max),
    count: readNumber(params, 'count', DEFAULT_NUMBER_OPTIONS.count),
    unique: readBoolean(params, 'unique', DEFAULT_NUMBER_OPTIONS.unique),
    sort: sort as SortOrder,
    decimals: readNumber(params, 'decimals', DEFAULT_NUMBER_OPTIONS.decimals),
  }
  return { mode: 'numbers', ...options, ...generateNumbers(options, below) }
}

/** The plain-text answer an agent reads first. */
export function summarise(result: RandomResult): string {
  switch (result.mode) {
    case 'dice':
      return result.text
    case 'coin':
      return result.flips.length === 1
        ? result.flips[0]!
        : `${result.heads} heads, ${result.tails} tails: ${result.flips.join(', ')}`
    case 'numbers':
      return result.formatted.join(', ')
  }
}
