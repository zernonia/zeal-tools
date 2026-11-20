import type { CaseId } from './case'
import type { Limit, SmsInfo } from './limits'
import type { TextStats } from './stats'
import { convertCase } from './case'
import { limits, smsInfo } from './limits'
import { textStats } from './stats'

export * from './case'
export * from './limits'
export * from './stats'

/**
 * The largest text the API and MCP accept: about 1 MB of UTF-16, or a
 * 150,000-word manuscript. The page has no such cap — it runs on your machine.
 */
export const MAX_TEXT_LENGTH = 500_000

export interface Analysis extends TextStats {
  sms: SmsInfo
  limits: Limit[]
}

/** Everything the tool reports about a text, in one pass per measure. */
export function analyse(text: string): Analysis {
  return { ...textStats(text), sms: smsInfo(text), limits: limits(text) }
}

export interface AnalyseRequest {
  text: string
  case?: CaseId
}

export interface AnalyseResponse extends Analysis {
  /** Present when a case was asked for: the text converted. */
  converted?: string
}

/** Shared by the REST route and MCP so the two cannot drift. */
export function respond({ text, case: id }: AnalyseRequest): AnalyseResponse {
  const result: AnalyseResponse = analyse(text)
  if (id)
    result.converted = convertCase(text, id)
  return result
}
