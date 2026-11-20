import { describe, expect, it } from 'vitest'
import tool from './mcp'

describe('calculate_age MCP tool', () => {
  it('calculates an age', async () => {
    const result = await tool.run({ birth: '1990-06-15', on: '2026-11-20' })
    expect(result.isError).toBeUndefined()
    expect(result.structuredContent).toMatchObject({ years: 36, months: 5, days: 5, bornOn: 'Friday' })
    expect(result.content[0]!.text).toContain('36 years, 5 months, 5 days old')
  })

  it('defaults "on" to a real date', async () => {
    const result = await tool.run({ birth: '1990-06-15' })
    expect(result.structuredContent?.on).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('switches to a date difference when from and to are given', async () => {
    const result = await tool.run({ from: '2026-11-16', to: '2026-11-27', includeEnd: true })
    expect(result.structuredContent).toMatchObject({ totalDays: 12, businessDays: 10 })
  })

  it('returns readable errors', async () => {
    expect((await tool.run({})).isError).toBe(true)
    const reversed = await tool.run({ birth: '2030-01-01', on: '2026-01-01' })
    expect(reversed.isError).toBe(true)
    expect(reversed.content[0]!.text).toMatch(/after 2026-01-01/)
    expect((await tool.run({ from: '2026-02-30', to: '2026-03-01' })).content[0]!.text).toMatch(/not a real date/)
  })
})
