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

pnpm enforces a supply-chain policy (`pnpm-workspace.yaml`). `semver@6.3.1` is exempted via `trustPolicyExclude` because the 6.x line predates npm trusted publishing; it arrives transitively through `nuxt → @vitejs/plugin-vue-jsx → @babel/core`. Don't widen that list without the same kind of justification.

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

Slices never import from each other — cross-tool code graduates to `shared/`. `meta.ts` is the only file the outside world reads to *know about* a tool; `core/index.ts` the only entry to *run* it.

Aliases: `#registry` → `shared/registry`, `#zeal` → `shared/core`.

Two structural quirks worth knowing before you go looking:

- `dir: { shared: '.shared-convention-unused' }` is deliberate. `shared/` here is a **full Nuxt layer**, not Nuxt 4's framework-free `shared/` convention directory, so that convention is pointed at a dummy path.
- `/` and `/tools/**` are **prerendered** (`routeRules`). Anything that must reach a crawler has to be in the SSR output, not produced on interaction.

`/api/v1` and `/mcp` are **server routes returning JSON**, not pages. Link to them with a plain `<a href>` — `NuxtLink` makes vue-router resolve a nonexistent page and logs *"No match found for location with path /api/v1"*.

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

Verify with Lighthouse (below) or axe; the homepage currently scores 100.

**Known open a11y failures on tool pages** (don't rediscover them as new): missing label on `#qr-logo`, missing accessible name on the reka slider thumb, and shiki comment-token contrast.

## Performance

Budget discipline matters more than micro-optimisation here — the pages are prerendered and served from Workers.

- **Keep heavy work out of the client bundle.** `CodeBlock.vue` highlights with shiki at prerender time only; the `import.meta.server` guard is what drops it from the client build (verified: 0 client chunks reference shiki). Same pattern for anything similar. Verify with `grep -rl shiki .output/public/_nuxt/`.
- Shiki uses the fine-grained bundle (`shiki/core`, bash + json grammars, vitesse-light/dark) with the **JavaScript regex engine**, not Oniguruma, so no WASM reaches the Workers runtime. Adding a language means an import in `shared/app/utils/highlight.ts` plus widening `CodeLang`.
- Fonts are **self-hosted** via `@fontsource-variable/geist{,-mono}`. Don't reintroduce a Google Fonts `@import` — it's a render-blocking third-party request on a Workers-served site.
- Heavy per-tool code is dynamically imported inside its slice so each route keeps its own chunk.

Running Lighthouse:

```bash
pnpm build
cd .output/public && python3 -m http.server 4599 &     # or: pnpm preview (wrangler)
CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  pnpm dlx lighthouse@latest http://localhost:4599/ --quiet \
  --only-categories=performance,accessibility,best-practices,seo --output=json
```

**Read performance scores from `http.server` with suspicion** — it ignores `_headers`, so there's no compression, caching, or HTTP/2, and FCP/LCP come out far worse than production. Use `pnpm preview` for a realistic number. Current baseline: perf 61–71, a11y 89–100, best-practices 100, SEO 100; CLS 0–0.079, TBT 10–60ms; the one real signal is **211–286 KiB of unused JS**.

## URL state (shareability)

- Tool state is schema-driven via `useToolState` (`shared/core/url-state.ts`). Fields marked `secret: true` (e.g. WiFi password) are excluded from URLs **by schema**, both directions — never rely on discipline.
- Hydrate from **the router's parsed query** (`useRoute().query`), never `window.location` — the latter races trailing-slash/history normalisation and breaks silently.
- On mount, merge only params actually present (`decodePresentState`) so programmatic presets survive.
- Variant pages preset their tab as the **schema default** (`useQr({ defaultTab: 'wifi' })`), not a post-hoc assignment — keeps the preset out of share URLs and survives hydration.

## SEO

- Long-tail variant pages are the growth strategy: unique title/h1/meta/FAQ/content per page (`/wifi`, `/vcard`, `/email`). Only add a variant with genuinely distinct copy, and register it in `meta.variants`.
- Hand-rolled, no `@nuxtjs/seo`: `useSeoMeta` + JSON-LD via `useHead` (WebApplication / FAQPage / HowTo / Breadcrumb), server routes for `sitemap.xml` and `robots.txt`.
- `titleTemplate` lives in `app/app.vue` — functions don't serialise from `nuxt.config`.
- OG image `public/og.png` is generated by `node --experimental-strip-types scripts/generate-og.mts` using our own PNG writer, a pixel font, and a real scannable QR. Keep the encoder erasable-syntax-only (no parameter properties) so strip-types keeps working.

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
