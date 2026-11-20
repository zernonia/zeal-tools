<script setup lang="ts">
import { Check, Copy } from 'lucide-vue-next'
import { MIN_PCS, scanContrast } from '../../core'

const { state, info, result, svg, layout, toPngBlob } = useBarcode()
const { track } = useAnalytics()

const symbologies = [
  { id: 'ean13', label: 'EAN-13', use: 'Retail products worldwide. Only valid in shops with a number from a GS1 company prefix.' },
  { id: 'upca', label: 'UPC-A', use: 'Retail in the US and Canada. Only valid in shops with a number from a GS1 company prefix.' },
  { id: 'ean8', label: 'EAN-8', use: 'Packs too small for EAN-13. GS1 issues these numbers one at a time, on request.' },
  { id: 'upce', label: 'UPC-E', use: 'Small US retail packs — a UPC-A with its zeros squeezed out.' },
  { id: 'code128', label: 'Code 128', use: 'Internal labels, asset tags, stock and order numbers. Any plain ASCII text, compact.' },
  { id: 'code39', label: 'Code 39', use: 'Older systems, ID badges and some industry labels. Capitals, digits and - . $ / + % only.' },
  { id: 'itf14', label: 'ITF-14', use: 'Outer cartons and cases. Survives printing on corrugated board.' },
]

const current = computed(() => symbologies.find(s => s.id === state.sym) ?? symbologies[0]!)
const numeric = computed(() => ['ean13', 'ean8', 'upca', 'upce', 'itf14'].includes(state.sym))
const retail = computed(() => ['ean13', 'ean8', 'upca', 'upce'].includes(state.sym))

const scales = ['1', '2', '3', '4', '6', '8']
const scaleModel = computed({
  get: () => String(state.scale),
  set: (value: string) => { state.scale = Number(value) },
})

const barcode = computed(() => result.value.barcode)
const error = computed(() => result.value.error)

const checkNote = computed(() => {
  const code = barcode.value
  if (!code?.checkDigit)
    return ''
  if (code.symbology === 'code39')
    return `Check character ${code.checkDigit} appended.`
  return code.checkAdded
    ? `Check digit ${code.checkDigit} calculated and added.`
    : `Check digit ${code.checkDigit} verified.`
})

/** Size at 300 dpi — the resolution most label and office printers work at. */
const DPI = 300
const mm = (px: number) => (px / DPI) * 25.4
const print = computed(() => {
  if (!layout.value)
    return null
  const factor = state.scale
  const modulePx = Math.round(state.w) * factor
  const moduleMm = mm(modulePx)
  const nominal = info.value.nominalModuleMm
  return {
    width: layout.value.width * factor,
    height: layout.value.height * factor,
    widthMm: mm(layout.value.width * factor),
    heightMm: mm(layout.value.height * factor),
    modulePx,
    moduleMm,
    magnification: nominal ? moduleMm / nominal : null,
  }
})

/**
 * GS1's permitted X-dimension ranges. Outside them a code may still scan on a
 * phone, but a checkout or warehouse scanner is entitled to refuse it.
 */
const sizeWarning = computed(() => {
  const p = print.value
  if (!p)
    return ''
  if (retail.value && (p.moduleMm < 0.264 || p.moduleMm > 0.66))
    return `GS1 allows EAN and UPC bar modules of 0.264–0.66 mm (80–200% of nominal). This prints at ${p.moduleMm.toFixed(3)} mm — change the bar width or PNG scale.`
  if (state.sym === 'itf14' && (p.moduleMm < 0.495 || p.moduleMm > 1.016))
    return `GS1 allows ITF-14 bar modules of 0.495–1.016 mm. This prints at ${p.moduleMm.toFixed(3)} mm — on cartons, larger is safer.`
  return ''
})

const contrast = computed(() => (state.transparent ? null : scanContrast(state.fg, state.bg)))
const contrastWarning = computed(() => {
  const c = contrast.value
  if (!c)
    return ''
  if (c.inverted)
    return 'The bars are lighter than the background. Most scanners expect dark bars on a light background and will not read this.'
  if (c.pcs < MIN_PCS)
    return `Most scanners use red light, which sees colours roughly by their red channel. There, these bars contrast with the background by only ${Math.round(c.pcs * 100)}% — aim for 75% or more. Red, orange and yellow bars all but vanish; dark blue, green or black are safe.`
  return ''
})

const announcement = ref('')
const copied = ref(false)

/**
 * Validation is live, so the message changes on every keystroke ("you
 * entered 5", "you entered 6"…). Announce it once typing pauses rather than
 * reading each one out.
 */
const status = ref('')
let statusTimer: ReturnType<typeof setTimeout> | undefined
watch(() => error.value ?? `${info.value.name} barcode ready.`, (message) => {
  clearTimeout(statusTimer)
  statusTimer = setTimeout(() => status.value = message, 900)
})
onBeforeUnmount(() => clearTimeout(statusTimer))

function filename(ext: string) {
  const safe = (barcode.value?.data ?? 'barcode').replace(/[^\w-]+/g, '-').slice(0, 40) || 'barcode'
  return `${state.sym}-${safe}.${ext}`
}

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)
}

async function downloadPng() {
  const blob = await toPngBlob()
  if (!blob) {
    announcement.value = 'The PNG could not be created in this browser — the SVG download works everywhere.'
    return
  }
  download(blob, filename('png'))
  announcement.value = 'PNG downloaded'
  track('tool_completed', { tool: 'barcode-generator', format: 'png' })
}

function downloadSvg() {
  if (!svg.value)
    return
  download(new Blob([svg.value], { type: 'image/svg+xml' }), filename('svg'))
  announcement.value = 'SVG downloaded'
  track('tool_completed', { tool: 'barcode-generator', format: 'svg' })
}

async function copySvg() {
  if (!svg.value)
    return
  await navigator.clipboard.writeText(svg.value)
  copied.value = true
  announcement.value = 'SVG code copied'
  setTimeout(() => copied.value = false, 1600)
  track('tool_completed', { tool: 'barcode-generator', format: 'svg' })
}

const sectionClass = 'space-y-4 rounded-2xl border border-border p-5'
const sectionTitleClass = 'text-sm font-semibold'
</script>

<template>
  <div class="tool-frame grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(320px,440px)]">
    <!-- Controls -->
    <div class="space-y-5">
      <section :class="sectionClass" aria-label="What to encode">
        <div>
          <Label for="barcode-type">Barcode type</Label>
          <Select v-model="state.sym">
            <SelectTrigger id="barcode-type" class="h-11" aria-describedby="barcode-type-hint" />
            <SelectContent>
              <SelectItem v-for="s in symbologies" :key="s.id" :value="s.id">
                {{ s.label }}
              </SelectItem>
            </SelectContent>
          </Select>
          <p id="barcode-type-hint" class="mt-2 text-xs text-muted-foreground">
            {{ current.use }}
          </p>
        </div>

        <div>
          <Label for="barcode-data">{{ numeric ? 'Number' : 'Text' }}</Label>
          <Input
            id="barcode-data"
            v-model="state.data"
            class="h-11 font-mono"
            :inputmode="numeric ? 'numeric' : 'text'"
            :placeholder="info.sample"
            autocomplete="off"
            spellcheck="false"
            :aria-invalid="error ? 'true' : undefined"
            aria-describedby="barcode-data-hint"
          />
          <p id="barcode-data-hint" class="mt-2 text-xs" :class="error ? 'text-destructive' : 'text-muted-foreground'">
            <template v-if="error">
              {{ error }}
            </template>
            <template v-else>
              {{ info.accepts }}.
              <template v-if="!state.data.trim()">
                Showing an example until you type.
              </template>
              {{ checkNote }}
            </template>
          </p>
        </div>

        <div v-if="state.sym === 'code39'" class="flex items-center gap-2">
          <Checkbox id="barcode-check" v-model="state.check" />
          <Label for="barcode-check" class="mb-0">Add the mod-43 check character</Label>
        </div>
        <div v-if="state.sym === 'itf14'" class="flex items-center gap-2">
          <Checkbox id="barcode-bearers" v-model="state.bearers" />
          <Label for="barcode-bearers" class="mb-0">Bearer bars (recommended — they stop a clipped scan reading a short number)</Label>
        </div>
      </section>

      <section :class="sectionClass" aria-label="Size">
        <h2 :class="sectionTitleClass">
          Size
        </h2>
        <div>
          <Label for="barcode-w">Bar width: {{ state.w }} px per module</Label>
          <Slider
            id="barcode-w"
            :model-value="[state.w]"
            :min="1"
            :max="6"
            :step="1"
            aria-label="Width of the narrowest bar in pixels"
            @update:model-value="value => state.w = value?.[0] ?? 2"
          />
        </div>
        <div>
          <Label for="barcode-h">Bar height: {{ state.h }} px</Label>
          <Slider
            id="barcode-h"
            :model-value="[state.h]"
            :min="20"
            :max="240"
            :step="5"
            aria-label="Bar height in pixels"
            @update:model-value="value => state.h = value?.[0] ?? 80"
          />
        </div>
        <div>
          <Label for="barcode-margin">Extra margin: {{ state.margin }} modules</Label>
          <Slider
            id="barcode-margin"
            :model-value="[state.margin]"
            :min="0"
            :max="20"
            :step="1"
            aria-label="Extra margin in modules, beyond the required quiet zone"
            @update:model-value="value => state.margin = value?.[0] ?? 2"
          />
          <p class="mt-2 text-xs text-muted-foreground">
            The quiet zone the specification requires — {{ barcode?.quietLeft ?? 10 }} modules on the left,
            {{ barcode?.quietRight ?? 10 }} on the right — is always included. This adds space beyond it.
          </p>
        </div>
        <div class="flex items-center gap-2">
          <Checkbox id="barcode-text" v-model="state.text" />
          <Label for="barcode-text" class="mb-0">Print the {{ numeric ? 'digits' : 'text' }} under the bars</Label>
        </div>
      </section>

      <section :class="sectionClass" aria-label="Colours">
        <h2 :class="sectionTitleClass">
          Colours
        </h2>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <Label>Bars</Label>
            <ColorPicker v-model="state.fg" label="Bar colour" />
          </div>
          <div v-if="!state.transparent">
            <Label>Background</Label>
            <ColorPicker v-model="state.bg" label="Background colour" />
          </div>
        </div>
        <div class="flex items-center gap-2">
          <Checkbox id="barcode-transparent" v-model="state.transparent" />
          <Label for="barcode-transparent" class="mb-0">Transparent background (only over a light surface)</Label>
        </div>
        <p v-if="contrastWarning" class="rounded-lg bg-destructive/10 p-3 text-xs text-destructive">
          {{ contrastWarning }}
        </p>
      </section>
    </div>

    <!-- Preview and the download area (sticky on desktop) -->
    <div class="lg:sticky lg:top-20 lg:self-start">
      <div class="rounded-2xl border border-border bg-muted p-5">
        <div
          class="grid min-h-40 place-items-center overflow-hidden rounded-xl border border-border/50 p-3"
          :class="state.transparent ? 'bg-[repeating-conic-gradient(#80808022_0_25%,transparent_0_50%)] bg-[length:16px_16px]' : ''"
        >
          <!-- eslint-disable-next-line vue/no-v-html -- our renderer's output; every string in it is escaped -->
          <div v-if="svg" class="w-full [&>svg]:mx-auto [&>svg]:h-auto [&>svg]:max-w-full" v-html="svg" />
          <p v-else class="p-6 text-center text-sm text-muted-foreground">
            Fix the input to see the barcode.
          </p>
        </div>

        <p v-if="barcode" class="mt-3 text-center font-mono text-xs text-muted-foreground">
          {{ info.name }} · {{ barcode.data }} · {{ barcode.modules.length }} modules
        </p>

        <div class="mt-4">
          <Label for="barcode-scale">PNG scale</Label>
          <Select v-model="scaleModel">
            <SelectTrigger id="barcode-scale" class="h-11" />
            <SelectContent>
              <SelectItem v-for="s in scales" :key="s" :value="s">
                {{ s }}× {{ layout ? `· ${layout.width * Number(s)} × ${layout.height * Number(s)} px` : '' }}
              </SelectItem>
            </SelectContent>
          </Select>
          <p v-if="print" class="mt-2 text-xs text-muted-foreground">
            At 300 dpi the PNG prints {{ print.widthMm.toFixed(1) }} × {{ print.heightMm.toFixed(1) }} mm,
            with bar modules of {{ print.moduleMm.toFixed(3) }} mm<template v-if="print.magnification">
              ({{ Math.round(print.magnification * 100) }}% of the nominal {{ info.nominalModuleMm }} mm)
            </template>.
          </p>
          <p v-if="sizeWarning" class="mt-2 text-xs text-destructive">
            {{ sizeWarning }}
          </p>
        </div>

        <div class="mt-4 grid grid-cols-2 gap-2">
          <Button size="lg" class="min-h-11 rounded-xl" :disabled="!svg" @click="downloadPng">
            Download PNG
          </Button>
          <Button size="lg" variant="outline" class="min-h-11 rounded-xl" :disabled="!svg" @click="downloadSvg">
            Download SVG
          </Button>
          <Button size="lg" variant="outline" class="col-span-2 min-h-11 rounded-xl" :disabled="!svg" @click="copySvg">
            <component :is="copied ? Check : Copy" class="size-4" />
            {{ copied ? 'Copied' : 'Copy SVG code' }}
          </Button>
        </div>

        <div class="mt-4 border-t border-border/60 pt-4">
          <ShareBar
            tool="barcode-generator"
            share-copy="Free barcode generator — EAN, UPC, Code 128, Code 39, ITF-14. Check digits done for you, SVG + PNG, no sign-up. Open source, with a free API + MCP server."
            :get-image-blob="() => toPngBlob()"
          />
        </div>
        <div aria-live="polite" class="sr-only">
          {{ announcement }}
        </div>
        <div aria-live="polite" class="sr-only">
          {{ status }}
        </div>
      </div>
    </div>
  </div>
</template>
