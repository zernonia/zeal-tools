import { describe, expect, it } from 'vitest'
import { BLOCK_SELECTOR, MASK_TEXT_SELECTOR, maskAttribute } from './replay-privacy'

describe('maskAttribute', () => {
  it('masks anything that could carry an input inside a tool', () => {
    expect(maskAttribute('aria-label', 'Remove holiday-photo.jpg', true)).toBe('****************')
    expect(maskAttribute('alt', 'Preview of passport.png', true)).not.toContain('passport')
    expect(maskAttribute('href', 'blob:https://zeal.tools/1234', true)).not.toContain('blob')
    expect(maskAttribute('download', 'invoice-acme.pdf', true)).toBe('****************')
    expect(maskAttribute('value', 'hunter2', true)).toBe('*******')
    expect(maskAttribute('data-value', 'secret', true)).toBe('******')
  })

  it('keeps presentational attributes so the tool still renders', () => {
    expect(maskAttribute('class', 'rounded-2xl border', true)).toBe('rounded-2xl border')
    expect(maskAttribute('style', 'left: 40%', true)).toBe('left: 40%')
    expect(maskAttribute('data-state', 'checked', true)).toBe('checked')
    expect(maskAttribute('ROLE', 'slider', true)).toBe('slider')
  })

  it('leaves the page around the tools alone', () => {
    expect(maskAttribute('aria-label', 'Search tools', false)).toBe('Search tools')
    expect(maskAttribute('href', '/tools/tuner', false)).toBe('/tools/tuner')
  })

  it('does not invent a value for an empty attribute', () => {
    expect(maskAttribute('alt', '', true)).toBe('')
  })
})

describe('selectors', () => {
  it('mask all text in a tool frame', () => {
    expect(MASK_TEXT_SELECTOR.split(', ')).toContain('.tool-frame')
  })

  it('block pictures in a tool frame, QR codes and maps included', () => {
    const blocked = BLOCK_SELECTOR.split(', ')
    for (const tag of ['img', 'canvas', 'svg', 'iframe', 'video'])
      expect(blocked).toContain(`.tool-frame ${tag}`)
  })

  it('treat a teleported dialog marked data-replay-mask like a tool frame', () => {
    expect(MASK_TEXT_SELECTOR.split(', ')).toContain('[data-replay-mask]')
    expect(BLOCK_SELECTOR.split(', ')).toContain('[data-replay-mask] img')
  })
})
