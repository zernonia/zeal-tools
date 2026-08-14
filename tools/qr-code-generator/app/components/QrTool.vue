<script setup lang="ts">
const props = defineProps<{ initialTab?: string }>()

const { state, logoHref, payload, matrix, svg, error, toPngBlob } = useQr()
const { track } = useAnalytics()

if (props.initialTab) state.tab = props.initialTab

const tabs = [
  { id: 'url', label: 'URL' },
  { id: 'text', label: 'Text' },
  { id: 'wifi', label: 'WiFi' },
  { id: 'email', label: 'Email' },
  { id: 'phone', label: 'Phone' },
  { id: 'sms', label: 'SMS' },
  { id: 'vcard', label: 'vCard' },
]

const sizes = [512, 1024, 2048, 4096]
const ecLevels = [
  { id: 'L', label: 'L · 7%' },
  { id: 'M', label: 'M · 15%' },
  { id: 'Q', label: 'Q · 25%' },
  { id: 'H', label: 'H · 30%' },
]
const dotStyles = [
  { id: 'square', label: 'Square' },
  { id: 'rounded', label: 'Rounded' },
  { id: 'dots', label: 'Dots' },
]

const announcement = ref('')

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

async function downloadPng() {
  const blob = await toPngBlob()
  if (!blob) return
  download(blob, 'qr-code.png')
  announcement.value = 'PNG downloaded'
  track('tool_completed', { tool: 'qr-code-generator', format: 'png' })
}

function downloadSvg() {
  if (!svg.value) return
  download(new Blob([svg.value], { type: 'image/svg+xml' }), 'qr-code.svg')
  announcement.value = 'SVG downloaded'
  track('tool_completed', { tool: 'qr-code-generator', format: 'svg' })
}

function onLogoUpload(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => { logoHref.value = String(reader.result) }
  reader.readAsDataURL(file)
}

const inputClass = 'h-10 w-full rounded-lg border border-neutral-200 bg-white px-3 text-sm outline-none transition-colors focus:border-flame-400 dark:border-neutral-700 dark:bg-neutral-900'
const labelClass = 'mb-1.5 block text-xs font-medium text-neutral-600 dark:text-neutral-400'
</script>

<template>
  <div class="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(320px,400px)]">
    <!-- Controls -->
    <div class="space-y-6">
      <!-- Type tabs -->
      <div role="tablist" aria-label="QR code type" class="flex flex-wrap gap-1.5">
        <button
          v-for="tab in tabs"
          :id="`tab-${tab.id}`"
          :key="tab.id"
          role="tab"
          type="button"
          :aria-selected="state.tab === tab.id"
          :aria-controls="`panel-${tab.id}`"
          class="h-9 rounded-lg px-3.5 text-sm font-medium transition-colors"
          :class="state.tab === tab.id
            ? 'bg-flame-500 text-white'
            : 'border border-neutral-200 text-neutral-600 hover:border-neutral-300 hover:text-neutral-900 dark:border-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-100'"
          @click="state.tab = tab.id"
        >
          {{ tab.label }}
        </button>
      </div>

      <!-- Inputs per type -->
      <div :id="`panel-${state.tab}`" role="tabpanel" :aria-labelledby="`tab-${state.tab}`" class="space-y-4">
        <div v-if="state.tab === 'url'">
          <label :class="labelClass" for="qr-url">Website URL</label>
          <input id="qr-url" v-model="state.url" type="url" :class="inputClass" placeholder="https://zeal.tools" autocomplete="off">
        </div>

        <div v-else-if="state.tab === 'text'">
          <label :class="labelClass" for="qr-text">Text</label>
          <textarea id="qr-text" v-model="state.text" :class="[inputClass, 'h-28 py-2.5']" placeholder="Any text…" />
        </div>

        <template v-else-if="state.tab === 'wifi'">
          <div>
            <label :class="labelClass" for="qr-ssid">Network name (SSID)</label>
            <input id="qr-ssid" v-model="state.ssid" type="text" :class="inputClass" autocomplete="off">
          </div>
          <div>
            <label :class="labelClass" for="qr-password">Password</label>
            <input id="qr-password" v-model="state.password" type="text" :class="inputClass" autocomplete="off">
            <p class="mt-1 text-xs text-neutral-500">Passwords never leave your browser and are never put in share links.</p>
          </div>
          <div class="flex gap-4">
            <div class="flex-1">
              <label :class="labelClass" for="qr-security">Security</label>
              <select id="qr-security" v-model="state.security" :class="inputClass">
                <option value="WPA">WPA / WPA2 / WPA3</option>
                <option value="WEP">WEP</option>
                <option value="nopass">Open (no password)</option>
              </select>
            </div>
            <label class="flex items-end gap-2 pb-2.5 text-sm">
              <input v-model="state.hidden" type="checkbox" class="size-4 accent-flame-500">
              Hidden network
            </label>
          </div>
        </template>

        <template v-else-if="state.tab === 'email'">
          <div>
            <label :class="labelClass" for="qr-to">Email address</label>
            <input id="qr-to" v-model="state.to" type="email" :class="inputClass" placeholder="hello@example.com" autocomplete="off">
          </div>
          <div>
            <label :class="labelClass" for="qr-subject">Subject <span class="font-normal text-neutral-400">(optional)</span></label>
            <input id="qr-subject" v-model="state.subject" type="text" :class="inputClass" autocomplete="off">
          </div>
          <div>
            <label :class="labelClass" for="qr-body">Body <span class="font-normal text-neutral-400">(optional)</span></label>
            <textarea id="qr-body" v-model="state.body" :class="[inputClass, 'h-20 py-2.5']" />
          </div>
        </template>

        <div v-else-if="state.tab === 'phone'">
          <label :class="labelClass" for="qr-phone">Phone number</label>
          <input id="qr-phone" v-model="state.phone" type="tel" :class="inputClass" placeholder="+1 555 123 4567" autocomplete="off">
        </div>

        <template v-else-if="state.tab === 'sms'">
          <div>
            <label :class="labelClass" for="qr-sms-phone">Phone number</label>
            <input id="qr-sms-phone" v-model="state.phone" type="tel" :class="inputClass" placeholder="+1 555 123 4567" autocomplete="off">
          </div>
          <div>
            <label :class="labelClass" for="qr-message">Message <span class="font-normal text-neutral-400">(optional)</span></label>
            <textarea id="qr-message" v-model="state.message" :class="[inputClass, 'h-20 py-2.5']" />
          </div>
        </template>

        <template v-else-if="state.tab === 'vcard'">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label :class="labelClass" for="qr-first">First name</label>
              <input id="qr-first" v-model="state.firstName" type="text" :class="inputClass" autocomplete="off">
            </div>
            <div>
              <label :class="labelClass" for="qr-last">Last name</label>
              <input id="qr-last" v-model="state.lastName" type="text" :class="inputClass" autocomplete="off">
            </div>
            <div>
              <label :class="labelClass" for="qr-org">Organization</label>
              <input id="qr-org" v-model="state.organization" type="text" :class="inputClass" autocomplete="off">
            </div>
            <div>
              <label :class="labelClass" for="qr-title">Job title</label>
              <input id="qr-title" v-model="state.title" type="text" :class="inputClass" autocomplete="off">
            </div>
            <div>
              <label :class="labelClass" for="qr-vphone">Phone</label>
              <input id="qr-vphone" v-model="state.vPhone" type="tel" :class="inputClass" autocomplete="off">
            </div>
            <div>
              <label :class="labelClass" for="qr-vemail">Email</label>
              <input id="qr-vemail" v-model="state.vEmail" type="email" :class="inputClass" autocomplete="off">
            </div>
          </div>
          <div>
            <label :class="labelClass" for="qr-vurl">Website</label>
            <input id="qr-vurl" v-model="state.vUrl" type="url" :class="inputClass" autocomplete="off">
          </div>
        </template>
      </div>

      <!-- Style options -->
      <fieldset class="space-y-4 rounded-2xl border border-neutral-200 p-5 dark:border-neutral-800">
        <legend class="px-1 text-sm font-semibold">Style</legend>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label :class="labelClass" for="qr-fg">Color</label>
            <div class="flex gap-2">
              <input id="qr-fg" v-model="state.fg" type="color" class="h-10 w-12 cursor-pointer rounded-lg border border-neutral-200 dark:border-neutral-700" aria-label="Foreground color picker">
              <input v-model="state.fg" type="text" :class="inputClass" aria-label="Foreground color hex value">
            </div>
          </div>
          <div>
            <label :class="labelClass" for="qr-bg">Background</label>
            <div class="flex gap-2">
              <input id="qr-bg" v-model="state.bg" type="color" class="h-10 w-12 cursor-pointer rounded-lg border border-neutral-200 dark:border-neutral-700" aria-label="Background color picker">
              <input v-model="state.bg" type="text" :class="inputClass" aria-label="Background color hex value">
            </div>
          </div>
          <div>
            <label :class="labelClass" for="qr-dots">Module style</label>
            <select id="qr-dots" v-model="state.dots" :class="inputClass">
              <option v-for="style in dotStyles" :key="style.id" :value="style.id">{{ style.label }}</option>
            </select>
          </div>
          <div>
            <label :class="labelClass" for="qr-ec">Error correction</label>
            <select id="qr-ec" v-model="state.ec" :class="inputClass" :disabled="!!logoHref">
              <option v-for="level in ecLevels" :key="level.id" :value="level.id">{{ level.label }}</option>
            </select>
            <p v-if="logoHref" class="mt-1 text-xs text-neutral-500">Locked to H while a logo is embedded.</p>
          </div>
          <div>
            <label :class="labelClass" for="qr-margin">Margin: {{ state.margin }} modules</label>
            <input id="qr-margin" v-model.number="state.margin" type="range" min="0" max="12" class="w-full accent-flame-500">
          </div>
          <div>
            <label :class="labelClass" for="qr-px">Download size</label>
            <select id="qr-px" v-model.number="state.px" :class="inputClass">
              <option v-for="size in sizes" :key="size" :value="size">{{ size }} × {{ size }} px</option>
            </select>
          </div>
        </div>
        <div>
          <label :class="labelClass" for="qr-logo">Center logo <span class="font-normal text-neutral-400">(optional — bumps error correction to H)</span></label>
          <div class="flex items-center gap-3">
            <input id="qr-logo" type="file" accept="image/*" class="text-xs file:mr-3 file:h-9 file:cursor-pointer file:rounded-lg file:border file:border-neutral-200 file:bg-white file:px-3 file:text-xs file:font-medium dark:file:border-neutral-700 dark:file:bg-neutral-900" @change="onLogoUpload">
            <button v-if="logoHref" type="button" class="text-xs font-medium text-flame-600 hover:underline" @click="logoHref = ''">Remove</button>
          </div>
        </div>
      </fieldset>
    </div>

    <!-- Preview (sticky on desktop) -->
    <div class="lg:sticky lg:top-20 lg:self-start">
      <div class="rounded-2xl border border-neutral-200 p-5 dark:border-neutral-800">
        <div class="mx-auto aspect-square w-full max-w-xs overflow-hidden rounded-xl border border-neutral-100 dark:border-neutral-800" aria-hidden="false">
          <div v-if="svg" class="[&>svg]:h-full [&>svg]:w-full" role="img" aria-label="Generated QR code preview" v-html="svg" />
          <div v-else class="grid h-full place-items-center p-6 text-center text-sm text-neutral-400">
            {{ error ?? 'Start typing to generate a QR code' }}
          </div>
        </div>
        <p v-if="matrix" class="mt-3 text-center text-xs text-neutral-500">
          Version {{ matrix.version }} · {{ matrix.size }}×{{ matrix.size }} modules · EC {{ matrix.ecLevel }}
        </p>
        <p v-if="error" class="mt-2 text-center text-xs text-red-600" role="alert">{{ error }}</p>

        <div class="mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            class="h-11 rounded-xl bg-flame-500 text-sm font-semibold text-white transition-colors hover:bg-flame-600 disabled:opacity-40"
            :disabled="!matrix"
            @click="downloadPng"
          >
            Download PNG
          </button>
          <button
            type="button"
            class="h-11 rounded-xl border border-neutral-200 text-sm font-semibold transition-colors hover:border-neutral-300 hover:bg-neutral-50 disabled:opacity-40 dark:border-neutral-700 dark:hover:bg-neutral-800"
            :disabled="!matrix"
            @click="downloadSvg"
          >
            Download SVG
          </button>
        </div>

        <div class="mt-4 border-t border-neutral-100 pt-4 dark:border-neutral-800">
          <ShareBar
            tool="qr-code-generator"
            share-copy="Free QR code generator — no sign-up, no watermark, works offline. Open source, with a free API + MCP server."
            :get-image-blob="() => toPngBlob(1024)"
          />
        </div>
        <div aria-live="polite" class="sr-only">{{ announcement }}</div>
      </div>
    </div>
  </div>
</template>
