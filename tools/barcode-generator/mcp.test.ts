import { describe, expect, it } from 'vitest'
import tool from './mcp'

describe('generate_barcode MCP tool', () => {
  it('returns SVG and what was encoded', async () => {
    const result = await tool.run({ symbology: 'ean13', data: '400638133393' })
    expect(result.isError).toBeFalsy()
    expect(result.content[0]).toMatchObject({ type: 'text' })
    expect((result.content[0] as { text: string }).text.startsWith('<svg')).toBe(true)
    expect(result.structuredContent).toMatchObject({ data: '4006381333931', checkDigit: '1', checkDigitAdded: true })
  })

  it('passes input errors through as tool errors with the reason', async () => {
    const result = await tool.run({ symbology: 'ean13', data: '4006381333932' })
    expect(result.isError).toBe(true)
    expect((result.content[0] as { text: string }).text).toMatch(/should be 1/)
  })

  it('names the symbologies it knows when given another', async () => {
    const result = await tool.run({ symbology: 'pdf417', data: 'x' })
    expect(result.isError).toBe(true)
    expect((result.content[0] as { text: string }).text).toMatch(/ean13.*itf14/)
  })
})
