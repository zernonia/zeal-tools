import type { StereoBuffer } from './index'
import { describe, expect, it } from 'vitest'
import { accumulateSegment, AUDIO, MODELS, outputOrder, planSegments, segmentInput, segmentWeights, toStereo } from './index'

function stereo(length: number, fill: (i: number) => number): StereoBuffer {
  const left = Float32Array.from({ length }, (_, i) => fill(i))
  const right = Float32Array.from({ length }, (_, i) => -fill(i))
  return { left, right }
}

/** Sum of every window's weight at each sample of the track. */
function coverage(total: number, size: number, overlap: number): Float32Array {
  const sum = new Float32Array(total)
  const plan = planSegments(total, size, overlap)
  plan.forEach((segment, i) => {
    const weights = segmentWeights(i, plan.length, segment.length, overlap)
    for (let j = 0; j < segment.length; j++)
      sum[segment.start + j]! += weights[j]!
  })
  return sum
}

describe('planSegments', () => {
  it('covers a short track with one padded window', () => {
    expect(planSegments(100, 400)).toEqual([{ start: 0, length: 100 }])
  })

  it('returns nothing for silence of zero length', () => {
    expect(planSegments(0, 400)).toEqual([])
  })

  it('covers every sample, with no window starting past the end', () => {
    for (const total of [400, 401, 699, 700, 701, 1000, 12_345]) {
      const plan = planSegments(total, 400, 100)
      const last = plan[plan.length - 1]!
      expect(last.start + last.length).toBe(total)
      expect(plan.every(s => s.start < total && s.length > 0 && s.length <= 400)).toBe(true)
      // Each window begins exactly one stride after the last.
      plan.forEach((s, i) => expect(s.start).toBe(i * 300))
    }
  })

  it('does not add a window the previous one already reached', () => {
    // 700 = 400 + one stride of 300: exactly two windows, not three.
    expect(planSegments(700, 400, 100)).toHaveLength(2)
  })

  it('rejects an overlap as long as the window', () => {
    expect(() => planSegments(1000, 400, 400)).toThrow(RangeError)
  })

  it('splits a three-minute song into the expected number of model windows', () => {
    const plan = planSegments(180 * AUDIO.sampleRate, AUDIO.segment)
    expect(plan).toHaveLength(31)
  })
})

describe('segmentWeights', () => {
  it('sums to exactly one at every sample, whatever the length', () => {
    for (const total of [50, 400, 450, 650, 700, 701, 999, 4_321]) {
      const sum = coverage(total, 400, 100)
      for (let i = 0; i < total; i++)
        expect(sum[i]).toBeCloseTo(1, 6)
    }
  })

  it('leaves the very start and end at full level', () => {
    const plan = planSegments(1000, 400, 100)
    expect(segmentWeights(0, plan.length, 400, 100)[0]).toBe(1)
    const last = plan.length - 1
    const tail = segmentWeights(last, plan.length, plan[last]!.length, 100)
    expect(tail[tail.length - 1]).toBe(1)
  })

  it('ramps monotonically through the overlap', () => {
    const w = segmentWeights(1, 3, 400, 100)
    for (let j = 1; j < 100; j++)
      expect(w[j]!).toBeGreaterThan(w[j - 1]!)
    for (let j = 301; j < 400; j++)
      expect(w[j]!).toBeLessThan(w[j - 1]!)
  })
})

describe('segmentInput', () => {
  it('lays out left then right, zero-padding a short window', () => {
    const source = stereo(10, i => i + 1)
    const input = segmentInput(source, { start: 6, length: 4 }, 8)
    expect(Array.from(input)).toEqual([7, 8, 9, 10, 0, 0, 0, 0, -7, -8, -9, -10, 0, 0, 0, 0])
  })
})

describe('accumulateSegment', () => {
  /**
   * A stand-in model: emits each stem as a fixed fraction of the input. If
   * the stitching is right, every stem comes back as that fraction of the
   * whole track, sample for sample, across every window boundary.
   */
  const SHARES = [0.1, 0.2, 0.3, 0.4]
  function fakeModel(input: Float32Array, size: number): Float32Array {
    const out = new Float32Array(SHARES.length * 2 * size)
    SHARES.forEach((share, k) => {
      for (let i = 0; i < 2 * size; i++)
        out[k * 2 * size + i] = input[i]! * share
    })
    return out
  }

  it('reconstructs the track exactly across window boundaries', () => {
    const size = 256
    const overlap = 64
    const total = 1_000
    const source = stereo(total, i => Math.sin(i / 7))
    const targets = SHARES.map(() => ({ left: new Float32Array(total), right: new Float32Array(total) }))
    const order = [0, 1, 2, 3]

    const plan = planSegments(total, size, overlap)
    plan.forEach((segment, i) => {
      const out = fakeModel(segmentInput(source, segment, size), size)
      accumulateSegment(targets, out, order, segment, segmentWeights(i, plan.length, segment.length, overlap), size)
    })

    SHARES.forEach((share, k) => {
      for (let i = 0; i < total; i++) {
        expect(targets[k]!.left[i]).toBeCloseTo(source.left[i]! * share, 5)
        expect(targets[k]!.right[i]).toBeCloseTo(source.right[i]! * share, 5)
      }
    })
  })

  it('routes each output index to the target the order names', () => {
    const size = 4
    const out = new Float32Array(4 * 2 * size)
    for (let k = 0; k < 4; k++)
      out.fill(k + 1, k * 2 * size, (k + 1) * 2 * size)
    const targets = [0, 1, 2, 3].map(() => ({ left: new Float32Array(size), right: new Float32Array(size) }))
    accumulateSegment(targets, out, [3, 0, 1, 2], { start: 0, length: size }, new Float32Array(size).fill(1), size)
    expect(targets.map(t => t.left[0])).toEqual([4, 1, 2, 3])
  })
})

describe('stem order', () => {
  for (const model of Object.values(MODELS)) {
    it(`${model.id}: maps every display stem to a distinct model output`, () => {
      const indices = outputOrder(model)
      expect(indices).toHaveLength(model.stems.length)
      expect(new Set(indices).size).toBe(model.stems.length)
      expect(indices.every(i => i >= 0 && i < model.stems.length)).toBe(true)
    })
  }

  it('matches HT-Demucs output order: drums, bass, other, vocals, then guitar, piano', () => {
    expect(MODELS.four.outputIndex).toEqual({ drums: 0, bass: 1, other: 2, vocals: 3 })
    expect(MODELS.six.outputIndex).toEqual({ drums: 0, bass: 1, other: 2, vocals: 3, guitar: 4, piano: 5 })
  })

  it('keeps the six-stem model a superset of the four, so presets carry over', () => {
    expect(MODELS.four.stems.every(s => MODELS.six.stems.includes(s))).toBe(true)
  })

  it('refuses a display stem the model cannot produce', () => {
    expect(() => outputOrder({ ...MODELS.four, stems: ['piano'] })).toThrow()
  })

  it('caps the track length so the stems fit in memory', () => {
    // Stereo float32 stems: the larger model trades length for parts.
    for (const model of Object.values(MODELS)) {
      const bytes = model.maxSeconds * AUDIO.sampleRate * 2 * 4 * model.stems.length
      expect(bytes).toBeLessThan(1.1e9)
    }
  })
})

describe('toStereo', () => {
  it('doubles mono', () => {
    const mono = new Float32Array([1, 2])
    const out = toStereo([mono])
    expect(out.left).toBe(mono)
    expect(out.right).toBe(mono)
  })

  it('keeps front left and right of a surround layout', () => {
    const ch = [0, 1, 2, 3, 4, 5].map(n => new Float32Array([n]))
    const out = toStereo(ch)
    expect([out.left[0], out.right[0]]).toEqual([0, 1])
  })

  it('refuses audio with no channels', () => {
    expect(() => toStereo([])).toThrow()
  })
})
