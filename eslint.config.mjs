import antfu from '@antfu/eslint-config'

export default antfu({
  vue: true,
  typescript: true,
  ignores: [
    '.nuxt',
    '.output',
    '.wrangler',
    'public',
  ],
  rules: {
    // The tool cores lean on compact `case N: x = ...; break` and
    // single-line guard blocks — that density is intentional here.
    'style/max-statements-per-line': 'off',
  },
})
