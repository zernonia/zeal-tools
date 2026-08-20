import type { StoreDefinition } from './storage'
import { describe, expect, it } from 'vitest'
import { deserialize, safeBoolean, safeList, safeNumber, safeText, serialize } from './storage'

interface Settings {
  name: string
  quality: number
  dark: boolean
  password: string
}

const def: StoreDefinition<Settings> = {
  key: 'zeal:test',
  version: 1,
  defaults: { name: 'Untitled', quality: 80, dark: false, password: '' },
  omit: ['password'],
}

describe('serialize', () => {
  it('writes the value with its version', () => {
    const out = JSON.parse(serialize({ ...def.defaults, name: 'Zeal' }, def))
    expect(out.v).toBe(1)
    expect(out.d.name).toBe('Zeal')
  })

  it('never writes an omitted field, whatever it is handed', () => {
    // The whole point of the definition: a secret cannot reach storage by
    // oversight, only by being taken out of `omit`.
    const out = JSON.parse(serialize({ ...def.defaults, password: 'hunter2' }, def))
    expect('password' in out.d).toBe(false)
    expect(serialize({ ...def.defaults, password: 'hunter2' }, def)).not.toContain('hunter2')
  })
})

describe('deserialize', () => {
  it('round-trips a stored value', () => {
    const stored = serialize({ ...def.defaults, name: 'Zeal', quality: 60 }, def)
    expect(deserialize(stored, def)).toEqual({ name: 'Zeal', quality: 60, dark: false, password: '' })
  })

  it('returns defaults when there is nothing stored', () => {
    expect(deserialize(null, def)).toEqual(def.defaults)
    expect(deserialize('', def)).toEqual(def.defaults)
  })

  it('returns defaults rather than throwing on rubbish', () => {
    // Storage is writable by the user, other tabs and extensions.
    for (const bad of ['not json', '[]', 'null', '42', '{"v":1}', '{"d":{}}'])
      expect(deserialize(bad, def)).toEqual(def.defaults)
  })

  it('discards data written by an older version', () => {
    const old = JSON.stringify({ v: 0, d: { name: 'Ancient' } })
    expect(deserialize(old, def)).toEqual(def.defaults)
  })

  it('ignores an omitted field even if the payload carries one', () => {
    // A hand-edited or older payload must not be able to reintroduce it.
    const sneaky = JSON.stringify({ v: 1, d: { name: 'Zeal', password: 'hunter2' } })
    expect(deserialize(sneaky, def).password).toBe('')
  })

  it('fills in fields the stored payload is missing', () => {
    const partial = JSON.stringify({ v: 1, d: { name: 'Zeal' } })
    expect(deserialize(partial, def)).toEqual({ ...def.defaults, name: 'Zeal' })
  })

  it('uses the revive step to reject the wrong shapes', () => {
    const strict: StoreDefinition<Settings> = {
      ...def,
      revive: (raw, defaults) => ({
        name: safeText(raw.name, defaults.name, 20),
        quality: safeNumber(raw.quality, defaults.quality, 10, 100),
        dark: safeBoolean(raw.dark, defaults.dark),
        password: defaults.password,
      }),
    }
    const nasty = JSON.stringify({ v: 1, d: { name: { evil: true }, quality: 5000, dark: 'yes' } })
    expect(deserialize(nasty, strict)).toEqual({ name: 'Untitled', quality: 100, dark: false, password: '' })
  })

  it('falls back when the revive step itself throws', () => {
    const broken: StoreDefinition<Settings> = { ...def, revive: () => { throw new Error('nope') } }
    expect(deserialize(serialize(def.defaults, def), broken)).toEqual(def.defaults)
  })
})

describe('defaults are never shared', () => {
  interface Nested { business: { name: string }, count: number }
  const nested: StoreDefinition<Nested> = {
    key: 'zeal:nested',
    version: 1,
    defaults: { business: { name: 'Untitled' }, count: 0 },
  }

  it('hands out a deep copy, so editing state cannot rewrite the defaults', () => {
    // A shallow spread shares every nested object with the definition. Editing
    // state.business.name then rewrites the default, and "clear" restores the
    // very value it was asked to erase — which is exactly what it did.
    const first = deserialize(null, nested)
    first.business.name = 'Edited'
    expect(deserialize(null, nested).business.name).toBe('Untitled')
    expect(nested.defaults.business.name).toBe('Untitled')
  })

  it('gives two readers independent objects', () => {
    const a = deserialize(null, nested)
    const b = deserialize(null, nested)
    a.business.name = 'A'
    expect(b.business.name).toBe('Untitled')
  })
})

describe('revive helpers', () => {
  it('bounds and cleans text', () => {
    expect(safeText('  Zeal  ', 'x')).toBe('  Zeal  ')
    expect(safeText('x'.repeat(500), 'fallback', 10)).toHaveLength(10)
    expect(safeText(42, 'fallback')).toBe('fallback')
    expect(safeText(null, 'fallback')).toBe('fallback')
  })

  it('strips control characters from stored text', () => {
    // Stored text is rendered into a document; a newline smuggled into a
    // company name would forge a second line of an address.
    expect(safeText(`Acme${String.fromCharCode(0)}\n Ltd`, 'x')).toBe('Acme Ltd')
  })

  it('clamps numbers and rejects nonsense', () => {
    expect(safeNumber(50, 0, 0, 100)).toBe(50)
    expect(safeNumber(500, 0, 0, 100)).toBe(100)
    expect(safeNumber(-5, 0, 0, 100)).toBe(0)
    for (const bad of [Number.NaN, Infinity, '50', null, {}])
      expect(safeNumber(bad, 7)).toBe(7)
  })

  it('only accepts real booleans', () => {
    expect(safeBoolean(true, false)).toBe(true)
    expect(safeBoolean('true', false)).toBe(false)
    expect(safeBoolean(1, false)).toBe(false)
  })

  it('revives a list, dropping entries it cannot read', () => {
    const revive = (raw: unknown) => (typeof raw === 'string' ? raw : null)
    expect(safeList(['a', 2, 'b', null], revive)).toEqual(['a', 'b'])
    expect(safeList('not a list', revive)).toEqual([])
  })

  it('caps a list, because storage is a writable surface', () => {
    const huge = Array.from({ length: 5000 }, (_, i) => String(i))
    expect(safeList(huge, raw => (typeof raw === 'string' ? raw : null), 50)).toHaveLength(50)
  })
})
