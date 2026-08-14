<script setup lang="ts">
import { Upload, X } from 'lucide-vue-next'

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

const sizes = ['512', '1024', '2048', '4096']
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
const securityOptions = [
  { id: 'WPA', label: 'WPA / WPA2 / WPA3' },
  { id: 'WEP', label: 'WEP' },
  { id: 'nopass', label: 'Open (no password)' },
]

// Select works with string values; px is numeric in shareable state
const pxModel = computed({
  get: () => String(state.px),
  set: (value: string) => { state.px = Number(value) },
})

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

const logoInput = ref<HTMLInputElement>()
function onLogoUpload(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => { logoHref.value = String(reader.result) }
  reader.readAsDataURL(file)
}
</script>

<template>
  <div class="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(320px,400px)]">
    <!-- Controls -->
    <div class="space-y-6">
      <Tabs v-model="state.tab">
        <TabsList aria-label="QR code type">
          <TabsTrigger v-for="tab in tabs" :key="tab.id" :value="tab.id">
            {{ tab.label }}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="url" class="space-y-4">
          <div>
            <Label for="qr-url">Website URL</Label>
            <Input id="qr-url" v-model="state.url" type="url" placeholder="https://zeal.tools" autocomplete="off" />
          </div>
        </TabsContent>

        <TabsContent value="text">
          <Label for="qr-text">Text</Label>
          <Textarea id="qr-text" v-model="state.text" class="h-28" placeholder="Any text…" />
        </TabsContent>

        <TabsContent value="wifi" class="space-y-4">
          <div>
            <Label for="qr-ssid">Network name (SSID)</Label>
            <Input id="qr-ssid" v-model="state.ssid" autocomplete="off" />
          </div>
          <div>
            <Label for="qr-password">Password</Label>
            <Input id="qr-password" v-model="state.password" autocomplete="off" />
            <p class="mt-1 text-xs text-muted-foreground">Passwords never leave your browser and are never put in share links.</p>
          </div>
          <div class="flex items-end gap-4">
            <div class="flex-1">
              <Label for="qr-security">Security</Label>
              <Select v-model="state.security">
                <SelectTrigger id="qr-security" />
                <SelectContent>
                  <SelectItem v-for="option in securityOptions" :key="option.id" :value="option.id">{{ option.label }}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <label class="flex h-10 items-center gap-2 text-sm">
              <Checkbox v-model="state.hidden" />
              Hidden network
            </label>
          </div>
        </TabsContent>

        <TabsContent value="email" class="space-y-4">
          <div>
            <Label for="qr-to">Email address</Label>
            <Input id="qr-to" v-model="state.to" type="email" placeholder="hello@example.com" autocomplete="off" />
          </div>
          <div>
            <Label for="qr-subject">Subject <span class="font-normal opacity-60">(optional)</span></Label>
            <Input id="qr-subject" v-model="state.subject" autocomplete="off" />
          </div>
          <div>
            <Label for="qr-body">Body <span class="font-normal opacity-60">(optional)</span></Label>
            <Textarea id="qr-body" v-model="state.body" class="h-20" />
          </div>
        </TabsContent>

        <TabsContent value="phone">
          <Label for="qr-phone">Phone number</Label>
          <Input id="qr-phone" v-model="state.phone" type="tel" placeholder="+1 555 123 4567" autocomplete="off" />
        </TabsContent>

        <TabsContent value="sms" class="space-y-4">
          <div>
            <Label for="qr-sms-phone">Phone number</Label>
            <Input id="qr-sms-phone" v-model="state.phone" type="tel" placeholder="+1 555 123 4567" autocomplete="off" />
          </div>
          <div>
            <Label for="qr-message">Message <span class="font-normal opacity-60">(optional)</span></Label>
            <Textarea id="qr-message" v-model="state.message" class="h-20" />
          </div>
        </TabsContent>

        <TabsContent value="vcard" class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <Label for="qr-first">First name</Label>
              <Input id="qr-first" v-model="state.firstName" autocomplete="off" />
            </div>
            <div>
              <Label for="qr-last">Last name</Label>
              <Input id="qr-last" v-model="state.lastName" autocomplete="off" />
            </div>
            <div>
              <Label for="qr-org">Organization</Label>
              <Input id="qr-org" v-model="state.organization" autocomplete="off" />
            </div>
            <div>
              <Label for="qr-title">Job title</Label>
              <Input id="qr-title" v-model="state.title" autocomplete="off" />
            </div>
            <div>
              <Label for="qr-vphone">Phone</Label>
              <Input id="qr-vphone" v-model="state.vPhone" type="tel" autocomplete="off" />
            </div>
            <div>
              <Label for="qr-vemail">Email</Label>
              <Input id="qr-vemail" v-model="state.vEmail" type="email" autocomplete="off" />
            </div>
          </div>
          <div>
            <Label for="qr-vurl">Website</Label>
            <Input id="qr-vurl" v-model="state.vUrl" type="url" autocomplete="off" />
          </div>
        </TabsContent>
      </Tabs>

      <!-- Style options -->
      <fieldset class="space-y-4 rounded-2xl border border-border p-5">
        <legend class="px-1 text-sm font-semibold">Style</legend>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <Label for="qr-fg">Color</Label>
            <div class="flex gap-2">
              <input id="qr-fg" v-model="state.fg" type="color" class="h-10 w-12 cursor-pointer rounded-lg border border-input bg-background" aria-label="Foreground color picker">
              <Input v-model="state.fg" aria-label="Foreground color hex value" />
            </div>
          </div>
          <div>
            <Label for="qr-bg">Background</Label>
            <div class="flex gap-2">
              <input id="qr-bg" v-model="state.bg" type="color" class="h-10 w-12 cursor-pointer rounded-lg border border-input bg-background" aria-label="Background color picker">
              <Input v-model="state.bg" aria-label="Background color hex value" />
            </div>
          </div>
          <div>
            <Label for="qr-dots">Module style</Label>
            <Select v-model="state.dots">
              <SelectTrigger id="qr-dots" />
              <SelectContent>
                <SelectItem v-for="style in dotStyles" :key="style.id" :value="style.id">{{ style.label }}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label for="qr-ec">Error correction</Label>
            <Select v-model="state.ec" :disabled="!!logoHref">
              <SelectTrigger id="qr-ec" />
              <SelectContent>
                <SelectItem v-for="level in ecLevels" :key="level.id" :value="level.id">{{ level.label }}</SelectItem>
              </SelectContent>
            </Select>
            <p v-if="logoHref" class="mt-1 text-xs text-muted-foreground">Locked to H while a logo is embedded.</p>
          </div>
          <div>
            <Label for="qr-margin">Margin: {{ state.margin }} modules</Label>
            <Slider
              id="qr-margin"
              :model-value="[state.margin]"
              :min="0"
              :max="12"
              :step="1"
              aria-label="Quiet zone margin in modules"
              @update:model-value="value => state.margin = value?.[0] ?? 4"
            />
          </div>
          <div>
            <Label for="qr-px">Download size</Label>
            <Select v-model="pxModel">
              <SelectTrigger id="qr-px" />
              <SelectContent>
                <SelectItem v-for="size in sizes" :key="size" :value="size">{{ size }} × {{ size }} px</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div>
          <Label for="qr-logo">Center logo <span class="font-normal opacity-60">(optional — bumps error correction to H)</span></Label>
          <div class="flex items-center gap-3">
            <input id="qr-logo" ref="logoInput" type="file" accept="image/*" class="sr-only" @change="onLogoUpload">
            <Button variant="outline" size="sm" @click="logoInput?.click()">
              <Upload class="size-3.5" />
              {{ logoHref ? 'Replace logo' : 'Upload logo' }}
            </Button>
            <Button v-if="logoHref" variant="ghost" size="sm" @click="logoHref = ''">
              <X class="size-3.5" />
              Remove
            </Button>
          </div>
        </div>
      </fieldset>
    </div>

    <!-- Preview (sticky on desktop) -->
    <div class="lg:sticky lg:top-20 lg:self-start">
      <div class="rounded-2xl border border-border p-5">
        <div class="mx-auto aspect-square w-full max-w-xs overflow-hidden rounded-xl border border-border/50">
          <div v-if="svg" class="[&>svg]:h-full [&>svg]:w-full" role="img" aria-label="Generated QR code preview" v-html="svg" />
          <div v-else class="grid h-full place-items-center p-6 text-center text-sm text-muted-foreground">
            {{ error ?? 'Start typing to generate a QR code' }}
          </div>
        </div>
        <p v-if="matrix" class="mt-3 text-center text-xs text-muted-foreground">
          Version {{ matrix.version }} · {{ matrix.size }}×{{ matrix.size }} modules · EC {{ matrix.ecLevel }}
        </p>
        <p v-if="error" class="mt-2 text-center text-xs text-destructive" role="alert">{{ error }}</p>

        <div class="mt-4 grid grid-cols-2 gap-2">
          <Button size="lg" class="rounded-xl" :disabled="!matrix" @click="downloadPng">
            Download PNG
          </Button>
          <Button size="lg" variant="outline" class="rounded-xl" :disabled="!matrix" @click="downloadSvg">
            Download SVG
          </Button>
        </div>

        <div class="mt-4 border-t border-border/60 pt-4">
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
