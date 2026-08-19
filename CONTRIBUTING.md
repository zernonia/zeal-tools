# Contributing to zeal.tools

## The Zero-Dependency Policy

**Rule:** a tool's core logic ships with **zero runtime npm dependencies**. Framework code (Nuxt/Vue/Tailwind) is the app shell and exempt; devDependencies (Vitest, Playwright, decoders used only in tests) are fine.

Why it's worth it:

1. **Full control of every use case** — no waiting on upstream, no fighting a wrapper's opinions
2. **Isomorphic by construction** — pure functions run identically in browser, server routes, and MCP
3. **Security & trust** — a near-empty `package.json` is auditable in an afternoon; zero supply-chain surface
4. **Bundle size** — you only ship the bytes you wrote

**The honesty clause:** zero-dep is the default, not a suicide pact. Some tools sit on enormous spec surfaces (video transcoding, full PDF rendering, OCR). For those, either scope the tool to what we *can* own, or add the exception to the allow-list below with justification. Every exception is a documented, deliberate decision — never a convenience.

### Runtime dependency allow-list

| Package | Tool | Justification |
|---|---|---|
| `onnxruntime-web` | background-remover | Executing a trained neural network is the "enormous spec surface" the honesty clause was written for — an entire ML runtime, not a format we could own. MIT licensed. Kept honest three ways: it sits behind a dynamic `import()`, so it lands in exactly one client chunk and is never preloaded; the pure image maths around it (tensor packing, matte activation, feathering, compositing, trimming, and the promptable-segmentation transforms) is still ours in `core/`, under unit test; and **nothing is vendored** — the weights stream from Hugging Face on first use and the wasm is emitted by the bundler, so there is no copy step to drift out of sync. |

## The Slice Template

Every tool is a self-contained Nuxt layer under `tools/<slug>/`:

```
tools/<slug>/
├── nuxt.config.ts       # layer marker (usually near-empty)
├── meta.ts              # ToolMeta — the ONLY file the outside world reads to know about the tool
├── core/                # ★ pure, isomorphic, zero-dep logic
│   ├── index.ts         #   the ONLY entry to run the tool
│   └── *.test.ts        #   unit tests live beside the code
├── app/
│   ├── pages/tools/<slug>/index.vue     # SEO shell + <ClientOnly> tool
│   ├── components/
│   └── composables/
├── server/api/v1/<slug>/                # REST endpoint (if meta.api) — imports the SAME core/
└── tests/e2e.spec.ts                    # Playwright happy path + axe a11y
```

Then register it: one import line in `shared/registry/index.ts`. Homepage grid, Cmd+K search, sitemap, API index and MCP tool list all derive from the registry automatically.

### Rules that keep slices clean

1. **Slices never import from each other.** Cross-tool code graduates to `shared/`.
2. `core/` **never** imports Vue, DOM APIs, or anything from `app/` — pure functions in, data out. This single rule is what makes UI, API and MCP share one implementation.
3. `meta.ts` is the only way to *know about* a tool; `core/index.ts` the only way to *run* it.
4. Tests are colocated: unit tests beside `core/`, e2e in the slice's `tests/`.

### Every tool must have

- **UX:** zero-click example on load · live results (no Generate button) · smart defaults · sacred download/copy area (no ads, ever) · mobile-first
- **Perf:** own route chunk · heavy code dynamically imported within the slice
- **Programmatic:** pure isomorphic core → API route + MCP registration via meta flags
- **Share:** state-in-URL via `useToolState` (schema marks secrets — they are excluded from URLs by construction) · share bar · OG image
- **SEO:** unique h1/title/meta · tool above the fold · 800+ words of real content below · schema.org (WebApplication + FAQPage + HowTo) · long-tail variant routes
- **A11y (WCAG 2.2 AA):** keyboard-complete · `aria-live` result announcements · AA contrast in light *and* dark · visible focus rings · 44px touch targets
- **Analytics:** typed events via `useAnalytics()` only — no ad-hoc tracking

### Testing a self-written core

The credibility of "we wrote it ourselves" comes from proving it's correct:

- Golden vectors from the spec, plus structural invariant tests
- Property tests: random payloads → encode → **decode with an independent decoder (devDependency only)** → round-trip must equal input
- For the QR encoder specifically: all EC levels, forced masks 0–7, numeric/alphanumeric/byte modes, versions small and large

## Workflow

```bash
pnpm install
pnpm dev
pnpm test          # must pass
pnpm build         # must build clean for cloudflare_module
```

PRs welcome. Keep commits scoped to one slice where possible.
