import { describe, expect, it } from 'vitest'
import { guardUrl } from './url-guard'

const reject = (url: string) => guardUrl(url).reason
const accept = (url: string) => guardUrl(url).url?.href

describe('guardUrl', () => {
  it('accepts ordinary pages and adds a missing scheme', () => {
    expect(accept('https://zeal.tools/tools/qr-code-generator')).toBe('https://zeal.tools/tools/qr-code-generator')
    expect(accept('zeal.tools')).toBe('https://zeal.tools/')
    expect(accept('http://example.com:80/a?b=1')).toBe('http://example.com/a?b=1')
  })

  it('refuses anything that is not http', () => {
    for (const url of ['file:///etc/passwd', 'ftp://a.test/x', 'gopher://a.test', 'data:text/html,<h1>x'])
      expect(reject(url)).toBe('scheme')
  })

  it('refuses loopback and localhost in every spelling', () => {
    for (const url of ['http://localhost/', 'http://127.0.0.1/', 'http://127.1.2.3/', 'https://api.localhost/', 'http://[::1]/', 'http://0.0.0.0/'])
      expect(reject(url)).toBe('private')
  })

  it('refuses the cloud metadata address, which is the one that matters', () => {
    // 169.254.169.254 is where AWS, GCP and Azure hand out credentials.
    expect(reject('http://169.254.169.254/latest/meta-data/')).toBe('private')
    // URL normalises this to ::ffff:a9fe:a9fe, so both spellings are checked.
    expect(reject('http://[::ffff:169.254.169.254]/')).toBe('private')
    expect(reject('http://[::ffff:a9fe:a9fe]/')).toBe('private')
    expect(reject('http://[::ffff:127.0.0.1]/')).toBe('private')
    // A mapped *public* address must still be allowed through.
    expect(guardUrl('http://[::ffff:8.8.8.8]/').ok).toBe(true)
  })

  it('refuses every private IPv4 range', () => {
    for (const url of ['http://10.0.0.1/', 'http://172.16.0.1/', 'http://172.31.255.255/', 'http://192.168.1.1/', 'http://100.64.0.1/', 'http://239.1.1.1/'])
      expect(reject(url)).toBe('private')
  })

  it('lets public addresses inside those families through', () => {
    // 172.32 is public even though 172.16-31 is not; an over-broad check here
    // would silently refuse real sites.
    expect(guardUrl('http://172.32.0.1/').ok).toBe(true)
    expect(guardUrl('http://11.0.0.1/').ok).toBe(true)
    expect(guardUrl('http://192.169.1.1/').ok).toBe(true)
  })

  it('refuses private IPv6 and internal suffixes', () => {
    for (const url of ['http://[fc00::1]/', 'http://[fe80::1]/', 'http://printer.local/', 'http://db.internal/', 'http://box.lan/'])
      expect(reject(url)).toBe('private')
  })

  it('refuses non-web ports, so it cannot be used to scan', () => {
    for (const url of ['http://example.com:22/', 'http://example.com:6379/', 'http://example.com:8080/'])
      expect(reject(url)).toBe('port')
  })

  it('rejects empty and absurd input', () => {
    expect(reject('')).toBe('empty')
    expect(reject('   ')).toBe('empty')
    expect(reject(`https://a.test/${'x'.repeat(3000)}`)).toBe('too-long')
    expect(reject('http://')).toBe('unparseable')
  })
})
