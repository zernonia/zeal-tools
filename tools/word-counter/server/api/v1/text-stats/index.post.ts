import { CASE_IDS, isCaseId, MAX_TEXT_LENGTH, respond } from '../../../../core'

interface Body {
  text?: unknown
  case?: unknown
}

/**
 * POST /api/v1/text-stats  { "text": "…", "case": "title" }
 *
 * POST only. Text sent here does travel to the server, unlike text typed into
 * the page, and a query string would also land in access logs and browser
 * history. Nothing is stored or logged by this route.
 */
export default defineEventHandler(async (event) => {
  enforceRateLimit(event)

  const body = await readBody<Body>(event).catch(() => null)
  if (!body || typeof body.text !== 'string')
    badRequest('Send a JSON body with a "text" string, and optionally "case".')
  if (body.text.length > MAX_TEXT_LENGTH)
    badRequest(`"text" is too long: the limit is ${MAX_TEXT_LENGTH} UTF-16 units. The browser tool has no limit.`)
  const id = body.case === undefined || isCaseId(body.case)
    ? body.case
    : badRequest(`"case" must be one of: ${CASE_IDS.join(', ')}.`)

  return {
    ...respond({ text: body.text, case: id }),
    note: 'Measured on the server and never stored. Text typed into the page at zeal.tools/tools/word-counter never leaves your browser.',
  }
})
