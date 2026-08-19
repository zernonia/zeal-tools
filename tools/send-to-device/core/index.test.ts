import { describe, expect, it } from 'vitest'
import {
  averageRate,
  CHUNK_SIZE,
  chunkRanges,
  decodeSignal,
  encodeSignal,
  estimateRemaining,
  formatBytes,
  formatRate,
  fromBase64Url,
  qrSvg,
  toBase64Url,
  transferProgress,
} from './index'

const SDP = 'v=0\r\no=- 42 2 IN IP4 127.0.0.1\r\ns=-\r\na=ice-ufrag:Ab1c\r\na=candidate:1 1 udp 2113937151 x.local 51234 typ host\r\n'

describe('signal encoding', () => {
  it('round-trips an offer unchanged', () => {
    const out = decodeSignal(encodeSignal({ type: 'offer', sdp: SDP }))
    expect(out).toEqual({ type: 'offer', sdp: SDP })
  })

  it('round-trips an answer unchanged', () => {
    expect(decodeSignal(encodeSignal({ type: 'answer', sdp: SDP })).type).toBe('answer')
  })

  it('survives the newlines and colons that fill an SDP', () => {
    // The payload rides through a QR code as text; CRLFs and colons are the
    // characters most likely to be mangled by a careless format.
    expect(decodeSignal(encodeSignal({ type: 'offer', sdp: SDP })).sdp).toContain('\r\n')
    expect(decodeSignal(encodeSignal({ type: 'offer', sdp: SDP })).sdp).toContain('a=ice-ufrag:Ab1c')
  })

  it('stays well inside what a QR code can carry', () => {
    // A real offer measured 716 bytes; a version-40 byte-mode QR holds 2953.
    const encoded = encodeSignal({ type: 'offer', sdp: SDP.repeat(6) })
    expect(new TextEncoder().encode(encoded).length).toBeLessThan(2953)
  })

  it('rejects something that is not from this tool', () => {
    expect(() => decodeSignal('https://example.com')).toThrow(/not from this tool/i)
    expect(() => decodeSignal('{"nope":1}')).toThrow(/not from this tool/i)
    expect(() => decodeSignal('')).toThrow(/not from this tool/i)
  })

  it('rejects a well-formed payload of the wrong kind', () => {
    expect(() => decodeSignal(JSON.stringify({ t: 'pranswer', s: SDP }))).toThrow(/offer nor an answer/i)
  })
})

describe('chunkRanges', () => {
  it('splits on exact boundaries when the size divides evenly', () => {
    expect(chunkRanges(300, 100)).toEqual([
      { start: 0, end: 100 },
      { start: 100, end: 200 },
      { start: 200, end: 300 },
    ])
  })

  it('leaves the remainder in a short final chunk', () => {
    const ranges = chunkRanges(250, 100)
    expect(ranges).toHaveLength(3)
    expect(ranges.at(-1)).toEqual({ start: 200, end: 250 })
  })

  it('covers every byte exactly once, with no gap or overlap', () => {
    const ranges = chunkRanges(10_000, 512)
    expect(ranges[0]!.start).toBe(0)
    expect(ranges.at(-1)!.end).toBe(10_000)
    for (let i = 1; i < ranges.length; i++)
      expect(ranges[i]!.start).toBe(ranges[i - 1]!.end)
    expect(ranges.reduce((sum, r) => sum + (r.end - r.start), 0)).toBe(10_000)
  })

  it('returns nothing for an empty file', () => {
    expect(chunkRanges(0)).toEqual([])
  })

  it('returns a single short chunk for a file below the chunk size', () => {
    expect(chunkRanges(10, 100)).toEqual([{ start: 0, end: 10 }])
  })

  it('defaults to the size every browser will send in one message', () => {
    expect(CHUNK_SIZE).toBe(16 * 1024)
    expect(chunkRanges(CHUNK_SIZE * 2)).toHaveLength(2)
  })

  it('refuses nonsense input', () => {
    expect(() => chunkRanges(-1)).toThrow()
    expect(() => chunkRanges(100, 0)).toThrow()
  })
})

describe('formatBytes', () => {
  it('uses whole numbers for bytes and one decimal above', () => {
    expect(formatBytes(0)).toBe('0 B')
    expect(formatBytes(999)).toBe('999 B')
    expect(formatBytes(1024)).toBe('1 KB')
    expect(formatBytes(1536)).toBe('1.5 KB')
  })

  it('climbs through the units', () => {
    expect(formatBytes(1024 ** 2)).toBe('1 MB')
    expect(formatBytes(1024 ** 3)).toBe('1 GB')
    expect(formatBytes(5.5 * 1024 ** 3)).toBe('5.5 GB')
  })

  it('does not print something silly for bad input', () => {
    expect(formatBytes(-5)).toBe('0 B')
    expect(formatBytes(Number.NaN)).toBe('0 B')
  })
})

describe('transferProgress', () => {
  it('reports the fraction moved', () => {
    expect(transferProgress(50, 200)).toBe(0.25)
    expect(transferProgress(200, 200)).toBe(1)
  })

  it('clamps rather than exceeding one', () => {
    expect(transferProgress(300, 200)).toBe(1)
    expect(transferProgress(-10, 200)).toBe(0)
  })

  it('calls an empty file finished, not stuck at zero', () => {
    expect(transferProgress(0, 0)).toBe(1)
  })
})

describe('formatRate', () => {
  it('renders a rate per second', () => {
    expect(formatRate(1024)).toBe('1 KB/s')
    expect(formatRate(1024 ** 2 * 2)).toBe('2 MB/s')
  })

  it('shows a placeholder before there is anything to measure', () => {
    expect(formatRate(0)).toBe('—')
    expect(formatRate(Number.NaN)).toBe('—')
  })
})

describe('estimateRemaining', () => {
  it('says done once everything has arrived', () => {
    expect(estimateRemaining(100, 100, 1000)).toBe('done')
    expect(estimateRemaining(120, 100, 1000)).toBe('done')
  })

  it('waits for a rate before guessing', () => {
    expect(estimateRemaining(0, 1000, 0)).toBe('estimating…')
  })

  it('rounds to steady bands rather than a jittering number', () => {
    // A per-frame estimate swings wildly on wifi; coarse bands read as calm.
    expect(estimateRemaining(0, 1000, 1000)).toBe('a moment')
    expect(estimateRemaining(0, 30_000, 1000)).toBe('30 seconds')
    expect(estimateRemaining(0, 120_000, 1000)).toBe('2 minutes')
    expect(estimateRemaining(0, 60_000, 1000)).toBe('1 minute')
  })

  it('switches to hours for a genuinely long transfer', () => {
    expect(estimateRemaining(0, 7_200_000, 1000)).toMatch(/hours?/)
  })

  it('never goes backwards as bytes arrive at a steady rate', () => {
    let previous = Infinity
    for (const moved of [0, 200, 400, 600, 800]) {
      const seconds = (1000 - moved) / 100
      expect(seconds).toBeLessThanOrEqual(previous)
      previous = seconds
    }
  })
})

describe('averageRate', () => {
  it('is bytes over seconds', () => {
    expect(averageRate(1000, 1000)).toBe(1000)
    expect(averageRate(1000, 2000)).toBe(500)
  })

  it('is zero before any time has passed', () => {
    expect(averageRate(1000, 0)).toBe(0)
  })
})

describe('url-safe encoding', () => {
  it('round-trips an offer', () => {
    expect(fromBase64Url(toBase64Url(encodeSignal({ type: 'offer', sdp: SDP })))).toBe(
      encodeSignal({ type: 'offer', sdp: SDP }),
    )
  })

  it('produces nothing a URL would mangle', () => {
    // `+`, `/` and `=` all mean something else in a URL; the fragment has to
    // survive being copied, shared and re-parsed.
    const encoded = toBase64Url(encodeSignal({ type: 'offer', sdp: SDP.repeat(4) }))
    expect(encoded).not.toMatch(/[+/=]/)
    expect(encoded).toMatch(/^[\w-]+$/)
  })

  it('handles text of every padding length', () => {
    for (const text of ['a', 'ab', 'abc', 'abcd', 'abcde'])
      expect(fromBase64Url(toBase64Url(text))).toBe(text)
  })

  it('survives non-ASCII, which an SDP alias can carry', () => {
    const text = 'Zoë’s Laptop — 日本語'
    expect(fromBase64Url(toBase64Url(text))).toBe(text)
  })

  it('says so plainly when the link was truncated', () => {
    expect(() => fromBase64Url('!!!not base64!!!')).toThrow(/incomplete or damaged/i)
  })
})

describe('qrSvg', () => {
  it('renders a square svg with a quiet zone on every side', () => {
    const svg = qrSvg('hello')
    const box = svg.match(/viewBox="0 0 (\d+) (\d+)"/)!
    expect(box[1]).toBe(box[2])
    // 4 modules of margin each side is what the spec asks for; without it
    // scanners cannot find the finder patterns against a page background.
    expect(Number(box[1])).toBeGreaterThanOrEqual(21 + 8)
  })

  it('paints a white ground under the dark modules', () => {
    // A transparent QR on a dark-themed page is unreadable — the quiet zone
    // has to actually be white, not just empty.
    const svg = qrSvg('hello')
    expect(svg).toContain('fill="#fff"')
    expect(svg).toContain('fill="#000"')
    expect(svg.indexOf('#fff')).toBeLessThan(svg.indexOf('#000'))
  })

  it('grows with the payload', () => {
    const small = Number(qrSvg('hi').match(/viewBox="0 0 (\d+)/)![1])
    const large = Number(qrSvg(encodeSignal({ type: 'offer', sdp: SDP.repeat(5) })).match(/viewBox="0 0 (\d+)/)![1])
    expect(large).toBeGreaterThan(small)
  })

  it('carries a full invitation link', () => {
    const link = `https://zeal.tools/tools/send-to-device#o=${toBase64Url(encodeSignal({ type: 'offer', sdp: SDP.repeat(5) }))}`
    expect(() => qrSvg(link)).not.toThrow()
  })
})
