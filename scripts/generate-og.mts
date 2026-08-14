/**
 * Generates public/og.png (1200×630) using only our own code: the shared
 * zero-dependency PNG writer, our QR encoder, and a tiny 5×7 pixel font.
 * Run: node --experimental-strip-types scripts/generate-og.mts
 */
import { writeFileSync } from 'node:fs'
import { deflateSync } from 'node:zlib'
import { encodePng, hexToRgba } from '../shared/core/png.ts'
import { encodeQr } from '../tools/qr-code-generator/core/encoder.ts'

const W = 1200
const H = 630

// 5×7 pixel font — just the glyphs we need
const FONT: Record<string, string[]> = {
  A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
  D: ['11110', '10001', '10001', '10001', '10001', '10001', '11110'],
  E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
  F: ['11111', '10000', '10000', '11110', '10000', '10000', '10000'],
  H: ['10001', '10001', '10001', '11111', '10001', '10001', '10001'],
  I: ['11111', '00100', '00100', '00100', '00100', '00100', '11111'],
  L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
  M: ['10001', '11011', '10101', '10101', '10001', '10001', '10001'],
  O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
  P: ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
  R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
  S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
  T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
  U: ['10001', '10001', '10001', '10001', '10001', '10001', '01110'],
  W: ['10001', '10001', '10001', '10101', '10101', '10101', '01010'],
  Z: ['11111', '00001', '00010', '00100', '01000', '10000', '11111'],
  '.': ['00000', '00000', '00000', '00000', '00000', '00110', '00110'],
  ',': ['00000', '00000', '00000', '00000', '00110', '00110', '01100'],
  ' ': ['00000', '00000', '00000', '00000', '00000', '00000', '00000'],
}

const rgba = new Uint8Array(W * H * 4)

function fill(x0: number, y0: number, w: number, h: number, color: [number, number, number, number]) {
  const x1 = Math.min(W, x0 + w)
  const y1 = Math.min(H, y0 + h)
  for (let y = Math.max(0, y0); y < y1; y++) {
    for (let x = Math.max(0, x0); x < x1; x++) {
      const i = (y * W + x) * 4
      rgba[i] = color[0]; rgba[i + 1] = color[1]; rgba[i + 2] = color[2]; rgba[i + 3] = color[3]
    }
  }
}

function drawText(text: string, x: number, y: number, scale: number, color: [number, number, number, number]) {
  let cx = x
  for (const ch of text.toUpperCase()) {
    const glyph = FONT[ch]
    if (glyph) {
      for (let row = 0; row < 7; row++) {
        for (let col = 0; col < 5; col++) {
          if (glyph[row][col] === '1') fill(cx + col * scale, y + row * scale, scale, scale, color)
        }
      }
    }
    cx += 6 * scale
  }
  return cx
}

const flame = hexToRgba('#f4540a')
const flameDark = hexToRgba('#c33d05')
const white: [number, number, number, number] = [255, 255, 255, 255]
const ink = hexToRgba('#2a1005')

// Background + subtle bottom band
fill(0, 0, W, H, flame)
fill(0, H - 14, W, 14, flameDark)

// Wordmark + tagline
drawText('ZEAL.TOOLS', 84, 176, 14, white)
drawText('FREE TOOLS, MADE WITH ZEAL.', 86, 320, 5, hexToRgba('#ffd9c2'))
drawText('UI . API . MCP', 86, 388, 5, white)

// A real, scannable QR code (of course it's real — we wrote the encoder)
const qr = encodeQr('https://zeal.tools', { ecLevel: 'M' })
const scale = 8
const quiet = 3
const card = (qr.size + quiet * 2) * scale
const cardX = W - card - 84
const cardY = Math.floor((H - card) / 2)
fill(cardX - 6, cardY - 6, card + 12, card + 12, hexToRgba('#ffe1cc'))
fill(cardX, cardY, card, card, white)
for (let y = 0; y < qr.size; y++) {
  for (let x = 0; x < qr.size; x++) {
    if (qr.modules[y * qr.size + x])
      fill(cardX + (x + quiet) * scale, cardY + (y + quiet) * scale, scale, scale, ink)
  }
}

writeFileSync(new URL('../public/og.png', import.meta.url), encodePng(W, H, rgba, raw => new Uint8Array(deflateSync(raw, { level: 9 }))))
console.log('public/og.png written')
