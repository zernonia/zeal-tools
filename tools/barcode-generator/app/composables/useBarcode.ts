import type { StateSchema } from '../../../../shared/core/url-state'
import type { Barcode, Symbology } from '../../core'
import { computed } from 'vue'
import { encodeBarcode, layoutBarcode, renderSvg, SYMBOLOGIES } from '../../core'

/** Shareable state. Nothing here is sensitive — a barcode prints its own data. */
export const barcodeStateSchema = {
  sym: { type: 'string', default: 'ean13' },
  data: { type: 'string', default: '' },
  check: { type: 'boolean', default: false },
  bearers: { type: 'boolean', default: true },
  text: { type: 'boolean', default: true },
  w: { type: 'number', default: 2 },
  h: { type: 'number', default: 80 },
  margin: { type: 'number', default: 2 },
  fg: { type: 'string', default: '#000000' },
  bg: { type: 'string', default: '#ffffff' },
  transparent: { type: 'boolean', default: false },
  // 2× of a 2 px module is 4 px — 0.34 mm at 300 dpi, EAN/UPC's nominal size.
  scale: { type: 'number', default: 2 },
} satisfies StateSchema

export function useBarcode() {
  const state = useToolState(barcodeStateSchema)

  const info = computed(() => SYMBOLOGIES.find(s => s.id === state.sym) ?? SYMBOLOGIES[0]!)

  // Zero-click example: an empty field previews the symbology's sample.
  const input = computed(() => state.data.trim() ? state.data : info.value.sample)

  const result = computed<{ barcode: Barcode | null, error: string | null }>(() => {
    try {
      return {
        barcode: encodeBarcode(info.value.id as Symbology, input.value, { checkChar: state.check, bearers: state.bearers }),
        error: null,
      }
    }
    catch (e) {
      return { barcode: null, error: e instanceof Error ? e.message : String(e) }
    }
  })

  const svgOptions = computed(() => ({
    moduleWidth: state.w,
    height: state.h,
    margin: state.margin,
    showText: state.text,
    fg: state.fg,
    bg: state.transparent ? 'transparent' : state.bg,
  }))

  const svg = computed(() => (result.value.barcode ? renderSvg(result.value.barcode, svgOptions.value) : ''))
  const layout = computed(() => (result.value.barcode ? layoutBarcode(result.value.barcode, svgOptions.value) : null))

  /**
   * Rasterise the exact SVG at an integer scale. Bar edges sit on whole
   * pixels of the SVG, so a whole-number scale keeps them on whole pixels of
   * the PNG — no grey anti-aliased edges for a scanner to misjudge.
   */
  async function toPngBlob(scale = state.scale): Promise<Blob | null> {
    if (!svg.value || !layout.value)
      return null
    const factor = Math.max(1, Math.min(10, Math.round(scale)))
    const width = layout.value.width * factor
    const height = layout.value.height * factor
    const url = URL.createObjectURL(new Blob([svg.value], { type: 'image/svg+xml' }))
    try {
      const img = new Image()
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve()
        img.onerror = () => reject(new Error('Failed to rasterise the barcode'))
        img.src = url
      })
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx)
        return null
      ctx.imageSmoothingEnabled = false
      ctx.drawImage(img, 0, 0, width, height)
      return await new Promise(resolve => canvas.toBlob(resolve, 'image/png'))
    }
    catch {
      return null
    }
    finally {
      URL.revokeObjectURL(url)
    }
  }

  return { state, info, input, result, svg, layout, toPngBlob }
}
