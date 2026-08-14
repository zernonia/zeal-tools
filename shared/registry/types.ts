export interface ToolMeta {
  /** URL slug — also the folder name under tools/. */
  slug: string
  name: string
  tagline: string
  /** Longer description for meta tags and the API index. */
  description: string
  category: string
  /** Search keywords, including synonyms and intents ("barcode" → QR). */
  keywords: string[]
  /** ISO date the tool shipped — drives sitemap lastmod + launch automation. */
  addedAt: string
  /** Expose as REST endpoint under /api/v1/<slug>. */
  api: boolean
  /** Expose through the MCP server. */
  mcp: boolean
  /** Long-tail variant routes relative to the tool page (e.g. 'wifi'). */
  variants?: string[]
  /** Default share copy for the X intent button. */
  shareCopy?: string
  /** Emoji used in the grid card and command palette. */
  icon?: string
}
