import type { StereoBuffer } from './index'
import { describe, expect, it } from 'vitest'
import { reduceBleed, wienerRefine } from './index'

const SIZE = 256

function tone(length: number, cycles: number, amp = 0.5): Float32Array {
  return Float32Array.from({ length }, (_, i) => amp * Math.sin((2 * Math.PI * cycles * i) / SIZE))
}
const stereo = (left: Float32Array, right = left.slice()): StereoBuffer => ({ left, right })
const add = (...xs: Float32Array[]) => xs.reduce((acc, x) => acc.map((v, i) => v + x[i]!))
const scale = (x: Float32Array, g: number) => x.map(v => v * g)

/** Signal-to-distortion ratio in dB, the field's standard measure. */
function sdr(estimate: Float32Array, truth: Float32Array, from = 0, to = truth.length): number {
  let s = 0
  let e = 0
  for (let i = from; i < to; i++) {
    s += truth[i]! ** 2
    e += (truth[i]! - estimate[i]!) ** 2
  }
  return 10 * Math.log10(s / e)
}

describe('wienerRefine', () => {
  const length = 4096

  it('leaves stems that add back up to the mix', () => {
    const a = tone(length, 5)
    const b = tone(length, 40, 0.3)
    const mix = stereo(add(a, b))
    const stems = [stereo(scale(add(a, b), 0.7)), stereo(scale(b, 0.2)), stereo(new Float32Array(length))]
    wienerRefine(mix, stems, { size: SIZE })
    for (let i = 0; i < length; i++)
      expect(stems[0]!.left[i]! + stems[1]!.left[i]! + stems[2]!.left[i]!).toBeCloseTo(mix.left[i]!, 5)
  })

  it('is a no-op when one stem already holds the whole mix', () => {
    const a = tone(length, 9)
    const mix = stereo(a.slice())
    const stems = [stereo(a.slice()), stereo(new Float32Array(length))]
    wienerRefine(mix, stems, { size: SIZE })
    for (let i = 0; i < length; i++)
      expect(stems[0]!.left[i]).toBeCloseTo(a[i]!, 5)
  })

  it('removes bleed from a stem when another stem owns those frequencies', () => {
    const guitar = tone(length, 6)
    const pad = tone(length, 48, 0.4)
    const mix = stereo(add(guitar, pad))
    // The model's guess: guitar carries 30% of the pad, other the rest.
    const stems = [stereo(add(guitar, scale(pad, 0.3))), stereo(scale(pad, 0.7))]
    const before = sdr(stems[0]!.left, guitar, SIZE, length - SIZE)
    wienerRefine(mix, stems, { size: SIZE })
    const after = sdr(stems[0]!.left, guitar, SIZE, length - SIZE)
    // Measured +5.7 dB. The ceiling here is the Hann window's leakage at this
    // tiny test size, not the method: at the real 4096 the bins are finer.
    expect(before).toBeLessThan(15)
    expect(after).toBeGreaterThan(before + 5)
  })

  it('sharpens further as the mask power rises', () => {
    const guitar = tone(length, 6)
    const pad = tone(length, 7, 0.4) // one bin away: genuinely overlapping
    const mix = stereo(add(guitar, pad))
    const run = (power: number) => {
      const stems = [stereo(add(guitar, scale(pad, 0.3))), stereo(scale(pad, 0.7))]
      wienerRefine(mix, stems, { size: SIZE, power })
      return sdr(stems[0]!.left, guitar, SIZE, length - SIZE)
    }
    expect(run(2)).toBeGreaterThan(run(1))
  })

  it('keeps each stem where it sat in the stereo field', () => {
    const left = tone(length, 6)
    const right = tone(length, 30)
    const mix = stereo(left.slice(), right.slice())
    // A stem panned hard left and one panned hard right.
    const stems = [stereo(left.slice(), new Float32Array(length)), stereo(new Float32Array(length), right.slice())]
    wienerRefine(mix, stems, { size: SIZE })
    const energy = (x: Float32Array) => x.reduce((a, v) => a + v * v, 0)
    expect(energy(stems[0]!.right) / energy(stems[0]!.left)).toBeLessThan(1e-3)
    expect(energy(stems[1]!.left) / energy(stems[1]!.right)).toBeLessThan(1e-3)
  })

  it('handles audio shorter than one window', () => {
    const a = tone(100, 3)
    const stems = [stereo(a.slice()), stereo(new Float32Array(100))]
    wienerRefine(stereo(a.slice()), stems, { size: SIZE })
    expect(stems[0]!.left[50]).toBeCloseTo(a[50]!, 5)
  })
})

describe('reduceBleed', () => {
  const length = 8192
  const names = ['vocals', 'drums', 'bass', 'guitar', 'piano', 'other'] as const

  function band() {
    const parts = names.map((_, k) => tone(length, 4 + k * 9, 0.2))
    const mix = stereo(add(...parts))
    // Bleed: the guitar stem also carries some of "other".
    const stems = parts.map(p => stereo(p.slice()))
    stems[3] = stereo(add(parts[3]!, scale(parts[5]!, 0.3)))
    stems[5] = stereo(scale(parts[5]!, 0.7))
    return { parts, mix, stems }
  }

  it('leaves vocals, drums and bass exactly as the model made them', () => {
    const { mix, stems } = band()
    const before = stems.slice(0, 3).map(s => s.left.slice())
    expect(reduceBleed(mix, stems, names)).toBe(true)
    before.forEach((b, k) => expect(stems[k]!.left).toEqual(b))
  })

  it('pulls bleed out of the guitar stem and keeps the total equal to the mix', () => {
    const { parts, mix, stems } = band()
    const before = sdr(stems[3]!.left, parts[3]!, 1024, length - 1024)
    reduceBleed(mix, stems, names)
    expect(sdr(stems[3]!.left, parts[3]!, 1024, length - 1024)).toBeGreaterThan(before + 5)
    for (let i = 0; i < length; i += 97)
      expect(stems.reduce((a, s) => a + s.left[i]!, 0)).toBeCloseTo(mix.left[i]!, 4)
  })

  it('does nothing for the four-stem model, which has no guitar to clean', () => {
    const four = ['vocals', 'drums', 'bass', 'other'] as const
    const a = tone(length, 5)
    const stems = four.map(() => stereo(a.slice()))
    expect(reduceBleed(stereo(a.slice()), stems, four)).toBe(false)
    expect(stems[3]!.left).toEqual(a)
  })
})
