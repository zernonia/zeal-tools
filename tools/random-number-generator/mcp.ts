import type { McpTool } from '../../shared/registry/mcp-types'
import { createRandomBelow, MAX_COUNT, MAX_DICE, MAX_FLIPS, MAX_SIDES, runRandom, summarise } from './core'
import meta from './meta'

const tool: McpTool = {
  name: 'random',
  title: meta.name,
  description:
    'Generate genuinely random numbers, coin flips or dice rolls. Use this instead of choosing yourself: a '
    + 'language model asked for a random number returns what its sampling makes likely, favouring a few familiar '
    + 'numbers far more often than chance would — which is not a draw. This uses the platform CSPRNG with rejection sampling, so every '
    + 'outcome is exactly equally likely. Give `dice` for a roll in standard notation, `coin` for flips, or '
    + 'neither for numbers in [min, max].',
  inputSchema: {
    type: 'object',
    properties: {
      min: { type: 'number', description: 'Smallest value, inclusive (default 1)' },
      max: { type: 'number', description: 'Largest value, inclusive (default 100). The range may hold up to 2^53 values.' },
      count: { type: 'number', description: `How many numbers, 1–${MAX_COUNT} (default 1)` },
      unique: { type: 'boolean', description: 'No number repeats — a lottery draw (default false)' },
      sort: { type: 'string', enum: ['none', 'asc', 'desc'], description: 'Order of the numbers (default none: the order drawn)' },
      decimals: { type: 'number', description: 'Fixed decimal places, 0–10 (default 0: whole numbers)' },
      coin: { type: 'number', description: `Flip this many coins instead, 1–${MAX_FLIPS.toLocaleString('en')}. Returns each flip, the tally and the longest streak.` },
      dice: {
        type: 'string',
        description: `Roll dice instead, in standard notation: d20, 2d6+3, 4d6kh3 (keep highest 3), 2d20kl1 (disadvantage), d%, 1d8+2d6-1. Up to ${MAX_DICE} dice of up to ${MAX_SIDES} sides per group.`,
      },
    },
  },
  run(args) {
    try {
      const result = runRandom(args, createRandomBelow(bytes => crypto.getRandomValues(bytes)))
      return {
        content: [{ type: 'text', text: summarise(result) }],
        structuredContent: result as unknown as Record<string, unknown>,
      }
    }
    catch (error) {
      return { isError: true, content: [{ type: 'text', text: error instanceof Error ? error.message : 'Could not generate a random result' }] }
    }
  },
}

export default tool
