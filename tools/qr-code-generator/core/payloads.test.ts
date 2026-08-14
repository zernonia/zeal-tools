import { describe, expect, it } from 'vitest'
import { emailPayload, smsPayload, telPayload, urlPayload, vcardPayload, wifiPayload } from './payloads'

describe('wifiPayload', () => {
  it('builds a WPA payload', () => {
    expect(wifiPayload({ ssid: 'Home', password: 'secret', security: 'WPA' }))
      .toBe('WIFI:T:WPA;S:Home;P:secret;;')
  })
  it('escapes special characters', () => {
    expect(wifiPayload({ ssid: 'a;b', password: 'p:q,r', security: 'WPA' }))
      .toBe('WIFI:T:WPA;S:a\\;b;P:p\\:q\\,r;;')
  })
  it('handles open networks', () => {
    expect(wifiPayload({ ssid: 'Cafe', security: 'nopass' })).toBe('WIFI:T:nopass;S:Cafe;;')
  })
  it('defaults security from password presence', () => {
    expect(wifiPayload({ ssid: 'X' })).toBe('WIFI:T:nopass;S:X;;')
    expect(wifiPayload({ ssid: 'X', password: 'y' })).toContain('T:WPA')
  })
  it('marks hidden networks', () => {
    expect(wifiPayload({ ssid: 'X', security: 'nopass', hidden: true })).toContain('H:true;')
  })
})

describe('vcardPayload', () => {
  it('builds a minimal vCard', () => {
    const v = vcardPayload({ firstName: 'Ada', lastName: 'Lovelace', email: 'ada@example.com' })
    expect(v).toContain('BEGIN:VCARD')
    expect(v).toContain('N:Lovelace;Ada;;;')
    expect(v).toContain('FN:Ada Lovelace')
    expect(v).toContain('EMAIL:ada@example.com')
    expect(v).toContain('END:VCARD')
  })
  it('escapes separators', () => {
    expect(vcardPayload({ organization: 'Acme, Inc; Ltd' })).toContain('ORG:Acme\\, Inc\\; Ltd')
  })
})

describe('emailPayload', () => {
  it('builds mailto with subject and body', () => {
    expect(emailPayload({ to: 'a@b.co', subject: 'Hi there', body: 'Line one' }))
      .toBe('mailto:a@b.co?subject=Hi%20there&body=Line%20one')
  })
  it('omits empty query', () => {
    expect(emailPayload({ to: 'a@b.co' })).toBe('mailto:a@b.co')
  })
})

describe('tel/sms/url', () => {
  it('strips formatting from phone numbers', () => {
    expect(telPayload('+1 (555) 123-4567')).toBe('tel:+15551234567')
  })
  it('builds SMSTO payloads', () => {
    expect(smsPayload({ phone: '+1 555', message: 'hello' })).toBe('SMSTO:+1555:hello')
  })
  it('prepends https:// when scheme is missing', () => {
    expect(urlPayload('zeal.tools')).toBe('https://zeal.tools')
    expect(urlPayload('https://zeal.tools')).toBe('https://zeal.tools')
    expect(urlPayload('mailto:x@y.z')).toBe('mailto:x@y.z')
  })
})
