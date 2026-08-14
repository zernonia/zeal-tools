/**
 * Matrix → SVG string. Isomorphic: the browser preview, the REST API and the
 * MCP endpoint all return this exact output.
 */
import type { QrMatrix } from './encoder'

export type DotStyle = 'square' | 'rounded' | 'dots'

export interface SvgOptions {
  /** Quiet zone in modules (spec minimum is 4). */
  margin?: number
  /** Foreground (dark module) color. */
  fg?: string
  /** Background color; 'transparent' omits the backdrop rect. */
  bg?: string
  /** Rendered size hint in px (width/height attributes). */
  size?: number
  dotStyle?: DotStyle
  /** Data-URI or URL drawn centered over the code (bump EC to H first). */
  logo?: { href: string, sizeRatio?: number }
}

const COLOR_RE = /^(#[0-9a-fA-F]{3,8}|[a-zA-Z]+|rgba?\([\d.,\s%]+\)|hsla?\([\d.,\s%deg]+\))$/

export function sanitizeColor(color: string | undefined, fallback: string): string {
  if (!color || !COLOR_RE.test(color)) return fallback
  return color
}

export function renderSvg(qr: QrMatrix, options: SvgOptions = {}): string {
  const margin = Math.max(0, Math.min(40, options.margin ?? 4))
  const fg = sanitizeColor(options.fg, '#111111')
  const bg = sanitizeColor(options.bg, '#ffffff')
  const dotStyle = options.dotStyle ?? 'square'
  const dim = qr.size + margin * 2
  const px = options.size ?? dim * 8

  const parts: string[] = []
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="0 0 ${dim} ${dim}" shape-rendering="crispEdges" role="img" aria-label="QR code">`,
  )
  if (bg !== 'transparent')
    parts.push(`<rect width="${dim}" height="${dim}" fill="${bg}"/>`)

  if (dotStyle === 'dots') {
    const r = 0.44
    const circles: string[] = []
    for (let y = 0; y < qr.size; y++) {
      for (let x = 0; x < qr.size; x++) {
        if (qr.modules[y * qr.size + x])
          circles.push(`<circle cx="${x + margin + 0.5}" cy="${y + margin + 0.5}" r="${r}"/>`)
      }
    }
    parts.push(`<g fill="${fg}">${circles.join('')}</g>`)
  }
  else {
    // One path for all modules — small output, fast paint
    let d = ''
    for (let y = 0; y < qr.size; y++) {
      for (let x = 0; x < qr.size; x++) {
        if (qr.modules[y * qr.size + x]) d += `M${x + margin} ${y + margin}h1v1h-1z`
      }
    }
    const rx = dotStyle === 'rounded' ? ' rx="0.3"' : ''
    if (dotStyle === 'rounded') {
      // rounded uses individual rects for corner radii
      const rects: string[] = []
      for (let y = 0; y < qr.size; y++) {
        for (let x = 0; x < qr.size; x++) {
          if (qr.modules[y * qr.size + x])
            rects.push(`<rect x="${x + margin}" y="${y + margin}" width="1" height="1"${rx}/>`)
        }
      }
      parts.push(`<g fill="${fg}">${rects.join('')}</g>`)
    }
    else {
      parts.push(`<path d="${d}" fill="${fg}"/>`)
    }
  }

  if (options.logo?.href) {
    const ratio = Math.min(0.3, Math.max(0.1, options.logo.sizeRatio ?? 0.22))
    const w = dim * ratio
    const pos = (dim - w) / 2
    const pad = w * 0.08
    parts.push(`<rect x="${pos - pad}" y="${pos - pad}" width="${w + pad * 2}" height="${w + pad * 2}" rx="${w * 0.12}" fill="${bg === 'transparent' ? '#ffffff' : bg}"/>`)
    parts.push(`<image href="${escapeAttr(options.logo.href)}" x="${pos}" y="${pos}" width="${w}" height="${w}" preserveAspectRatio="xMidYMid meet"/>`)
  }

  parts.push('</svg>')
  return parts.join('')
}

function escapeAttr(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
