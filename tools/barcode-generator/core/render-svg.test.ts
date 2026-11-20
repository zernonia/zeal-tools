import { describe, expect, it } from 'vitest'
import { encodeBarcode, generateBarcode, parseSymbology, SYMBOLOGIES } from './index'
import { escapeXml, layoutBarcode, MIN_PCS, renderSvg, sanitizeColor, scanContrast } from './render-svg'

describe('renderSvg', () => {
  it.each(SYMBOLOGIES.map(s => [s.id, s.sample] as const))('renders %s without NaN', (id, sample) => {
    const { svg } = generateBarcode(id, sample)
    expect(svg.startsWith('<svg')).toBe(true)
    expect(svg.endsWith('</svg>')).toBe(true)
    expect(svg).not.toContain('NaN')
    expect(svg).not.toContain('undefined')
  })

  it('starts the first bar after the margin and the quiet zone', () => {
    const code = encodeBarcode('ean13', '400638133393')
    const svg = renderSvg(code, { moduleWidth: 3, margin: 0 })
    expect(svg).toMatch(new RegExp(`<path d="M${11 * 3} `))
    const layout = layoutBarcode(code, { moduleWidth: 3, margin: 0 })
    expect(layout.width).toBe((11 + 95 + 7) * 3)
  })

  it('clamps sizes and rounds the module width to whole pixels', () => {
    const code = encodeBarcode('code128', 'A')
    expect(layoutBarcode(code, { moduleWidth: 2.6 }).x0).toBe((2 + 10) * 3)
    expect(layoutBarcode(code, { moduleWidth: 99 }).x0).toBe((2 + 10) * 10)
    expect(layoutBarcode(code, { height: -5 }).barHeight).toBe(10)
  })

  it('makes guard bars longer than data bars on retail codes', () => {
    const svg = renderSvg(encodeBarcode('ean13', '400638133393'), { height: 80 })
    const heights = new Set([...svg.matchAll(/v([\d.]+)h-/g)].map(m => Number(m[1])))
    expect(heights.size).toBe(2)
    expect(Math.min(...heights)).toBe(80)
  })

  it('draws text only when asked', () => {
    const code = encodeBarcode('ean13', '400638133393')
    expect(renderSvg(code)).toContain('<text')
    expect(renderSvg(code, { showText: false })).not.toContain('<text')
  })

  it('draws ITF-14 bearer bars across the quiet zones', () => {
    const code = encodeBarcode('itf14', '1540014128876')
    const layout = layoutBarcode(code, { moduleWidth: 2, margin: 0 })
    const svg = renderSvg(code, { moduleWidth: 2, margin: 0 })
    expect(svg).toContain(`M0 0h${layout.width}v8`)
    expect(renderSvg(encodeBarcode('itf14', '1540014128876', { bearers: false }))).not.toMatch(/M\d+ \d+h\d{3,}v/)
  })

  it('escapes text and drops control characters, which XML forbids', () => {
    const svg = renderSvg(encodeBarcode('code128', '<a href="x">&\'\u0001'))
    expect(svg).not.toContain('<a ')
    expect(svg).not.toContain('\u0001')
    expect(svg).toContain('&lt;a href=&quot;x&quot;&gt;&amp;&#39;')
    expect(escapeXml('"<&>\'')).toBe('&quot;&lt;&amp;&gt;&#39;')
  })

  it('never lets an unsafe colour into an attribute', () => {
    const svg = renderSvg(encodeBarcode('code39', 'A'), { fg: '"/><script>alert(1)</script>', bg: 'red;x' })
    expect(svg).not.toContain('<script')
    expect(svg).toContain('fill="#000000"')
    expect(svg).toContain('fill="#ffffff"')
    expect(sanitizeColor('#1e3a8a', '#000')).toBe('#1e3a8a')
    expect(sanitizeColor('url(#x)', '#000')).toBe('#000')
  })

  it('omits the backdrop for a transparent background', () => {
    expect(renderSvg(encodeBarcode('code39', 'A'), { bg: 'transparent' })).not.toContain('<rect')
  })

  it('labels the image for assistive technology', () => {
    expect(renderSvg(encodeBarcode('ean8', '9638507'))).toContain('aria-label="EAN-8 barcode: 9638 5074"')
  })
})

describe('scanContrast', () => {
  it('passes black on white and dark blue, and fails red, which a red-light scanner cannot see', () => {
    expect(scanContrast('#000000', '#ffffff')!.pcs).toBe(1)
    expect(scanContrast('#1e3a8a', '#ffffff')!.pcs).toBeGreaterThan(MIN_PCS)
    expect(scanContrast('#dc2626', '#ffffff')!.pcs).toBeLessThan(MIN_PCS)
  })

  it('flags light bars on a dark background', () => {
    expect(scanContrast('#ffffff', '#000000')).toEqual({ pcs: 0, inverted: true })
  })

  it('returns null for colours it cannot read', () => {
    expect(scanContrast('red', '#fff')).toBeNull()
    expect(scanContrast('#000', '#fff')!.pcs).toBe(1)
  })
})

describe('parseSymbology', () => {
  it('accepts the spellings people use', () => {
    expect(parseSymbology('EAN-13')).toBe('ean13')
    expect(parseSymbology('upc')).toBe('upca')
    expect(parseSymbology('Code 128')).toBe('code128')
    expect(parseSymbology('itf')).toBe('itf14')
    expect(parseSymbology('pdf417')).toBeNull()
    expect(parseSymbology(3)).toBeNull()
  })
})
