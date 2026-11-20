import jsQR from 'jsqr'
import { describe, expect, it } from 'vitest'
import { encodeQr } from '../../../shared/core/qr'
import { fileName, fitWithin, halvingSteps, isRepeat, scanSizes } from './frames'
import { checkGtin, formatLabel, parseScan, summarise, worstSeverity } from './parse'

describe('parseScan', () => {
  it('routes each payload type', () => {
    const cases: [string, string][] = [
      ['https://zeal.tools', 'url'],
      ['WIFI:T:WPA;S:x;P:y;;', 'wifi'],
      ['MECARD:N:Doe,Jane;;', 'contact'],
      ['BEGIN:VCARD\nFN:Jane\nEND:VCARD', 'contact'],
      ['mailto:a@example.com', 'email'],
      ['tel:+441234567', 'phone'],
      ['SMSTO:+441234567:hi', 'sms'],
      ['geo:1,2', 'geo'],
      ['BEGIN:VEVENT\nSUMMARY:x\nEND:VEVENT', 'event'],
      ['Just some words', 'text'],
      ['', 'text'],
    ]
    for (const [raw, kind] of cases)
      expect(parseScan(raw).kind, raw).toBe(kind)
  })

  it('always keeps the raw text', () => {
    expect(parseScan('WIFI:T:WPA;S:x;P:y;;').raw).toBe('WIFI:T:WPA;S:x;P:y;;')
  })

  it('never treats script or device schemes as links', () => {
    for (const raw of ['javascript:alert(1)', ' JAVASCRIPT:alert(1)', 'data:text/html,<script>', 'intent://scan#Intent;end', 'file:///etc/passwd']) {
      const result = parseScan(raw)
      expect(result.kind, raw).toBe('text')
      expect(result.warnings[0]!.severity).toBe('danger')
    }
  })

  it('falls back to text with a note when a known prefix is malformed', () => {
    for (const raw of ['WIFI:T:WPA;P:x;;', 'MECARD:;;', 'BEGIN:VEVENT\nEND:VEVENT', 'tel:hello', 'geo:999,0']) {
      const result = parseScan(raw)
      expect(result.kind, raw).toBe('text')
      expect(result.warnings[0]!.code, raw).toBe('malformed')
    }
  })

  it('warns about WEP networks', () => {
    expect(parseScan('WIFI:T:WEP;S:x;P:y;;').warnings[0]!.code).toBe('weak')
  })

  it('builds downloadable files for contacts and events', () => {
    const contact = parseScan('MECARD:N:Doe,Jane;;')
    expect(contact.kind === 'contact' && contact.vcard).toContain('FN:Jane Doe')
    const event = parseScan('BEGIN:VEVENT\nSUMMARY:x\nEND:VEVENT')
    expect(event.kind === 'event' && event.ics).toContain('BEGIN:VCALENDAR')
  })

  it('reads retail barcodes as product numbers and checks the digit', () => {
    expect(parseScan('5012345678900', 'ean_13')).toMatchObject({ kind: 'product', valid: true })
    expect(parseScan('5012345678901', 'ean_13')).toMatchObject({ kind: 'product', valid: false })
    expect(parseScan('01234565', 'upc_e')).toMatchObject({ kind: 'product', valid: null })
    // A Code 128 holding a URL is still a URL.
    expect(parseScan('https://example.com', 'code_128').kind).toBe('url')
    expect(parseScan('5012345678900', 'qr_code').kind).toBe('text')
  })
})

describe('checkGtin', () => {
  it('validates GS1 check digits', () => {
    expect(checkGtin('5012345678900')).toBe(true) // EAN-13
    expect(checkGtin('96385074')).toBe(true) // EAN-8
    expect(checkGtin('036000291452')).toBe(true) // UPC-A
    expect(checkGtin('036000291453')).toBe(false)
    expect(checkGtin('123')).toBe(false)
  })
})

describe('labels and summaries', () => {
  it('names formats and summarises results', () => {
    expect(formatLabel('qr_code')).toBe('QR code')
    expect(formatLabel('mystery')).toBe('mystery')
    expect(summarise(parseScan('https://www.example.com/x'))).toBe('www.example.com')
    expect(summarise(parseScan('WIFI:S:Home;;'))).toBe('Home')
    expect(summarise(parseScan(`${'x'.repeat(100)}\nsecond line`))).toHaveLength(60)
  })

  it('reports the worst severity', () => {
    expect(worstSeverity(parseScan('https://example.com').warnings)).toBeNull()
    expect(worstSeverity(parseScan('http://bit.ly/x').warnings)).toBe('caution')
    expect(worstSeverity(parseScan('http://1.2.3.4').warnings)).toBe('danger')
  })
})

describe('frames', () => {
  it('fits without enlarging', () => {
    expect(fitWithin(4000, 3000, 1000)).toEqual({ width: 1000, height: 750 })
    expect(fitWithin(300, 200, 1000)).toEqual({ width: 300, height: 200 })
  })

  it('halves step by step down to the target', () => {
    const steps = halvingSteps(8000, 6000, { width: 1000, height: 750 })
    expect(steps).toEqual([
      { width: 4000, height: 3000 },
      { width: 2000, height: 1500 },
      { width: 1000, height: 750 },
    ])
    expect(halvingSteps(1200, 900, { width: 1000, height: 750 })).toEqual([{ width: 1000, height: 750 }])
  })

  it('picks scan sizes largest first, never larger than the image', () => {
    expect(scanSizes(6000, 4000)).toEqual([2048, 1024, 640])
    expect(scanSizes(800, 600)).toEqual([800, 640])
    expect(scanSizes(300, 300)).toEqual([300])
  })

  it('treats the same code inside the window as a repeat', () => {
    expect(isRepeat(null, 'a', 0)).toBe(false)
    expect(isRepeat({ raw: 'a', at: 0 }, 'a', 1000)).toBe(true)
    expect(isRepeat({ raw: 'a', at: 0 }, 'a', 5000)).toBe(false)
    expect(isRepeat({ raw: 'a', at: 0 }, 'b', 1000)).toBe(false)
  })

  it('makes safe file names', () => {
    expect(fileName('Jane Doé', 'vcf', 'contact')).toBe('jane-doe.vcf')
    expect(fileName('../../etc/passwd', 'ics', 'event')).toBe('etc-passwd.ics')
    expect(fileName('例え', 'vcf', 'contact')).toBe('contact.vcf')
  })
})

/**
 * Encode with our own encoder, decode with jsQR (the scanner's fallback
 * decoder), parse with this core: the whole path a printed code takes,
 * minus the camera.
 */
describe('round trip through the fallback decoder', () => {
  function scan(text: string): string {
    const qr = encodeQr(text, { ecLevel: 'M' })
    const scale = 4
    const quiet = 4
    const dim = (qr.size + quiet * 2) * scale
    const rgba = new Uint8ClampedArray(dim * dim * 4).fill(255)
    for (let y = 0; y < dim; y++) {
      for (let x = 0; x < dim; x++) {
        const mx = Math.floor(x / scale) - quiet
        const my = Math.floor(y / scale) - quiet
        if (mx >= 0 && mx < qr.size && my >= 0 && my < qr.size && qr.modules[my * qr.size + mx] === 1) {
          const i = (y * dim + x) * 4
          rgba[i] = rgba[i + 1] = rgba[i + 2] = 0
        }
      }
    }
    return jsQR(rgba, dim, dim)!.data
  }

  it('recovers a WiFi login with escaped characters', () => {
    const result = parseScan(scan('WIFI:T:WPA;S:Caf\\;e;P:p\\:w\\\\d;;'))
    expect(result.kind === 'wifi' && result.wifi).toMatchObject({ ssid: 'Caf;e', password: 'p:w\\d' })
  })

  it('recovers a lookalike link and still flags it', () => {
    const result = parseScan(scan('https://xn--pple-43d.com/login'))
    expect(result.kind).toBe('url')
    expect(result.warnings[0]!.code).toBe('lookalike')
  })
})
