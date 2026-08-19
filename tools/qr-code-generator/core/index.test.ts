import jsQR from 'jsqr'
import { describe, expect, it } from 'vitest'
import { encodeQr } from '../../../shared/core/qr'
import { buildPayload, generateQr } from './index'

/**
 * Rasterize a matrix to RGBA the way a camera would see it (with quiet zone),
 * so an independent decoder can read it back.
 */
function rasterize(modules: Uint8Array, size: number, scale = 4, quiet = 4) {
  const dim = (size + quiet * 2) * scale
  const rgba = new Uint8ClampedArray(dim * dim * 4)
  for (let y = 0; y < dim; y++) {
    for (let x = 0; x < dim; x++) {
      const mx = Math.floor(x / scale) - quiet
      const my = Math.floor(y / scale) - quiet
      const dark = mx >= 0 && mx < size && my >= 0 && my < size && modules[my * size + mx] === 1
      const v = dark ? 0 : 255
      const i = (y * dim + x) * 4
      rgba[i] = v; rgba[i + 1] = v; rgba[i + 2] = v; rgba[i + 3] = 255
    }
  }
  return { rgba, dim }
}

function roundTrip(text: string, ecLevel: 'L' | 'M' | 'Q' | 'H' = 'M'): string {
  const qr = encodeQr(text, { ecLevel })
  const { rgba, dim } = rasterize(qr.modules, qr.size)
  const decoded = jsQR(rgba, dim, dim)
  expect(decoded, `decode failed for ${JSON.stringify(text.slice(0, 40))}`).not.toBeNull()
  return decoded!.data
}

describe('generateQr payloads decode to the right strings', () => {
  it('wifi payload', () => {
    const payload = buildPayload({ type: 'wifi', ssid: 'My Café', password: 'p;a,s:s"w\\d', security: 'WPA' })
    expect(roundTrip(payload, 'Q')).toBe('WIFI:T:WPA;S:My Café;P:p\\;a\\,s\\:s\\"w\\\\d;;')
  })

  it('full generate returns svg + metadata', () => {
    const result = generateQr({ type: 'url', url: 'zeal.tools' }, { ecLevel: 'Q' })
    expect(result.payload).toBe('https://zeal.tools')
    expect(result.svg).toContain('<svg')
    expect(result.ecLevel).toBe('Q')
  })

  it('logo bumps EC to H', () => {
    const result = generateQr({ type: 'url', url: 'zeal.tools' }, { logo: { href: 'data:image/png;base64,x' } })
    expect(result.ecLevel).toBe('H')
  })
})
