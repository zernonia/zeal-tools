import { transposeChart } from '../../../../core'

export default defineEventHandler((event) => {
  enforceRateLimit(event)

  const query = getQuery(event)
  const chart = typeof query.chart === 'string' ? query.chart : ''
  if (!chart.trim()) {
    setResponseStatus(event, 400)
    return { error: 'Add ?chart=... plus either ?semitones=N or ?fromKey=C&toKey=D.' }
  }

  const semitones = query.semitones !== undefined ? Number(query.semitones) : undefined
  const fromKey = typeof query.fromKey === 'string' ? query.fromKey : undefined
  const toKey = typeof query.toKey === 'string' ? query.toKey : undefined

  if (semitones === undefined && !(fromKey && toKey)) {
    setResponseStatus(event, 400)
    return { error: 'Specify how far to move: either semitones, or both fromKey and toKey.' }
  }

  const result = transposeChart(chart, { semitones, fromKey, toKey })
  return {
    chart: result.text,
    semitones: result.semitones,
    accidental: result.accidental,
    chordLines: result.chordLines,
  }
})
