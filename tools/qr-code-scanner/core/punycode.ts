/**
 * Punycode (RFC 3492) decoding, for showing an internationalised hostname the
 * way it will look in the address bar.
 *
 * `URL` already turns `аpple.com` (with a Cyrillic а) into
 * `xn--pple-43d.com`, which is what the browser will really connect to. The
 * reverse is needed to explain *why* that matters — to show the visitor the
 * lookalike and the encoded form side by side — and there is no isomorphic
 * built-in for it, so it lives here: about forty lines of the RFC's own
 * algorithm.
 */

const BASE = 36
const T_MIN = 1
const T_MAX = 26
const SKEW = 38
const DAMP = 700
const INITIAL_BIAS = 72
const INITIAL_N = 128

function adapt(delta: number, points: number, firstTime: boolean): number {
  delta = firstTime ? Math.floor(delta / DAMP) : delta >> 1
  delta += Math.floor(delta / points)
  let k = 0
  while (delta > ((BASE - T_MIN) * T_MAX) >> 1) {
    delta = Math.floor(delta / (BASE - T_MIN))
    k += BASE
  }
  return Math.floor(k + ((BASE - T_MIN + 1) * delta) / (delta + SKEW))
}

function digitOf(code: number): number {
  if (code >= 48 && code <= 57)
    return code - 22
  if (code >= 65 && code <= 90)
    return code - 65
  if (code >= 97 && code <= 122)
    return code - 97
  return BASE
}

/** Decode one punycode label (without the `xn--` prefix). Returns null when malformed. */
export function decodePunycode(input: string): string | null {
  const output: number[] = []
  const basic = Math.max(0, input.lastIndexOf('-'))
  for (let j = 0; j < basic; j++) {
    const code = input.charCodeAt(j)
    if (code >= 0x80)
      return null
    output.push(code)
  }

  let n = INITIAL_N
  let bias = INITIAL_BIAS
  let i = 0
  for (let index = basic > 0 ? basic + 1 : 0; index < input.length;) {
    const oldI = i
    let w = 1
    for (let k = BASE; ; k += BASE) {
      if (index >= input.length)
        return null
      const digit = digitOf(input.charCodeAt(index++))
      if (digit >= BASE)
        return null
      i += digit * w
      const t = k <= bias ? T_MIN : k >= bias + T_MAX ? T_MAX : k - bias
      if (digit < t)
        break
      w *= BASE - t
      if (w > 0x7FFFFFFF)
        return null
    }
    const length = output.length + 1
    bias = adapt(i - oldI, length, oldI === 0)
    n += Math.floor(i / length)
    i %= length
    if (n > 0x10FFFF)
      return null
    output.splice(i++, 0, n)
  }
  return String.fromCodePoint(...output)
}

/** `xn--pple-43d.com` → `аpple.com`. Labels that fail to decode are left as they are. */
export function hostToUnicode(host: string): string {
  return host
    .split('.')
    .map((label) => {
      if (!label.toLowerCase().startsWith('xn--'))
        return label
      return decodePunycode(label.slice(4)) ?? label
    })
    .join('.')
}
