import type { McpTool } from '../../shared/registry/mcp-types'
import { audit, buildTags, readMeta, resolveCard } from './core'
import { fetchHead } from './core/fetch'
import meta from './meta'

const tool: McpTool = {
  name: 'check_meta_tags',
  title: meta.name,
  description:
    'Read a page\'s meta tags and report what each platform will show. Pass `url` to fetch a live page, '
    + 'or `html` to check markup you already have. Returns the tags, an audit with severities, and the '
    + 'resolved link card for Google, X, Facebook, LinkedIn and Slack — each of which uses a different '
    + 'fallback chain, so they genuinely differ. Set `generate` to also get copy-ready tags.',
  inputSchema: {
    type: 'object',
    properties: {
      url: { type: 'string', description: 'Page to fetch. http/https only; private addresses are refused.' },
      html: { type: 'string', description: 'HTML to check instead of fetching. Takes precedence over url.' },
      generate: { type: 'boolean', description: 'Also return copy-ready tags built from what was found (default false).' },
    },
  },
  async run(args) {
    const html = typeof args.html === 'string' ? args.html : ''
    const url = typeof args.url === 'string' ? args.url : ''

    let source = html
    let finalUrl: string | undefined
    if (!source) {
      if (!url)
        return { isError: true, content: [{ type: 'text', text: 'Pass either url or html.' }] }
      const fetched = await fetchHead(url)
      if (!fetched.ok)
        return { isError: true, content: [{ type: 'text', text: fetched.error ?? 'That page could not be checked.' }] }
      source = fetched.html ?? ''
      finalUrl = fetched.finalUrl
    }

    const parsed = readMeta(source)
    const findings = audit(parsed)
    const errors = findings.filter(f => f.severity === 'error')
    const warnings = findings.filter(f => f.severity === 'warning')

    const summary = [
      `${errors.length} error${errors.length === 1 ? '' : 's'}, ${warnings.length} warning${warnings.length === 1 ? '' : 's'}.`,
      ...[...errors, ...warnings].map(f => `- [${f.severity}] ${f.label}: ${f.message}`),
    ].join('\n')

    return {
      content: [{ type: 'text', text: summary }],
      structuredContent: {
        finalUrl,
        meta: parsed,
        findings,
        cards: {
          google: resolveCard(parsed, 'google'),
          x: resolveCard(parsed, 'x'),
          facebook: resolveCard(parsed, 'facebook'),
          linkedin: resolveCard(parsed, 'linkedin'),
          slack: resolveCard(parsed, 'slack'),
        },
        ...(args.generate === true
          ? {
              tags: buildTags({
                title: parsed.og.title ?? parsed.title ?? undefined,
                description: parsed.og.description ?? parsed.description ?? undefined,
                url: parsed.og.url ?? parsed.canonical ?? undefined,
                image: parsed.og.image ?? undefined,
                siteName: parsed.og.site_name ?? undefined,
                type: parsed.og.type ?? 'website',
              }),
            }
          : {}),
      },
    }
  },
}

export default tool
