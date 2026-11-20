import type { McpTool } from './mcp-types'
import ageCalculator from '../../tools/age-calculator/mcp'
import barcodeGenerator from '../../tools/barcode-generator/mcp'
import chordTransposer from '../../tools/chord-transposer/mcp'
import metaTagChecker from '../../tools/meta-tag-checker/mcp'
import namePicker from '../../tools/name-picker/mcp'
import passwordGenerator from '../../tools/password-generator/mcp'
import qrCodeGenerator from '../../tools/qr-code-generator/mcp'
import randomNumberGenerator from '../../tools/random-number-generator/mcp'
import whoisLookup from '../../tools/whois-lookup/mcp'
import wordCounter from '../../tools/word-counter/mcp'
import xPostDownloader from '../../tools/x-post-downloader/mcp'

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
  metaTagChecker,
  whoisLookup,
  xPostDownloader,
  ageCalculator,
  wordCounter,
  randomNumberGenerator,
  barcodeGenerator,
]

export function findMcpTool(name: string): McpTool | undefined {
  return mcpTools.find(tool => tool.name === name)
}
