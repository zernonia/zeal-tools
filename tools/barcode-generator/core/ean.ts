/**
 * EAN-13, EAN-8, UPC-A and UPC-E, from ISO/IEC 15420 and the GS1 General
 * Specifications.
 *
 * Every digit is seven modules: two bars and two spaces. There are three
 * encodings of each digit — L (odd parity), G (even parity, L's mirror image
 * complemented) and R (L complemented) — and EAN-13's thirteenth digit is not
 * drawn at all: it is carried by which of the left six digits use L and which
 * use G. That is why the leading digit sits outside the bars on a real label.
 */
import type { Barcode, Symbology, TextSpan } from './types'
import { gs1CheckDigit } from './check-digit'
import { BarcodeError } from './types'

const L_CODES = ['0001101', '0011001', '0010011', '0111101', '0100011', '0110001', '0101111', '0111011', '0110111', '0001011']
const complement = (bits: string) => bits.replace(/[01]/g, b => (b === '0' ? '1' : '0'))
const R_CODES = L_CODES.map(complement)
const G_CODES = R_CODES.map(code => [...code].reverse().join(''))

/** Parity of the left six digits, indexed by EAN-13's leading digit. */
const EAN13_PARITY = ['LLLLLL', 'LLGLGG', 'LLGGLG', 'LLGGGL', 'LGLLGG', 'LGGLLG', 'LGGGLL', 'LGLGLG', 'LGLGGL', 'LGGLGL']

/**
 * UPC-E parity for number system 0, indexed by check digit (E = even/G,
 * O = odd/L). Number system 1 uses the exact inverse.
 */
const UPCE_PARITY = ['EEEOOO', 'EEOEOO', 'EEOOEO', 'EEOOOE', 'EOEEOO', 'EOOEEO', 'EOOOEE', 'EOEOEO', 'EOEOOE', 'EOOEOE']

const START = '101'
const MIDDLE = '01010'
const END = '101'
const UPCE_END = '010101'

export const NAMES: Record<Symbology, string> = {
  ean13: 'EAN-13',
  ean8: 'EAN-8',
  upca: 'UPC-A',
  upce: 'UPC-E',
  code128: 'Code 128',
  code39: 'Code 39',
  itf14: 'ITF-14',
}

/** Strip the spaces and hyphens people copy from a printed number. */
export function cleanDigits(raw: string, name: string): string {
  const digits = raw.replace(/[\s-]/g, '')
  const bad = digits.match(/\D/)
  if (bad)
    throw new BarcodeError(`${name} encodes digits only — "${bad[0]}" is not a digit.`)
  return digits
}

/**
 * Accept the data digits alone (check digit appended) or with the check digit
 * (verified). A wrong check digit is an error, never silently "fixed": it
 * usually means a typo somewhere else in the number.
 */
export function withCheckDigit(digits: string, dataLength: number, name: string): { full: string, check: string, added: boolean } {
  if (digits.length === dataLength) {
    const check = String(gs1CheckDigit(digits))
    return { full: digits + check, check, added: true }
  }
  if (digits.length === dataLength + 1) {
    const expected = String(gs1CheckDigit(digits.slice(0, dataLength)))
    const given = digits[dataLength]!
    if (given !== expected) {
      throw new BarcodeError(
        `The check digit should be ${expected}, not ${given}. It is calculated from the other ${dataLength} digits, `
        + `so a mismatch usually means a typo earlier in the number — or leave it off and it is added for you.`,
      )
    }
    return { full: digits, check: given, added: false }
  }
  throw new BarcodeError(
    `${name} needs ${dataLength} digits, or ${dataLength + 1} with the check digit — you entered ${digits.length}.`,
  )
}

/** Centre of digit `i` in a run of seven-module digits starting at `offset`. */
const digitCentres = (offset: number, count: number) => Array.from({ length: count }, (_, i) => offset + 7 * i + 3.5)

function mark(bits: string, extend: boolean): string {
  return extend ? bits : '0'.repeat(bits.length)
}

function encodeEan13Digits(full: string): { modules: string, guards: string } {
  const parity = EAN13_PARITY[Number(full[0])]!
  let modules = START
  let guards = START
  for (let i = 0; i < 6; i++) {
    const d = Number(full[i + 1])
    const code = parity[i] === 'L' ? L_CODES[d]! : G_CODES[d]!
    modules += code
    guards += mark(code, false)
  }
  modules += MIDDLE
  guards += MIDDLE
  for (let i = 0; i < 6; i++) {
    const code = R_CODES[Number(full[i + 7])]!
    modules += code
    guards += mark(code, false)
  }
  modules += END
  guards += END
  return { modules, guards }
}

export function encodeEan13(raw: string): Barcode {
  const { full, check, added } = withCheckDigit(cleanDigits(raw, 'EAN-13'), 12, 'EAN-13')
  const { modules, guards } = encodeEan13Digits(full)
  const text: TextSpan[] = [
    // The leading digit is carried by parity, not bars, so it prints in the
    // left quiet zone — which is why that margin is 11 modules, not 7.
    { text: full[0]!, x: [-4.5] },
    { text: full.slice(1, 7), x: digitCentres(3, 6) },
    { text: full.slice(7), x: digitCentres(50, 6) },
  ]
  return { symbology: 'ean13', modules, guards, quietLeft: 11, quietRight: 7, data: full, checkDigit: check, checkAdded: added, text }
}

export function encodeUpcA(raw: string): Barcode {
  const { full, check, added } = withCheckDigit(cleanDigits(raw, 'UPC-A'), 11, 'UPC-A')
  // A UPC-A is an EAN-13 whose leading digit is 0 — identical bars.
  const { modules } = encodeEan13Digits(`0${full}`)
  // UPC-A also extends the bars of its first and last digits.
  const guards = START + L_CODES[Number(full[0])]! + '0'.repeat(35) + MIDDLE + '0'.repeat(35) + R_CODES[Number(full[11])]! + END
  const text: TextSpan[] = [
    { text: full[0]!, x: [-4.5], small: true },
    { text: full.slice(1, 6), x: digitCentres(10, 5) },
    { text: full.slice(6, 11), x: digitCentres(50, 5) },
    { text: full[11]!, x: [95 + 4.5], small: true },
  ]
  return { symbology: 'upca', modules, guards, quietLeft: 9, quietRight: 9, data: full, checkDigit: check, checkAdded: added, text }
}

export function encodeEan8(raw: string): Barcode {
  const { full, check, added } = withCheckDigit(cleanDigits(raw, 'EAN-8'), 7, 'EAN-8')
  let modules = START
  let guards = START
  for (let i = 0; i < 4; i++) {
    const code = L_CODES[Number(full[i])]!
    modules += code
    guards += mark(code, false)
  }
  modules += MIDDLE
  guards += MIDDLE
  for (let i = 4; i < 8; i++) {
    const code = R_CODES[Number(full[i])]!
    modules += code
    guards += mark(code, false)
  }
  modules += END
  guards += END
  const text: TextSpan[] = [
    { text: full.slice(0, 4), x: digitCentres(3, 4) },
    { text: full.slice(4), x: digitCentres(36, 4) },
  ]
  return { symbology: 'ean8', modules, guards, quietLeft: 7, quietRight: 7, data: full, checkDigit: check, checkAdded: added, text }
}

/**
 * UPC-E (number system + 6 digits) → the 11 data digits of the UPC-A it
 * abbreviates. The last of the six says where the zeros were removed.
 */
export function expandUpcE(ns: string, six: string): string {
  const [d1, d2, d3, d4, d5, d6] = six
  switch (d6) {
    case '0': case '1': case '2':
      return `${ns}${d1}${d2}${d6}0000${d3}${d4}${d5}`
    case '3':
      return `${ns}${d1}${d2}${d3}00000${d4}${d5}`
    case '4':
      return `${ns}${d1}${d2}${d3}${d4}00000${d5}`
    default:
      return `${ns}${d1}${d2}${d3}${d4}${d5}0000${d6}`
  }
}

/**
 * UPC-A data digits (11) → the six UPC-E digits, or null when the number has
 * too few zeros in the right places to be shortened. Rules are tried in the
 * specification's order, and each candidate is accepted only if it expands
 * back to exactly the input — so this can never produce a code that means
 * something else.
 */
export function compressUpcA(eleven: string): string | null {
  const ns = eleven[0]!
  if (ns !== '0' && ns !== '1')
    return null
  const m = eleven.slice(1, 6)
  const p = eleven.slice(6, 11)
  const candidates = [
    `${m[0]}${m[1]}${p[2]}${p[3]}${p[4]}${m[2]}`,
    `${m[0]}${m[1]}${m[2]}${p[3]}${p[4]}3`,
    `${m[0]}${m[1]}${m[2]}${m[3]}${p[4]}4`,
    `${m}${p[4]}`,
  ]
  for (const six of candidates) {
    if (/^\d{6}$/.test(six) && expandUpcE(ns, six) === eleven)
      return six
  }
  return null
}

export function encodeUpcE(raw: string): Barcode {
  const digits = cleanDigits(raw, 'UPC-E')
  let ns: string
  let six: string
  let given: string | undefined

  if (digits.length === 6) {
    ns = '0'
    six = digits
  }
  else if (digits.length === 7 || digits.length === 8) {
    ns = digits[0]!
    six = digits.slice(1, 7)
    given = digits[7]
  }
  else if (digits.length === 11 || digits.length === 12) {
    // A full UPC-A: shorten it if its zeros allow.
    const upca = withCheckDigit(digits, 11, 'UPC-A')
    const compressed = compressUpcA(upca.full.slice(0, 11))
    if (!compressed) {
      throw new BarcodeError(
        `${upca.full} cannot be shortened to UPC-E — only UPC-A numbers with a run of zeros in the right place can. Use UPC-A instead.`,
      )
    }
    ns = upca.full[0]!
    six = compressed
    given = upca.full[11]
  }
  else {
    throw new BarcodeError(
      `UPC-E takes 6 digits, 7 with the number system digit in front, 8 with the check digit too — or a 12-digit UPC-A to shorten. You entered ${digits.length}.`,
    )
  }

  if (ns !== '0' && ns !== '1')
    throw new BarcodeError(`UPC-E's number system digit must be 0 or 1, not ${ns}.`)

  const expanded = expandUpcE(ns, six)
  const check = String(gs1CheckDigit(expanded))
  if (given !== undefined && given !== check) {
    throw new BarcodeError(
      `The check digit should be ${check}, not ${given}. UPC-E's check digit comes from the full UPC-A it stands for (${expanded}${check}) — leave it off and it is added for you.`,
    )
  }

  const pattern = UPCE_PARITY[Number(check)]!
  let modules = START
  for (let i = 0; i < 6; i++) {
    const d = Number(six[i])
    // Number system 0 reads the table as written; 1 is its inverse.
    const even = (pattern[i] === 'E') === (ns === '0')
    modules += even ? G_CODES[d]! : L_CODES[d]!
  }
  modules += UPCE_END
  const guards = START + '0'.repeat(42) + UPCE_END
  const data = `${ns}${six}${check}`
  const text: TextSpan[] = [
    { text: ns, x: [-4.5], small: true },
    { text: six, x: digitCentres(3, 6) },
    { text: check, x: [51 + 3.5], small: true },
  ]
  return { symbology: 'upce', modules, guards, quietLeft: 9, quietRight: 7, data, checkDigit: check, checkAdded: given === undefined, text }
}
