/**
 * THE tool registry. Homepage grid, Cmd+K search, sitemap, API index and the
 * MCP tool list all derive from this single aggregation.
 *
 * Adding a tool = adding its folder under tools/ and one import line here.
 */
import type { ToolMeta } from './types'
import qrCodeGenerator from '../../tools/qr-code-generator/meta'

export type { ToolMeta }

export const registry: ToolMeta[] = [
  qrCodeGenerator,
]

export function getTool(slug: string): ToolMeta | undefined {
  return registry.find(tool => tool.slug === slug)
}
