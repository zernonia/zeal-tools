import type { HighlighterCore } from 'shiki/core'

export type CodeLang = 'bash' | 'json'

let highlighter: Promise<HighlighterCore> | null = null

/**
 * Fine-grained shiki bundle — only the grammars and themes we actually use,
 * and the JavaScript regex engine so no WASM is needed on the Workers target.
 */
function loadHighlighter() {
  highlighter ??= (async () => {
    const { createHighlighterCore } = await import('shiki/core')
    const { createJavaScriptRegexEngine } = await import('shiki/engine/javascript')
    return createHighlighterCore({
      themes: [
        import('shiki/themes/vitesse-light.mjs'),
        import('shiki/themes/vitesse-dark.mjs'),
      ],
      langs: [
        import('shiki/langs/bash.mjs'),
        import('shiki/langs/json.mjs'),
      ],
      engine: createJavaScriptRegexEngine(),
    })
  })()
  return highlighter
}

/**
 * Server-only by design: every page carrying a snippet is prerendered, so the
 * highlighted markup travels in the payload and shiki never reaches the client
 * bundle. `import.meta.server` is statically false in the client build, so the
 * dynamic imports below are dropped entirely.
 */
export async function highlightCode(code: string, lang: CodeLang): Promise<string> {
  if (!import.meta.server)
    return ''

  const hl = await loadHighlighter()
  return hl.codeToHtml(code.trim(), {
    lang,
    // Emits --shiki-light / --shiki-dark custom properties instead of baked
    // colours, which is what lets one render serve both themes.
    themes: { light: 'vitesse-light', dark: 'vitesse-dark' },
    defaultColor: false,
  })
}

/** Stable across server and client so the payload is reused, not refetched. */
export function codeKey(code: string, lang: CodeLang): string {
  let hash = 0
  for (let i = 0; i < code.length; i++)
    hash = (Math.imul(31, hash) + code.charCodeAt(i)) | 0
  return `code:${lang}:${(hash >>> 0).toString(36)}`
}
