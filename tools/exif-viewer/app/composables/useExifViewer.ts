import type { ExifReading } from '../../core'
import { formatBytes } from '../../../../shared/core/bytes'
import { readExif, stripMetadata } from '../../core'

export function useExifViewer() {
  const name = ref('')
  const type = ref('')
  const size = ref(0)
  const previewUrl = ref('')
  const reading = ref<ExifReading | null>(null)
  const cleanUrl = ref('')
  const removed = ref(0)
  const loaded = ref(false)
  const error = ref('')

  let original: Uint8Array | null = null

  const sensitive = computed(() => reading.value?.tags.filter(t => t.sensitive) ?? [])
  const technical = computed(() => reading.value?.tags.filter(t => !t.sensitive) ?? [])
  const hasMetadata = computed(() => (reading.value?.tags.length ?? 0) > 0)
  const canStrip = computed(() => type.value === 'image/jpeg' || type.value === 'image/png')

  const mapUrl = computed(() => {
    const at = reading.value?.location
    if (!at)
      return ''
    return `https://www.openstreetmap.org/?mlat=${at.latitude}&mlon=${at.longitude}#map=16/${at.latitude}/${at.longitude}`
  })

  /**
   * The embeddable map, and why it is not loaded until asked for.
   *
   * Fetching map tiles sends these coordinates to OpenStreetMap — which is the
   * single most sensitive thing this tool just found in the photo. Rendering it
   * automatically would leak the exact secret the visitor came here to check,
   * before they had decided anything. So the frame is built only when someone
   * asks for it, and the page says plainly what asking costs.
   */
  const embedUrl = computed(() => {
    const at = reading.value?.location
    if (!at)
      return ''
    const d = 0.004
    const bbox = [at.longitude - d, at.latitude - d / 2, at.longitude + d, at.latitude + d / 2].join(',')
    return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${at.latitude},${at.longitude}`
  })

  const mapShown = ref(false)

  function release() {
    if (previewUrl.value)
      URL.revokeObjectURL(previewUrl.value)
    if (cleanUrl.value)
      URL.revokeObjectURL(cleanUrl.value)
    previewUrl.value = ''
    cleanUrl.value = ''
  }

  async function load(file: File | null | undefined) {
    if (!file)
      return
    try {
      release()
      error.value = ''
      name.value = file.name
      type.value = file.type
      size.value = file.size
      previewUrl.value = URL.createObjectURL(file)

      original = new Uint8Array(await file.arrayBuffer())
      reading.value = readExif(original)
      mapShown.value = false

      const stripped = stripMetadata(original, file.type)
      removed.value = stripped.removed
      cleanUrl.value = URL.createObjectURL(
        new Blob([stripped.data as unknown as BlobPart], { type: file.type }),
      )
      loaded.value = true
    }
    catch {
      error.value = 'That file could not be read.'
      loaded.value = false
    }
  }

  function reset() {
    release()
    original = null
    reading.value = null
    loaded.value = false
    name.value = ''
    removed.value = 0
    error.value = ''
  }

  const cleanName = computed(() => {
    const dot = name.value.lastIndexOf('.')
    return dot > 0 ? `${name.value.slice(0, dot)}-clean${name.value.slice(dot)}` : `${name.value}-clean`
  })

  onScopeDispose(release)

  return {
    name,
    type,
    size,
    previewUrl,
    reading,
    cleanUrl,
    cleanName,
    removed,
    loaded,
    error,
    sensitive,
    technical,
    hasMetadata,
    canStrip,
    mapUrl,
    embedUrl,
    mapShown,
    load,
    reset,
    formatBytes,
  }
}
