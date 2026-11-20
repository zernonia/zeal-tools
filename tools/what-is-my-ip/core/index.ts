/**
 * What Is My IP — the only entry to run the tool.
 *
 * `address` parses, normalises and classifies an IP; `connection` shapes the
 * request's headers and Cloudflare's `cf` object into the response; `format`
 * turns that response into words for the page.
 */
export * from './address'
export * from './connection'
export * from './format'
