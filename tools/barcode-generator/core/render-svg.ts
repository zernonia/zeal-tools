/**
 * Barcode → SVG string. Isomorphic: the browser preview, the PNG download
 * (which rasterises this exact string), the REST API and the MCP tool all
 * draw through here.
 *
 * Units are pixels, and every bar edge lands on a whole multiple of the
 * module width, so a PNG rasterised at an integer scale has no half-pixel
 * greys at the edges for a scanner to misread.
 */
import type { Barcode, Symbology } from './types'
import { NAMES } from './ean'

export interface SvgOptions {
  /** Width of one module in px, 1–10. */
  moduleWidth?: number
  /** Bar height in px, 10–600. */
  height?: number
  /** Bar colour. */
  fg?: string
  /** Background; 'transparent' omits the backdrop (the quiet zone still needs light behind it). */
  bg?: string
  /** Draw the human-readable digits or text. */
  showText?: boolean
  /** Extra space around the symbol, in modules, on top of the quiet zones. 0–40. */
  margin?: number
  /** Text size in px. Defaults to a size that fits the digit slots. */
  fontSize?: number
}

export const DEFAULT_SVG_OPTIONS = {
  moduleWidth: 2,
  height: 80,
  fg: '#000000',
  bg: '#ffffff',
  showText: true,
  margin: 2,
} as const

const RETAIL: ReadonlySet<Symbology> = new Set(['ean13', 'ean8', 'upca', 'upce'])

const COLOR_RE = /^(?:#[0-9a-f]{3,8}|[a-z]+|rgba?\([\d.,\s%]+\)|hsla?\([\d.,\s%deg]+\))$/i

/** Anything that is not plainly a colour falls back — this string lands in an SVG attribute. */
export function sanitizeColor(color: string | undefined, fallback: string): string {
  if (!color || !COLOR_RE.test(color))
    return fallback
  return color
}

/**
 * Escape for SVG text and attributes. Control characters are dropped as well:
 * XML 1.0 forbids them outright, and Code 128 can legally carry them.
 */
export function escapeXml(value: string): string {
  return value
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\v\f\u000E-\u001F\u007F]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function clamp(value: number | undefined, min: number, max: number, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback
}

const num = (value: number) => Number(value.toFixed(3)).toString()

/** OCR-B is what retail labels use; nobody has it installed, so a monospace stands in. */
const FONT = `'OCR-B', 'OCR B', ui-monospace, Menlo, Consolas, 'Courier New', monospace`

export interface SvgLayout {
  width: number
  height: number
  /** x of the first bar, px. */
  x0: number
  barTop: number
  barHeight: number
}

export function layoutBarcode(code: Barcode, options: SvgOptions = {}): SvgLayout & { fontSize: number, guardExt: number, bearer: number, baseline: number, showText: boolean, margin: number } {
  const w = Math.round(clamp(options.moduleWidth, 1, 10, DEFAULT_SVG_OPTIONS.moduleWidth))
  const barHeight = clamp(options.height, 10, 600, DEFAULT_SVG_OPTIONS.height)
  const margin = Math.round(clamp(options.margin, 0, 40, DEFAULT_SVG_OPTIONS.margin))
  const showText = options.showText ?? DEFAULT_SVG_OPTIONS.showText
  const retail = RETAIL.has(code.symbology)
  const fontSize = clamp(options.fontSize, 6, 96, Math.max(10, w * (retail ? 9 : 7)))

  const total = margin * 2 + code.quietLeft + code.modules.length + code.quietRight
  const bearer = code.bearers ? 4 * w : 0
  const top = margin * w
  const barTop = top + bearer
  const barBottom = barTop + barHeight
  const guardExt = retail ? (showText ? fontSize * 0.55 : 5 * w) : 0
  const textTop = barBottom + bearer + (retail ? fontSize * 0.1 : fontSize * 0.3)
  const baseline = textTop + fontSize * 0.78
  const contentBottom = Math.max(barBottom + guardExt, barBottom + bearer, showText ? baseline + fontSize * 0.25 : 0)

  return {
    width: total * w,
    height: Math.ceil(contentBottom + margin * w),
    x0: (margin + code.quietLeft) * w,
    barTop,
    barHeight,
    fontSize,
    guardExt,
    bearer,
    baseline,
    showText,
    margin,
  }
}

export function renderSvg(code: Barcode, options: SvgOptions = {}): string {
  const w = Math.round(clamp(options.moduleWidth, 1, 10, DEFAULT_SVG_OPTIONS.moduleWidth))
  const fg = sanitizeColor(options.fg, DEFAULT_SVG_OPTIONS.fg)
  const bg = options.bg === 'transparent' ? 'transparent' : sanitizeColor(options.bg, DEFAULT_SVG_OPTIONS.bg)
  const layout = layoutBarcode(code, options)
  const { width, height, x0, barTop, barHeight, fontSize, guardExt, bearer, baseline, showText, margin } = layout

  const label = `${NAMES[code.symbology]} barcode: ${code.text.map(span => span.text).join(' ')}`
  const parts: string[] = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" shape-rendering="crispEdges" role="img" aria-label="${escapeXml(label)}">`,
  ]
  if (bg !== 'transparent')
    parts.push(`<rect width="${width}" height="${height}" fill="${bg}"/>`)

  // Bars: one subpath per run of dark modules.
  let d = ''
  const { modules, guards } = code
  for (let i = 0; i < modules.length;) {
    if (modules[i] !== '1') {
      i++
      continue
    }
    let j = i
    while (j < modules.length && modules[j] === '1')
      j++
    const h = barHeight + (guards[i] === '1' ? guardExt : 0)
    d += `M${x0 + i * w} ${num(barTop)}h${(j - i) * w}v${num(h)}h-${(j - i) * w}z`
    i = j
  }
  parts.push(`<path d="${d}" fill="${fg}"/>`)

  // ITF-14 bearer bars run across the quiet zones too — that is their job.
  if (bearer) {
    const bx = margin * w
    const bw = width - margin * 2 * w
    parts.push(`<path d="M${bx} ${num(barTop - bearer)}h${bw}v${bearer}h-${bw}zM${bx} ${num(barTop + barHeight)}h${bw}v${bearer}h-${bw}z" fill="${fg}"/>`)
  }

  if (showText) {
    for (const span of code.text) {
      const size = span.small ? fontSize * 0.75 : fontSize
      const xs = span.x.map(x => num(x0 + x * w)).join(' ')
      // A long Code 128 string can be wider than its bars; squeeze rather than spill.
      const estimate = span.text.length * size * 0.6
      const fit = span.x.length === 1 && span.text.length > 1 && estimate > code.modules.length * w
        ? ` textLength="${code.modules.length * w}" lengthAdjust="spacingAndGlyphs"`
        : ''
      const y = span.small ? baseline - fontSize * 0.1 : baseline
      parts.push(`<text x="${xs}" y="${num(y)}" font-family="${FONT}" font-size="${num(size)}" text-anchor="middle" fill="${fg}"${fit}>${escapeXml(span.text)}</text>`)
    }
  }

  parts.push('</svg>')
  return parts.join('')
}

function hexRgb(color: string): [number, number, number] | null {
  const m = color.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})(?:[0-9a-f]{2})?$/i)
  if (!m)
    return null
  const hex = m[1]!.length === 3 ? [...m[1]!].map(c => c + c).join('') : m[1]!
  const n = Number.parseInt(hex, 16)
  return [n >> 16 & 0xFF, n >> 8 & 0xFF, n & 0xFF]
}

function linear(c: number): number {
  const s = c / 255
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
}

/**
 * How a red-light scanner sees the colours. Checkout scanners illuminate at
 * roughly 630–660 nm, so what they measure is close to the red channel's
 * reflectance — which is why red bars vanish and dark blue ones read fine.
 * Returns the print contrast signal (background − bar) / background on that
 * channel, and whether the bars are lighter than the background. Null when
 * either colour is not hex (the UI only ever produces hex).
 */
export function scanContrast(fg: string, bg: string): { pcs: number, inverted: boolean } | null {
  const bar = hexRgb(fg)
  const space = hexRgb(bg)
  if (!bar || !space)
    return null
  const rb = linear(bar[0])
  const rs = linear(space[0])
  if (rs <= rb)
    return { pcs: 0, inverted: rs < rb }
  return { pcs: (rs - rb) / rs, inverted: false }
}

/** Below this print contrast signal, warn. 75% is the long-standing rule of thumb for 1D codes. */
export const MIN_PCS = 0.75
