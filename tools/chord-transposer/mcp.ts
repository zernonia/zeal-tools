import type { Accidental } from '../../shared/core/music'
import type { McpTool } from '../../shared/registry/mcp-types'
import { transposeChart } from './core'
import meta from './meta'

const tool: McpTool = {
  name: 'transpose_chords',
  title: meta.name,
  description:
    'Transpose a chord chart to a new key. Chord lines are rewritten and lyric lines are left untouched, '
    + 'with column alignment preserved. Give either fromKey and toKey, or a semitones offset.',
  inputSchema: {
    type: 'object',
    required: ['chart'],
    properties: {
      chart: { type: 'string', description: 'The chord chart. Chords on their own lines, lyrics underneath.' },
      fromKey: { type: 'string', description: 'Key the chart is currently in, e.g. "C".' },
      toKey: { type: 'string', description: 'Key to transpose into, e.g. "Eb". Determines sharp/flat spelling.' },
      semitones: { type: 'number', description: 'Alternative to the key pair: move by this many semitones.' },
      accidental: { type: 'string', enum: ['sharp', 'flat'], description: 'Force a spelling instead of inferring it from toKey.' },
    },
  },
  run(args) {
    const chart = typeof args.chart === 'string' ? args.chart : ''
    if (!chart.trim())
      return { isError: true, content: [{ type: 'text', text: 'Provide a `chart` string.' }] }

    const fromKey = typeof args.fromKey === 'string' ? args.fromKey : undefined
    const toKey = typeof args.toKey === 'string' ? args.toKey : undefined
    const semitones = typeof args.semitones === 'number' ? args.semitones : undefined
    if (semitones === undefined && !(fromKey && toKey))
      return { isError: true, content: [{ type: 'text', text: 'Give either `semitones`, or both `fromKey` and `toKey`.' }] }

    const result = transposeChart(chart, {
      fromKey,
      toKey,
      semitones,
      accidental: args.accidental === 'flat' || args.accidental === 'sharp' ? args.accidental as Accidental : undefined,
    })

    return {
      content: [{ type: 'text', text: result.text }],
      structuredContent: {
        semitones: result.semitones,
        accidental: result.accidental,
        chordLines: result.chordLines,
      },
    }
  },
}

export default tool
