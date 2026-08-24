<script setup lang="ts">
import { Check, Mic, MicOff } from 'lucide-vue-next'
import { advice as adviceFor, closeness } from '../../core'
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
  pinned,
  auto,
  pin,
  start,
  stop,
  tunings,
} = useTuner()

if (props.defaultTuning)
  tuningId.value = props.defaultTuning

const listening = computed(() => state.value === 'listening')

const status = computed(() => {
  if (!listening.value)
    return ''
  if (!reading.value)
    return 'Listening.'
  const aim = target.value ? ` Aiming at string ${target.value.label}.` : ''
  return `${noteLabel.value}. ${adviceFor(cents.value)}.${aim}`
})

/** Which way to turn, in words — the thing people actually want to know. */
const advice = computed(() => (reading.value ? adviceFor(cents.value) : 'Play a single string'))

/** The status dot: firms up as the string closes in, solid once it is there. */
const dot = computed(() => (reading.value ? closeness(cents.value) : 0))

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

    <section class="flex grow flex-col items-center gap-5 rounded-2xl border bg-background p-5 dark:bg-input/30 sm:p-6">
      <!-- Tuning and auto-detect above the reading, out of its way. -->
      <div class="flex w-full flex-wrap items-center justify-between gap-3">
        <Select v-model="tuningId" :disabled="chromatic">
          <SelectTrigger id="tuning" class="w-auto rounded-full" aria-label="Tuning">
            {{ chromatic ? 'Chromatic' : `${tuning.instrument} · ${tuning.name}` }}
          </SelectTrigger>
          <SelectContent>
            <template v-for="[instrument, list] in grouped" :key="instrument">
              <SelectItem v-for="t in list" :key="t.id" :value="t.id">
                {{ instrument }} — {{ t.name }}
              </SelectItem>
            </template>
          </SelectContent>
        </Select>

        <div v-if="!chromatic" class="flex items-center gap-2">
          <Label for="auto" class="mb-0 text-sm font-medium text-muted-foreground">Auto</Label>
          <Checkbox id="auto" v-model="auto" />
        </div>
      </div>

      <template v-if="listening">
        <div class="flex grow flex-col items-center justify-center gap-4">
          <!-- How you are doing, beside what you are aiming at. -->
          <div class="flex items-center gap-3">
            <span
              class="size-7 rounded-full border-2 transition-colors"
              :class="inTune ? 'border-primary bg-primary' : 'border-muted-foreground/40 bg-muted-foreground'"
              :style="inTune ? undefined : { opacity: 0.3 + dot * 0.7 }"
              aria-hidden="true"
            />
            <span
              data-testid="tuner-note"
              class="grid size-14 place-items-center rounded-full border-2 font-heading text-2xl transition-colors"
              :class="reading ? (inTune ? 'border-primary text-primary' : 'border-border text-foreground') : 'border-border text-muted-foreground/40'"
            >{{ reading ? reading.note : '—' }}</span>
          </div>

          <div class="flex flex-col items-center gap-1 text-center">
            <p
              data-testid="tuner-cents"
              class="flex items-center gap-1.5 text-base font-medium transition-colors"
              :class="inTune ? 'text-primary' : 'text-foreground'"
            >
              <Check v-if="inTune" class="size-4" aria-hidden="true" />
              {{ advice }}
            </p>
            <p class="text-xs tabular-nums text-muted-foreground" data-testid="tuner-readout">
              <template v-if="reading">
                {{ frequency.toFixed(1) }} Hz · {{ cents > 0 ? '+' : '' }}{{ cents }}¢
                <template v-if="target">
                  · string {{ target.label }} ({{ target.note }}{{ target.octave }})
                </template>
              </template>
              <template v-else>
                &nbsp;
              </template>
            </p>
          </div>

          <TunerStrings
            v-if="!chromatic"
            :tuning="tuning"
            :target="target"
            :pinned="pinned"
            :cents="reading ? cents : null"
            :in-tune="inTune"
            :a4="a4"
            @pin="pin"
          />
          <p v-if="!chromatic" class="text-center text-xs text-muted-foreground">
            Tap a string to tune only that one. Tap it again to go back to auto.
          </p>
        </div>

        <!-- Input level, so a dead microphone is visible rather than mysterious. -->
        <div class="mt-auto h-1 w-32 overflow-hidden rounded-full bg-muted" role="img" aria-label="Microphone level">
          <div class="h-full rounded-full bg-muted-foreground/60 transition-[width] duration-75" :style="{ width: `${level * 100}%` }" />
        </div>
      </template>

      <template v-else>
        <div class="flex grow flex-col items-center justify-center gap-5 py-4">
          <TunerStrings
            v-if="!chromatic"
            :tuning="tuning"
            :target="null"
            :pinned="pinned"
            :cents="null"
            :in-tune="false"
            :a4="a4"
            @pin="pin"
          />
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
        </div>
      </template>
    </section>

    <!-- Settings -->
    <section class="grid gap-5 rounded-2xl border bg-background p-5 dark:bg-input/30 sm:grid-cols-2">
      <div class="flex flex-col gap-2">
        <Label for="chromatic-row">Mode</Label>
        <div id="chromatic-row" class="flex items-center gap-2">
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
