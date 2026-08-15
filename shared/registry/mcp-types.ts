/** What a slice must export to appear as an MCP tool. */
export interface McpContent {
  type: 'text' | 'image'
  text?: string
  data?: string
  mimeType?: string
}

export interface McpResult {
  content: McpContent[]
  structuredContent?: Record<string, unknown>
  isError?: boolean
}

export interface McpTool {
  /** Tool name as the agent calls it, e.g. `generate_qr`. */
  name: string
  title: string
  description: string
  /** JSON Schema for the arguments object. */
  inputSchema: Record<string, unknown>
  run: (args: Record<string, unknown>) => McpResult
}
