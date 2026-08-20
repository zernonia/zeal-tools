import type { McpTool } from './mcp-types'
import chordTransposer from '../../tools/chord-transposer/mcp'
import namePicker from '../../tools/name-picker/mcp'
import passwordGenerator from '../../tools/password-generator/mcp'
import qrCodeGenerator from '../../tools/qr-code-generator/mcp'

export type { McpTool } from './mcp-types'

/**
 * Every tool exposed over MCP. A slice with `mcp: true` in its meta adds one
 * line here — the same shape as the registry itself, so the MCP surface can
 * never drift from what the tools actually implement.
 */
export const mcpTools: McpTool[] = [
  qrCodeGenerator,
  chordTransposer,
  passwordGenerator,
  namePicker,
]

export function findMcpTool(name: string): McpTool | undefined {
  return mcpTools.find(tool => tool.name === name)
}
