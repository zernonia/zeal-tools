# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm install           # runs `nuxt prepare` via postinstall — required before test/build
pnpm dev               # Nuxt dev server on :3000
pnpm test              # vitest run (unit)
pnpm build             # nuxt build → .output (cloudflare_module preset)
pnpm lint              # eslint . (@antfu/eslint-config)
pnpm lint:fix          # autofix
pnpm preview           # wrangler dev against the built output
```

Single test file / single test name:

```bash
pnpm vitest run tools/qr-code-generator/core/encoder.test.ts
pnpm vitest run -t "boosts EC level"
```

CI (`.github/workflows/ci.yml`) runs **`pnpm test` and `pnpm build` only** — lint is not gated, so run it yourself before finishing. Deploys run through the **Cloudflare Workers Builds** git integration (worker `zeal-tools`); there is no Actions deploy workflow and no wrangler credentials are needed.

The background remover vendors **nothing**. Its weights stream from Hugging
Face on first use, and the ONNX Runtime wasm is emitted into `_nuxt/` as a
content-hashed asset by the bundler — leave `ort.env.wasm.wasmPaths` unset and
that happens automatically, version-locked to the installed `onnxruntime-web`.
Do not reintroduce a copy step: an earlier one drifted from the package and
404'd on the loader glue. Nothing is fetched on page load; verify with
`grep -c ort-wasm .output/public/tools/background-remover/index.html` (expect 0).

Two constraints shape the model choices. A Cloudflare static asset cannot
exceed **25 MiB**, and — the one that actually bites — **GitHub release assets
send no CORS headers at all**, so rembg's models cannot be fetched from a
browser however convenient they look. Hugging Face sends
`access-control-allow-origin: *`.

Three things about that tool are measured, not guessed, and must stay that way.
**Preprocessing and activation are per-model** (BiRefNet divides by a flat 255
and emits logits from about -15 to +8 needing a sigmoid; U²-Net divides by the
image's brightest channel and emits non-negative saliency needing a min-max
stretch) — using the wrong one yields a plausible, wrong matte, and both
branches stay unit-tested even though one model ships. **fp16 weights are not
faster** on the wasm backend, which has no fp16 acceleration, so they only
halve the download. And **WASM is not asynchronous**: it runs on the calling
thread, so inference on the main thread froze the page for 5.5s — hence
`ort.env.wasm.proxy = true`. That has a trap of its own: proxy mode *transfers*
input tensors, so any tensor reused across runs (the SAM embeddings) must be
copied per run or the second call throws `ArrayBuffer is already detached`.
Avoid ISNet despite its ideal 42 MiB int8 build: it is **AGPL-3.0**.
`onnxruntime-web` is the sole entry on CONTRIBUTING's runtime dependency
allow-list; verify it stays in one lazily imported chunk with
`grep -rl onnxruntime .output/public/_nuxt/`.

`package.json#packageManager` pins pnpm — without it Cloudflare Workers Builds picked a pnpm 8/9 that rejects a settings-only `pnpm-workspace.yaml` ("packages field missing or empty"). The `packages: [.]` entry there is belt-and-braces for the same reason; it does not make this a monorepo and does not change the lockfile.

pnpm enforces a supply-chain policy (`pnpm-workspace.yaml`). `semver@6.3.1` is exempted via `trustPolicyExclude` because the 6.x line predates npm trusted publishing; it arrives transitively through `nuxt → @vitejs/plugin-vue-jsx → @babel/core`. Don't widen that list without the same kind of justification.

## Git conventions

Commit messages are **Conventional Commits** — `type(scope): subject`, lowercase, imperative, no trailing full stop. Scope is the tool slug when the change belongs to one slice (`feat(stage-timer):`, `fix(background-remover):`), otherwise the area (`brand`, `seo`, `nav`, `home`). Split unrelated work into separate commits rather than one sweep; group files so each commit is a single coherent change.

Types in use: `feat`, `fix`, `refactor`, `perf`, `docs`, `test`, `chore`, `build`.

## Product invariants (the Zeal Promise — never violate)

- No sign-up, ever. No watermarks. No ads near download/copy actions.
- Privacy-first: process client-side wherever possible; tool inputs never reach our servers.
- The download/copy area is sacred — never block or crowd it.
- No dynamic/tracking QR codes (the accounts-and-paywall trap). No anonymous file hosting: with no sign-up it's an abuse magnet.
- "Request a tool" links point at `https://github.com/zernonia/zeal-tools/issues/new?template=tool-request.md`.

## Architecture

**Every tool is a self-contained Nuxt layer** under `tools/<slug>/`, composed in `nuxt.config.ts` via `extends`. `shared/` is also a layer. Read `CONTRIBUTING.md` — it owns the slice template, the zero-dependency policy, and the per-tool checklist. Follow it rather than restating it.

The two invariants everything hangs off:

1. **`core/` is pure and isomorphic** — no Vue, no DOM, no npm runtime deps. This is what lets one implementation serve the UI, the REST route, and MCP.
2. **`shared/registry/index.ts` is the only way to know a tool exists.** Homepage grid, ⌘K palette, sitemap, API index and MCP tool list all derive from it. Adding a tool = a folder under `tools/` + one import line there. `meta.variants` drives the long-tail sitemap entries.

Slices never import from each other — cross-tool code graduates to `shared/`. `meta.ts` is the only file the outside world reads to *know about* a tool; `core/index.ts` the only entry to *run* it. Music theory lives in `shared/core/music.ts`, duration/date maths in `shared/core/duration.ts`, and the QR encoder in `shared/core/qr.ts`. The first two have two consumers each; the encoder currently has one, having briefly been shared with send-to-device before that tool moved to network discovery. It stays in `shared/` because that is where an ISO/IEC 18004 implementation belongs, not because two slices happen to import it today.

Two registry details that are easy to get wrong:

- **`apiPath` is not optional guesswork.** The REST segment often differs from the slug — `qr-code-generator` serves `/api/v1/qr`, `chord-transposer` serves `/api/v1/chords`. Set it in `meta.ts`; the API index, `llms.txt` and the RFC 9727 catalog all read it. They used to each guess differently, which advertised URLs that 404.
- **MCP tools register in `shared/registry/mcp.ts`**, not in the route. Each slice exports an `McpTool` (name, schema, `run`) from its own `mcp.ts` and adds one line to that aggregator. `server/routes/mcp.ts` maps over it and knows nothing about any specific tool.

**`api: false, mcp: false` is a legitimate answer.** Audio playback (worship pads) and on-screen displays (stage timer, countdown timer) have no meaningful headless surface. The flags exist for this — inventing endpoints would put dead URLs in the API catalog and the MCP server card.

Aliases: `#registry` → `shared/registry`, `#zeal` → `shared/core`.

Two structural quirks worth knowing before you go looking:

- `dir: { shared: '.shared-convention-unused' }` is deliberate. `shared/` here is a **full Nuxt layer**, not Nuxt 4's framework-free `shared/` convention directory, so that convention is pointed at a dummy path.
- `/` and `/tools/**` are **prerendered** (`routeRules`). Anything that must reach a crawler has to be in the SSR output, not produced on interaction.

`/api/v1` and `/mcp` are **server routes returning JSON**, not pages. Link to them with a plain `<a href>` — `NuxtLink` makes vue-router resolve a nonexistent page and logs *"No match found for location with path /api/v1"*.

## Send to Device (WebRTC + discovery)

Two devices on the same network find each other, then open a data channel
directly. What is decided, not incidental:

- **A browser cannot discover anything by itself.** LocalSend multicasts on
  UDP and listens on port 53317; a page can do neither, and no browser API
  exists for either — that is what the sandbox is for. So something has to
  introduce the two devices. Every browser equivalent works this way
  (ShareDrop uses Firebase). Do not accept a bug report claiming this could be
  done "locally only" without re-reading this paragraph.
- **The switchboard is a relay, not a database.** Nitro's `cloudflare_durable`
  preset exports a Durable Object and routes crossws through it; crossws uses
  `ctx.acceptWebSocket()`, the hibernation API, so idle sockets accrue no
  duration charges. There is **no storage call anywhere** in
  `server/routes/_ws/pair.ts`. Presence is not even known server-side: a device
  announces itself and the others answer directly, so the list is assembled by
  each client.
- **`iceServers: []` still holds, and is the reason the file stays local.** The
  introduction leaves your network; the file cannot. With no STUN or TURN the
  browser offers only host candidates, so no relay exists for the bytes to
  cross — and both devices must therefore be on the same network. Guarantee and
  limitation are one decision.
- **Grouping is by network, not by address — IPv6 has no NAT.** The first
  version hashed the whole `CF-Connecting-IP`, which silently gave every IPv6
  device its own room, because every device has a globally routable address and
  nothing is translated. `networkKey` keeps an IPv4 address whole and cuts IPv6
  to its /64, the block a LAN is delegated. Measured before the fix: one machine
  got two different rooms over IPv4 and IPv6. **A device on IPv4 still cannot
  see one on IPv6** — that is not solvable from the address, and the UI shows a
  short network id so the mismatch is visible rather than mysterious.
- **The room lives in the socket URL, not in memory.** A hibernated Durable
  Object keeps only a socket's id and URL — `peer.context` and `peer.topics` do
  not survive, and the request headers are long gone. So the client fetches its
  room from `/_pair/room` and names it when connecting; `upgrade()` re-derives
  it from `CF-Connecting-IP` and refuses a mismatch. **That check is the
  security boundary**, not the secrecy of the hash.
- **Consent is mandatory, because rooms are grouped by public address.** On an
  office or café network, strangers appear in the list. Nothing is ever
  accepted automatically, and dismissing the prompt declines. Filenames are
  attacker-controlled and shown pre-consent, so `cleanName` strips control
  characters and path separators and bounds the length — all under test.
- **An open WebSocket disqualifies the page from bfcache.** Lighthouse's
  `bf-cache` audit fails and cannot pass while discovery is live. Everything
  else stays 100.

Verified against the built output with two browser contexts: discovery with no
interaction, consent prompt, 12 MB transferred SHA-256 identical, decline
reported back to the sender, and departure clearing the list.

## Image tools (compressor, EXIF viewer, favicon generator)

Three slices share the same shape: the browser does the pixels, `core/` owns
the arithmetic and the file formats. Facts that were measured, not assumed:

- **A canvas cannot encode AVIF.** `toBlob` returns null for it in Chrome, so
  only WebP, JPEG and PNG are offered. **HEIC cannot be decoded** anywhere but
  Safari, so it is not accepted as input — a format that works for some
  visitors and silently fails for the rest is worse than an honest omission.
- **`createImageBitmap` cannot decode SVG in Chrome**, which is exactly the
  format people have their logo in. The favicon generator decodes through an
  `<img>` element instead, and assumes a square when a viewBox-only SVG reports
  a natural size of zero.
- **Downscaling halves repeatedly.** One big jump makes the browser sample
  roughly one pixel in ten; stepping down lets each pass average what it
  discards. Do not "simplify" this back to a single drawImage.
- **Metadata stripping is lossless and must stay so.** JPEG and PNG are
  containers: the compressed image sits in its own segments and the metadata
  beside it, so the image segments are copied through verbatim. Verified on a
  real 5.6 MB photograph — image data identical in length and SHA-256. The
  colour profile is deliberately kept in both formats; it describes how to
  render the pixels, not who took them.
- **`shared/core/zip.ts` is stored-only, never deflated** — the payloads are
  already-compressed images, where deflate buys nothing and would cost a
  dependency. Output is checked by the system `unzip`, and read back in tests
  by a reader written independently of the writer.
- **ICO entries are PNG-compressed**, which every current browser reads;
  `file(1)` confirms the output as "MS Windows icon resource ... with PNG image
  data". A size of 256 is written as 0 because the dimension field is one byte.

## Design system

Tokens come from the shadcn-vue preset **`aJPg5QW`** (style `reka-nova`, base `stone`, font `geist`), copied verbatim into `app/assets/css/main.css`. This is the **shadcn-vue** preset — the same code decodes to something completely different in the React `shadcn` CLI, so resolve preset codes with `shadcn-vue`, never `shadcn`.

- Use semantic tokens (`bg-card`, `text-muted-foreground`, `border-input`, `bg-primary`), never raw `neutral-*`. There is **no brand accent colour** any more — the old flame orange was removed and every accent is now `primary`/`ring`.
- `--background` is the app shell; `--card` is the content surface. **In dark mode `--background` is darker than `--card`**, so a `bg-background` element inside the card renders as a hole. The nova fix is to keep `bg-background` and add a `dark:` override (`dark:bg-input/30`) — what `Button` (outline) and `TabsTrigger` do.
- Inputs follow nova: `bg-transparent dark:bg-input/30`, plus `disabled:bg-input/50 dark:disabled:bg-input/80`.
- Long-form sections (how-to, concepts, FAQ, API docs) sit in `rounded-2xl bg-muted/50 p-6 sm:p-8`.

**Dark mode is class-based**, not `prefers-color-scheme`. `@custom-variant dark (&:is(.dark *))` means every `dark:` utility keys off `.dark` on `<html>`. An inline pre-paint script in `nuxt.config.ts` sets that class before first paint — essential, because the pages are prerendered and without it dark users get a white flash. `useColorMode()` owns `light | dark | system` and persists to `localStorage` under `zeal-theme`; the script's key and the composable's must stay in sync.

Two Tailwind v4 traps, both of which have already caused bugs here:

- **`scale`/`translate`/`rotate` are standalone CSS properties**, not `transform`. So `-translate-x-1/2` *stacks on top of* a library's `transform: translate(...)` instead of overriding it — that double-offset the ColorPicker thumbs. Assert on `getComputedStyle(el).scale`, not `.transform`.
- **Variant order decides the winner at equal specificity.** Tailwind emits `dark:*` after `data-[state=*]:*`, so `dark:bg-input/30` beat `data-[state=checked]:bg-primary` and checkboxes looked unchecked in dark mode. When a state style must survive dark mode, add the dark-scoped pair (`dark:data-[state=checked]:bg-primary`). Verify by comparing byte offsets in the built CSS.

CSS vars in arbitrary values use parens in v4: `w-(--reka-popper-anchor-width)` fits a popover to its trigger.

## reka-ui patterns

The UI primitives in `shared/app/components/ui/` wrap reka-ui in the shadcn-vue style. All form controls go through them — never a native OS popup where a reka primitive exists (use `ColorPicker`, not a bare `<input type="color">`, and keep a hex text input beside pickers). Components register by bare filename (`pathPrefix: false` in the layer config).

Behaviours learned the hard way:

- **Keeping content in the DOM while collapsed:** `:unmount-on-hide="false"` on the root (`FaqSection` uses it so FAQ answers stay crawlable). Do **not** use `force-mount` — it bypasses reka's Presence, which zeroes `--reka-accordion-content-height` and kills the collapse animation.
- **Inside a Dialog use `Listbox*`, not `Combobox*`.** A forced-open `ComboboxRoot` registers a dismissable layer that outranks the Dialog's, so Escape stops closing the modal (the keydown still reaches `window` un-prevented — it's reka's layer stack, not DOM propagation). `SearchPalette` uses `ListboxRoot`/`ListboxFilter`/`ListboxContent`/`ListboxItem`, matching shadcn-vue's `Command`.
- Accordion animation relies on `--reka-accordion-content-height` with the `accordion-down`/`accordion-up` keyframes in `main.css`. A `grid-template-rows: 0fr → 1fr` tween does **not** interpolate here — it jumps on the first frame.
- **Reka positions its own thumbs.** `ColorAreaThumb` and slider thumbs already set `position`/`left`/`top`/`transform`; don't add `absolute` or `-translate-*`.
- The shadcn-vue registry is reachable — when in doubt about a component's canonical classes, fetch `https://www.shadcn-vue.com/r/styles/reka-nova/<name>.json` rather than guessing.

## Layout

`app/layouts/default.vue` is an app shell: a fixed-height flex row of `SiteSidebar` + a scrolling content card.

The card's `relative` class is **load-bearing**. `.sr-only` is `position: absolute`, and `overflow` only clips absolutely-positioned descendants whose containing block is inside it. Without `relative`, the sr-only file input escapes to the initial containing block and stretches the document into a second scrollbar. Don't remove it as tidy-up.

The sidebar is an inline column at `lg+` and a reka Dialog drawer below it, both rendering `SiteSidebarNav` so there is one nav definition.

## Accessibility (WCAG 2.2 AA, both themes)

Non-negotiable bar: keyboard-complete, `aria-live` result announcements, visible focus rings, 44px touch targets, `prefers-reduced-motion` respected (the global rule in `main.css` neutralises animation/transition durations).

Rules that come from real defects found here:

- **The skip link must be the first focusable element** — before `SiteSidebar` in the DOM, not inside the content card, or keyboard users tab the whole nav first. It needs `focus:fixed` (it sits outside the positioned card) and its target needs `tabindex="-1"`, otherwise browsers scroll without moving focus and the next Tab walks back into the nav.
- **Never wrap a reka control in `<label>`.** Reka renders `<button role="checkbox">`, and `<button>` is labelable, so an ancestor label can re-forward the click and double-toggle (Chromium doesn't; other engines do). Always `<Checkbox id="x">` + `<Label for="x">`.
- Every input needs a programmatic name, including visually hidden ones — a bare `<input type="file" class="sr-only">` fails `label`, and reka sliders need an explicit `aria-label`.
- Collapsed disclosure content should stay in the DOM via `unmountOnHide`, which marks it `hidden` — crawlable *and* correctly hidden from assistive tech. Do not hand-roll a "visually hidden but exposed" collapse.
- Check contrast for **generated** colour too, not just tokens — shiki's vitesse comment colour fails contrast on `bg-muted`.

Verify with Lighthouse (below) or axe. **Both the homepage and tool pages score 100** — treat any regression as a real defect, not a known issue.

Two fixes worth not undoing: `Slider.vue` forwards its `aria-label` down to `SliderThumb` (the element with `role="slider"` — a label on the root names nothing), and `highlightCode` post-processes shiki's comment colour, which fails AA on `bg-muted` at 2.14:1 light / 3.26:1 dark.

## Performance

Budget discipline matters more than micro-optimisation here — the pages are prerendered and served from Workers.

- **Keep heavy work out of the client bundle.** `CodeBlock.vue` highlights with shiki at prerender time only; the `import.meta.server` guard is what drops it from the client build (verified: 0 client chunks reference shiki). Same pattern for anything similar. Verify with `grep -rl shiki .output/public/_nuxt/`.
- Shiki uses the fine-grained bundle (`shiki/core`, bash + json grammars, vitesse-light/dark) with the **JavaScript regex engine**, not Oniguruma. Adding a language means an import in `shared/app/utils/highlight.ts` plus widening `CodeLang`.
- That used to mean **no WASM reached the Workers runtime**, and it no longer does: the Worker now carries a 467 kB `onig-*.wasm`, and it appeared when `nuxt-og-image` was added (449 → 618 kB gz). What is verified: the chunk is reached from `CodeBlock` via `shiki`, our highlighter config is still correct (`shiki/core` + `createJavaScriptRegexEngine`, no oniguruma requested), and `nitro.experimental.wasm: false` does not drop it. What is *not* pinned down is the exact interaction that makes the optional oniguruma engine survive bundling. A clean before/after is no longer buildable, since every page now calls `defineOgImageComponent`. Anyone reducing Worker size should start here, and start by reproducing the comparison on a branch.
- Fonts are **self-hosted** via `@fontsource-variable/geist{,-mono}`. Don't reintroduce a Google Fonts `@import` — it's a render-blocking third-party request on a Workers-served site.
- **Per-tool code splitting is a hard requirement.** A tool's UI and core must never land in the shared baseline. Verify per route by counting only `rel="modulepreload"` (blocking) — `rel="prefetch"` is idle-time and doesn't count:

  ```bash
  grep -o 'rel="modulepreload"[^>]*href="/_nuxt/[^"]*"' .output/public/tools/<slug>/index.html
  ```

  Current split: ~307 KiB blocking shared, +174 KiB only on the QR route (tool UI + encoder in their own chunks).
- **Anything used on interaction, not on load, must be deferred** — render it via `Lazy<Component>` behind a `v-if` latch so its chunk becomes `prefetch` rather than `modulepreload`. `SearchPalette` does this: the ⌘K/"/" listener lives in `shared/app/plugins/search-shortcut.client.ts` so the palette's reka Dialog + Listbox + fuzzy chunk only loads on first open. Keeping a listener inside a component forces its chunk onto every page.
- Prerendered routes never execute the Nitro renderer, so anything render-only (shiki, the OG renderer) is dead weight in the Worker bundle. Measured: **449 kB gz before `nuxt-og-image`, 621 kB gz after**. Harmless at runtime because it sits behind dynamic imports; move it to a build script if the Worker ever nears the size limit.

Running Lighthouse:

```bash
pnpm build
cd .output/public && python3 -m http.server 4599 &     # or: pnpm preview (wrangler)
CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  pnpm dlx lighthouse@latest http://localhost:4599/ --quiet \
  --only-categories=performance,accessibility,best-practices,seo --output=json
```

**Read performance scores from `http.server` with suspicion** — it ignores `_headers`, so there's no compression, caching, or HTTP/2, and FCP/LCP come out far worse than production. Use `pnpm preview` (wrangler) for a realistic number; that is the same runtime you deploy to.

Baseline on `pnpm preview`, mobile: **perf 91 · a11y 100 · best-practices 100 · SEO 100**, CLS 0.028, TBT ~100 ms, ~65 KiB unused JS. Production measured 83/89 before the CLS and a11y work.

## Agent discovery

Agents are a first-class audience, not an afterthought — every tool is meant to
be callable without a browser. These surfaces all derive from the registry, so
a new tool advertises itself automatically:

| Surface | Route | Spec |
|---|---|---|
| Agent guide | `/llms.txt` | llmstxt.org (served as `text/markdown`) |
| API catalog | `/.well-known/api-catalog` | RFC 9727 linkset (RFC 9264) |
| MCP server card | `/.well-known/mcp/server-card.json` | SEP-1649 |
| Link headers | `/`, `/tools/**`, `/api/**` | RFC 8288 |
| Content Signals | `robots.txt` | contentsignals.org |

- Nitro **does** serve `server/routes/.well-known/**` — dot-directories are not skipped.
- `llms.txt` must be **Markdown, served as `text/markdown`**. Validators reject `text/plain` as "not a Markdown file" even when the body is valid Markdown with an H1. Keep the shape llmstxt.org specifies: one H1 first, a `>` blockquote summary, then H2 sections whose entries are all `- [name](url): description`.
- `robots.txt` takes only `User-agent` / `Allow` / `Disallow` / `Sitemap` as directives. Anything else (an `LLM-Content:` line, for instance) fails Lighthouse's `robots-txt` audit and costs 8 SEO points. Put pointers in `#` comments.
- Content-Signal is currently `ai-train=yes, search=yes, ai-input=yes`, matching the MIT/open-source stance. It is a **policy** choice — flip it if that changes.
- **Do not publish OAuth/OIDC discovery, `oauth-protected-resource`, or `auth.md`.** This site has no authentication by design; advertising auth endpoints that don't exist is worse than the missing-metadata warning some scanners show. The MCP card states `authentication: none` deliberately.
- Verify content types with `curl -s -D -` (GET). `curl -I` sends HEAD and reports `application/json` for everything, which looks like a bug and isn't.

## URL state (shareability)

- Tool state is schema-driven via `useToolState` (`shared/core/url-state.ts`). Fields marked `secret: true` (e.g. WiFi password) are excluded from URLs **by schema**, both directions — never rely on discipline.
- Hydrate from **the router's parsed query** (`useRoute().query`), never `window.location` — the latter races trailing-slash/history normalisation and breaks silently.
- On mount, merge only params actually present (`decodePresentState`) so programmatic presets survive.
- Variant pages preset their tab as the **schema default** (`useQr({ defaultTab: 'wifi' })`), not a post-hoc assignment — keeps the preset out of share URLs and survives hydration.

## SEO

**One URL form, and it is the slashless one.** `assets.html_handling` is set to
`drop-trailing-slash` in `wrangler.jsonc`. Cloudflare's default
(`auto-trailing-slash`) served `/tools/foo/` and 307'd `/tools/foo` — which is
precisely the URL every canonical, `og:url`, JSON-LD `@id` and sitemap entry
points at, so we were handing Google a canonical that redirected. Search
Console reported it as *"Alternate page with proper canonical tag"*. The root
is the one path that keeps its slash.

**www and http are not handled in code and cannot be.** Static assets are
served before the Worker runs, so a redirect in Nitro never executes for a
prerendered page. `zeal.tools` and `www.zeal.tools`, over both http and https,
all return 200 with identical HTML — four URLs per page. Fixing it needs two
zone-level settings in the Cloudflare dashboard (a Redirect Rule for the
hostname, and Always Use HTTPS); there is no wrangler config for either. If a
duplicate-content report reappears, check those before touching the code.



- Long-tail variant pages are the growth strategy: unique title/h1/meta/FAQ/content per page (`/wifi`, `/vcard`, `/email`). Only add a variant with genuinely distinct copy, and register it in `meta.variants`.
- Hand-rolled, no `@nuxtjs/seo`: `useSeoMeta` + JSON-LD via `useHead` (WebApplication / FAQPage / HowTo / Breadcrumb), server routes for `sitemap.xml` and `robots.txt`.
- `titleTemplate` lives in `app/app.vue` — functions don't serialise from `nuxt.config`.
- OG images come from **`nuxt-og-image`**, rendered by satori at build time and written out as static PNGs — one per page, so every tool and variant gets its own card. There is no runtime renderer in the Worker and nothing to run by hand; a page opts in with `defineOgImageComponent('Default', { title, description })` and the card lives in `app/components/OgImage/Default.satori.vue`.
- That component is rendered by **satori, not a browser**: plain flex, explicit hex colours, no CSS variables and no theme tokens. Its font is Geist rather than the site's pixel display face — v6 has no option to hand satori a font file (families resolve via `@nuxt/fonts` or a Google Fonts lookup), and passing a buffer through `satoriOptions` fails because binary does not survive the trip into the prerender runtime.

## Analytics

Typed events via `useAnalytics()` **only** — no ad-hoc capture calls. Cookieless by configuration: autocapture off, session recording off, `person_profiles: 'never'`, lazy-loaded. The PostHog public key is committed in `runtimeConfig`; override or disable with `NUXT_PUBLIC_POSTHOG_KEY`. Events: `tool_viewed`, `tool_completed {tool, format}` (north star), `share_clicked {tool, channel}`, `search_performed`, `search_zero_results`.

## API + MCP

- REST routes are colocated in the slice. No API keys ever; light per-IP rate limiting via `enforceRateLimit` (`shared/server/utils/zeal.ts`, 120/min) with honest error messages.
- Every user-supplied colour or string that reaches SVG goes through `sanitizeColor` / attribute escaping in the renderer.
- Styled output over the API returns SVG (full fidelity); the server-side PNG variant renders plain squares only — the browser rasterises the SVG, keeping one source of truth.
- `server/routes/mcp.ts` is a hand-rolled stateless Streamable-HTTP JSON-RPC server (protocol 2025-06-18): initialize / ping / tools/list / tools/call, notifications → 202. The tool list derives from registry `mcp: true`. Keep it zero-dep, and throw `JsonRpcError` rather than object literals so the error `message` survives serialisation.

## Testing

Vitest, `environment: 'node'`, matching `shared/**/*.test.ts` and `tools/**/*.test.ts`, colocated beside the code they cover.

Credibility for a self-written core comes from proof, not assertion:

- Round-trip against an **independent decoder held as a devDependency only** (QR uses `jsqr`): encode → rasterize → decode → must equal input.
- Golden vectors from the spec plus structural invariants; for QR specifically all EC levels, forced masks 0–7, numeric/alphanumeric/byte modes, small and large versions.
- Styled-output scannability is browser-verified across patterns × gradients × matched eye pairs. Mismatched exotic eye combos may fail jsQR (real scanners are laxer) but the UI must say "test-scan".
- The chosen EC level is a **minimum** — always pass `boostEc: true` from the UI; the free redundancy makes styled patterns scan reliably.
- For browser checks, drive the built output with `playwright-core` (already a devDependency) against `pnpm preview` or a static server. Note posthog-js drops events from a HeadlessChrome UA — override the UA when testing analytics.
