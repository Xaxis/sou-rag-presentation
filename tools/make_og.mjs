/* Render the social card to site/og.png.
 *
 *   node tools/make_og.mjs
 *
 * Run this locally when the card design changes; the PNG is committed and the
 * site build just copies it. Vercel never needs a browser.
 * Requires playwright and a local server on :8912 serving dist/.
 */
import { chromium } from 'playwright';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = process.env.PORT || 8912;
const BROWSER = process.env.BROWSER ||
  '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser';

const b = await chromium.launch({ executablePath: BROWSER, headless: true });
// Pin the scheme: without it the card inherits whatever the rendering machine's
// OS is set to, and the committed PNG would flip between light and dark
// depending on who re-rendered it.
const p = await b.newPage({
  viewport: { width: 1200, height: 630 },
  deviceScaleFactor: 1,
  colorScheme: 'dark',
});
await p.goto(`http://localhost:${PORT}/og.html`, { waitUntil: 'networkidle' });
// let the point cloud settle and a retrieval event fire
await p.waitForTimeout(3400);
await p.screenshot({ path: path.join(ROOT, 'site', 'og.png') });
console.log('wrote site/og.png (1200x630)');
console.log('the retrieval event fires at a random point - look at the card before');
console.log('committing it, and re-run if the glow has landed on the wordmark.');
await b.close();
