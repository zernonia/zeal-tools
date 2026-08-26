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
  /**
   * May be async. Most tools are pure and return synchronously, but the meta
   * checker has to fetch a page — and a route that forgets to await this
   * serialises a pending Promise as `{}`, which is exactly what it did.
   */
  run: (args: Record<string, unknown>) => McpResult | Promise<McpResult>
}
