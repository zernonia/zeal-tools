<script setup lang="ts">
import { Check, Mic, MicOff } from 'lucide-vue-next'
import { midiToFrequency } from '../../core'
import { useTuner } from '../composables/useTuner'

const props = defineProps<{ defaultTuning?: string }>()

const {
  state,
  error,
  tuningId,
  tuning,
  a4,
  chromatic,
  frequency,
  reading,
  noteLabel,
  cents,
  inTune,
  level,
  target,
  start,
  stop,
  tunings,
} = useTuner()

if (props.defaultTuning)
  tuningId.value = props.defaultTuning

const listening = computed(() => state.value === 'listening')

/** Clamped to the meter's range; past 50 cents it is a different note anyway. */
const needle = computed(() => Math.max(-50, Math.min(50, cents.value)))

const status = computed(() => {
  if (!listening.value)
    return ''
  if (!reading.value)
    return 'Listening.'
  const direction = cents.value < 0 ? 'flat' : 'sharp'
  return inTune.value
    ? `${noteLabel.value} is in tune.`
    : `${noteLabel.value}, ${Math.abs(cents.value)} cents ${direction}.`
})

const grouped = computed(() => {
  const map = new Map<string, typeof tunings>()
  for (const t of tunings) {
    if (!map.has(t.instrument))
      map.set(t.instrument, [])
    map.get(t.instrument)!.push(t)
  }
  return [...map.entries()]
})
</script>

<template>
  <div class="tool-frame flex flex-col gap-5">
    <p class="sr-only" aria-live="polite">
      {{ status }}
    </p>

    <!-- The reading. Largest thing on the page, because it is the whole tool. -->
    <section class="flex grow flex-col items-center justify-center gap-6 rounded-2xl border bg-background p-6 dark:bg-input/30">
      <template v-if="listening">
        <div class="flex items-baseline gap-2">
          <span
            data-testid="tuner-note"
            class="font-heading text-7xl tabular-nums transition-colors sm:text-8xl"
            :class="reading ? (inTune ? 'text-primary' : 'text-foreground') : 'text-muted-foreground/40'"
          >{{ reading ? reading.note : '—' }}</span>
          <span v-if="reading" class="text-2xl text-muted-foreground">{{ reading.octave }}</span>
        </div>

        <!-- Cents meter -->
        <div class="w-full max-w-md">
          <div class="relative h-14">
            <!-- ticks -->
            <div class="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-border" aria-hidden="true" />
            <div
              v-for="tick in [-50, -25, 0, 25, 50]"
              :key="tick"
              class="absolute top-1/2 w-px -translate-y-1/2 bg-border"
              :class="tick === 0 ? 'h-8' : 'h-4'"
              :style="{ left: `${((tick + 50) / 100) * 100}%` }"
              aria-hidden="true"
            />
            <!-- the in-tune band, so 'close enough' is visible rather than implied -->
            <div
              class="absolute top-1/2 h-8 -translate-y-1/2 rounded-full bg-primary/10"
              :style="{ left: '45%', width: '10%' }"
              aria-hidden="true"
            />
            <div
              v-if="reading"
              class="absolute top-1/2 h-10 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full transition-[left,background-color] duration-100"
              :class="inTune ? 'bg-primary' : 'bg-foreground'"
              :style="{ left: `${((needle + 50) / 100) * 100}%` }"
              role="img"
              :aria-label="`${Math.abs(cents)} cents ${cents < 0 ? 'flat' : 'sharp'}`"
            />
          </div>
          <div class="flex justify-between text-xs text-muted-foreground">
            <span>♭ flat</span>
            <span v-if="reading" data-testid="tuner-cents" class="tabular-nums" :class="inTune ? 'text-primary' : 'text-foreground'">
              <Check v-if="inTune" class="mr-1 inline size-3.5" />
              {{ cents > 0 ? '+' : '' }}{{ cents }}¢
            </span>
            <span v-else>—</span>
            <span>sharp ♯</span>
          </div>
        </div>

        <p class="text-sm tabular-nums text-muted-foreground" data-testid="tuner-readout">
          <template v-if="reading">
            {{ frequency.toFixed(1) }} Hz
            <template v-if="target">
              · aiming at string {{ target.label }} ({{ target.note }}{{ target.octave }})
            </template>
          </template>
          <template v-else>
            Play a note
          </template>
        </p>

        <!-- input level, so a dead mic is visible rather than mysterious -->
        <div class="h-1 w-32 overflow-hidden rounded-full bg-muted" role="img" aria-label="Microphone level">
          <div class="h-full rounded-full bg-muted-foreground/60 transition-[width] duration-75" :style="{ width: `${level * 100}%` }" />
        </div>
      </template>

      <template v-else>
        <Mic class="size-8 text-muted-foreground" />
        <div class="text-center">
          <p class="font-medium">
            Tune by ear, or let the microphone do it
          </p>
          <p class="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
            The audio is analysed on your own device and never recorded or sent anywhere.
          </p>
        </div>
        <Button size="lg" @click="start">
          <Mic class="size-4" /> Start listening
        </Button>
        <p v-if="error" class="max-w-sm text-center text-sm text-destructive">
          {{ error }}
        </p>
      </template>
    </section>

    <!-- Strings for the chosen tuning -->
    <section v-if="!chromatic" class="rounded-2xl border bg-background p-5 dark:bg-input/30">
      <h2 class="text-sm font-semibold">
        {{ tuning.instrument }} — {{ tuning.name }}
      </h2>
      <ul class="mt-3 flex flex-wrap gap-2">
        <li v-for="string in tuning.strings" :key="string.label">
          <div
            class="flex min-h-11 min-w-16 flex-col items-center justify-center rounded-xl border px-3 py-1.5 transition-colors"
            :class="target?.label === string.label
              ? (inTune ? 'border-primary bg-primary/10' : 'border-foreground/40 bg-muted')
              : 'border-border'"
          >
            <span class="text-sm font-medium">{{ string.note }}<span class="text-muted-foreground">{{ string.octave }}</span></span>
            <span class="text-[11px] tabular-nums text-muted-foreground">{{ midiToFrequency(string.midi, a4).toFixed(1) }} Hz</span>
          </div>
        </li>
      </ul>
    </section>

    <!-- Settings -->
    <section class="grid gap-5 rounded-2xl border bg-background p-5 dark:bg-input/30 sm:grid-cols-2">
      <div class="flex flex-col gap-2">
        <Label for="tuning">Instrument</Label>
        <Select v-model="tuningId" :disabled="chromatic">
          <SelectTrigger id="tuning" class="w-full">
            {{ tuning.instrument }} — {{ tuning.name }}
          </SelectTrigger>
          <SelectContent>
            <template v-for="[instrument, list] in grouped" :key="instrument">
              <SelectItem v-for="t in list" :key="t.id" :value="t.id">
                {{ instrument }} — {{ t.name }}
              </SelectItem>
            </template>
          </SelectContent>
        </Select>
        <div class="flex items-center gap-2">
          <Checkbox id="chromatic" v-model="chromatic" />
          <Label for="chromatic" class="mb-0 text-sm font-normal text-muted-foreground">
            Chromatic — show the nearest note instead
          </Label>
        </div>
      </div>

      <div class="flex flex-col gap-2">
        <div class="flex items-center justify-between">
          <Label for="a4">Reference pitch</Label>
          <span class="text-sm tabular-nums text-muted-foreground">A4 = {{ a4 }} Hz</span>
        </div>
        <Slider
          id="a4"
          :model-value="[a4]"
          :min="415"
          :max="446"
          :step="1"
          aria-label="Reference pitch for A4 in hertz"
          @update:model-value="value => a4 = value?.[0] ?? 440"
        />
        <p class="text-xs text-muted-foreground">
          440 is concert pitch. Some orchestras sit at 442; 415 is the baroque standard.
        </p>
      </div>

      <div v-if="listening" class="sm:col-span-2">
        <Button variant="outline" @click="stop">
          <MicOff class="size-4" /> Stop listening
        </Button>
      </div>
    </section>
  </div>
</template>
