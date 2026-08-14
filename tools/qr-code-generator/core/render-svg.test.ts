import { describe, expect, it } from 'vitest'
import { encodeQr } from './encoder'
import { renderSvg, sanitizeColor, type DotStyle, type EyeBallStyle, type EyeFrameStyle } from './render-svg'

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
