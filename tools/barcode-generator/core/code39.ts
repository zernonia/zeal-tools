/**
 * Code 39, from ISO/IEC 16388.
 *
 * Each character is nine elements — five bars and four spaces — of which
 * exactly three are wide, hence the name. Characters are separated by a
 * narrow gap and the symbol is framed by `*`, which is why `*` cannot appear
 * in the data. Wide elements are drawn at three times the narrow width, the
 * top of the 2:1–3:1 range the standard allows and the most forgiving to
 * print and scan.
 */
import type { Barcode } from './types'
import { CODE39_CHARSET, code39CheckChar } from './check-digit'
import { BarcodeError, widthsToModules } from './types'

/** Wide (1) / narrow (0) for each element, bar first, in CODE39_CHARSET order then `*`. */
export const CODE39_PATTERNS: Record<string, string> = {
  '0': '000110100',
  '1': '100100001',
  '2': '001100001',
  '3': '101100000',
  '4': '000110001',
  '5': '100110000',
  '6': '001110000',
  '7': '000100101',
  '8': '100100100',
  '9': '001100100',
  'A': '100001001',
  'B': '001001001',
  'C': '101001000',
  'D': '000011001',
  'E': '100011000',
  'F': '001011000',
  'G': '000001101',
  'H': '100001100',
  'I': '001001100',
  'J': '000011100',
  'K': '100000011',
  'L': '001000011',
  'M': '101000010',
  'N': '000010011',
  'O': '100010010',
  'P': '001010010',
  'Q': '000000111',
  'R': '100000110',
  'S': '001000110',
  'T': '000010110',
  'U': '110000001',
  'V': '011000001',
  'W': '111000000',
  'X': '010010001',
  'Y': '110010000',
  'Z': '011010000',
  '-': '010000101',
  '.': '110000100',
  ' ': '011000100',
  '$': '010101000',
  '/': '010100010',
  '+': '010001010',
  '%': '000101010',
  '*': '010010100',
}

export const CODE39_WIDE = 3
export const CODE39_MAX_LENGTH = 60

function charModules(ch: string): string {
  return widthsToModules([...CODE39_PATTERNS[ch]!].map(bit => (bit === '1' ? CODE39_WIDE : 1)))
}

export interface Code39Options {
  /** Append the optional mod-43 check character. */
  checkChar?: boolean
}

export function encodeCode39(input: string, options: Code39Options = {}): Barcode {
  if (!input)
    throw new BarcodeError('Enter something to encode.')
  if (input.length > CODE39_MAX_LENGTH)
    throw new BarcodeError(`Code 39 here takes up to ${CODE39_MAX_LENGTH} characters — you entered ${input.length}. It is a wide symbology; Code 128 fits the same data in far less space.`)
  for (const ch of input) {
    if (ch === '*')
      throw new BarcodeError('Code 39 reserves "*" for the start and stop characters, so it cannot appear in the data.')
    if (!CODE39_CHARSET.includes(ch)) {
      const hint = /[a-z]/.test(ch)
        ? ' It has no lower case — use capitals, or switch to Code 128, which has both.'
        : ' It covers 0–9, A–Z, space and - . $ / + % only.'
      throw new BarcodeError(`Code 39 cannot encode "${ch}".${hint}`)
    }
  }
  const check = options.checkChar ? code39CheckChar(input) : undefined
  const data = input + (check ?? '')
  const modules = [...`*${data}*`].map(charModules).join('0')
  return {
    symbology: 'code39',
    modules,
    guards: '',
    quietLeft: 10,
    quietRight: 10,
    data,
    checkDigit: check,
    checkAdded: check !== undefined,
    text: [{ text: data, x: [modules.length / 2] }],
  }
}
