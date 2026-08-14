/**
 * Public surface of the QR tool core. Everything else in this folder is an
 * implementation detail — the UI, the REST API, and the MCP endpoint all go
 * through generateQr().
 */
import { encodeQr, type EcLevel, type QrMatrix } from './encoder'
import { renderSvg, type DotStyle, type SvgOptions } from './render-svg'
import {
  emailPayload, smsPayload, telPayload, urlPayload, vcardPayload, wifiPayload,
  type EmailInput, type SmsInput, type VCardInput, type WifiInput,
} from './payloads'

export type { EcLevel, QrMatrix, DotStyle, SvgOptions, WifiInput, VCardInput, EmailInput, SmsInput }
export { encodeQr, renderSvg, wifiPayload, vcardPayload, emailPayload, telPayload, smsPayload, urlPayload }

export type QrInput =
  | { type: 'url', url: string }
  | { type: 'text', text: string }
  | { type: 'wifi' } & WifiInput
  | { type: 'email' } & EmailInput
  | { type: 'phone', phone: string }
  | { type: 'sms' } & SmsInput
  | { type: 'vcard' } & VCardInput

export interface GenerateOptions extends SvgOptions {
  ecLevel?: EcLevel
}

export interface GenerateResult {
  svg: string
  matrix: QrMatrix
  payload: string
  size: number
  version: number
  ecLevel: EcLevel
}

/** Build the raw payload string for any supported input type. */
export function buildPayload(input: QrInput): string {
  switch (input.type) {
    case 'url': return urlPayload(input.url)
    case 'text': return input.text
    case 'wifi': return wifiPayload(input)
    case 'email': return emailPayload(input)
    case 'phone': return telPayload(input.phone)
    case 'sms': return smsPayload(input)
    case 'vcard': return vcardPayload(input)
  }
}

export function generateQr(input: QrInput | string, options: GenerateOptions = {}): GenerateResult {
  const payload = typeof input === 'string' ? input : buildPayload(input)
  // A center logo covers modules — auto-bump error correction to H.
  const ecLevel: EcLevel = options.logo?.href ? 'H' : options.ecLevel ?? 'M'
  const matrix = encodeQr(payload, { ecLevel })
  const svg = renderSvg(matrix, options)
  return { svg, matrix, payload, size: matrix.size, version: matrix.version, ecLevel: matrix.ecLevel }
}
