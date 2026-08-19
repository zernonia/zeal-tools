import type { ToolMeta } from '#registry'
import { variantLabel } from '#registry'

export interface HowToStep { name: string, text: string }

export interface ToolJsonLdOptions {
  /** Variant slug for a long-tail page, e.g. `wifi`. */
  variant?: string
  /** Display name, when the page is not simply the tool's own name. */
  name?: string
  description?: string
  featureList?: string[]
  howTo?: { name: string, steps: HowToStep[] }
}

/**
 * WebApplication + BreadcrumbList for a tool page, derived from the registry.
 *
 * Written once here because hand-rolling it per page had drifted badly:
 * breadcrumbs existed on two pages of twelve, several tool pages had no
 * WebApplication at all, and the three QR variant pages — the long-tail growth
 * pages — carried no structured data whatsoever.
 *
 * FAQPage is deliberately absent: FaqSection emits that from the questions it
 * actually renders, so declaring it here too would duplicate it, which is
 * exactly the bug this replaces on the background remover.
 */
export function useToolJsonLd(meta: ToolMeta, options: ToolJsonLdOptions = {}) {
  const { public: { siteUrl } } = useRuntimeConfig()

  const toolUrl = `${siteUrl}/tools/${meta.slug}`
  const pageUrl = options.variant ? `${toolUrl}/${options.variant}` : toolUrl
  const name = options.name ?? (options.variant ? `${variantLabel(options.variant)} ${meta.name}` : meta.name)

  const trail = [
    { '@type': 'ListItem', 'position': 1, 'name': 'zeal.tools', 'item': siteUrl },
    { '@type': 'ListItem', 'position': 2, 'name': meta.name, 'item': toolUrl },
  ]
  if (options.variant) {
    trail.push({ '@type': 'ListItem', 'position': 3, 'name': variantLabel(options.variant), 'item': pageUrl })
  }

  const graph: Record<string, unknown>[] = [
    {
      '@type': 'WebApplication',
      'name': name,
      'url': pageUrl,
      'applicationCategory': 'UtilitiesApplication',
      'operatingSystem': 'Any',
      'description': options.description ?? meta.tagline,
      'offers': { '@type': 'Offer', 'price': '0', 'priceCurrency': 'USD' },
      ...(options.featureList ? { featureList: options.featureList } : {}),
    },
    { '@type': 'BreadcrumbList', 'itemListElement': trail },
  ]

  if (options.howTo) {
    graph.push({
      '@type': 'HowTo',
      'name': options.howTo.name,
      'step': options.howTo.steps.map(step => ({ '@type': 'HowToStep', 'name': step.name, 'text': step.text })),
    })
  }

  useHead({
    script: [{
      type: 'application/ld+json',
      innerHTML: JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }),
    }],
  })
}
