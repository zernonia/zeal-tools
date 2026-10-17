/**
 * Screenshots of every tool, in both themes, for the blog's tool cards.
 *
 * The blog shows what a tool actually looks like, so these go stale when a
 * tool's UI changes — rerun this then. It drives the built site rather than
 * the dev server, because dev pages carry Vite's overlay and unoptimised
 * fonts:
 *
 *   pnpm build
 *   (cd .output/public && python3 -m http.server 4599) &
 *   node scripts/capture-tool-screenshots.mjs
 *
 * Writes public/blog/tools/<slug>-{light,dark}.jpg. JPEG rather than PNG
 * because these are UI with soft shadows and text, where q82 is visually
 * clean at roughly a fifth of the size.
 */
import { existsSync, mkdirSync, readdirSync } from 'node:fs'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright-core'

const BASE = process.env.BASE_URL ?? 'http://localhost:4599'
const CHROME = process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const OUT = fileURLToPath(new URL('../public/blog/tools/', import.meta.url))
/** Tall enough for the tool and its header, short enough to read as a card. */
const MAX_HEIGHT = 760

// Only real slices — Finder drops a .DS_Store in here, which would 404.
const toolsDir = fileURLToPath(new URL('../tools/', import.meta.url))
const slugs = readdirSync(toolsDir).filter(name => existsSync(`${toolsDir}${name}/meta.ts`))
mkdirSync(OUT, { recursive: true })

const browser = await chromium.launch({ executablePath: CHROME })
for (const theme of ['light', 'dark']) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 1000 }, colorScheme: theme })
  // The pre-paint script reads this key, so the page renders in the theme
  // from its first frame instead of flashing and settling.
  await context.addInitScript((t) => {
    try {
      localStorage.setItem('zeal-theme', t)
    }
    catch {}
  }, theme)
  for (const slug of slugs) {
    const page = await context.newPage()
    await page.goto(`${BASE}/tools/${slug}/`, { waitUntil: 'load' })
    await page.evaluate(async () => {
      await document.fonts.ready
    })
    // Hydration, then any zero-click example the tool renders on load.
    await page.waitForTimeout(1200)
    const box = await page.locator('main > div').first().boundingBox()
    if (!box)
      throw new Error(`No content box on /tools/${slug}`)
    await page.screenshot({
      path: `${OUT}${slug}-${theme}.jpg`,
      type: 'jpeg',
      quality: 82,
      clip: { x: box.x, y: box.y, width: box.width, height: Math.min(box.height, MAX_HEIGHT) },
    })
    await page.close()
    console.log(theme, slug)
  }
  await context.close()
}
await browser.close()
