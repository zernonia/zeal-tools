<script setup lang="ts">
import { Maximize2 } from 'lucide-vue-next'
import { EVENT_PRESETS, readCountdown, resolveTarget } from '../../core'

const props = defineProps<{ presetId?: string }>()

const state = useToolState({
  preset: { type: 'string', default: props.presetId ?? '' },
  date: { type: 'string', default: '' },
  title: { type: 'string', default: '' },
} as const)

const { track } = useAnalytics()
const now = ref(new Date())
let ticker: ReturnType<typeof setInterval> | undefined
onMounted(() => {
  ticker = setInterval(() => now.value = new Date(), 250)
})
onUnmounted(() => clearInterval(ticker))

const target = computed(() => resolveTarget(
  { presetId: state.preset || undefined, isoDate: state.date || undefined },
  now.value,
))

const reading = computed(() => (target.value ? readCountdown(target.value, now.value) : null))

const targetLabel = computed(() => {
  if (!target.value)
    return null
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'full', timeStyle: 'short' }).format(target.value)
})

/** A preset and an explicit date are mutually exclusive — choosing one clears the other. */
function choosePreset(id: string) {
  state.preset = state.preset === id ? '' : id
  if (state.preset)
    state.date = ''
  track('tool_completed', { tool: 'countdown-timer', format: 'preset' })
}

const board = useTemplateRef<HTMLElement>('board')
async function goFullscreen() {
  await board.value?.requestFullscreen?.().catch(() => {})
}

const units = computed(() => {
  const r = reading.value
  if (!r)
    return []
  return [
    { label: r.days === 1 ? 'day' : 'days', value: r.days },
    { label: r.hours === 1 ? 'hour' : 'hours', value: r.hours },
    { label: r.minutes === 1 ? 'minute' : 'minutes', value: r.minutes },
    { label: r.seconds === 1 ? 'second' : 'seconds', value: r.seconds },
  ]
})

const sectionClass = 'space-y-4 rounded-2xl border border-border p-5'
const sectionTitleClass = 'text-sm font-semibold'
</script>

<template>
  <div class="space-y-5">
    <section ref="board" class="bg-card" :class="[sectionClass]" aria-label="Countdown">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <h2 :class="sectionTitleClass">
          {{ state.title || 'Countdown' }}
        </h2>
        <Button variant="outline" size="sm" @click="goFullscreen">
          <Maximize2 class="size-3.5" />
          Full screen
        </Button>
      </div>

      <div v-if="reading" class="py-6">
        <p v-if="reading.past" class="text-center text-lg font-medium text-muted-foreground">
          That date has passed — {{ targetLabel }}.
        </p>
        <div v-else class="grid grid-cols-4 gap-2 sm:gap-4">
          <div v-for="unit in units" :key="unit.label" class="rounded-xl border border-border p-3 text-center sm:p-5">
            <p class="font-mono text-3xl font-semibold tabular-nums sm:text-5xl">
              {{ unit.value }}
            </p>
            <p class="mt-1 text-xs uppercase tracking-wide text-muted-foreground sm:text-sm">
              {{ unit.label }}
            </p>
          </div>
        </div>
        <p class="mt-4 text-center text-sm text-muted-foreground">
          {{ targetLabel }}
        </p>
      </div>
      <p v-else class="py-10 text-center text-sm text-muted-foreground">
        Pick a milestone or set your own date and time to start counting.
      </p>

      <p class="sr-only" aria-live="polite">
        {{ reading && !reading.past ? `${reading.days} days, ${reading.hours} hours, ${reading.minutes} minutes remaining` : '' }}
      </p>
    </section>

    <section :class="sectionClass" aria-label="What to count to">
      <h2 :class="sectionTitleClass">
        What are you counting to?
      </h2>

      <div class="flex flex-wrap gap-2">
        <Button
          v-for="preset in EVENT_PRESETS"
          :key="preset.id"
          size="sm"
          :variant="state.preset === preset.id ? 'default' : 'outline'"
          @click="choosePreset(preset.id)"
        >
          {{ preset.label }}
        </Button>
      </div>
      <p class="text-xs text-muted-foreground">
        Milestones always roll to the next occurrence, so a Christmas countdown still works in January.
        Easter is calculated, not looked up.
      </p>

      <div class="grid gap-4 sm:grid-cols-2">
        <div>
          <Label for="countdown-date">Or your own date and time</Label>
          <Input
            id="countdown-date"
            type="datetime-local"
            :model-value="state.date"
            @update:model-value="value => { state.date = String(value); if (state.date) state.preset = '' }"
          />
        </div>
        <div>
          <Label for="countdown-title">Title <span class="font-normal opacity-60">(optional)</span></Label>
          <Input id="countdown-title" v-model="state.title" placeholder="Doors open · Registration closes" />
        </div>
      </div>
    </section>

    <div class="rounded-2xl border border-border p-5">
      <ShareBar tool="countdown-timer" share-copy="Free countdown timer — to any date, or to Christmas, Easter and New Year." />
    </div>
  </div>
</template>
