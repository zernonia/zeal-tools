import { describe, expect, it } from 'vitest'
import { compressUpcA, encodeEan8, encodeEan13, encodeUpcA, encodeUpcE, expandUpcE } from './ean'

const join = (...parts: string[]) => parts.join('')

describe('ean-13', () => {
  it('encodes 4006381333931 to the module pattern in the specification', () => {
    // Leading 4 → left parity L G L L G G.
    const expected = join(
      '101',
      '0001101', // 0 L
      '0100111', // 0 G
      '0101111', // 6 L
      '0111101', // 3 L
      '0001001', // 8 G
      '0110011', // 1 G
      '01010',
      '1000010', // 3 R
      '1000010', // 3 R
      '1000010', // 3 R
      '1110100', // 9 R
      '1000010', // 3 R
      '1100110', // 1 R
      '101',
    )
    const code = encodeEan13('400638133393')
    expect(code.modules).toBe(expected)
    expect(code.data).toBe('4006381333931')
    expect(code.checkDigit).toBe('1')
    expect(code.checkAdded).toBe(true)
  })

  it('accepts the full 13 digits and keeps the check digit typed', () => {
    const code = encodeEan13('4006381333931')
    expect(code.checkAdded).toBe(false)
    expect(code.modules).toBe(encodeEan13('400638133393').modules)
  })

  it('ignores the spaces and hyphens people copy from packaging', () => {
    expect(encodeEan13('4 006381 333931').data).toBe('4006381333931')
    expect(encodeEan13('400-6381-33393').data).toBe('4006381333931')
  })

  it('refuses a wrong check digit and says which one is right', () => {
    expect(() => encodeEan13('4006381333932')).toThrow(/should be 1, not 2/)
  })

  it('explains a wrong length and a non-digit', () => {
    expect(() => encodeEan13('12345')).toThrow(/needs 12 digits, or 13 .* you entered 5/)
    expect(() => encodeEan13('40063813339X')).toThrow(/"X" is not a digit/)
  })

  it('has the specified quiet zones: 11 modules left, 7 right', () => {
    const code = encodeEan13('400638133393')
    expect([code.quietLeft, code.quietRight]).toEqual([11, 7])
  })

  it('extends only the three guard patterns, and prints the leading digit outside the bars', () => {
    const code = encodeEan13('400638133393')
    const extended = [...code.guards].flatMap((g, i) => (g === '1' ? [i] : []))
    expect(extended).toEqual([0, 2, 46, 48, 92, 94])
    expect(code.text.map(t => t.text)).toEqual(['4', '006381', '333931'])
    expect(code.text[0]!.x[0]).toBeLessThan(0)
    expect(code.text[1]!.x).toEqual([6.5, 13.5, 20.5, 27.5, 34.5, 41.5])
  })
})

describe('upc-a', () => {
  it('036000291452 draws exactly the bars of EAN-13 0036000291452', () => {
    const upc = encodeUpcA('03600029145')
    expect(upc.data).toBe('036000291452')
    expect(upc.modules).toBe(encodeEan13('0036000291452').modules)
  })

  it('extends the first and last digits as well as the guards', () => {
    const upc = encodeUpcA('036000291452')
    expect(upc.guards.slice(3, 10)).toBe('0001101') // 0, L code
    expect(upc.guards.slice(85, 92)).toBe('1101100') // 2, R code
    expect(upc.guards.slice(10, 85).replace(/0/g, '')).toBe('11') // only the centre guard's bars
    expect([upc.quietLeft, upc.quietRight]).toEqual([9, 9])
    expect(upc.text.map(t => [t.text, !!t.small])).toEqual([['0', true], ['36000', false], ['29145', false], ['2', true]])
  })
})

describe('ean-8', () => {
  it('encodes 96385074 to the specified pattern', () => {
    const expected = join(
      '101',
      '0001011', // 9 L
      '0101111', // 6 L
      '0111101', // 3 L
      '0110111', // 8 L
      '01010',
      '1001110', // 5 R
      '1110010', // 0 R
      '1000100', // 7 R
      '1011100', // 4 R
      '101',
    )
    const code = encodeEan8('9638507')
    expect(code.modules).toBe(expected)
    expect(code.data).toBe('96385074')
    expect([code.quietLeft, code.quietRight]).toEqual([7, 7])
  })
})

describe('upc-e', () => {
  it('encodes 01234565 to the specified pattern', () => {
    // Check digit 5, number system 0 → parity E O O E E O.
    const expected = join(
      '101',
      '0110011', // 1 G
      '0010011', // 2 L
      '0111101', // 3 L
      '0011101', // 4 G
      '0111001', // 5 G
      '0101111', // 6 L
      '010101',
    )
    const code = encodeUpcE('0123456')
    expect(code.modules).toBe(expected)
    expect(code.data).toBe('01234565')
    expect([code.quietLeft, code.quietRight]).toEqual([9, 7])
  })

  it('assumes number system 0 for six digits, and inverts parity for number system 1', () => {
    expect(encodeUpcE('123456').data).toBe('01234565')
    const ns1 = encodeUpcE('1123456')
    const ns0 = encodeUpcE('0123456')
    expect(ns1.modules).not.toBe(ns0.modules)
  })

  it('expands by the rule its last digit selects', () => {
    expect(expandUpcE('0', '425261')).toBe('04210000526') // 0–2: manufacturer XX d6 00
    expect(expandUpcE('0', '123453')).toBe('01230000045') // 3
    expect(expandUpcE('0', '123454')).toBe('01234000005') // 4
    expect(expandUpcE('0', '123457')).toBe('01234500007') // 5–9
  })

  it('shortens a UPC-A that allows it, and says so when it does not', () => {
    expect(compressUpcA('04210000526')).toBe('425261')
    expect(encodeUpcE('042100005264').data).toBe('04252614')
    expect(compressUpcA('03600029145')).toBeNull()
    expect(() => encodeUpcE('036000291452')).toThrow(/cannot be shortened/)
  })

  it('checks the check digit against the expanded UPC-A', () => {
    expect(encodeUpcE('04252614').checkAdded).toBe(false)
    expect(() => encodeUpcE('04252615')).toThrow(/should be 4, not 5.*042100005264/)
  })

  it('refuses number systems other than 0 and 1', () => {
    expect(() => encodeUpcE('2123456')).toThrow(/must be 0 or 1/)
  })
})
