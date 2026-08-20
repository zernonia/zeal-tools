<script setup lang="ts">
import { Check, Copy } from 'lucide-vue-next'
import { intervalName } from '#zeal/music'
import { isChordLine } from '../../core'

const { state, keys, detected, result, shapeKey, shapeChart } = useChordTransposer()
const { track } = useAnalytics()

const copied = ref(false)
const announcement = computed(() =>
  result.value.chordLines > 0
    ? `Transposed ${result.value.chordLines} chord lines to ${state.toKey}`
    : 'No chord lines detected yet',
)

async function copyResult() {
  await navigator.clipboard.writeText(shapeChart.value ?? result.value.text)
  copied.value = true
  setTimeout(() => copied.value = false, 1600)
  track('tool_completed', { tool: 'chord-transposer', format: 'text' })
}

function nudge(semitones: number) {
  const index = keys.indexOf(state.toKey as typeof keys[number])
  if (index === -1)
    return
  state.toKey = keys[(index + semitones + keys.length) % keys.length]
}

/**
 * Split the output into lines tagged as chords or lyrics, so chord lines can
 * be coloured. Seeing at a glance which lines were touched is the fastest way
 * to trust that the lyrics came through untouched.
 */
const outputLines = computed(() =>
  (shapeChart.value ?? result.value.text)
    .split('\n')
    .map((text, index) => ({ id: index, text, chords: isChordLine(text) })),
)

const sectionClass = 'space-y-4 rounded-2xl border border-border p-5'
const sectionTitleClass = 'text-sm font-semibold'
</script>

<template>
  <div class="tool-frame grid gap-8 lg:grid-cols-2">
    <div class="space-y-5">
      <section :class="sectionClass" aria-label="Your chart">
        <h2 :class="sectionTitleClass">
          Your chart
        </h2>
        <div>
          <Label for="chart-input">Paste chords and lyrics</Label>
          <Textarea
            id="chart-input"
            v-model="state.chart"
            class="h-64 font-mono text-xs leading-relaxed"
            spellcheck="false"
            placeholder="Paste a chord chart — chords on their own lines, lyrics underneath."
          />
          <p class="mt-1 text-xs text-muted-foreground">
            Lines that are entirely chords get transposed. Everything else is left exactly as it is.
          </p>
        </div>
      </section>

      <section :class="sectionClass" aria-label="Keys">
        <h2 :class="sectionTitleClass">
          Keys
        </h2>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <Label for="from-key">Original key</Label>
            <Select v-model="state.fromKey">
              <SelectTrigger id="from-key" />
              <SelectContent>
                <SelectItem v-for="key in keys" :key="key" :value="key">
                  {{ key }}
                </SelectItem>
              </SelectContent>
            </Select>
            <p v-if="detected && detected !== state.fromKey" class="mt-1.5 text-xs text-muted-foreground">
              Looks like {{ detected }}.
              <button type="button" class="font-medium text-foreground underline" @click="state.fromKey = detected.replace('m', '')">
                Use it
              </button>
            </p>
          </div>
          <div>
            <Label for="to-key">New key</Label>
            <Select v-model="state.toKey">
              <SelectTrigger id="to-key" />
              <SelectContent>
                <SelectItem v-for="key in keys" :key="key" :value="key">
                  {{ key }}
                </SelectItem>
              </SelectContent>
            </Select>
            <div class="mt-1.5 flex gap-1.5">
              <Button variant="outline" size="sm" class="h-7 px-2 text-xs" @click="nudge(-1)">
                −1 semitone
              </Button>
              <Button variant="outline" size="sm" class="h-7 px-2 text-xs" @click="nudge(1)">
                +1 semitone
              </Button>
            </div>
          </div>
        </div>
        <div class="flex flex-wrap items-center gap-3 rounded-xl bg-muted/60 px-4 py-3">
          <span class="grid size-9 place-items-center rounded-lg border border-border bg-card font-mono text-sm font-semibold">
            {{ state.fromKey }}
          </span>
          <span class="text-muted-foreground" aria-hidden="true">→</span>
          <span class="grid size-9 place-items-center rounded-lg border border-primary bg-primary font-mono text-sm font-semibold text-primary-foreground">
            {{ state.toKey }}
          </span>
          <p class="text-xs text-muted-foreground">
            <span class="font-medium text-foreground">{{ intervalName(result.semitones) }}</span>
            · {{ result.semitones }} semitone{{ result.semitones === 1 ? '' : 's' }}
            · spelled with {{ result.accidental === 'flat' ? 'flats' : 'sharps' }}
          </p>
        </div>
      </section>

      <section :class="sectionClass" aria-label="Capo">
        <h2 :class="sectionTitleClass">
          Capo <span class="text-xs font-normal text-muted-foreground">(optional)</span>
        </h2>
        <div>
          <Label for="capo">Capo on fret {{ state.capo || '—' }}</Label>
          <Slider
            id="capo"
            :model-value="[state.capo]"
            :min="0"
            :max="11"
            :step="1"
            aria-label="Capo fret"
            @update:model-value="value => state.capo = value?.[0] ?? 0"
          />
          <p class="mt-1.5 text-xs text-muted-foreground">
            <template v-if="shapeKey">
              Capo {{ state.capo }} — play {{ shapeKey }} shapes and it sounds in {{ state.toKey }}.
            </template>
            <template v-else>
              Leave at 0 for no capo. With a capo you finger a lower key than the one you hear.
            </template>
          </p>
        </div>
      </section>
    </div>

    <div class="lg:sticky lg:top-20 lg:self-start">
      <div class="rounded-2xl border border-border p-5">
        <div class="flex items-center justify-between gap-3">
          <h2 class="text-sm font-semibold">
            {{ shapeKey ? `Shapes to play (capo ${state.capo})` : `In ${state.toKey}` }}
          </h2>
          <Button variant="outline" size="sm" @click="copyResult">
            <component :is="copied ? Check : Copy" class="size-3.5" />
            {{ copied ? 'Copied' : 'Copy' }}
          </Button>
        </div>

        <pre class="mt-4 max-h-[28rem] overflow-auto rounded-lg border border-border bg-muted p-4 font-mono text-xs leading-relaxed"><code><span
          v-for="line in outputLines"
          :key="line.id"
          class="block min-h-[1.2em]"
          :class="line.chords ? 'font-semibold text-primary' : 'text-muted-foreground'"
        >{{ line.text }}</span></code></pre>

        <p v-if="result.chordLines === 0" class="mt-3 text-xs text-muted-foreground" role="status">
          No chord lines found yet. Chords need to sit on their own line, above the lyrics.
        </p>
        <p v-else class="mt-3 text-xs text-muted-foreground">
          {{ result.chordLines }} chord line{{ result.chordLines === 1 ? '' : 's' }} transposed.
        </p>

        <div class="mt-4 border-t border-border/60 pt-4">
          <ShareBar tool="chord-transposer" share-copy="Free chord transposer — change the key of any chart, lyrics untouched." />
        </div>
        <div aria-live="polite" class="sr-only">
          {{ announcement }}
        </div>
      </div>
    </div>
  </div>
</template>
