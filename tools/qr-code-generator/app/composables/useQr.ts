import { computed, ref, shallowRef, watchEffect } from 'vue'
import {
  buildPayload, encodeQr, renderSvg,
  type EcLevel, type DotStyle, type QrInput, type QrMatrix,
} from '../../core'
import { drawQrToCanvas } from '../../core/render-canvas'
import type { StateSchema } from '../../../../shared/core/url-state'

/**
 * Shareable state schema. The WiFi password is marked secret — the codec
 * excludes it from URLs by construction.
 */
export const qrStateSchema = {
  tab: { type: 'string', default: 'url' },
  url: { type: 'string', default: '' },
  text: { type: 'string', default: '' },
  ssid: { type: 'string', default: '' },
  password: { type: 'string', default: '', secret: true },
  security: { type: 'string', default: 'WPA' },
  hidden: { type: 'boolean', default: false },
  to: { type: 'string', default: '' },
  subject: { type: 'string', default: '' },
  body: { type: 'string', default: '' },
  phone: { type: 'string', default: '' },
  message: { type: 'string', default: '' },
  firstName: { type: 'string', default: '' },
  lastName: { type: 'string', default: '' },
  organization: { type: 'string', default: '' },
  title: { type: 'string', default: '' },
  vEmail: { type: 'string', default: '' },
  vPhone: { type: 'string', default: '' },
  vUrl: { type: 'string', default: '' },
  ec: { type: 'string', default: 'M' },
  fg: { type: 'string', default: '#111111' },
  bg: { type: 'string', default: '#ffffff' },
  margin: { type: 'number', default: 4 },
  dots: { type: 'string', default: 'square' },
  px: { type: 'number', default: 1024 },
} satisfies StateSchema

export function useQr() {
  const state = useToolState(qrStateSchema)
  // Logo stays local-only (data URIs don't belong in share links)
  const logoHref = ref<string>('')

  const input = computed<QrInput>(() => {
    switch (state.tab) {
      case 'text': return { type: 'text', text: state.text }
      case 'wifi': return { type: 'wifi', ssid: state.ssid, password: state.password, security: state.security as 'WPA' | 'WEP' | 'nopass', hidden: state.hidden }
      case 'email': return { type: 'email', to: state.to, subject: state.subject, body: state.body }
      case 'phone': return { type: 'phone', phone: state.phone }
      case 'sms': return { type: 'sms', phone: state.phone, message: state.message }
      case 'vcard': return { type: 'vcard', firstName: state.firstName, lastName: state.lastName, organization: state.organization, title: state.title, email: state.vEmail, phone: state.vPhone, url: state.vUrl }
      default: return { type: 'url', url: state.url }
    }
  })

  // Zero-click example: an empty URL tab previews https://zeal.tools
  const payload = computed(() => {
    const raw = buildPayload(input.value)
    if (state.tab === 'url' && !state.url.trim()) return 'https://zeal.tools'
    return raw
  })

  const matrix = shallowRef<QrMatrix | null>(null)
  const error = ref<string | null>(null)

  watchEffect(() => {
    try {
      if (!payload.value.trim()) {
        matrix.value = null
        error.value = null
        return
      }
      matrix.value = encodeQr(payload.value, {
        ecLevel: logoHref.value ? 'H' : (state.ec as EcLevel),
        boostEc: false,
      })
      error.value = null
    }
    catch (e) {
      matrix.value = null
      error.value = e instanceof Error ? e.message : String(e)
    }
  })

  const svg = computed(() => {
    if (!matrix.value) return ''
    return renderSvg(matrix.value, {
      fg: state.fg,
      bg: state.bg,
      margin: state.margin,
      dotStyle: state.dots as DotStyle,
      logo: logoHref.value ? { href: logoHref.value } : undefined,
    })
  })

  async function toPngBlob(size?: number): Promise<Blob | null> {
    if (!matrix.value) return null
    const canvas = document.createElement('canvas')
    await drawQrToCanvas(matrix.value, canvas, {
      size: size ?? state.px,
      margin: state.margin,
      fg: state.fg,
      bg: state.bg,
      dotStyle: state.dots as DotStyle,
      logo: logoHref.value ? { href: logoHref.value } : undefined,
    })
    return await new Promise(resolve => canvas.toBlob(resolve, 'image/png'))
  }

  return { state, logoHref, payload, matrix, svg, error, toPngBlob }
}
