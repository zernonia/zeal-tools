import type { McpTool } from '../../shared/registry/mcp-types'
import { CASE_IDS, isCaseId, MAX_TEXT_LENGTH, respond } from './core'
import meta from './meta'

const tool: McpTool = {
  name: 'count_words',
  title: meta.name,
  description:
    'Count words, characters (graphemes, with and without spaces), UTF-16 length, UTF-8 bytes, sentences, '
    + 'paragraphs, lines and unique words in a text, with reading time (238 wpm), speaking time (130 wpm), the top '
    + 'keywords, SMS encoding and segments, and length against X (weighted) and meta description limits. '
    + 'Words follow Unicode word boundaries, so Chinese, Japanese and Thai are split by dictionary; contractions and '
    + 'hyphenated compounds count as one word. Pass `case` to also get the text converted.',
  inputSchema: {
    type: 'object',
    required: ['text'],
    properties: {
      text: { type: 'string', description: `The text to measure, up to ${MAX_TEXT_LENGTH.toLocaleString('en-GB')} UTF-16 units.` },
      case: { type: 'string', enum: [...CASE_IDS], description: 'Optional: also return the text converted to this case.' },
    },
  },
  run(args) {
    if (typeof args.text !== 'string')
      return { isError: true, content: [{ type: 'text', text: 'Provide a `text` string.' }] }
    if (args.text.length > MAX_TEXT_LENGTH)
      return { isError: true, content: [{ type: 'text', text: `text is too long: the limit is ${MAX_TEXT_LENGTH} UTF-16 units.` }] }
    const id = args.case === undefined || isCaseId(args.case) ? args.case : null
    if (id === null)
      return { isError: true, content: [{ type: 'text', text: `case must be one of: ${CASE_IDS.join(', ')}.` }] }

    const result = respond({ text: args.text, case: id })
    const summary = `${result.words} words, ${result.characters} characters (${result.charactersNoSpaces} without spaces), `
      + `${result.sentences} sentences, ${result.paragraphs} paragraphs.`
    return {
      content: [{ type: 'text', text: result.converted ?? summary }],
      structuredContent: { ...result },
    }
  },
}

export default tool
