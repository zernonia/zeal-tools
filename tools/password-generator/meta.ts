import type { ToolMeta } from '../../shared/registry/types'

const meta: ToolMeta = {
  slug: 'password-generator',
  name: 'Password Generator',
  tagline: 'Strong passwords, generated in your browser and never sent anywhere.',
  description:
    'Generate a strong random password with the character sets you choose. It is produced in your browser by the '
    + 'operating system\'s cryptographic random source, never transmitted and never stored. See the entropy and how '
    + 'long it would take to crack before you use it.',
  category: 'Generators',
  keywords: [
    'password generator',
    'random password generator',
    'strong password generator',
    'secure password generator',
    'passphrase generator',
    'generate password online',
    'password entropy calculator',
    'no sign-up password generator',
  ],
  addedAt: '2026-08-19',
  api: true,
  apiPath: 'password',
  mcp: true,
  shareCopy:
    'Free password generator that never sends your password anywhere — it is made in your own browser. '
    + 'No sign-up, open source.',
  icon: '🔑',
}

export default meta
