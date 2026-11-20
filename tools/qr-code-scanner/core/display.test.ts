import { describe, expect, it } from 'vitest'
import { hostParts, initials, verdictOf, wifiStrength } from './display'
import { analyseUrl } from './url'

describe('verdictOf', () => {
  it('takes the worst warning', () => {
    expect(verdictOf([]).tone).toBe('clear')
    expect(verdictOf(analyseUrl('http://example.com')!.warnings).tone).toBe('caution')
    expect(verdictOf(analyseUrl('http://192.168.0.1/login')!.warnings).tone).toBe('danger')
  })

  it('treats a note alone as clear', () => {
    expect(verdictOf(analyseUrl('www.example.com')!.warnings).tone).toBe('clear')
  })
})

describe('hostParts', () => {
  it('splits off what comes before the registrable domain', () => {
    expect(hostParts(analyseUrl('https://shop.bbc.co.uk/x')!)).toEqual({ prefix: 'shop.', site: 'bbc.co.uk' })
    expect(hostParts(analyseUrl('https://example.com')!)).toEqual({ prefix: '', site: 'example.com' })
  })

  it('exposes an imitation for what it is', () => {
    expect(hostParts(analyseUrl('https://paypal.com.login.example.net')!)).toEqual({ prefix: 'paypal.com.login.', site: 'example.net' })
  })

  it('keeps international characters as they look', () => {
    expect(hostParts(analyseUrl('https://www.xn--mnchen-3ya.de')!)).toEqual({ prefix: 'www.', site: 'münchen.de' })
  })

  it('shows an IP address whole', () => {
    expect(hostParts({ displayHost: '10.0.0.1', site: '0.1' })).toEqual({ prefix: '', site: '10.0.0.1' })
  })
})

describe('wifiStrength', () => {
  it('grades the security type', () => {
    expect(wifiStrength({ open: true, security: 'nopass' })).toBe('open')
    expect(wifiStrength({ open: false, security: 'WEP' })).toBe('weak')
    expect(wifiStrength({ open: false, security: 'WPA' })).toBe('secure')
    expect(wifiStrength({ open: false, security: 'SAE' })).toBe('secure')
  })
})

describe('initials', () => {
  it('takes the first and last word', () => {
    expect(initials('Jane van Doe')).toBe('JD')
    expect(initials('acme')).toBe('A')
    expect(initials('  ')).toBe('')
    expect(initials('Émile Zola')).toBe('ÉZ')
    expect(initials('— Jane')).toBe('J')
    expect(initials('(Jane) Doe')).toBe('JD')
  })
})
