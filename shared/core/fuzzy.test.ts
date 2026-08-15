import type { SearchDoc } from './fuzzy'
import { describe, expect, it } from 'vitest'
import { search } from './fuzzy'

const docs: SearchDoc[] = [
  { slug: 'qr-code-generator', name: 'QR Code Generator', tagline: 'Free QR codes', category: 'Generators', keywords: ['qr', 'qrcode', 'barcode', 'wifi qr', 'vcard'] },
  { slug: 'password-generator', name: 'Password Generator', tagline: 'Strong random passwords', category: 'Generators', keywords: ['password', 'random', 'secure'] },
  { slug: 'chord-transposer', name: 'Chord Transposer', tagline: 'Transpose song chords', category: 'Music', keywords: ['chords', 'music', 'key', 'transpose'] },
]

function slugs(query: string) {
  return search(query, docs).map(r => r.doc.slug)
}

describe('fuzzy search rankings', () => {
  it('finds by exact keyword', () => {
    expect(slugs('qr')[0]).toBe('qr-code-generator')
  })
  it('finds by concatenated keyword', () => {
    expect(slugs('qrcode')[0]).toBe('qr-code-generator')
  })
  it('multi-word query requires all words', () => {
    expect(slugs('wifi qr')[0]).toBe('qr-code-generator')
    expect(slugs('wifi zebra')).toEqual([])
  })
  it('finds by synonym keyword (barcode → QR)', () => {
    expect(slugs('barcode')[0]).toBe('qr-code-generator')
  })
  it('subsequence typo tolerance', () => {
    expect(slugs('pasword')[0]).toBe('password-generator')
  })
  it('name weighting beats tagline matches', () => {
    expect(slugs('generator')).toContain('qr-code-generator')
    expect(slugs('chord')[0]).toBe('chord-transposer')
  })
  it('empty query returns nothing', () => {
    expect(slugs('')).toEqual([])
    expect(slugs('   ')).toEqual([])
  })
  it('no result for garbage', () => {
    expect(slugs('zzzzqqqq')).toEqual([])
  })
})
