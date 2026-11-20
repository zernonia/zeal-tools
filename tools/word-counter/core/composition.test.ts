import { describe, expect, it } from 'vitest'
import { composition } from './composition'
import { graphemeLength } from './stats'

describe('composition', () => {
  it('sorts each character into one class', () => {
    expect(composition('Hi 42, ok?\n€')).toEqual({ letters: 4, digits: 2, spaces: 3, punctuation: 2, other: 1 })
  })

  it('adds up to the character count, emoji and accents included', () => {
    const text = 'Café 👍🏽 — 3️⃣ 日本語!\r\n'
    const parts = composition(text)
    expect(Object.values(parts).reduce((a, b) => a + b, 0)).toBe(graphemeLength(text))
    expect(parts.letters).toBe(7)
    // A keycap emoji starts with a digit but is not one.
    expect(parts.digits).toBe(0)
  })

  it('is all zeros for an empty text', () => {
    expect(composition('')).toEqual({ letters: 0, digits: 0, spaces: 0, punctuation: 0, other: 0 })
  })
})
