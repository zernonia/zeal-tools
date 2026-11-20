import { describe, expect, it } from 'vitest'
import { CODE39_PATTERNS, encodeCode39 } from './code39'
import { CODE128_PATTERNS, code128Checksum, encodeCode128, planCode128 } from './code128'
import { encodeItf14, ITF_PATTERNS } from './itf'
import { widthsToModules } from './types'

const pattern = (value: number) => widthsToModules(CODE128_PATTERNS[value]!)

describe('code 128 table', () => {
  it('has 106 symbols of eleven modules and a thirteen-module stop', () => {
    expect(CODE128_PATTERNS).toHaveLength(107)
    CODE128_PATTERNS.slice(0, 106).forEach((p, v) => {
      expect(p, `value ${v}`).toHaveLength(6)
      expect([...p].reduce((s, w) => s + Number(w), 0), `value ${v}`).toBe(11)
    })
    expect(pattern(106)).toHaveLength(13)
  })

  it('has an even number of bar modules in every symbol — the parity rule that catches a mistyped entry', () => {
    CODE128_PATTERNS.slice(0, 106).forEach((p, v) => {
      const bars = Number(p[0]) + Number(p[2]) + Number(p[4])
      expect(bars % 2, `value ${v}`).toBe(0)
    })
  })

  it('has no duplicates', () => {
    expect(new Set(CODE128_PATTERNS).size).toBe(107)
  })

  it('matches the published start, stop and value-0 patterns', () => {
    expect(pattern(103)).toBe('11010000100') // Start A
    expect(pattern(104)).toBe('11010010000') // Start B
    expect(pattern(105)).toBe('11010011100') // Start C
    expect(pattern(106)).toBe('1100011101011') // Stop
    expect(pattern(0)).toBe('11011001100')
  })
})

describe('code 128 encoding', () => {
  it('encodes "Wikipedia" in set B with check value 88', () => {
    const code = encodeCode128('Wikipedia')
    // W i k i p e d i a in set B, then 3281 mod 103 = 88.
    expect(code.symbols).toEqual([104, 55, 73, 75, 73, 80, 69, 68, 73, 65, 88, 106])
    expect(code.modules).toHaveLength(11 * 11 + 13)
  })

  it('packs an even digit run into set C', () => {
    expect(encodeCode128('1234').symbols).toEqual([105, 12, 34, 82, 106])
    expect(encodeCode128('00').symbols).toEqual([105, 0, 105 % 103, 106])
  })

  it('does not switch for three digits, where set C saves nothing', () => {
    expect(encodeCode128('123').symbols!.slice(0, 4)).toEqual([104, 17, 18, 19])
  })

  it('does not switch for four digits mid-text, where the two switches cost what C saves', () => {
    expect(encodeCode128('AB1234CD').symbols!.slice(0, 9)).toEqual([104, 33, 34, 17, 18, 19, 20, 35, 36])
  })

  it('switches to set C for a run that pays for it', () => {
    expect(encodeCode128('AB123456').symbols!.slice(0, 7)).toEqual([104, 33, 34, 99, 12, 34, 56])
    expect(encodeCode128('123456AB').symbols!.slice(0, 7)).toEqual([105, 12, 34, 56, 100, 33, 34])
  })

  it('puts the odd digit of an odd run outside set C', () => {
    // 1 + 23 + 45 + 67: start B, "1", CODE C, 23, 45, 67 = 6 symbols.
    expect(encodeCode128('1234567').symbols!.length - 2).toBe(6)
  })

  it('uses SHIFT for a lone control character in lower-case text', () => {
    const code = encodeCode128('ab\tcd')
    expect(code.symbols!.slice(0, 7)).toEqual([104, 65, 66, 98, 73, 67, 68])
  })

  it('moves into set A for a run of control characters rather than shifting for each', () => {
    // Either "start B, a, CODE A, 3 tabs, CODE B, b" or "start A, SHIFT a, 3 tabs,
    // CODE B, b" — both eight symbols. Three SHIFTs would cost nine.
    const symbols = encodeCode128('a\t\t\tb').symbols!
    expect(symbols.length - 2).toBe(8)
    expect(symbols.filter(v => v === 98).length).toBeLessThanOrEqual(1)
  })

  it('starts in set A when the text opens with control characters', () => {
    expect(encodeCode128('\r\nOK').symbols!.slice(0, 5)).toEqual([103, 77, 74, 47, 43])
  })

  it('computes the check over every symbol including switches', () => {
    const symbols = encodeCode128('AB123456').symbols!
    expect(symbols.at(-2)).toBe(code128Checksum(symbols.slice(0, -2)))
  })

  it('plans deterministically', () => {
    expect(planCode128('X1234567890')).toEqual(planCode128('X1234567890'))
  })

  it('rejects empty, non-ASCII and over-long input with a reason', () => {
    expect(() => encodeCode128('')).toThrow(/Enter something/)
    expect(() => encodeCode128('café')).toThrow(/"é" is outside it/)
    expect(() => encodeCode128('x'.repeat(81))).toThrow(/up to 80/)
  })

  it('keeps control characters out of the printed line', () => {
    expect(encodeCode128('A\tB').text[0]!.text).toBe('A B')
  })

  it('has a 10-module quiet zone each side', () => {
    const code = encodeCode128('x')
    expect([code.quietLeft, code.quietRight]).toEqual([10, 10])
  })
})

describe('code 39', () => {
  it('draws * as narrow-wide-narrow-narrow-wide-narrow-wide-narrow-narrow at 3:1', () => {
    const code = encodeCode39('A')
    expect(code.modules.slice(0, 15)).toBe('100010111011101')
    expect(code.modules.slice(-15)).toBe('100010111011101')
  })

  it('has three wide elements in every character, two of them bars except for $ / + %', () => {
    for (const [ch, p] of Object.entries(CODE39_PATTERNS)) {
      expect([...p].filter(b => b === '1'), ch).toHaveLength(3)
      const wideBars = [0, 2, 4, 6, 8].filter(i => p[i] === '1').length
      expect(wideBars, ch).toBe('$/+%'.includes(ch) ? 0 : 2)
    }
    expect(new Set(Object.values(CODE39_PATTERNS)).size).toBe(44)
  })

  it('separates characters with one narrow space and has the expected width', () => {
    const code = encodeCode39('CODE39')
    expect(code.modules).toHaveLength((6 + 2) * 16 - 1)
  })

  it('appends the mod-43 check character only when asked', () => {
    expect(encodeCode39('CODE39').data).toBe('CODE39')
    const checked = encodeCode39('CODE39', { checkChar: true })
    expect(checked.data).toBe('CODE39W')
    expect(checked.checkDigit).toBe('W')
  })

  it('explains what it cannot encode', () => {
    expect(() => encodeCode39('abc')).toThrow(/no lower case/)
    expect(() => encodeCode39('A*B')).toThrow(/reserves "\*"/)
    expect(() => encodeCode39('A#B')).toThrow(/cannot encode "#"/)
  })

  it('has a 10-module quiet zone each side', () => {
    const code = encodeCode39('A')
    expect([code.quietLeft, code.quietRight]).toEqual([10, 10])
  })
})

describe('itf-14', () => {
  it('builds every digit from two wide elements of five', () => {
    for (const p of ITF_PATTERNS)
      expect([...p].filter(b => b === '1')).toHaveLength(2)
    expect(new Set(ITF_PATTERNS).size).toBe(10)
  })

  it('encodes GS1\'s example 1 54 00141 28876 3 with start and stop patterns', () => {
    const code = encodeItf14('1540014128876')
    expect(code.data).toBe('15400141288763')
    expect(code.modules).toHaveLength(4 + 7 * 18 + 5)
    expect(code.modules.slice(0, 4)).toBe('1010') // start: narrow bar, space, bar, space
    expect(code.modules.slice(-5)).toBe('11101') // stop: wide bar, narrow space, narrow bar
    // First pair 1,5: bars of 1 (w n n n w), spaces of 5 (w n w n n).
    expect(code.modules.slice(4, 22)).toBe(widthsToModules([3, 3, 1, 1, 1, 3, 1, 1, 3, 1]))
  })

  it('draws bearer bars unless told not to', () => {
    expect(encodeItf14('1540014128876').bearers).toBe(true)
    expect(encodeItf14('1540014128876', { bearers: false }).bearers).toBe(false)
  })

  it('refuses a wrong check digit', () => {
    expect(() => encodeItf14('15400141288764')).toThrow(/should be 3, not 4/)
  })
})
