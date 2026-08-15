import type { StateSchema } from './url-state'
import { describe, expect, it } from 'vitest'
import { decodePresentState, decodeState, defaultState, encodeState } from './url-state'

const schema = {
  data: { type: 'string', default: '' },
  size: { type: 'number', default: 1024 },
  ec: { type: 'string', default: 'M' },
  transparent: { type: 'boolean', default: false },
  password: { type: 'string', default: '', secret: true },
} satisfies StateSchema

describe('url-state codec', () => {
  it('encodes only non-default fields', () => {
    const state = { ...defaultState(schema), data: 'https://zeal.tools', size: 2048 }
    expect(encodeState(schema, state)).toBe('data=https%3A%2F%2Fzeal.tools&size=2048')
  })

  it('nEVER serializes secret fields', () => {
    const state = { ...defaultState(schema), data: 'x', password: 'hunter2' }
    expect(encodeState(schema, state)).not.toContain('hunter2')
    expect(encodeState(schema, state)).not.toContain('password')
  })

  it('never deserializes secret fields either', () => {
    const decoded = decodeState(schema, new URLSearchParams('password=evil&data=ok'))
    expect(decoded.password).toBe('')
    expect(decoded.data).toBe('ok')
  })

  it('round-trips through URLSearchParams', () => {
    const state = { ...defaultState(schema), data: 'héllo & co', transparent: true }
    const decoded = decodeState(schema, new URLSearchParams(encodeState(schema, state)))
    expect(decoded).toEqual(state)
  })

  it('falls back to defaults on malformed numbers', () => {
    expect(decodeState(schema, new URLSearchParams('size=banana')).size).toBe(1024)
  })
})

describe('decodePresentState (hydration merge)', () => {
  it('returns only keys present in the query', () => {
    const partial = decodePresentState(schema, new URLSearchParams('size=2048'))
    expect(partial).toEqual({ size: 2048 })
    expect('data' in partial).toBe(false)
  })

  it('never reads secrets even when present', () => {
    expect(decodePresentState(schema, new URLSearchParams('password=evil'))).toEqual({})
  })

  it('drops malformed numbers instead of resetting them', () => {
    expect(decodePresentState(schema, new URLSearchParams('size=banana'))).toEqual({})
  })
})
