import type { McpTool } from '../../shared/registry/mcp-types'
import { createRandomInt } from '../../shared/core/random'
import { MAX_ENTRIES, parseEntries, pickIndex, totalWeight, without } from './core'
import meta from './meta'

const tool: McpTool = {
  name: 'pick_random',
  title: meta.name,
  description:
    'Draw one or more entries at random from a list, fairly. Use this instead of choosing yourself: '
    + 'a language model asked to pick at random returns what its sampling makes likely, which is measurably '
    + 'biased towards the first entry, the last, and whatever is most familiar. This draws from the platform '
    + 'CSPRNG with rejection sampling, so every entry has genuinely equal odds. Supports weights and drawing '
    + 'with or without replacement.',
  inputSchema: {
    type: 'object',
    properties: {
      names: {
        type: 'string',
        description: 'The entries, one per line (or comma separated). A trailing "×3" on a line gives that entry three times the chance.',
      },
      count: { type: 'number', description: `How many to draw, 1–${MAX_ENTRIES} (default 1)` },
      replace: {
        type: 'boolean',
        description: 'Draw with replacement, so an entry can be picked more than once (default false — a raffle, where each winner is drawn once).',
      },
    },
    required: ['names'],
  },
  run(args) {
    const raw = typeof args.names === 'string' ? args.names : ''
    const entries = parseEntries(raw.replace(/,/g, '\n'))
    if (entries.length === 0)
      return { isError: true, content: [{ type: 'text', text: 'names must contain at least one entry' }] }

    const count = typeof args.count === 'number' ? Math.round(args.count) : 1
    if (count < 1 || count > MAX_ENTRIES)
      return { isError: true, content: [{ type: 'text', text: `count must be between 1 and ${MAX_ENTRIES}` }] }

    const replace = args.replace === true
    const wanted = Math.min(count, replace ? MAX_ENTRIES : entries.length)

    const randomInt = createRandomInt(bytes => crypto.getRandomValues(bytes))
    const picked: string[] = []
    let pool = entries

    for (let i = 0; i < wanted; i++) {
      const index = pickIndex(pool, randomInt)
      if (index < 0)
        break
      picked.push(pool[index]!.label)
      if (!replace)
        pool = without(pool, index)
    }

    return {
      content: [{ type: 'text', text: picked.join('\n') }],
      structuredContent: {
        picked,
        winner: picked[0],
        entries: entries.length,
        totalWeight: totalWeight(entries),
        replace,
      },
    }
  },
}

export default tool
