import type { McpTool } from '../../shared/registry/mcp-types'
import { parsePostRef, PostError, postMarkdown } from './core'
import { fetchPost } from './core/fetch'
import meta from './meta'

const tool: McpTool = {
  name: 'read_x_post',
  title: meta.name,
  description:
    'Read a public post on X (Twitter) without an account. Pass `url` (any x.com or twitter.com post link, or a '
    + 'bare post ID). Returns the post as Markdown — author, date, text with links expanded, reply-to and quoted '
    + 'post — plus structured data with direct MP4 links for each video rendition (best first) and original-size '
    + 'photo links. Posts over 280 characters come back truncated, and protected, age-restricted or deleted '
    + 'posts cannot be read; both are stated in the result.',
  inputSchema: {
    type: 'object',
    properties: {
      url: { type: 'string', description: 'Link to the post, e.g. https://x.com/NASA/status/2119833829389041896, or its numeric ID.' },
    },
    required: ['url'],
  },
  async run(args) {
    const ref = parsePostRef(typeof args.url === 'string' ? args.url : '')
    if ('error' in ref)
      return { isError: true, content: [{ type: 'text', text: ref.error }] }
    try {
      const post = await fetchPost(ref.id)
      return { content: [{ type: 'text', text: postMarkdown(post) }], structuredContent: { post } }
    }
    catch (error) {
      const message = error instanceof PostError ? error.message : 'That post could not be read.'
      return { isError: true, content: [{ type: 'text', text: message }] }
    }
  },
}

export default tool
