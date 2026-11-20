/**
 * Check characters. GS1's mod-10 covers EAN-13, EAN-8, UPC-A, UPC-E (via its
 * UPC-A expansion) and ITF-14; Code 39's optional check is mod 43.
 */

/**
 * GS1 mod-10 check digit. Weights alternate 3, 1, 3… starting from the digit
 * nearest the check digit, so the same function serves every GS1 length.
 */
export function gs1CheckDigit(digits: string): number {
  let sum = 0
  for (let i = 0; i < digits.length; i++) {
    const d = digits.charCodeAt(digits.length - 1 - i) - 48
    sum += i % 2 === 0 ? d * 3 : d
  }
  return (10 - (sum % 10)) % 10
}

/** Code 39's character set in value order — the order the mod-43 check uses. */
export const CODE39_CHARSET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ-. $/+%'

/** Mod-43 check character for Code 39: the sum of character values, mod 43. */
export function code39CheckChar(data: string): string {
  let sum = 0
  for (const ch of data) {
    const value = CODE39_CHARSET.indexOf(ch)
    if (value < 0)
      throw new Error(`"${ch}" is not a Code 39 character`)
    sum += value
  }
  return CODE39_CHARSET[sum % 43]!
}
