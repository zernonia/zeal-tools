/**
 * THE tool registry. Homepage grid, Cmd+K search, sitemap, API index and the
 * MCP tool list all derive from this single aggregation.
 *
 * Adding a tool = adding its folder under tools/ and one import line here.
 */
import type { ToolMeta } from './types'
import chordTransposer from '../../tools/chord-transposer/meta'
import countdownTimer from '../../tools/countdown-timer/meta'
import qrCodeGenerator from '../../tools/qr-code-generator/meta'
import stageTimer from '../../tools/stage-timer/meta'
import worshipPads from '../../tools/worship-pads/meta'

export type { ToolMeta }

export const registry: ToolMeta[] = [
  qrCodeGenerator,
  chordTransposer,
  worshipPads,
  stageTimer,
  countdownTimer,
]

export function getTool(slug: string): ToolMeta | undefined {
  return registry.find(tool => tool.slug === slug)
}

/**
 * Variants are stored as bare slugs; these are the casings their own pages use.
 * Anything unlisted falls back to capitalisation.
 */
const VARIANT_LABELS: Record<string, string> = {
  wifi: 'WiFi',
  vcard: 'vCard',
  email: 'Email',
}

export function variantLabel(slug: string): string {
  return VARIANT_LABELS[slug] ?? slug.charAt(0).toUpperCase() + slug.slice(1)
}
