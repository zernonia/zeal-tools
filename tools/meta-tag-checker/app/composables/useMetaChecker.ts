import type { StateSchema } from '../../../../shared/core/url-state'
import type { Finding, HeadMeta, Platform } from '../../core'
import { audit, buildTags, readMeta, resolveCard } from '../../core'

/**
 * Only the URL is shareable. Pasted markup is not put in a link: it is far too
 * big for one, and it is somebody's unreleased page.
 */
const schema = {
  tab: { type: 'string', default: 'paste' },
  url: { type: 'string', default: '' },
} satisfies StateSchema

const PLATFORMS: Platform[] = ['google', 'x', 'facebook', 'linkedin', 'slack']

export function useMetaChecker(options: { defaultTab?: string } = {}) {
  const state = useToolState({ ...schema, tab: { type: 'string', default: options.defaultTab ?? 'paste' } })
  const { track } = useAnalytics()

  /** Pasted markup never leaves the page, so it is plain local state. */
  const html = ref('')
  const fetched = ref('')
  const loading = ref(false)
  const error = ref('')
  const finalUrl = ref('')
  const truncated = ref(false)

  const source = computed(() => (state.tab === 'url' ? fetched.value : html.value))
  const hasInput = computed(() => source.value.trim().length > 0)

  const meta = computed<HeadMeta>(() => readMeta(source.value))
  const findings = computed<Finding[]>(() => (hasInput.value ? audit(meta.value) : []))
  const errors = computed(() => findings.value.filter(f => f.severity === 'error'))
  const warnings = computed(() => findings.value.filter(f => f.severity === 'warning'))
  const passes = computed(() => findings.value.filter(f => f.severity === 'ok'))

  const cards = computed(() => Object.fromEntries(
    PLATFORMS.map(platform => [platform, resolveCard(meta.value, platform)]),
  ) as Record<Platform, ReturnType<typeof resolveCard>>)

  /**
   * Tags rebuilt from what was found, so the output is a corrected version of
   * the page rather than a blank form.
   */
  const generated = computed(() => buildTags({
    title: meta.value.og.title ?? meta.value.title ?? undefined,
    description: meta.value.og.description ?? meta.value.description ?? undefined,
    url: meta.value.og.url ?? meta.value.canonical ?? finalUrl.value ?? undefined,
    image: meta.value.og.image ?? undefined,
    siteName: meta.value.og.site_name ?? undefined,
    type: meta.value.og.type ?? 'website',
  }))

  /** The only thing here that touches the network. */
  async function check() {
    const target = state.url.trim()
    if (!target || loading.value)
      return
    loading.value = true
    error.value = ''
    fetched.value = ''
    truncated.value = false
    try {
      const response = await $fetch<{
        finalUrl?: string
        truncated?: boolean
        meta: HeadMeta
      } & { html?: string }>('/api/v1/meta', { query: { url: target } })
      // The endpoint returns parsed data rather than the page, so the tags are
      // rebuilt here from what it sent instead of re-parsing markup.
      fetched.value = buildFrom(response.meta)
      finalUrl.value = response.finalUrl ?? target
      truncated.value = response.truncated ?? false
      track('tool_completed', { tool: 'meta-tag-checker', format: 'url' })
    }
    catch (cause: unknown) {
      const message = (cause as { data?: { message?: string } })?.data?.message
      error.value = message ?? 'That page could not be checked.'
    }
    finally {
      loading.value = false
    }
  }

  return {
    state,
    html,
    loading,
    error,
    finalUrl,
    truncated,
    hasInput,
    meta,
    findings,
    errors,
    warnings,
    passes,
    cards,
    generated,
    platforms: PLATFORMS,
    check,
  }
}

/**
 * Turn the endpoint's parsed result back into markup for the shared pipeline.
 *
 * Round-tripping like this keeps one code path: whatever the source, the UI is
 * always looking at `readMeta` output, so the previews and the audit cannot
 * disagree between the two tabs.
 */
function buildFrom(meta: HeadMeta): string {
  const esc = (v: string) => v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;')
  const parts: string[] = ['<html', meta.lang ? ` lang="${esc(meta.lang)}"` : '', '><head>']
  if (meta.charset)
    parts.push(`<meta charset="${esc(meta.charset)}">`)
  if (meta.title)
    parts.push(`<title>${esc(meta.title)}</title>`)
  for (const [name, value] of [['description', meta.description], ['robots', meta.robots], ['viewport', meta.viewport], ['theme-color', meta.themeColor]] as const) {
    if (value)
      parts.push(`<meta name="${name}" content="${esc(value)}">`)
  }
  if (meta.canonical)
    parts.push(`<link rel="canonical" href="${esc(meta.canonical)}">`)
  for (const icon of meta.icons)
    parts.push(`<link rel="icon" href="${esc(icon)}">`)
  for (const [key, value] of Object.entries(meta.og))
    parts.push(`<meta property="og:${esc(key)}" content="${esc(value)}">`)
  for (const [key, value] of Object.entries(meta.twitter))
    parts.push(`<meta name="twitter:${esc(key)}" content="${esc(value)}">`)
  for (const block of meta.jsonLd)
    parts.push(`<script type="application/ld+json">${block}</script>`)
  parts.push('</head>')
  return parts.join('')
}
