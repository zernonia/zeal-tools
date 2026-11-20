import { describe, expect, it } from 'vitest'
import { code39CheckChar, gs1CheckDigit } from './check-digit'

describe('gs1CheckDigit', () => {
  // Published examples: GS1's EAN-13, a Coca-Cola UPC-A, Wikipedia's EAN-8,
  // GS1's ITF-14 and the UPC-A behind UPC-E 0425261.
  it.each([
    ['400638133393', 1],
    ['590123412345', 7],
    ['03600029145', 2],
    ['9638507', 4],
    ['1540014128876', 3],
    ['04210000526', 4],
  ])('%s → %i', (digits, check) => {
    expect(gs1CheckDigit(digits)).toBe(check)
  })

  it('is 0, not 10, when the sum is already a multiple of ten', () => {
    expect(gs1CheckDigit('000000000000')).toBe(0)
    // 5×3 + 5×1 = 20
    expect(gs1CheckDigit('000000000055')).toBe(0)
  })

  it('catches every single-digit error', () => {
    const base = '400638133393'
    const check = gs1CheckDigit(base)
    for (let i = 0; i < base.length; i++) {
      for (let d = 0; d <= 9; d++) {
        if (String(d) === base[i])
          continue
        const typo = base.slice(0, i) + d + base.slice(i + 1)
        expect(gs1CheckDigit(typo)).not.toBe(check)
      }
    }
  })
})

describe('code39CheckChar', () => {
  it('sums character values mod 43', () => {
    // C12 O24 D13 E14 3 9 = 75 → 75 − 43 = 32 → W
    expect(code39CheckChar('CODE39')).toBe('W')
    // 1+2+3+4+5 = 15 → F
    expect(code39CheckChar('12345')).toBe('F')
    // % is value 42, the last one
    expect(code39CheckChar('%')).toBe('%')
    expect(code39CheckChar('%1')).toBe('0')
  })

  it('rejects characters outside the set', () => {
    expect(() => code39CheckChar('abc')).toThrow()
  })
})
