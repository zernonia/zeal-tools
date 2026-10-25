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
import exifViewer from '../../tools/exif-viewer/meta'
import faviconGenerator from '../../tools/favicon-generator/meta'
import imageCompressor from '../../tools/image-compressor/meta'
import imageRedactor from '../../tools/image-redactor/meta'
import invoiceMaker from '../../tools/invoice-maker/meta'
import metaTagChecker from '../../tools/meta-tag-checker/meta'
import metronome from '../../tools/metronome/meta'
import namePicker from '../../tools/name-picker/meta'
import passwordGenerator from '../../tools/password-generator/meta'
import qrCodeGenerator from '../../tools/qr-code-generator/meta'
import sendToDevice from '../../tools/send-to-device/meta'
import stageTimer from '../../tools/stage-timer/meta'
import stemSplitter from '../../tools/stem-splitter/meta'
import tuner from '../../tools/tuner/meta'
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
  exifViewer,
  faviconGenerator,
  tuner,
  invoiceMaker,
  namePicker,
  metaTagChecker,
  stemSplitter,
  imageRedactor,
  metronome,
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
  'wheel': 'Wheel of Names',
  'raffle': 'Raffle',
  'classroom': 'Classroom',
  'vocal-remover': 'Vocal Remover',
  'acapella-extractor': 'Acapella Extractor',
  'drum-remover': 'Drum Remover',
  'worship-practice-tracks': 'Worship Practice Tracks',
}

/**
 * The tool page — or registered variant — a path is, or null for anything
 * else. Only advertised landing pages count: an app surface such as the stage
 * timer's projector view is part of a tool someone is already using, and
 * counting it would record one visit as two.
 */
export function toolOfPath(path: string): { tool: string, variant?: string } | null {
  const [section, slug, variant, ...rest] = path.split('/').filter(Boolean)
  if (section !== 'tools' || !slug || rest.length)
    return null
  const tool = getTool(slug)
  if (!tool)
    return null
  if (!variant)
    return { tool: tool.slug }
  return tool.variants?.includes(variant) ? { tool: tool.slug, variant } : null
}

export function variantLabel(slug: string): string {
  return VARIANT_LABELS[slug] ?? slug.charAt(0).toUpperCase() + slug.slice(1)
}
