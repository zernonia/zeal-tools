import { describe, expect, it } from 'vitest'
import { isGsm7, limits, smsInfo, xLength } from './limits'

describe('smsInfo: GSM-7', () => {
  it('fits 160 characters in one segment', () => {
    expect(smsInfo('a'.repeat(160))).toEqual({ encoding: 'GSM-7', units: 160, segments: 1, perSegment: 160, remaining: 0, nonGsm: [] })
  })

  it('drops to 153 per segment once split', () => {
    expect(smsInfo('a'.repeat(161))).toMatchObject({ segments: 2, perSegment: 153, remaining: 145 })
    expect(smsInfo('a'.repeat(306))).toMatchObject({ segments: 2, remaining: 0 })
    expect(smsInfo('a'.repeat(307))).toMatchObject({ segments: 3, remaining: 152 })
  })

  it('counts extension characters as two units', () => {
    expect(smsInfo('€')).toMatchObject({ encoding: 'GSM-7', units: 2 })
    expect(smsInfo('[]{}^~|\\\f')).toMatchObject({ units: 18 })
    expect(smsInfo('€'.repeat(80))).toMatchObject({ units: 160, segments: 1 })
    expect(smsInfo('€'.repeat(81))).toMatchObject({ units: 162, segments: 2 })
  })

  it('never splits an escape pair across segments', () => {
    // 152 single units, then a € that would straddle 152–154: it moves to segment two.
    const info = smsInfo(`${'a'.repeat(152)}€${'a'.repeat(10)}`)
    expect(info.units).toBe(164)
    expect(info.segments).toBe(2)
    expect(info.remaining).toBe(153 - 12)
  })

  it('accepts the accented letters GSM-7 does have', () => {
    expect(isGsm7('café è ù ì ò Ä Ö Ñ Ü ä ö ñ ü à £ ¥ § ¿ ¡ Δ Ω @ $ _')).toBe(true)
    expect(isGsm7('line\nbreak')).toBe(true)
  })

  it('is zero segments for an empty message', () => {
    expect(smsInfo('')).toMatchObject({ encoding: 'GSM-7', units: 0, segments: 0, remaining: 160 })
  })
})

describe('smsInfo: UCS-2', () => {
  it('switches the whole message for one character outside GSM-7', () => {
    const info = smsInfo('Don’t forget')
    expect(info.encoding).toBe('UCS-2')
    expect(info.nonGsm).toEqual(['’'])
    expect(info.perSegment).toBe(70)
  })

  it('lists each offending character once, in order', () => {
    expect(smsInfo('ł ç ł 😀 ç').nonGsm).toEqual(['ł', 'ç', '😀'])
  })

  it('fits 70 units, then 67 per segment', () => {
    expect(smsInfo('ł'.repeat(70))).toMatchObject({ segments: 1, remaining: 0 })
    expect(smsInfo('ł'.repeat(71))).toMatchObject({ segments: 2, perSegment: 67, remaining: 63 })
    expect(smsInfo('ł'.repeat(134))).toMatchObject({ segments: 2, remaining: 0 })
    expect(smsInfo('ł'.repeat(135))).toMatchObject({ segments: 3 })
  })

  it('counts an emoji as its UTF-16 units and never splits a surrogate pair', () => {
    expect(smsInfo('😀')).toMatchObject({ units: 2 })
    expect(smsInfo('👍🏽')).toMatchObject({ units: 4 })
    // 66 units, then a pair that would straddle 66–68.
    const info = smsInfo(`${'ł'.repeat(66)}😀${'ł'.repeat(5)}`)
    expect(info.units).toBe(73)
    expect(info.segments).toBe(2)
    expect(info.remaining).toBe(67 - 7)
  })

  it('treats curly quotes and the lowercase ç as outside GSM-7', () => {
    expect(isGsm7('“quoted”')).toBe(false)
    expect(isGsm7('ç')).toBe(false)
    expect(isGsm7('Ç')).toBe(true)
  })
})

describe('xLength', () => {
  it('counts Latin text one per character', () => {
    expect(xLength('Hello, world!')).toBe(13)
  })

  it('counts CJK double', () => {
    expect(xLength('你好')).toBe(4)
    expect(xLength('日本語 ok')).toBe(9)
  })

  it('counts any emoji as two, including sequences and flags', () => {
    expect(xLength('😀')).toBe(2)
    expect(xLength('👨‍👩‍👧‍👦')).toBe(2)
    expect(xLength('🇬🇧')).toBe(2)
    expect(xLength('❤️')).toBe(2)
  })

  it('counts a link as 23, whatever its length', () => {
    expect(xLength('https://example.com/a/very/long/path?with=query&and=more')).toBe(23)
    expect(xLength('see https://a.co')).toBe(27)
    expect(xLength('www.example.org')).toBe(23)
  })

  it('normalises to NFC first, so a decomposed accent counts once', () => {
    expect(xLength('é')).toBe(1)
  })

  it('reports each limit against its own count', () => {
    const [x, meta, title] = limits('你好 https://example.com')
    expect(x).toMatchObject({ id: 'x', used: 28, max: 280 })
    expect(meta).toMatchObject({ id: 'meta-description', used: 22, max: 155 })
    expect(title).toMatchObject({ id: 'title', used: 22, max: 60 })
  })
})
