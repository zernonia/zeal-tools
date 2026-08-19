<script setup lang="ts">
import type { PasswordOptions } from '../../core'
import { Check, Copy, RefreshCw } from 'lucide-vue-next'
import {
  buildAlphabet,
  crackTime,
  createRandomInt,
  DEFAULT_OPTIONS,
  entropyBits,
  generatePassword,
  strength,
} from '../../core'

const { track } = useAnalytics()

/**
 * Deliberately not in the URL, unlike every other tool here: `useToolState`
 * would put the settings in a shareable link, and a link that reconstructs how
 * someone generated their password is a link worth not existing.
 */
const options = reactive<PasswordOptions>({ ...DEFAULT_OPTIONS })

const password = ref('')
const error = ref('')
const copied = ref(false)

const bits = computed(() => entropyBits(options))
const level = computed(() => strength(bits.value))
const poolSize = computed(() => buildAlphabet(options).length)

const SETS = [
  { key: 'lowercase', label: 'Lowercase', hint: 'a–z' },
  { key: 'uppercase', label: 'Uppercase', hint: 'A–Z' },
  { key: 'digits', label: 'Numbers', hint: '0–9' },
  { key: 'symbols', label: 'Symbols', hint: '!@#$…' },
] as const

const METER = {
  weak: { width: '25%', bar: 'bg-destructive', text: 'text-destructive' },
  fair: { width: '50%', bar: 'bg-amber-500', text: 'text-amber-500' },
  strong: { width: '75%', bar: 'bg-primary', text: 'text-foreground' },
  excellent: { width: '100%', bar: 'bg-primary', text: 'text-foreground' },
} as const

function regenerate() {
  error.value = ''
  try {
    // The OS random source, not Math.random. Generated here and never sent
    // anywhere — the whole reason to prefer the browser over the API.
    password.value = generatePassword(options, createRandomInt(bytes => crypto.getRandomValues(bytes)))
  }
  catch (cause) {
    password.value = ''
    error.value = cause instanceof Error ? cause.message : 'Could not generate a password.'
  }
}

// A password on screen the moment the page loads — no Generate button to hunt.
onMounted(regenerate)
watch(options, regenerate)

async function copy() {
  if (!password.value)
    return
  await navigator.clipboard.writeText(password.value)
  copied.value = true
  setTimeout(() => copied.value = false, 1600)
  track('tool_completed', { tool: 'password-generator', format: 'clipboard' })
}

const sectionClass = 'space-y-4 rounded-2xl border border-border p-5'
</script>

<template>
  <div class="space-y-5">
    <section :class="sectionClass" aria-label="Generated password">
      <div class="flex items-center justify-between gap-3">
        <Label for="password-output" class="mb-0 text-sm font-semibold">Your password</Label>
        <Button variant="ghost" size="sm" class="min-h-11" @click="regenerate()">
          <RefreshCw class="size-3.5" />
          New one
        </Button>
      </div>

      <!--
        A real input rather than a styled div: it can be focused, selected with
        the keyboard, and read by a password manager. Readonly because typing
        into it would imply this is where you store something.
      -->
      <Input
        id="password-output"
        :model-value="password"
        readonly
        spellcheck="false"
        autocomplete="off"
        class="h-auto py-3 text-center font-mono text-lg break-all sm:text-xl"
        @focus="($event.target as HTMLInputElement).select()"
      />

      <p v-if="error" class="text-sm text-destructive" role="alert">
        {{ error }}
      </p>

      <template v-else>
        <div class="flex items-center gap-3">
          <div class="h-1.5 grow overflow-hidden rounded-full bg-muted">
            <div class="h-full rounded-full transition-all duration-300" :class="METER[level].bar" :style="{ width: METER[level].width }" />
          </div>
          <span class="text-xs font-medium capitalize" :class="METER[level].text">{{ level }}</span>
        </div>
        <p class="text-xs text-muted-foreground">
          {{ Math.round(bits) }} bits of entropy from {{ poolSize }} possible characters — about
          <strong class="font-medium text-foreground">{{ crackTime(bits) }}</strong> to crack if someone
          could try a trillion guesses a second.
        </p>
      </template>

      <!-- The copy area. Nothing else ever goes here. -->
      <Button size="lg" class="min-h-11 w-full" :disabled="!password" @click="copy()">
        <component :is="copied ? Check : Copy" class="size-4" />
        {{ copied ? 'Copied' : 'Copy password' }}
      </Button>
    </section>

    <section :class="sectionClass" aria-label="Settings">
      <div>
        <Label for="password-length">Length: {{ options.length }} characters</Label>
        <Slider
          id="password-length"
          :model-value="[options.length]"
          :min="4"
          :max="128"
          :step="1"
          aria-label="Password length in characters"
          @update:model-value="value => options.length = value?.[0] ?? 20"
        />
      </div>

      <fieldset>
        <legend class="mb-2 text-sm font-medium">
          Include
        </legend>
        <div class="grid gap-2 sm:grid-cols-2">
          <div v-for="set in SETS" :key="set.key" class="flex items-center gap-2">
            <Checkbox :id="`password-${set.key}`" v-model="options[set.key]" />
            <Label :for="`password-${set.key}`" class="mb-0">
              {{ set.label }}
              <span class="font-normal text-muted-foreground">{{ set.hint }}</span>
            </Label>
          </div>
        </div>
      </fieldset>

      <div class="space-y-2 border-t border-border pt-4">
        <div class="flex items-center gap-2">
          <Checkbox id="password-require" v-model="options.requireEach" />
          <Label for="password-require" class="mb-0">Use at least one of each type</Label>
        </div>
        <div class="flex items-center gap-2">
          <Checkbox id="password-ambiguous" v-model="options.excludeAmbiguous" />
          <Label for="password-ambiguous" class="mb-0">Avoid look-alike characters</Label>
        </div>
        <p class="text-xs text-muted-foreground">
          Look-alikes are the ones that go wrong when a password is read off a screen or down a phone —
          l against 1 and I, O against 0. Excluding them shrinks the pool slightly, so the length has to
          do a little more of the work.
        </p>
      </div>
    </section>

    <div aria-live="polite" class="sr-only">
      {{ error || `New password generated. ${Math.round(bits)} bits of entropy, rated ${level}.` }}
    </div>
  </div>
</template>
