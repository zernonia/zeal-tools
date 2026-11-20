import type { ToolMeta } from '../../shared/registry/types'

const meta: ToolMeta = {
  slug: 'random-number-generator',
  name: 'Random Number Generator',
  tagline: 'Random numbers, coin flips and dice rolls — fair, from your operating system\'s random source.',
  description:
    'Generate random numbers in any range, flip a coin or roll dice in standard notation like 2d6+3 or 4d6kh3. '
    + 'Every draw uses crypto.getRandomValues with rejection sampling, so each outcome is exactly equally likely. '
    + 'Unique numbers, sorting, decimals, flip history and streaks. Free, no sign-up, nothing uploaded.',
  category: 'Generators',
  keywords: [
    'random number generator',
    'rng',
    'random number',
    'pick a random number',
    'random number between 1 and 100',
    'random number picker',
    'lottery number generator',
    'unique random numbers',
    'flip a coin',
    'coin flip',
    'coin toss',
    'heads or tails',
    'dice roller',
    'roll a dice',
    'roll dice online',
    'd20 roller',
    'dnd dice roller',
    'virtual dice',
  ],
  addedAt: '2026-11-20',
  api: true,
  // The verb, not the tool name: /api/v1/random?dice=2d6 reads correctly in a
  // script, and it serves coins and dice as well as numbers.
  apiPath: 'random',
  mcp: true,
  variants: ['flip-a-coin', 'dice-roller'],
  shareCopy:
    'Free random number generator, coin flip and dice roller — real cryptographic randomness, no modulo bias, '
    + 'nothing uploaded. No sign-up, open source.',
  icon: '🎲',
}

export default meta
