<script setup lang="ts">
import { ExternalLink, Pause, Play, RotateCcw } from 'lucide-vue-next'

const { state, message, reading, start, pause, reset, adjust, setDuration, setWarn, setMessage } = useStageTimer('presenter')
const { track } = useAnalytics()

const minutes = computed({
  get: () => Math.round(state.durationSeconds / 60),
  set: (value: number) => setDuration(value * 60),
})

function toggle() {
  if (state.running) {
    pause()
  }
  else {
    start()
    track('tool_completed', { tool: 'stage-timer', format: 'timer' })
  }
}

function openStage() {
  window.open('/tools/stage-timer/stage', 'zeal-stage-timer', 'noopener')
}

const sectionClass = 'space-y-4 rounded-2xl border border-border p-5'
const sectionTitleClass = 'text-sm font-semibold'
</script>

<template>
  <div class="space-y-5">
    <section :class="sectionClass" aria-label="Presenter view">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <h2 :class="sectionTitleClass">
          Presenter view
        </h2>
        <Button variant="outline" size="sm" @click="openStage">
          <ExternalLink class="size-3.5" />
          Open stage view
        </Button>
      </div>

      <StageTimerDisplay :reading="reading" :message="message" />

      <div class="flex flex-wrap items-center gap-2">
        <Button size="lg" class="rounded-xl" @click="toggle">
          <component :is="state.running ? Pause : Play" class="size-4" />
          {{ state.running ? 'Pause' : 'Start' }}
        </Button>
        <Button size="lg" variant="outline" class="rounded-xl" @click="reset">
          <RotateCcw class="size-4" />
          Reset
        </Button>
        <Button variant="outline" size="sm" @click="adjust(60)">
          +1 min
        </Button>
        <Button variant="outline" size="sm" @click="adjust(-60)">
          −1 min
        </Button>
      </div>
      <p class="text-xs text-muted-foreground">
        Open the stage view on the screen the speaker can see. Both windows stay in sync in this browser —
        nothing is sent to a server.
      </p>
    </section>

    <section :class="sectionClass" aria-label="Timer settings">
      <h2 :class="sectionTitleClass">
        Settings
      </h2>
      <div class="grid gap-4 sm:grid-cols-2">
        <div>
          <Label for="timer-minutes">Length: {{ minutes }} min</Label>
          <Slider
            id="timer-minutes"
            :model-value="[minutes]"
            :min="1"
            :max="120"
            :step="1"
            aria-label="Timer length in minutes"
            @update:model-value="value => minutes = value?.[0] ?? 5"
          />
        </div>
        <div>
          <Label for="timer-warn">Turn amber at: {{ state.warnSeconds }}s left</Label>
          <Slider
            id="timer-warn"
            :model-value="[state.warnSeconds]"
            :min="0"
            :max="300"
            :step="15"
            aria-label="Warning threshold in seconds"
            @update:model-value="value => setWarn(value?.[0] ?? 60)"
          />
          <p class="mt-1 text-xs text-muted-foreground">
            Set to 0 for no warning colour.
          </p>
        </div>
      </div>
      <div>
        <Label for="timer-message">Message on the stage screen <span class="font-normal opacity-60">(optional)</span></Label>
        <Input
          id="timer-message"
          :model-value="message"
          placeholder="Wrap up · Q&amp;A next · Back at 10:45"
          @update:model-value="value => setMessage(String(value))"
        />
      </div>
    </section>
  </div>
</template>
