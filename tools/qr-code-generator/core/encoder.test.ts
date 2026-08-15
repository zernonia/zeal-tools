import type { EcLevel } from './encoder'
import jsQR from 'jsqr'
import { describe, expect, it } from 'vitest'
import { encodeQr } from './encoder'
import { buildPayload, generateQr } from './index'

/** Rasterize a matrix to RGBA the way a camera would see it (with quiet zone). */
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

function roundTrip(text: string, ecLevel: EcLevel = 'M', boostEc = false): string {
  const qr = encodeQr(text, { ecLevel, boostEc })
  const { rgba, dim } = rasterize(qr.modules, qr.size)
  const decoded = jsQR(rgba, dim, dim)
  expect(decoded, `decode failed for ${JSON.stringify(text.slice(0, 40))} (v${qr.version}${qr.ecLevel})`).not.toBeNull()
  return decoded!.data
}

// Simple deterministic PRNG so property tests are reproducible
function mulberry32(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

describe('encodeQr structure', () => {
  it('produces the correct matrix size for each version', () => {
    const v1 = encodeQr('HELLO', { ecLevel: 'M' })
    expect(v1.version).toBe(1)
    expect(v1.size).toBe(21)
    expect(v1.modules.length).toBe(21 * 21)
  })

  it('boosts EC level when the version has room', () => {
    const qr = encodeQr('HI', { ecLevel: 'L', boostEc: true })
    expect(qr.ecLevel).toBe('H')
  })

  it('rejects empty input', () => {
    expect(() => encodeQr('')).toThrow()
  })

  it('rejects oversized input', () => {
    expect(() => encodeQr('x'.repeat(4000), { ecLevel: 'H' })).toThrow()
  })
})

describe('round-trip decode (independent decoder)', () => {
  it('decodes URLs', () => {
    expect(roundTrip('https://zeal.tools')).toBe('https://zeal.tools')
    expect(roundTrip('https://example.com/path?query=value&x=1#fragment'))
      .toBe('https://example.com/path?query=value&x=1#fragment')
  })

  it('decodes numeric mode', () => {
    expect(roundTrip('1234567890')).toBe('1234567890')
    expect(roundTrip('0'.repeat(100))).toBe('0'.repeat(100))
  })

  it('decodes alphanumeric mode', () => {
    expect(roundTrip('HELLO WORLD 123 $%*+-./:')).toBe('HELLO WORLD 123 $%*+-./:')
  })

  it('decodes UTF-8 byte mode', () => {
    expect(roundTrip('héllo wörld — ünïcode ✓')).toBe('héllo wörld — ünïcode ✓')
  })

  it('decodes at every EC level', () => {
    for (const ec of ['L', 'M', 'Q', 'H'] as EcLevel[]) {
      expect(roundTrip('https://zeal.tools/tools/qr-code-generator', ec)).toBe('https://zeal.tools/tools/qr-code-generator')
    }
  })

  it('decodes larger payloads (higher versions)', () => {
    const long = 'The quick brown fox jumps over the lazy dog. '.repeat(12)
    for (const ec of ['L', 'M', 'Q', 'H'] as EcLevel[]) {
      const qr = encodeQr(long, { ecLevel: ec, boostEc: false })
      expect(qr.version).toBeGreaterThan(9)
      expect(roundTrip(long, ec)).toBe(long)
    }
  })

  it('round-trips random payloads across levels (property test)', () => {
    const rand = mulberry32(42)
    const alphabet = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 .:/?#-_'
    for (let i = 0; i < 24; i++) {
      const len = 1 + Math.floor(rand() * 180)
      let s = ''
      for (let j = 0; j < len; j++) s += alphabet[Math.floor(rand() * alphabet.length)]
      const ec = (['L', 'M', 'Q', 'H'] as EcLevel[])[i % 4]
      expect(roundTrip(s, ec)).toBe(s)
    }
  })

  it('decodes every mask when forced', () => {
    for (let mask = 0; mask < 8; mask++) {
      const qr = encodeQr('MASK TEST 123', { ecLevel: 'Q', mask })
      expect(qr.mask).toBe(mask)
      const { rgba, dim } = rasterize(qr.modules, qr.size)
      const decoded = jsQR(rgba, dim, dim)
      expect(decoded?.data, `mask ${mask}`).toBe('MASK TEST 123')
    }
  })
})

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
