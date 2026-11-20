/**
 * Code 128, from ISO/IEC 15417.
 *
 * 107 symbol characters, each eleven modules of three bars and three spaces
 * (the stop is thirteen). What a value *means* depends on the active code
 * set: A holds upper case and control characters, B upper and lower case, and
 * C packs two digits into one symbol — which is the whole reason to switch.
 *
 * ## Choosing code sets
 *
 * The usual advice ("use C for four or more digits") is a heuristic, and it
 * is wrong at the edges — an odd-length run, a run in the middle of text, a
 * lone control character in lower-case text. This encoder does not guess. It
 * runs a shortest-path search over (position, code set): from each state it
 * may encode one character in A or B, a pair of digits in C, borrow one
 * character from the other of A/B with SHIFT, or switch sets. Each step costs
 * the symbols it emits, so the cheapest path to the end is, by construction,
 * the fewest symbols that can encode the input. Ties go to the path with
 * fewer set changes, then to code set B, so the output is deterministic.
 */
import type { Barcode } from './types'
import { BarcodeError, widthsToModules } from './types'

/** Bar/space widths for values 0–105, then the 7-element stop (106). */
export const CODE128_PATTERNS = [
  '212222',
  '222122',
  '222221',
  '121223',
  '121322',
  '131222',
  '122213',
  '122312',
  '132212',
  '221213',
  '221312',
  '231212',
  '112232',
  '122132',
  '122231',
  '113222',
  '123122',
  '123221',
  '223211',
  '221132',
  '221231',
  '213212',
  '223112',
  '312131',
  '311222',
  '321122',
  '321221',
  '312212',
  '322112',
  '322211',
  '212123',
  '212321',
  '232121',
  '111323',
  '131123',
  '131321',
  '112313',
  '132113',
  '132311',
  '211313',
  '231113',
  '231311',
  '112133',
  '112331',
  '132131',
  '113123',
  '113321',
  '133121',
  '313121',
  '211331',
  '231131',
  '213113',
  '213311',
  '213131',
  '311123',
  '311321',
  '331121',
  '312113',
  '312311',
  '332111',
  '314111',
  '221411',
  '431111',
  '111224',
  '111422',
  '121124',
  '121421',
  '141122',
  '141221',
  '112214',
  '112412',
  '122114',
  '122411',
  '142112',
  '142211',
  '241211',
  '221114',
  '413111',
  '241112',
  '134111',
  '111242',
  '121142',
  '121241',
  '114212',
  '124112',
  '124211',
  '411212',
  '421112',
  '421211',
  '212141',
  '214121',
  '412121',
  '111143',
  '111341',
  '131141',
  '114113',
  '114311',
  '411113',
  '411311',
  '113141',
  '114131',
  '311141',
  '411131',
  '211412',
  '211214',
  '211232',
  '2331112',
] as const

export type CodeSet = 'A' | 'B' | 'C'

export const START: Record<CodeSet, number> = { A: 103, B: 104, C: 105 }
export const STOP = 106
const SHIFT = 98
/** Value that switches *to* a set, from whichever set is active. */
const SWITCH_TO: Record<CodeSet, number> = { A: 101, B: 100, C: 99 }

/** Longest input accepted. Beyond this a symbol is too long to scan reliably anyway. */
export const CODE128_MAX_LENGTH = 80

const inA = (code: number) => code <= 95
const inB = (code: number) => code >= 32 && code <= 127
const isDigit = (code: number) => code >= 48 && code <= 57

function valueIn(set: 'A' | 'B', code: number): number {
  if (set === 'A')
    return code < 32 ? code + 64 : code - 32
  return code - 32
}

type Step
  = | { kind: 'start', set: CodeSet }
    | { kind: 'switch', set: CodeSet }
    | { kind: 'char', set: CodeSet, value: number }
    | { kind: 'shift', set: 'A' | 'B', value: number }

/** Back-pointers are the previous cell itself, so a later relaxation cannot rewrite a path already chosen. */
interface Cell { symbols: number, switches: number, prev: Cell | null, steps: Step[] }

const SETS: CodeSet[] = ['B', 'A', 'C']

function better(a: { symbols: number, switches: number }, b: Cell | undefined): boolean {
  if (!b)
    return true
  return a.symbols < b.symbols || (a.symbols === b.symbols && a.switches < b.switches)
}

/**
 * The fewest-symbol sequence of code-set decisions for `input`. Returned as
 * steps so tests and the UI can say which set each character went into.
 */
export function planCode128(input: string): Step[] {
  const codes = [...input].map(ch => ch.codePointAt(0)!)
  const n = codes.length
  const table: Partial<Record<CodeSet, Cell>>[] = Array.from({ length: n + 1 }, () => ({}))

  for (const set of SETS)
    table[0]![set] = { symbols: 1, switches: 0, prev: null, steps: [{ kind: 'start', set }] }

  const relax = (i: number, set: CodeSet, base: Cell, add: { symbols: number, switches: number }, steps: Step[]) => {
    const cand = { symbols: base.symbols + add.symbols, switches: base.switches + add.switches }
    if (better(cand, table[i]![set]))
      table[i]![set] = { ...cand, prev: base, steps }
  }

  for (let i = 0; i <= n; i++) {
    // Switching in place. Relaxed from a snapshot so two switches never chain:
    // going A→B→C costs more than A→C and is never the shortest path.
    if (i > 0) {
      const snapshot = { ...table[i] }
      for (const from of SETS) {
        if (!snapshot[from])
          continue
        for (const to of SETS) {
          if (to === from)
            continue
          relax(i, to, snapshot[from]!, { symbols: 1, switches: 1 }, [{ kind: 'switch', set: to }])
        }
      }
    }
    if (i === n)
      break
    const code = codes[i]!
    for (const set of SETS) {
      const cell = table[i]![set]
      if (!cell)
        continue
      if (set === 'C') {
        if (i + 1 < n && isDigit(code) && isDigit(codes[i + 1]!)) {
          const value = (code - 48) * 10 + (codes[i + 1]! - 48)
          relax(i + 2, 'C', cell, { symbols: 1, switches: 0 }, [{ kind: 'char', set: 'C', value }])
        }
        continue
      }
      const other = set === 'A' ? 'B' : 'A'
      const here = set === 'A' ? inA(code) : inB(code)
      const there = other === 'A' ? inA(code) : inB(code)
      if (here)
        relax(i + 1, set, cell, { symbols: 1, switches: 0 }, [{ kind: 'char', set, value: valueIn(set, code) }])
      else if (there)
        relax(i + 1, set, cell, { symbols: 2, switches: 1 }, [{ kind: 'shift', set: other, value: valueIn(other, code) }])
    }
  }

  let end: CodeSet | null = null
  for (const set of SETS) {
    const cell = table[n]![set]
    if (cell && (end === null || better(cell, table[n]![end])))
      end = set
  }
  if (end === null)
    throw new BarcodeError('This text cannot be encoded in Code 128.')

  const steps: Step[] = []
  for (let cell: Cell | null = table[n]![end]!; cell; cell = cell.prev)
    steps.unshift(...cell.steps)
  return steps
}

/** Symbol values for a plan, without check or stop. */
function stepValues(steps: Step[]): number[] {
  const values: number[] = []
  for (const step of steps) {
    switch (step.kind) {
      case 'start': values.push(START[step.set]); break
      case 'switch': values.push(SWITCH_TO[step.set]); break
      case 'char': values.push(step.value); break
      case 'shift': values.push(SHIFT, step.value); break
    }
  }
  return values
}

/** Mod-103 check: the start value plus each following value times its position. */
export function code128Checksum(values: number[]): number {
  let sum = values[0]!
  for (let i = 1; i < values.length; i++)
    sum += values[i]! * i
  return sum % 103
}

/** Printable form of the input for the line under the bars. */
function readable(input: string): string {
  return [...input].map(ch => (ch.codePointAt(0)! < 32 || ch === '\u007F' ? ' ' : ch)).join('')
}

export function encodeCode128(input: string): Barcode {
  if (!input)
    throw new BarcodeError('Enter something to encode.')
  const chars = [...input]
  if (chars.length > CODE128_MAX_LENGTH)
    throw new BarcodeError(`Code 128 here takes up to ${CODE128_MAX_LENGTH} characters — you entered ${chars.length}. Longer symbols get too wide to scan; consider a QR code.`)
  const bad = chars.find(ch => ch.codePointAt(0)! > 127)
  if (bad)
    throw new BarcodeError(`Code 128 covers plain ASCII only — "${bad}" is outside it. Accented letters, symbols like £ and emoji need a QR code.`)

  const values = stepValues(planCode128(input))
  const check = code128Checksum(values)
  const symbols = [...values, check, STOP]
  const modules = symbols.map(v => widthsToModules(CODE128_PATTERNS[v]!)).join('')
  const text = readable(input)
  return {
    symbology: 'code128',
    modules,
    guards: '',
    quietLeft: 10,
    quietRight: 10,
    data: input,
    text: [{ text, x: [modules.length / 2] }],
    symbols,
  }
}
