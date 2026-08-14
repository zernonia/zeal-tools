# zeal.tools

> **Free tools, made with zeal.**
> No sign-ups, no watermarks, no nonsense. Every tool usable three ways: **UI · REST API · MCP.**

The web is full of bad utility tools — ad-stuffed QR generators, watermarked outputs, forced sign-ups. zeal.tools is the antidote: fast, clean, open-source tools that actually work, each one also callable programmatically.

## The zero-dependency story

**Every tool's core logic ships with zero runtime npm dependencies.** Open `package.json`: the app shell is Nuxt + Tailwind, and that's it. The QR encoder is our own from-scratch implementation of ISO/IEC 18004 — segment encoding, Reed–Solomon error correction over GF(256), all 8 mask patterns with penalty scoring. Even the server-side PNG writer is ours.

Why bother?

1. **Auditable in an afternoon** — a tool site asks for your WiFi passwords and contact details; you should be able to read every line that touches them. There's no supply chain here to attack.
2. **Isomorphic by construction** — pure functions with no DOM or npm baggage run identically in your browser, in Cloudflare Workers, and behind the MCP endpoint. One implementation, three surfaces.
3. **Verified, not vibes** — every build round-trips thousands of payloads through an *independent* decoder (a devDependency, never shipped) across all QR versions, error-correction levels, and masks.

## The Zeal Promise

On every tool, non-negotiable:

- ✅ No sign-up — ever
- ✅ No watermarks on any output
- ✅ No ads near the download action
- ✅ Works fully on mobile
- ✅ Privacy-first: client-side processing wherever possible
- ✅ Open source (MIT) — audit it, contribute, self-host
- ✅ Zero runtime dependencies in tool logic

## Three ways to use every tool

**UI** — [zeal.tools](https://zeal.tools)

**REST API** — no key, no sign-up:

```bash
curl -X POST https://zeal.tools/api/v1/qr \
  -H 'content-type: application/json' \
  -d '{"data": "https://zeal.tools"}'          # → SVG

curl 'https://zeal.tools/api/v1/qr?data=hello&format=png' -o qr.png
```

**MCP** — add to any MCP client (Claude, IDEs, agents):

```json
{ "mcpServers": { "zeal-tools": { "url": "https://zeal.tools/mcp" } } }
```

## Architecture

One Nuxt 4 app, composed from **domain slices via Nuxt Layers**. Everything belonging to a tool lives in one folder:

```
tools/qr-code-generator/
├── meta.ts          # registry entry: name, keywords, api/mcp flags
├── core/            # ★ pure, isomorphic, ZERO-DEP logic + unit tests
├── app/             # pages, components, composables (this slice only)
└── server/          # REST endpoint — imports the SAME core/
```

Adding a tool = adding a folder (+ one line in `shared/registry`). Deleting a tool = deleting a folder. Slices never import from each other; shared code graduates to `shared/`. See [CONTRIBUTING.md](CONTRIBUTING.md) for the full slice template.

## Development

```bash
pnpm install
pnpm dev             # local dev server
pnpm test            # unit tests (incl. encoder round-trip verification)
pnpm build           # build for Cloudflare Workers
pnpm preview         # wrangler dev against the real Workers runtime
pnpm deploy          # wrangler deploy
```

## License

[MIT](LICENSE) — built with zeal.
