import type { RandomBelow } from './random'

/**
 * Standard dice notation, as tabletop players write it.
 *
 *   d20          one twenty-sided die
 *   2d6+3        two six-sided dice, plus three
 *   4d6kh3       four d6, keep the highest three (ability scores)
 *   2d20kl1      two d20, keep the lowest (disadvantage)
 *   d%  d100     percentile
 *   1d8+2d6-1    several groups and modifiers, added left to right
 *
 * Parsed by a hand-written scanner that walks the string once. Regular
 * expressions were the obvious alternative, and this repository has twice had
 * to replace a pattern that backtracked badly on hostile input; a scanner
 * cannot, and it can say exactly where the notation went wrong.
 */

export const MAX_DICE = 100
export const MAX_SIDES = 1000
export const MAX_TERMS = 12
export const MAX_MODIFIER = 1_000_000

/** Two d20, keep the higher — the fifth-edition rule for rolling with advantage. */
export const ADVANTAGE = '2d20kh1'
/** Two d20, keep the lower. */
export const DISADVANTAGE = '2d20kl1'

export interface Keep {
  which: 'highest' | 'lowest'
  count: number
}

export interface DiceTerm {
  kind: 'dice'
  sign: 1 | -1
  count: number
  sides: number
  keep: Keep | null
}

export interface ConstantTerm {
  kind: 'constant'
  sign: 1 | -1
  value: number
}

export type Term = DiceTerm | ConstantTerm

export interface DiceExpression {
  terms: Term[]
  /** Tidied notation: lower case, no spaces, `d%` written as `d100`. */
  notation: string
}

export class DiceNotationError extends Error {
  constructor(message: string, readonly position: number) {
    super(message)
    this.name = 'DiceNotationError'
  }
}

function isDigit(char: string | undefined): boolean {
  return char !== undefined && char >= '0' && char <= '9'
}

export function parseDice(input: string): DiceExpression {
  // Whitespace carries no meaning in notation, and "2D6" is as common as "2d6".
  const source = input.replace(/\s+/g, '').toLowerCase()
  if (!source)
    throw new DiceNotationError('Enter some dice, for example 2d6+3 or d20.', 0)

  let at = 0
  const terms: Term[] = []

  const readInt = (): number | null => {
    const start = at
    while (isDigit(source[at]))
      at++
    if (at === start)
      return null
    // Long digit runs would lose precision long before they hit a limit.
    if (at - start > 9)
      throw new DiceNotationError(`${source.slice(start, at)} is far too large.`, start)
    return Number(source.slice(start, at))
  }

  while (at < source.length) {
    if (terms.length === MAX_TERMS)
      throw new DiceNotationError(`At most ${MAX_TERMS} groups and modifiers in one roll.`, at)

    let sign: 1 | -1 = 1
    const signAt = at
    if (source[at] === '+' || source[at] === '-') {
      sign = source[at] === '-' ? -1 : 1
      at++
    }
    else if (terms.length > 0) {
      throw new DiceNotationError(`Expected + or − before "${source.slice(at)}".`, at)
    }

    const termAt = at
    const leading = readInt()

    if (source[at] !== 'd') {
      if (leading === null) {
        const found = source[at]
        throw new DiceNotationError(
          found === undefined
            ? `Expected dice or a number after "${source[signAt]}".`
            : `Unexpected "${found}". Notation looks like 2d6+3.`,
          at,
        )
      }
      if (leading > MAX_MODIFIER)
        throw new DiceNotationError(`Modifiers can be at most ${MAX_MODIFIER.toLocaleString('en')}.`, termAt)
      terms.push({ kind: 'constant', sign, value: leading })
      continue
    }

    at++ // the d
    const count = leading ?? 1
    let sides: number | null
    if (source[at] === '%') {
      sides = 100
      at++
    }
    else {
      sides = readInt()
    }
    if (sides === null)
      throw new DiceNotationError('Expected the number of sides after "d", as in d6 or d20.', at)
    if (count < 1 || count > MAX_DICE)
      throw new DiceNotationError(`Roll between 1 and ${MAX_DICE} dice in a group.`, termAt)
    if (sides < 2 || sides > MAX_SIDES)
      throw new DiceNotationError(`A die needs from 2 to ${MAX_SIDES.toLocaleString('en')} sides.`, termAt)

    let keep: Keep | null = null
    if (source[at] === 'k') {
      const keepAt = at
      at++
      let which: Keep['which'] = 'highest'
      if (source[at] === 'h' || source[at] === 'l') {
        which = source[at] === 'l' ? 'lowest' : 'highest'
        at++
      }
      const kept = readInt()
      if (kept === null)
        throw new DiceNotationError('Say how many dice to keep, as in 4d6kh3.', at)
      if (kept < 1 || kept > count)
        throw new DiceNotationError(`Can only keep between 1 and ${count} of ${count} dice.`, keepAt)
      keep = { which, count: kept }
    }

    terms.push({ kind: 'dice', sign, count, sides, keep })
  }

  return { terms, notation: formatTerms(terms) }
}

function formatTerms(terms: readonly Term[]): string {
  return terms.map((term, index) => {
    const sign = term.sign === -1 ? '-' : index === 0 ? '' : '+'
    if (term.kind === 'constant')
      return `${sign}${term.value}`
    const keep = term.keep ? `k${term.keep.which === 'highest' ? 'h' : 'l'}${term.keep.count}` : ''
    return `${sign}${term.count === 1 ? '' : term.count}d${term.sides}${keep}`
  }).join('')
}

export interface RolledGroup {
  notation: string
  sign: 1 | -1
  sides: number
  rolls: number[]
  /** Parallel to `rolls`: false for a die a keep rule dropped. */
  kept: boolean[]
  /** Sum of the kept dice, before the sign. */
  subtotal: number
}

export interface DiceRoll {
  notation: string
  groups: RolledGroup[]
  /** All constants, added together. */
  modifier: number
  total: number
  /** Lowest and highest totals this notation can produce. */
  range: { min: number, max: number }
}

/**
 * Which dice a keep rule keeps. Ties go to the earlier die, so the result is
 * the same however the dice are displayed — it never affects the total.
 */
function keptMask(rolls: readonly number[], keep: Keep | null): boolean[] {
  if (!keep)
    return rolls.map(() => true)
  const order = rolls
    .map((value, index) => ({ value, index }))
    .sort((a, b) => (keep.which === 'highest' ? b.value - a.value : a.value - b.value) || a.index - b.index)
  const mask = rolls.map(() => false)
  for (const { index } of order.slice(0, keep.count))
    mask[index] = true
  return mask
}

export function rollDice(expression: DiceExpression | string, below: RandomBelow): DiceRoll {
  const parsed = typeof expression === 'string' ? parseDice(expression) : expression
  const groups: RolledGroup[] = []
  let modifier = 0
  let min = 0
  let max = 0

  for (const term of parsed.terms) {
    if (term.kind === 'constant') {
      modifier += term.sign * term.value
      min += term.sign * term.value
      max += term.sign * term.value
      continue
    }
    const rolls = Array.from({ length: term.count }, () => below(term.sides) + 1)
    const kept = keptMask(rolls, term.keep)
    const subtotal = rolls.reduce((sum, value, index) => sum + (kept[index] ? value : 0), 0)
    groups.push({
      notation: formatTerms([{ ...term, sign: 1 }]),
      sign: term.sign,
      sides: term.sides,
      rolls,
      kept,
      subtotal,
    })
    const keptCount = term.keep?.count ?? term.count
    if (term.sign === 1) {
      min += keptCount
      max += keptCount * term.sides
    }
    else {
      min -= keptCount * term.sides
      max -= keptCount
    }
  }

  const total = groups.reduce((sum, group) => sum + group.sign * group.subtotal, modifier)
  return { notation: parsed.notation, groups, modifier, total, range: { min, max } }
}

/** One line for the clipboard: `2d6+3: [4, 2] + 3 = 9`, dropped dice in parentheses. */
export function describeRoll(roll: DiceRoll): string {
  const parts = roll.groups.map((group, index) => {
    const dice = group.rolls.map((value, i) => (group.kept[i] ? String(value) : `(${value})`)).join(', ')
    const sign = group.sign === -1 ? '− ' : index === 0 ? '' : '+ '
    return `${sign}[${dice}]`
  })
  if (roll.modifier !== 0)
    parts.push(`${roll.modifier < 0 ? '−' : '+'} ${Math.abs(roll.modifier)}`)
  return `${roll.notation}: ${parts.join(' ')} = ${roll.total}`
}
