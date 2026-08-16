import { KEYS } from '#zeal/music'
import { capoShapeKey, detectKey, transposeChart } from '../../core'

const SAMPLE = `C                G
Amazing grace how sweet the sound
Am               F
That saved a wretch like me
C           G        C
I once was lost, but now am found`

export const CHART_SCHEMA = {
  chart: { type: 'string', default: SAMPLE },
  fromKey: { type: 'string', default: 'C' },
  toKey: { type: 'string', default: 'D' },
  capo: { type: 'number', default: 0 },
} as const

export function useChordTransposer() {
  const state = useToolState(CHART_SCHEMA)

  /** Key detected from the pasted chart, offered as a one-click correction. */
  const detected = computed(() => detectKey(state.chart))

  const result = computed(() => transposeChart(state.chart, {
    fromKey: state.fromKey,
    toKey: state.toKey,
  }))

  /** With a capo on, you finger a lower key — this is the one people get wrong. */
  const shapeKey = computed(() => (state.capo > 0 ? capoShapeKey(state.toKey, state.capo) : null))

  const shapeChart = computed(() => {
    if (!shapeKey.value)
      return null
    return transposeChart(state.chart, { fromKey: state.fromKey, toKey: shapeKey.value }).text
  })

  return { state, keys: KEYS, detected, result, shapeKey, shapeChart }
}
