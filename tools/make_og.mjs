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
const p = await b.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
await p.goto(`http://localhost:${PORT}/og.html`, { waitUntil: 'networkidle' });
// let the point cloud settle and a retrieval event fire
await p.waitForTimeout(3400);
await p.screenshot({ path: path.join(ROOT, 'site', 'og.png') });
console.log('wrote site/og.png (1200x630)');
await b.close();
