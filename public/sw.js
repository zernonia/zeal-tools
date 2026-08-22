/**
 * Service worker — offline, and the reason the install prompt is offered.
 *
 * Chrome will not offer to install a site whose worker has no fetch handler,
 * so one is required whatever else it does. Given that, it may as well make
 * the claim the FAQs already make true: several tools say they keep working
 * offline once the page has loaded, which until now held only for as long as
 * the tab stayed open.
 *
 * Three rules keep it from becoming the usual stale-content bug factory:
 *
 * 1. **Pages are network-first.** These routes are prerendered and redeployed;
 *    a cache-first worker would pin visitors to whatever HTML they saw first
 *    and there is no version handshake here to rescue them. The cache is only
 *    consulted when the network actually fails.
 * 2. **Only content-hashed assets are served cache-first.** Anything under
 *    `/_nuxt/` cannot change meaning without changing filename, so a hit is
 *    always correct. Everything else revalidates.
 * 3. **Whole surfaces are left alone.** The API, MCP, the pairing socket and
 *    the well-known documents are never intercepted — they are either not
 *    cacheable or actively harmful to cache.
 */

/**
 * Two caches, not one, and this is load-bearing. With a single cache and a
 * single cap, the dozens of hashed assets each page pulls in evict the handful
 * of HTML entries almost immediately — measured: after visiting two pages the
 * cache was full and *both* pages fell back to the offline card while their
 * own scripts sat in the cache. Pages are few, small, and the whole point;
 * they get their own budget.
 */
const PAGES = 'zeal-pages-v1'
const ASSETS = 'zeal-assets-v1'
const KEEP = [PAGES, ASSETS]

/** Generous: every page here is a few tens of KB of prerendered HTML. */
const MAX_PAGES = 60
const MAX_ASSETS = 140

/**
 * The background remover's ONNX runtime is several megabytes and is already
 * cached by the browser's own HTTP cache; copying it in here would evict most
 * of everything else for no gain.
 */
const MAX_BYTES = 2 * 1024 * 1024

/**
 * Never intercepted. `/api` and `/mcp` are live JSON and rate-limited,
 * `/_ws` is the pairing socket's upgrade path, and `.well-known` documents
 * are read by scanners that should always see the current answer.
 */
const BYPASS = [/^\/api\//, /^\/mcp\b/, /^\/_ws\//, /^\/\.well-known\//, /^\/_pair\//]

/** Content-hashed, so a cache hit can never be the wrong version. */
const IMMUTABLE = /^\/(?:_nuxt|_og|_og-static-fonts)\//

self.addEventListener('install', (event) => {
  // The homepage only, so a cold offline start has somewhere to land. Every
  // other page caches itself the first time it is visited.
  event.waitUntil(
    caches.open(PAGES)
      .then(cache => cache.add('/'))
      .catch(() => {})
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) {
      if (!KEEP.includes(key))
        await caches.delete(key)
    }
    await self.clients.claim()
  })())
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET')
    return

  const url = new URL(request.url)
  // Cross-origin is left entirely alone: the model weights stream from Hugging
  // Face and the map tiles come from OpenStreetMap, and neither belongs here.
  if (url.origin !== self.location.origin)
    return
  if (BYPASS.some(pattern => pattern.test(url.pathname)))
    return
  // A partial response cannot be stored, and storing the full one instead
  // would break media seeking.
  if (request.headers.has('range'))
    return

  if (request.mode === 'navigate') {
    event.respondWith(page(request))
    return
  }
  event.respondWith(IMMUTABLE.test(url.pathname) ? immutable(request) : revalidating(request))
})

/** Network-first. The cache is a fallback for being offline, never a source. */
async function page(request) {
  try {
    const response = await fetch(request)
    if (response.ok)
      store(PAGES, request, response.clone(), MAX_PAGES)
    return response
  }
  catch {
    // This exact page if it has been seen before; otherwise say so plainly
    // rather than serving the homepage under someone else's URL.
    // `ignoreVary` because the edge sets `Vary: Accept-Encoding`, and a
    // navigation whose encoding differs from the stored one is still the page
    // that was asked for.
    const hit = await caches.match(request, { cacheName: PAGES, ignoreVary: true })
    return hit ?? offline()
  }
}

async function immutable(request) {
  const hit = await caches.match(request, { cacheName: ASSETS, ignoreVary: true })
  if (hit)
    return hit
  const response = await fetch(request)
  if (response.ok)
    store(ASSETS, request, response.clone(), MAX_ASSETS)
  return response
}

async function revalidating(request) {
  try {
    const response = await fetch(request)
    if (response.ok)
      store(ASSETS, request, response.clone(), MAX_ASSETS)
    return response
  }
  catch {
    const hit = await caches.match(request, { cacheName: ASSETS, ignoreVary: true })
    if (hit)
      return hit
    throw new Error('offline and not cached')
  }
}

async function store(name, request, response, limit) {
  // Opaque and partial responses report no length and cannot be trusted.
  if (response.type !== 'basic' && response.type !== 'default')
    return
  const length = Number(response.headers.get('content-length') ?? 0)
  if (length > MAX_BYTES)
    return
  try {
    const cache = await caches.open(name)
    await cache.put(request, response)
    await trim(cache, limit)
  }
  catch {
    // Quota, or storage turned off. The page still works; it just stops
    // remembering, which is the honest degradation.
  }
}

/**
 * `cache.keys()` resolves in insertion order, so dropping from the front
 * evicts the oldest write. That is FIFO rather than true LRU — a genuine LRU
 * needs a timestamp per entry, which is a whole side-table for a cache whose
 * worst failure is one extra network request.
 */
async function trim(cache, limit) {
  const keys = await cache.keys()
  if (keys.length <= limit)
    return
  for (const key of keys.slice(0, keys.length - limit))
    await cache.delete(key)
}

/** Themed so it does not flash white at someone reading in the dark. */
function offline() {
  const body = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><title>Offline · zeal.tools</title>
<style>:root{color-scheme:light dark}
body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f5f5f5;color:#1c1917;
font:16px/1.5 ui-sans-serif,system-ui,sans-serif;text-align:center;padding:24px}
main{max-width:32rem}h1{font-size:1.5rem;margin:0 0 .5rem}p{margin:0;color:#57534e}
@media (prefers-color-scheme:dark){body{background:#0c0a09;color:#fafaf9}p{color:#a8a29e}}</style>
</head><body><main><h1>You're offline</h1>
<p>This page hasn't been opened on this device yet, so there's no copy saved. Tools you've already
visited still work without a connection.</p></main></body></html>`
  return new Response(body, {
    status: 503,
    headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' },
  })
}
