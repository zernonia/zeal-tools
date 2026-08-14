/**
 * Matrix → canvas (browser only). Used for PNG download, copy-image and
 * Web Share. Kept in core because it takes matrix data in and pixels out —
 * but unlike the SVG renderer it needs a DOM canvas, so the composable is
 * the only caller.
 */
import type { QrMatrix } from './encoder'

export interface CanvasOptions {
  size?: number
  margin?: number
  fg?: string
  bg?: string
  dotStyle?: 'square' | 'rounded' | 'dots'
  logo?: { href: string, sizeRatio?: number }
}

export async function drawQrToCanvas(qr: QrMatrix, canvas: HTMLCanvasElement, options: CanvasOptions = {}): Promise<void> {
  const margin = Math.max(0, Math.min(40, options.margin ?? 4))
  const dim = qr.size + margin * 2
  const target = Math.max(dim, Math.min(4096, options.size ?? 1024))
  const scale = Math.max(1, Math.floor(target / dim))
  const px = dim * scale

  canvas.width = px
  canvas.height = px
  const ctx = canvas.getContext('2d')!

  const bg = options.bg ?? '#ffffff'
  if (bg !== 'transparent') {
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, px, px)
  }
  else {
    ctx.clearRect(0, 0, px, px)
  }

  ctx.fillStyle = options.fg ?? '#111111'
  const style = options.dotStyle ?? 'square'
  for (let y = 0; y < qr.size; y++) {
    for (let x = 0; x < qr.size; x++) {
      if (!qr.modules[y * qr.size + x]) continue
      const cx = (x + margin) * scale
      const cy = (y + margin) * scale
      if (style === 'dots') {
        ctx.beginPath()
        ctx.arc(cx + scale / 2, cy + scale / 2, scale * 0.44, 0, Math.PI * 2)
        ctx.fill()
      }
      else if (style === 'rounded') {
        ctx.beginPath()
        ctx.roundRect(cx, cy, scale, scale, scale * 0.3)
        ctx.fill()
      }
      else {
        ctx.fillRect(cx, cy, scale, scale)
      }
    }
  }

  if (options.logo?.href) {
    const ratio = Math.min(0.3, Math.max(0.1, options.logo.sizeRatio ?? 0.22))
    const w = px * ratio
    const pos = (px - w) / 2
    const pad = w * 0.08
    ctx.fillStyle = bg === 'transparent' ? '#ffffff' : bg
    ctx.beginPath()
    ctx.roundRect(pos - pad, pos - pad, w + pad * 2, w + pad * 2, w * 0.12)
    ctx.fill()
    await new Promise<void>((resolve) => {
      const img = new Image()
      img.onload = () => {
        ctx.drawImage(img, pos, pos, w, w)
        resolve()
      }
      img.onerror = () => resolve()
      img.src = options.logo!.href
    })
  }
}
