import type { Accidental } from '../../../../../../shared/core/music'
import { transposeChart } from '../../../../core'

interface Body {
  chart?: string
  fromKey?: string
  toKey?: string
  semitones?: number
  accidental?: Accidental
}

export default defineEventHandler(async (event) => {
  enforceRateLimit(event)

  const body = await readBody<Body>(event).catch(() => null)
  if (!body || typeof body.chart !== 'string' || body.chart.trim() === '') {
    setResponseStatus(event, 400)
    return { error: 'Send a JSON body with a "chart" string. Add either fromKey and toKey, or semitones.' }
  }
  if (body.semitones === undefined && !(body.fromKey && body.toKey)) {
    setResponseStatus(event, 400)
    return { error: 'Specify how far to move: either "semitones", or both "fromKey" and "toKey".' }
  }

  const result = transposeChart(body.chart, {
    semitones: body.semitones,
    fromKey: body.fromKey,
    toKey: body.toKey,
    accidental: body.accidental,
  })

  return {
    chart: result.text,
    semitones: result.semitones,
    accidental: result.accidental,
    chordLines: result.chordLines,
  }
})
