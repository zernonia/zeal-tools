/**
 * QR Code Scanner core: everything about a scan that is not pixels.
 *
 * Decoding itself happens in the browser (BarcodeDetector, or jsQR as a
 * fallback). What comes back is a string, and this module decides what that
 * string is — a link and how far to trust it, a WiFi login, a contact, an
 * event — and how to hand it on safely. Pure and isomorphic, like every core.
 */
export type { CalendarEvent, IcsDate } from './calendar'
export { parseEvent, parseIcsDate, toIcs } from './calendar'
export type { Contact } from './contact'
export { parseMecard, parseVcard, toVcard } from './contact'
export { readFields, splitUnescaped, unescapeValue } from './fields'
export type { Size } from './frames'
export { fileName, fitWithin, halvingSteps, isRepeat, LIVE_FRAME_EDGE, LIVE_INTERVAL_MS, scanSizes } from './frames'
export type { EmailInfo, GeoInfo, PhoneInfo, SmsInfo } from './messages'
export { parseEmail, parseGeo, parsePhone, parseSms } from './messages'
export type { ScanKind, ScanResult } from './parse'
export { checkGtin, FORMAT_LABELS, formatLabel, KIND_LABELS, parseScan, summarise, worstSeverity } from './parse'
export { decodePunycode, hostToUnicode } from './punycode'
export type { Severity, UrlInfo, Warning } from './url'
export { analyseUrl, SHORTENERS, siteOf } from './url'
export type { WifiInfo } from './wifi'
export { parseWifi, securityLabel } from './wifi'
