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
  /** Expose as REST endpoint under /api/v1/<apiPath ?? slug>. */
  api: boolean
  /**
   * Endpoint segment when it differs from the slug — `qr-code-generator`
   * serves `/api/v1/qr`. Guessing this from the slug is how the API index,
   * llms.txt and the API catalog end up advertising URLs that 404.
   */
  apiPath?: string
  /** Expose through the MCP server. */
  mcp: boolean
  /**
   * Long-tail variant routes relative to the tool page (e.g. 'wifi'). These
   * appear in the sidebar nav, the sitemap and llms.txt, so list only real
   * landing pages here — an app surface like the stage timer's projector view
   * is reached from its own tool, not advertised as somewhere to arrive.
   */
  variants?: string[]
  /** Default share copy for the X intent button. */
  shareCopy?: string
  /** Emoji used in the grid card and command palette. */
  icon?: string
}
