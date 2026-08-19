import type { McpTool } from '../../shared/registry/mcp-types'
import type { PasswordOptions } from './core'
import {
  buildAlphabet,
  crackTime,
  createRandomInt,
  DEFAULT_OPTIONS,
  entropyBits,
  generatePassword,
  strength,
} from './core'
import meta from './meta'

const tool: McpTool = {
  name: 'generate_password',
  title: meta.name,
  description: `${meta.description} Returns the password plus its entropy and an estimated time to crack.`,
  inputSchema: {
    type: 'object',
    properties: {
      length: { type: 'number', description: 'Characters, 1–256 (default 20)' },
      lowercase: { type: 'boolean', description: 'Include a–z (default true)' },
      uppercase: { type: 'boolean', description: 'Include A–Z (default true)' },
      digits: { type: 'boolean', description: 'Include 0–9 (default true)' },
      symbols: { type: 'boolean', description: 'Include punctuation (default true)' },
      excludeAmbiguous: { type: 'boolean', description: 'Drop characters that are easy to misread, e.g. l/1/I and O/0 (default false)' },
      requireEach: { type: 'boolean', description: 'Guarantee at least one character from every selected set (default true)' },
      count: { type: 'number', description: 'How many to generate, 1–50 (default 1)' },
    },
  },
  run(args) {
    const bool = (key: string, fallback: boolean) => (typeof args[key] === 'boolean' ? args[key] : fallback)
    const options: PasswordOptions = {
      length: typeof args.length === 'number' ? Math.round(args.length) : DEFAULT_OPTIONS.length,
      lowercase: bool('lowercase', true),
      uppercase: bool('uppercase', true),
      digits: bool('digits', true),
      symbols: bool('symbols', true),
      excludeAmbiguous: bool('excludeAmbiguous', false),
      requireEach: bool('requireEach', true),
    }

    if (options.length < 1 || options.length > 256)
      return { isError: true, content: [{ type: 'text', text: 'length must be between 1 and 256' }] }

    const count = typeof args.count === 'number' ? Math.round(args.count) : 1
    if (count < 1 || count > 50)
      return { isError: true, content: [{ type: 'text', text: 'count must be between 1 and 50' }] }

    try {
      const randomInt = createRandomInt(bytes => crypto.getRandomValues(bytes))
      const passwords = Array.from({ length: count }, () => generatePassword(options, randomInt))
      const bits = entropyBits(options)
      return {
        content: [{ type: 'text', text: passwords.join('\n') }],
        structuredContent: {
          passwords,
          entropyBits: Math.round(bits * 10) / 10,
          strength: strength(bits),
          crackTime: crackTime(bits),
          alphabetSize: buildAlphabet(options).length,
        },
      }
    }
    catch (error) {
      return { isError: true, content: [{ type: 'text', text: error instanceof Error ? error.message : 'Could not generate a password' }] }
    }
  },
}

export default tool
