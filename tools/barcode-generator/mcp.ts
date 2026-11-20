import type { McpTool } from '../../shared/registry/mcp-types'
import { generateBarcode, NAMES, parseSymbology, SYMBOLOGIES } from './core'
import meta from './meta'

const num = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) ? value : undefined)

const tool: McpTool = {
  name: 'generate_barcode',
  title: meta.name,
  description: `${meta.description} Returns the barcode as an SVG string. Check digits are appended when left off and verified when given. `
    + 'A generated EAN or UPC is only valid at retail if its number comes from a GS1 company prefix the user owns.',
  inputSchema: {
    type: 'object',
    properties: {
      symbology: { type: 'string', enum: SYMBOLOGIES.map(s => s.id), description: SYMBOLOGIES.map(s => `${s.id}: ${s.accepts}`).join('; ') },
      data: { type: 'string', description: 'What to encode. Digits for EAN/UPC/ITF-14 (check digit optional); text for Code 128 and Code 39.' },
      checkChar: { type: 'boolean', description: 'Code 39 only: append the mod-43 check character (default false).' },
      bearers: { type: 'boolean', description: 'ITF-14 only: draw bearer bars (default true).' },
      moduleWidth: { type: 'number', description: 'Width of the narrowest bar in px, 1–10 (default 2).' },
      height: { type: 'number', description: 'Bar height in px, 10–600 (default 80).' },
      showText: { type: 'boolean', description: 'Print the human-readable line (default true).' },
      fg: { type: 'string', description: 'Bar colour (default #000000). Keep it dark: red bars are invisible to red-light scanners.' },
      bg: { type: 'string', description: 'Background colour (default #ffffff), or "transparent".' },
    },
    required: ['symbology', 'data'],
  },
  run(args) {
    const symbology = parseSymbology(args.symbology)
    if (!symbology)
      return { isError: true, content: [{ type: 'text', text: `Unknown symbology. Use one of: ${SYMBOLOGIES.map(s => s.id).join(', ')}.` }] }
    if (typeof args.data !== 'string' || !args.data)
      return { isError: true, content: [{ type: 'text', text: 'Provide `data` — the number or text to encode.' }] }
    try {
      const { svg, barcode } = generateBarcode(symbology, args.data, {
        checkChar: args.checkChar === true,
        bearers: args.bearers !== false,
        moduleWidth: num(args.moduleWidth),
        height: num(args.height),
        showText: args.showText !== false,
        fg: typeof args.fg === 'string' ? args.fg : undefined,
        bg: typeof args.bg === 'string' ? args.bg : undefined,
      })
      return {
        content: [{ type: 'text', text: svg }],
        structuredContent: {
          symbology: NAMES[symbology],
          data: barcode.data,
          checkDigit: barcode.checkDigit ?? null,
          checkDigitAdded: barcode.checkAdded ?? false,
          modules: barcode.modules.length,
        },
      }
    }
    catch (error) {
      return { isError: true, content: [{ type: 'text', text: error instanceof Error ? error.message : 'Failed to generate the barcode' }] }
    }
  },
}

export default tool
