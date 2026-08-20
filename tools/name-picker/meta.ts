import type { ToolMeta } from '../../shared/registry/types'

const meta: ToolMeta = {
  slug: 'name-picker',
  name: 'Name Picker',
  tagline: 'Spin a wheel to pick a random name, winner or team — fairly, in the browser.',
  description:
    'A random name picker with a spinning wheel. Paste a list, spin, and get one name drawn with a '
    + 'cryptographic source of randomness rather than a rough approximation of one. Weights, '
    + 'remove-after-picking and a saved list. Free, no sign-up, and the list never leaves your browser.',
  category: 'Utilities',
  keywords: [
    'wheel of names',
    'name wheel',
    'picker wheel',
    'wheel spinner',
    'spinner wheel',
    'spin the wheel',
    'random wheel',
    'wheel decide',
    'random name picker',
    'random picker',
    'random chooser',
    'random name generator',
    'raffle winner picker',
    'giveaway picker',
    'prize draw picker',
    'classroom name picker',
    'random student selector',
    'random team generator',
    'group generator',
    'decision wheel',
    'who goes first',
  ],
  addedAt: '2026-08-20',
  api: true,
  // The REST segment is the verb, not the tool: /api/v1/pick reads correctly
  // in a script, and the wheel is a picture of what this does rather than
  // the thing itself.
  apiPath: 'pick',
  mcp: true,
  variants: ['wheel', 'raffle', 'classroom'],
  shareCopy:
    'Free random name picker — spin a wheel, draw a fair winner. The draw uses real cryptographic '
    + 'randomness and your list never leaves your browser. No sign-up, open source.',
  icon: '🎡',
}

export default meta
