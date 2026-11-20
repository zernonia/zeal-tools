/**
 * Shared shapes for every symbology. A barcode here is a row of modules —
 * the narrowest unit a symbology works in — plus the facts the renderer needs
 * to draw it the way the specification says a real label looks.
 */

export type Symbology = 'ean13' | 'ean8' | 'upca' | 'upce' | 'code128' | 'code39' | 'itf14'

/** One run of human-readable text, positioned in module units from the first bar. */
export interface TextSpan {
  text: string
  /**
   * Glyph centres, one per character. A single value with a longer string
   * means "centre the whole string here".
   */
  x: number[]
  /** Drawn smaller — UPC's number-system and check digits sit outside the bars. */
  small?: boolean
}

export interface Barcode {
  symbology: Symbology
  /** '1' is a bar module, '0' a space module. Starts and ends with a bar. */
  modules: string
  /**
   * Same length as `modules`; '1' marks a module whose bar extends down
   * between the digits (EAN/UPC guard bars). Empty when nothing extends.
   */
  guards: string
  /** Minimum light margins, in modules, that the specification requires. */
  quietLeft: number
  quietRight: number
  /** Everything encoded, check digit or character included. */
  data: string
  /** The check digit or character, when the symbology has one. */
  checkDigit?: string
  /** True when the check digit was computed rather than typed. */
  checkAdded?: boolean
  text: TextSpan[]
  /** ITF-14: horizontal bearer bars above and below the symbol. */
  bearers?: boolean
  /** Code 128 symbol values, start through stop — handy for tests and agents. */
  symbols?: number[]
}

/** An input problem worth showing to a person verbatim. */
export class BarcodeError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'BarcodeError'
  }
}

/**
 * Bar/space widths → module string. Element 0 is a bar. `'2131'` becomes
 * `'1101110'`… with alternating colours.
 */
export function widthsToModules(widths: string | number[], startWithBar = true): string {
  let out = ''
  let bar = startWithBar
  for (const w of widths) {
    out += (bar ? '1' : '0').repeat(Number(w))
    bar = !bar
  }
  return out
}
