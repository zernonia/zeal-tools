/**
 * Matrix → SVG string. Isomorphic: the browser preview, the REST API and the
 * MCP endpoint all return this exact output.
 *
 * Fully styleable — module patterns, custom finder-eye frames/balls with
 * independent colors, and linear/radial gradients — all our own drawing code,
 * with no wrapper library limits.
 */
import type { QrMatrix } from '../../../shared/core/qr'

export type DotStyle
  = | 'square' | 'rounded' | 'dots' | 'diamond' | 'classy' | 'fluid'
    | 'vertical' | 'horizontal'

export type EyeFrameStyle = 'square' | 'rounded' | 'circle' | 'leaf'
export type EyeBallStyle = 'square' | 'rounded' | 'circle' | 'leaf' | 'diamond'

export interface GradientSpec {
  type: 'linear' | 'radial'
  from: string
  to: string
  /** Linear gradient angle in degrees (0 = left→right). */
  rotation?: number
}

export interface SvgOptions {
  /** Quiet zone in modules (spec minimum is 4). */
  margin?: number
  /** Foreground (dark module) color. */
  fg?: string
  /** Optional foreground gradient — overrides fg for filled areas. */
  gradient?: GradientSpec
  /** Background color; 'transparent' omits the backdrop rect. */
  bg?: string
  /** Rendered size hint in px (width/height attributes). */
  size?: number
  dotStyle?: DotStyle
  eyeFrameStyle?: EyeFrameStyle
  eyeBallStyle?: EyeBallStyle
  /** Custom eye frame color (defaults to the foreground fill). */
  eyeFrameColor?: string
  /** Custom eye ball color (defaults to the foreground fill). */
  eyeBallColor?: string
  /** Data-URI or URL drawn centered over the code (bump EC to H first). */
  logo?: { href: string, sizeRatio?: number }
}

const COLOR_RE = /^(?:#[0-9a-fA-F]{3,8}|[a-zA-Z]+|rgba?\([\d.,\s%]+\)|hsla?\([\d.,\s%deg]+\))$/

export function sanitizeColor(color: string | undefined, fallback: string): string {
  if (!color || !COLOR_RE.test(color))
    return fallback
  return color
}

const num = (value: number) => Number(value.toFixed(3)).toString()

/** Rounded-rect path with per-corner radii [tl, tr, br, bl]. */
function roundedRect(x: number, y: number, w: number, h: number, radii: [number, number, number, number]): string {
  const [tl, tr, br, bl] = radii.map(r => Math.max(0, Math.min(r, w / 2, h / 2))) as [number, number, number, number]
  let d = `M${num(x + tl)} ${num(y)}`
  d += `h${num(w - tl - tr)}`
  if (tr)
    d += `a${num(tr)} ${num(tr)} 0 0 1 ${num(tr)} ${num(tr)}`
  d += `v${num(h - tr - br)}`
  if (br)
    d += `a${num(br)} ${num(br)} 0 0 1 ${num(-br)} ${num(br)}`
  d += `h${num(-(w - br - bl))}`
  if (bl)
    d += `a${num(bl)} ${num(bl)} 0 0 1 ${num(-bl)} ${num(-bl)}`
  d += `v${num(-(h - bl - tl))}`
  if (tl)
    d += `a${num(tl)} ${num(tl)} 0 0 1 ${num(tl)} ${num(-tl)}`
  return `${d}z`
}

function circlePath(cx: number, cy: number, r: number): string {
  return `M${num(cx - r)} ${num(cy)}a${num(r)} ${num(r)} 0 1 0 ${num(r * 2)} 0a${num(r)} ${num(r)} 0 1 0 ${num(-r * 2)} 0z`
}

function diamondPath(x: number, y: number, size: number): string {
  const h = size / 2
  return `M${num(x + h)} ${num(y)}L${num(x + size)} ${num(y + h)}L${num(x + h)} ${num(y + size)}L${num(x)} ${num(y + h)}z`
}

export function renderSvg(qr: QrMatrix, options: SvgOptions = {}): string {
  const margin = Math.max(0, Math.min(40, options.margin ?? 4))
  const fg = sanitizeColor(options.fg, '#111111')
  const bg = options.bg === 'transparent' ? 'transparent' : sanitizeColor(options.bg, '#ffffff')
  const dotStyle: DotStyle = options.dotStyle ?? 'square'
  const eyeFrameStyle: EyeFrameStyle = options.eyeFrameStyle ?? mapEyeDefault(dotStyle)
  const eyeBallStyle: EyeBallStyle = options.eyeBallStyle ?? mapBallDefault(dotStyle)
  const size = qr.size
  const dim = size + margin * 2
  const px = options.size ?? dim * 8

  const parts: string[] = []
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="0 0 ${dim} ${dim}" shape-rendering="geometricPrecision" role="img" aria-label="QR code">`,
  )

  // Gradient definition (shared by data modules and default-colored eyes)
  let dataFill = fg
  if (options.gradient) {
    const from = sanitizeColor(options.gradient.from, fg)
    const to = sanitizeColor(options.gradient.to, fg)
    if (options.gradient.type === 'radial') {
      parts.push(`<defs><radialGradient id="zg" gradientUnits="userSpaceOnUse" cx="${num(dim / 2)}" cy="${num(dim / 2)}" r="${num(dim * 0.6)}"><stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></radialGradient></defs>`)
    }
    else {
      const angle = ((options.gradient.rotation ?? 0) % 360) * Math.PI / 180
      const c = dim / 2
      const dx = Math.cos(angle) * c
      const dy = Math.sin(angle) * c
      parts.push(`<defs><linearGradient id="zg" gradientUnits="userSpaceOnUse" x1="${num(c - dx)}" y1="${num(c - dy)}" x2="${num(c + dx)}" y2="${num(c + dy)}"><stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs>`)
    }
    dataFill = 'url(#zg)'
  }
  const eyeFrameFill = options.eyeFrameColor ? sanitizeColor(options.eyeFrameColor, fg) : dataFill
  const eyeBallFill = options.eyeBallColor ? sanitizeColor(options.eyeBallColor, fg) : dataFill

  if (bg !== 'transparent')
    parts.push(`<rect width="${dim}" height="${dim}" fill="${bg}"/>`)

  // ── Data modules (finder-eye regions handled separately) ────────────────
  const inEye = (x: number, y: number) =>
    (x < 7 && y < 7) || (x >= size - 7 && y < 7) || (x < 7 && y >= size - 7)
  const dark = (x: number, y: number) =>
    x >= 0 && x < size && y >= 0 && y < size && qr.modules[y * size + x] === 1

  let d = ''
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (!qr.modules[y * size + x] || inEye(x, y))
        continue
      const mx = x + margin
      const my = y + margin
      switch (dotStyle) {
        case 'rounded':
          d += roundedRect(mx, my, 1, 1, [0.3, 0.3, 0.3, 0.3])
          break
        case 'dots':
          // tangent circles (r = ½ module) keep enough dark coverage to
          // survive strict binarizers while still reading as dots
          d += circlePath(mx + 0.5, my + 0.5, 0.5)
          break
        case 'diamond':
          // slightly inflated so diagonal coverage doesn't starve decoders
          d += diamondPath(mx - 0.09, my - 0.09, 1.18)
          break
        case 'classy':
          d += roundedRect(mx, my, 1, 1, [0.5, 0, 0.5, 0])
          break
        case 'fluid': {
          // round only the corners not touching a dark neighbor
          const t = dark(x, y - 1); const r = dark(x + 1, y); const b = dark(x, y + 1); const l = dark(x - 1, y)
          d += roundedRect(mx, my, 1, 1, [
            !t && !l ? 0.5 : 0,
            !t && !r ? 0.5 : 0,
            !b && !r ? 0.5 : 0,
            !b && !l ? 0.5 : 0,
          ])
          break
        }
        case 'vertical': {
          const t = dark(x, y - 1) && !inEye(x, y - 1)
          const b = dark(x, y + 1) && !inEye(x, y + 1)
          d += roundedRect(mx + 0.15, my, 0.7, 1, [t ? 0 : 0.35, t ? 0 : 0.35, b ? 0 : 0.35, b ? 0 : 0.35])
          break
        }
        case 'horizontal': {
          const l = dark(x - 1, y) && !inEye(x - 1, y)
          const r = dark(x + 1, y) && !inEye(x + 1, y)
          d += roundedRect(mx, my + 0.15, 1, 0.7, [l ? 0 : 0.35, r ? 0 : 0.35, r ? 0 : 0.35, l ? 0 : 0.35])
          break
        }
        default:
          d += `M${mx} ${my}h1v1h-1z`
      }
    }
  }
  parts.push(`<path d="${d}" fill="${dataFill}"/>`)

  // ── Finder eyes ─────────────────────────────────────────────────────────
  const eyeOrigins: [number, number][] = [[0, 0], [size - 7, 0], [0, size - 7]]
  for (const [ex, ey] of eyeOrigins) {
    const x = ex + margin
    const y = ey + margin

    let framePath: string
    switch (eyeFrameStyle) {
      case 'rounded':
        framePath = roundedRect(x, y, 7, 7, [2, 2, 2, 2]) + roundedRect(x + 1, y + 1, 5, 5, [1.2, 1.2, 1.2, 1.2])
        break
      case 'circle':
        framePath = circlePath(x + 3.5, y + 3.5, 3.5) + circlePath(x + 3.5, y + 3.5, 2.5)
        break
      case 'leaf':
        framePath = roundedRect(x, y, 7, 7, [2.6, 0, 2.6, 0]) + roundedRect(x + 1, y + 1, 5, 5, [1.6, 0, 1.6, 0])
        break
      default:
        framePath = roundedRect(x, y, 7, 7, [0, 0, 0, 0]) + roundedRect(x + 1, y + 1, 5, 5, [0, 0, 0, 0])
    }
    parts.push(`<path d="${framePath}" fill="${eyeFrameFill}" fill-rule="evenodd"/>`)

    // Non-square balls run slightly larger than the nominal 3×3 so their
    // off-center cross-sections keep the 1:1:3:1:1 finder ratio that strict
    // decoders check (verified against an independent decoder in tests).
    let ballPath: string
    switch (eyeBallStyle) {
      case 'rounded':
        ballPath = roundedRect(x + 2, y + 2, 3, 3, [0.8, 0.8, 0.8, 0.8])
        break
      case 'circle':
        ballPath = circlePath(x + 3.5, y + 3.5, 1.7)
        break
      case 'leaf':
        ballPath = roundedRect(x + 2, y + 2, 3, 3, [1.2, 0, 1.2, 0])
        break
      case 'diamond':
        ballPath = diamondPath(x + 1.7, y + 1.7, 3.6)
        break
      default:
        ballPath = roundedRect(x + 2, y + 2, 3, 3, [0, 0, 0, 0])
    }
    parts.push(`<path d="${ballPath}" fill="${eyeBallFill}"/>`)
  }

  // ── Center logo ─────────────────────────────────────────────────────────
  if (options.logo?.href) {
    const ratio = Math.min(0.3, Math.max(0.1, options.logo.sizeRatio ?? 0.22))
    const w = dim * ratio
    const pos = (dim - w) / 2
    const pad = w * 0.08
    parts.push(`<rect x="${num(pos - pad)}" y="${num(pos - pad)}" width="${num(w + pad * 2)}" height="${num(w + pad * 2)}" rx="${num(w * 0.12)}" fill="${bg === 'transparent' ? '#ffffff' : bg}"/>`)
    parts.push(`<image href="${escapeAttr(options.logo.href)}" x="${num(pos)}" y="${num(pos)}" width="${num(w)}" height="${num(w)}" preserveAspectRatio="xMidYMid meet"/>`)
  }

  parts.push('</svg>')
  return parts.join('')
}

/** Sensible eye defaults per pattern so single-select styling looks coherent. */
function mapEyeDefault(dotStyle: DotStyle): EyeFrameStyle {
  switch (dotStyle) {
    case 'dots': return 'circle'
    case 'rounded': case 'fluid': case 'vertical': case 'horizontal': return 'rounded'
    case 'classy': return 'leaf'
    default: return 'square'
  }
}

function mapBallDefault(dotStyle: DotStyle): EyeBallStyle {
  switch (dotStyle) {
    case 'dots': return 'circle'
    // 'rounded' (not 'diamond') for the diamond pattern: a diamond ball's
    // off-center cross-sections break strict decoders' finder-ratio checks
    case 'rounded': case 'fluid': case 'vertical': case 'horizontal': case 'diamond': return 'rounded'
    case 'classy': return 'leaf'
    default: return 'square'
  }
}

function escapeAttr(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
