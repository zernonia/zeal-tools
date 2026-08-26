import type { DotStyle, EyeBallStyle, EyeFrameStyle } from './render-svg'
import { describe, expect, it } from 'vitest'
import { encodeQr } from '../../../shared/core/qr'
import {
  DEFAULT_LOGO_PADDING,
  LOGO_COVERAGE_LIMIT,
  logoCoverage,
  renderSvg,
  sanitizeColor,
} from './render-svg'

const qr = encodeQr('https://zeal.tools', { ecLevel: 'M' })

describe('renderSvg styles', () => {
  const dotStyles: DotStyle[] = ['square', 'rounded', 'dots', 'diamond', 'classy', 'fluid', 'vertical', 'horizontal']
  it.each(dotStyles)('renders %s modules as valid svg', (dotStyle) => {
    const svg = renderSvg(qr, { dotStyle })
    expect(svg).toContain('<svg')
    expect(svg).toContain('</svg>')
    expect(svg).toMatch(/<path d="M[^"]+/)
    // no NaN coordinates ever
    expect(svg).not.toContain('NaN')
  })

  const frames: EyeFrameStyle[] = ['square', 'rounded', 'circle', 'leaf']
  it.each(frames)('renders %s eye frames', (eyeFrameStyle) => {
    const svg = renderSvg(qr, { eyeFrameStyle })
    expect(svg).toContain('fill-rule="evenodd"')
    expect(svg).not.toContain('NaN')
  })

  const balls: EyeBallStyle[] = ['square', 'rounded', 'circle', 'leaf', 'diamond']
  it.each(balls)('renders %s eye balls', (eyeBallStyle) => {
    expect(renderSvg(qr, { eyeBallStyle })).not.toContain('NaN')
  })

  it('draws exactly three eye frames and three balls', () => {
    const svg = renderSvg(qr, {})
    expect(svg.match(/fill-rule="evenodd"/g)).toHaveLength(3)
  })
})

describe('renderSvg colors and gradients', () => {
  it('applies custom eye colors', () => {
    const svg = renderSvg(qr, { fg: '#111111', eyeFrameColor: '#ff0000', eyeBallColor: '#00ff00' })
    expect(svg).toContain('fill="#ff0000"')
    expect(svg).toContain('fill="#00ff00"')
  })

  it('defines a linear gradient and references it', () => {
    const svg = renderSvg(qr, { gradient: { type: 'linear', from: '#f4540a', to: '#7c3aed', rotation: 45 } })
    expect(svg).toContain('<linearGradient id="zg"')
    expect(svg).toContain('stop-color="#f4540a"')
    expect(svg).toContain('stop-color="#7c3aed"')
    expect(svg).toContain('fill="url(#zg)"')
  })

  it('defines a radial gradient', () => {
    const svg = renderSvg(qr, { gradient: { type: 'radial', from: '#f4540a', to: '#7c3aed' } })
    expect(svg).toContain('<radialGradient id="zg"')
  })

  it('eyes inherit the gradient unless overridden', () => {
    const svg = renderSvg(qr, { gradient: { type: 'linear', from: '#111', to: '#222' } })
    expect(svg.match(/fill="url\(#zg\)"/g)!.length).toBeGreaterThanOrEqual(7) // data + 3 frames + 3 balls
  })

  it('omits the background rect when transparent', () => {
    const svg = renderSvg(qr, { bg: 'transparent' })
    expect(svg).not.toMatch(/<rect width="\d+" height="\d+" fill="/)
  })

  it('sanitizes malicious color input', () => {
    expect(sanitizeColor('"><script>alert(1)</script>', '#111')).toBe('#111')
    expect(sanitizeColor('url(javascript:x)', '#111')).toBe('#111')
    expect(sanitizeColor('#ff0000', '#111')).toBe('#ff0000')
    expect(sanitizeColor('rebeccapurple', '#111')).toBe('rebeccapurple')
    const svg = renderSvg(qr, { fg: '"><script>x</script>' })
    expect(svg).not.toContain('<script>')
  })

  it('keeps data modules out of the eye regions', () => {
    // eyes are drawn as exactly 6 paths after the data path; the data path
    // must not paint inside the top-left 7×7 finder area
    const svg = renderSvg(qr, { margin: 0, dotStyle: 'square' })
    const dataPath = svg.match(/<path d="([^"]+)" fill="#111111"\/>/)?.[1] ?? ''
    for (const match of dataPath.matchAll(/M(\d+) (\d+)h1v1h-1z/g)) {
      const x = Number(match[1])
      const y = Number(match[2])
      expect(x < 7 && y < 7, `module at ${x},${y} is inside the top-left eye`).toBe(false)
    }
  })
})

describe('logo padding and rounding', () => {
  const png = 'data:image/png;base64,iVBORw0KGgo='
  const svgFor = (logo: Record<string, unknown>) => renderSvg(qr, { logo: { href: png, ...logo } })

  it('emits no clip path when nothing is rounded', () => {
    const svg = svgFor({ radius: 0 })
    expect(svg).not.toContain('clipPath')
    expect(svg).not.toContain('clip-path')
  })

  it('clips the image once a radius is asked for', () => {
    const svg = svgFor({ radius: 0.2 })
    expect(svg).toContain('<clipPath id="zl">')
    expect(svg).toContain('clip-path="url(#zl)"')
  })

  it('grows the plate with the padding, keeping the corners concentric', () => {
    // Plate radius must be the logo's radius plus the padding, or the gap
    // between the two pinches at the corners as the padding widens. Measured
    // against the logo's own rendered width so it holds at any code size.
    const svg = renderSvg(qr, { logo: { href: png, sizeRatio: 0.2, padding: 0.1, radius: 0.25 } })
    const w = Number(/<image[^>]*width="([\d.]+)"/.exec(svg)![1])
    // The plate is the filled one; the clip path's rect carries no fill.
    const plates = [...svg.matchAll(/<rect x="[\d.-]+" y="[\d.-]+" width="([\d.]+)" height="[\d.]+" rx="([\d.]+)" fill=/g)]
    const [, width, rx] = plates[plates.length - 1]!
    expect(Number(width)).toBeCloseTo(w * 1.2, 2)
    expect(Number(rx)).toBeCloseTo(w * 0.35, 2)
  })

  it('clamps padding and radius to what stays scannable and sane', () => {
    const wide = svgFor({ padding: 5 })
    const tight = svgFor({ padding: -3 })
    // A padding of 5x the logo would swallow the whole code.
    expect(wide).toBe(svgFor({ padding: 0.25 }))
    expect(tight).toBe(svgFor({ padding: 0 }))
    expect(svgFor({ radius: 9 })).toBe(svgFor({ radius: 0.5 }))
  })

  it('keeps the previous look when neither is given', () => {
    // The default has to stay 8% padding, or every QR anyone has already
    // shared a link to quietly changes shape.
    expect(svgFor({})).toBe(svgFor({ padding: DEFAULT_LOGO_PADDING, radius: 0 }))
  })

  it('measures coverage as area, and grows it with padding', () => {
    expect(logoCoverage(0.2, 0)).toBeCloseTo(0.04, 6)
    expect(logoCoverage(0.2, 0.25)).toBeCloseTo(0.09, 6)
    expect(logoCoverage(0.3, 0.25)).toBeGreaterThan(logoCoverage(0.3, 0))
    expect(logoCoverage(999, 0)).toBeCloseTo(logoCoverage(0.3, 0), 6)
  })
})

describe('logo coverage limit', () => {
  it('sits below the point where decoding was measured to break', () => {
    // Sweeping size 16-30% against padding 0-25% and decoding with jsQR: every
    // combination at or below 10.5% coverage decoded, every one at or above
    // 10.9% failed. The limit has to warn before that, not after.
    expect(LOGO_COVERAGE_LIMIT).toBeLessThan(0.105)
    expect(logoCoverage(0.22, 0.2)).toBeLessThan(0.105)
    expect(logoCoverage(0.22, 0.25)).toBeGreaterThan(LOGO_COVERAGE_LIMIT)
    expect(logoCoverage(0.3, 0.08)).toBeGreaterThan(LOGO_COVERAGE_LIMIT)
  })
})
