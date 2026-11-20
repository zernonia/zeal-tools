import { describe, expect, it } from 'vitest'
import { decodePunycode, hostToUnicode } from './punycode'
import { analyseUrl, siteOf } from './url'

const codes = (raw: string) => analyseUrl(raw)!.warnings.map(w => w.code)

describe('punycode', () => {
  it('decodes the RFC 3492 vectors that matter here', () => {
    expect(decodePunycode('mnchen-3ya')).toBe('münchen')
    expect(decodePunycode('pple-43d')).toBe('аpple')
    expect(decodePunycode('r8jz45g')).toBe('例え')
    expect(hostToUnicode('xn--pypl-53dc.com')).toBe('pаypаl.com')
  })

  it('returns null for malformed input and leaves such labels alone', () => {
    expect(decodePunycode('!!!')).toBeNull()
    expect(hostToUnicode('xn--!!!.com')).toBe('xn--!!!.com')
    expect(hostToUnicode('example.com')).toBe('example.com')
  })
})

describe('siteOf', () => {
  it('takes the registrable domain', () => {
    expect(siteOf('www.example.com')).toBe('example.com')
    expect(siteOf('shop.bbc.co.uk')).toBe('bbc.co.uk')
    expect(siteOf('example.com')).toBe('example.com')
    expect(siteOf('a.b.c.example.com.my')).toBe('example.com.my')
  })
})

describe('analyseUrl', () => {
  it('reads a plain https link with no warnings', () => {
    const info = analyseUrl('https://www.zeal.tools/tools/qr-code-generator?x=1')!
    expect(info.scheme).toBe('https')
    expect(info.host).toBe('www.zeal.tools')
    expect(info.site).toBe('zeal.tools')
    expect(info.rest).toBe('/tools/qr-code-generator?x=1')
    expect(info.warnings).toEqual([])
  })

  it('returns null for things that are not web links', () => {
    expect(analyseUrl('hello world')).toBeNull()
    expect(analyseUrl('ftp://example.com')).toBeNull()
    expect(analyseUrl('https://exa mple.com')).toBeNull()
    expect(analyseUrl('example')).toBeNull()
    expect(analyseUrl('https://')).toBeNull()
  })

  it('flags plain http', () => {
    expect(codes('http://example.com')).toEqual(['http'])
  })

  it('accepts a bare www. address and says it assumed https', () => {
    const info = analyseUrl('www.example.com/menu')!
    expect(info.href).toBe('https://www.example.com/menu')
    expect(codes('www.example.com/menu')).toEqual(['assumed-scheme'])
  })

  it('flags a Cyrillic lookalike as dangerous and shows both spellings', () => {
    const info = analyseUrl('https://аpple.com/login')!
    expect(info.host).toBe('xn--pple-43d.com')
    expect(info.displayHost).toBe('аpple.com')
    const warning = info.warnings.find(w => w.code === 'lookalike')!
    expect(warning.severity).toBe('danger')
    expect(warning.message).toContain('xn--pple-43d.com')
  })

  it('flags an all-Cyrillic lookalike label', () => {
    // Every letter here is Cyrillic, chosen because each one passes for Latin.
    expect(codes('https://раура.com')).toContain('lookalike')
  })

  it('gives a genuine international domain only a caution', () => {
    const info = analyseUrl('https://münchen.de')!
    expect(info.warnings.map(w => [w.code, w.severity])).toEqual([['idn', 'caution']])
    expect(codes('https://例え.jp')).toEqual(['idn'])
  })

  it('flags shorteners and QR redirect services', () => {
    expect(codes('https://bit.ly/3abc')).toEqual(['shortener'])
    expect(codes('https://qrco.de/bfx')).toEqual(['shortener'])
  })

  it('flags IP-address hosts, including ones URL normalises', () => {
    expect(codes('http://192.168.1.1/admin')).toContain('ip')
    expect(codes('https://[::1]/')).toContain('ip')
    // 0x7f000001 is 127.0.0.1 once URL has normalised it.
    expect(analyseUrl('http://0x7f000001/')!.host).toBe('127.0.0.1')
    expect(codes('http://0x7f000001/')).toContain('ip')
  })

  it('flags userinfo that disguises the real host', () => {
    const info = analyseUrl('https://paypal.com@evil.example/')!
    expect(info.host).toBe('evil.example')
    expect(info.warnings[0]!.code).toBe('userinfo')
    expect(info.warnings[0]!.message).toContain('evil.example')
  })

  it('flags a subdomain that imitates another site', () => {
    const info = analyseUrl('https://paypal.com.secure-login.xyz/')!
    expect(info.site).toBe('secure-login.xyz')
    expect(info.warnings.map(w => w.code)).toEqual(['imitation'])
  })

  it('flags unusual ports and embedded redirects', () => {
    expect(codes('https://example.com:8443/')).toEqual(['port'])
    const info = analyseUrl('https://www.google.com/url?q=https://evil.example/x')!
    expect(info.warnings.map(w => w.code)).toEqual(['redirect'])
    expect(info.warnings[0]!.message).toContain('evil.example')
  })

  it('shortens a very long path for display but keeps the full href', () => {
    const long = `https://example.com/${'a'.repeat(200)}`
    const info = analyseUrl(long)!
    expect(info.rest.length).toBe(80)
    expect(info.href).toBe(long)
  })
})
