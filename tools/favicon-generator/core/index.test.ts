import { describe, expect, it } from 'vitest'
import { buildIco, htmlSnippet, ICO_SIZES, ICON_SIZES, manifestJson } from './index'

/** A stand-in for PNG bytes; the container never looks inside them. */
const fakePng = (n: number, fill: number) => new Uint8Array(n).fill(fill)

/** Read an ICO back using only its own directory. */
function readIco(ico: Uint8Array) {
  const view = new DataView(ico.buffer, ico.byteOffset, ico.byteLength)
  expect(view.getUint16(0, true)).toBe(0)
  expect(view.getUint16(2, true)).toBe(1)
  const count = view.getUint16(4, true)
  const entries = []
  for (let i = 0; i < count; i++) {
    const at = 6 + i * 16
    const length = view.getUint32(at + 8, true)
    const offset = view.getUint32(at + 12, true)
    entries.push({
      width: ico[at]!,
      height: ico[at + 1]!,
      planes: view.getUint16(at + 4, true),
      bits: view.getUint16(at + 6, true),
      data: ico.subarray(offset, offset + length),
    })
  }
  return entries
}

describe('buildIco', () => {
  it('writes a directory the sizes can be read back from', () => {
    // The output is also identified by file(1) as "MS Windows icon resource,
    // 3 icons, with PNG image data" and decoded by macOS sips.
    const ico = buildIco([
      { size: 16, png: fakePng(10, 1) },
      { size: 32, png: fakePng(20, 2) },
      { size: 48, png: fakePng(30, 3) },
    ])
    const entries = readIco(ico)
    expect(entries.map(e => e.width)).toEqual([16, 32, 48])
    expect(entries.map(e => e.height)).toEqual([16, 32, 48])
  })

  it('points each entry at its own image', () => {
    const ico = buildIco([
      { size: 16, png: fakePng(10, 0xAA) },
      { size: 32, png: fakePng(20, 0xBB) },
    ])
    const entries = readIco(ico)
    expect([...entries[0]!.data]).toEqual([...fakePng(10, 0xAA)])
    expect([...entries[1]!.data]).toEqual([...fakePng(20, 0xBB)])
  })

  it('declares 32-bit colour, which is what a PNG entry is', () => {
    const [entry] = readIco(buildIco([{ size: 32, png: fakePng(8, 1) }]))
    expect(entry!.planes).toBe(1)
    expect(entry!.bits).toBe(32)
  })

  it('writes 256 as zero, the only way the format can say it', () => {
    // The dimension field is one byte, so 256 does not fit and 0 means 256.
    const [entry] = readIco(buildIco([{ size: 256, png: fakePng(8, 1) }]))
    expect(entry!.width).toBe(0)
    expect(entry!.height).toBe(0)
  })

  it('is exactly as long as its parts', () => {
    const ico = buildIco([{ size: 16, png: fakePng(10, 1) }, { size: 32, png: fakePng(25, 1) }])
    expect(ico.length).toBe(6 + 2 * 16 + 10 + 25)
  })

  it('refuses to write an icon with no images', () => {
    expect(() => buildIco([])).toThrow(/at least one/i)
  })
})

describe('manifestJson', () => {
  it('is valid JSON naming both installable sizes', () => {
    const parsed = JSON.parse(manifestJson({ name: 'Zeal Tools' }))
    expect(parsed.name).toBe('Zeal Tools')
    expect(parsed.icons.map((i: { sizes: string }) => i.sizes)).toEqual(['192x192', '512x512'])
    expect(parsed.display).toBe('standalone')
  })

  it('keeps short_name short enough for a home screen', () => {
    // Android truncates past roughly twelve characters anyway.
    const parsed = JSON.parse(manifestJson({ name: 'An Extremely Long Product Name' }))
    expect(parsed.short_name.length).toBeLessThanOrEqual(12)
  })

  it('prefers a short name when one is given', () => {
    expect(JSON.parse(manifestJson({ name: 'Zeal Tools', shortName: 'Zeal' })).short_name).toBe('Zeal')
  })

  it('falls back rather than producing a nameless manifest', () => {
    expect(JSON.parse(manifestJson({ name: '   ' })).name).toBe('My site')
  })

  it('carries the colours through', () => {
    const parsed = JSON.parse(manifestJson({ name: 'X', themeColor: '#101010', backgroundColor: '#fafafa' }))
    expect(parsed.theme_color).toBe('#101010')
    expect(parsed.background_color).toBe('#fafafa')
  })
})

describe('htmlSnippet', () => {
  it('declares favicon.ico, which browsers request regardless', () => {
    // Omitting it does not stop the request, it just makes it a 404.
    expect(htmlSnippet()).toContain('href="/favicon.ico"')
  })

  it('covers tabs, iOS and the manifest', () => {
    const html = htmlSnippet()
    expect(html).toContain('apple-touch-icon')
    expect(html).toContain('sizes="180x180"')
    expect(html).toContain('rel="manifest"')
    expect(html).toContain('sizes="32x32"')
  })
})

describe('sizes', () => {
  it('ships a short list rather than thirty legacy files', () => {
    expect(ICON_SIZES.length).toBeLessThanOrEqual(8)
    expect(ICON_SIZES.map(s => s.size)).toContain(180)
    expect(ICON_SIZES.map(s => s.size)).toContain(512)
  })

  it('packs the small sizes into the ico itself', () => {
    expect(ICO_SIZES).toEqual([16, 32, 48])
    for (const size of ICO_SIZES)
      expect(ICON_SIZES.map(s => s.size)).toContain(size)
  })

  it('gives every file a distinct name', () => {
    expect(new Set(ICON_SIZES.map(s => s.file)).size).toBe(ICON_SIZES.length)
  })
})
