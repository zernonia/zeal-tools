import type { QrMatrix } from '../../../shared/core/qr'
/**
 * Matrix → PNG bytes, using the shared zero-dependency PNG writer.
 * Isomorphic — powers the REST API's ?format=png on Cloudflare Workers.
 */
import { encodePng, hexToRgba } from '../../../shared/core/png'

export interface PngOptions {
  /** Output size in pixels (snapped so modules stay crisp). */
  size?: number
  margin?: number
  fg?: string
  bg?: string
}

export function renderPng(qr: QrMatrix, options: PngOptions = {}): Uint8Array {
  const margin = Math.max(0, Math.min(40, options.margin ?? 4))
  const dim = qr.size + margin * 2
  const target = Math.max(dim, Math.min(4096, options.size ?? 1024))
  const scale = Math.max(1, Math.floor(target / dim))
  const px = dim * scale

  const fg = hexToRgba(options.fg ?? '#111111', [17, 17, 17, 255])
  const bg = hexToRgba(options.bg ?? '#ffffff', [255, 255, 255, 255])

  const rgba = new Uint8Array(px * px * 4)
  for (let y = 0; y < px; y++) {
    const my = Math.floor(y / scale) - margin
    for (let x = 0; x < px; x++) {
      const mx = Math.floor(x / scale) - margin
      const dark = my >= 0 && my < qr.size && mx >= 0 && mx < qr.size && qr.modules[my * qr.size + mx] === 1
      const c = dark ? fg : bg
      const i = (y * px + x) * 4
      rgba[i] = c[0]; rgba[i + 1] = c[1]; rgba[i + 2] = c[2]; rgba[i + 3] = c[3]
    }
  }
  return encodePng(px, px, rgba)
}
