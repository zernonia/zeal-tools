/**
 * THE tool registry. Homepage grid, Cmd+K search, sitemap, API index and the
 * MCP tool list all derive from this single aggregation.
 *
 * Adding a tool = adding its folder under tools/ and one import line here.
 */
import type { ToolMeta } from './types'
import backgroundRemover from '../../tools/background-remover/meta'
import chordTransposer from '../../tools/chord-transposer/meta'
import countdownTimer from '../../tools/countdown-timer/meta'
import imageCompressor from '../../tools/image-compressor/meta'
import passwordGenerator from '../../tools/password-generator/meta'
import qrCodeGenerator from '../../tools/qr-code-generator/meta'
import sendToDevice from '../../tools/send-to-device/meta'
import stageTimer from '../../tools/stage-timer/meta'
import worshipPads from '../../tools/worship-pads/meta'

export type { ToolMeta }

/**
 * Sorted by name here rather than at each call site, because this array is the
 * order every surface inherits — homepage grid, sidebar nav, sitemap, API
 * index, llms.txt and the MCP tool list. Sorting programmatically keeps
 * "adding a tool = one import line" true; requiring correct placement in the
 * literal would quietly become "one import line, in the right position".
 *
 * Search results are not affected: fuzzy search ranks by score and only falls
 * back to name order for ties.
 */
export const registry: ToolMeta[] = [
  qrCodeGenerator,
  chordTransposer,
  worshipPads,
  stageTimer,
  countdownTimer,
  backgroundRemover,
  passwordGenerator,
  sendToDevice,
  imageCompressor,
].sort((a, b) => a.name.localeCompare(b.name))

export function getTool(slug: string): ToolMeta | undefined {
  return registry.find(tool => tool.slug === slug)
}

/**
 * Variants are stored as bare slugs; these are the casings their own pages use.
 * Anything unlisted falls back to capitalisation.
 */
const VARIANT_LABELS: Record<string, string> = {
  'png-to-jpg': 'PNG to JPG',
  'jpg-to-webp': 'JPG to WebP',
  'wifi': 'WiFi',
  'vcard': 'vCard',
  'email': 'Email',
}

export function variantLabel(slug: string): string {
  return VARIANT_LABELS[slug] ?? slug.charAt(0).toUpperCase() + slug.slice(1)
}
