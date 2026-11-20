/**
 * ITF-14, the GS1 outer-carton code: fourteen digits in Interleaved 2 of 5
 * (ISO/IEC 16390).
 *
 * Each digit is five elements, two of them wide. Digits travel in pairs: the
 * first is drawn in the bars and the second in the spaces between them,
 * which is why ITF only ever holds an even number of digits. Wide is drawn at
 * three times narrow, the ratio GS1 recommends.
 *
 * Bearer bars — the heavy frame along the top and bottom — exist because ITF
 * has no start/stop strong enough to stop a scanner that clips the edge of
 * the symbol reading a shorter, valid-looking number. They are on by default.
 */
import type { Barcode } from './types'
import { cleanDigits, withCheckDigit } from './ean'
import { widthsToModules } from './types'

/** Wide (1) / narrow (0) for digits 0–9. */
export const ITF_PATTERNS = ['00110', '10001', '01001', '11000', '00101', '10100', '01100', '00011', '10010', '01010']
export const ITF_WIDE = 3
const START = [1, 1, 1, 1]
const STOP = [ITF_WIDE, 1, 1]

export interface ItfOptions {
  bearers?: boolean
}

export function encodeItf14(raw: string, options: ItfOptions = {}): Barcode {
  const { full, check, added } = withCheckDigit(cleanDigits(raw, 'ITF-14'), 13, 'ITF-14')
  const widths: number[] = [...START]
  for (let i = 0; i < full.length; i += 2) {
    const bars = ITF_PATTERNS[Number(full[i])]!
    const spaces = ITF_PATTERNS[Number(full[i + 1])]!
    for (let k = 0; k < 5; k++) {
      widths.push(bars[k] === '1' ? ITF_WIDE : 1)
      widths.push(spaces[k] === '1' ? ITF_WIDE : 1)
    }
  }
  widths.push(...STOP)
  const modules = widthsToModules(widths)
  return {
    symbology: 'itf14',
    modules,
    guards: '',
    quietLeft: 10,
    quietRight: 10,
    data: full,
    checkDigit: check,
    checkAdded: added,
    text: [{ text: full, x: [modules.length / 2] }],
    bearers: options.bearers ?? true,
  }
}
