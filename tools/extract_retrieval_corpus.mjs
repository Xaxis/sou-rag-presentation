/* Write tools/retrieval-corpus.json from the running playground.
 *
 *   node tools/build_site.mjs && npx serve dist -l 8912
 *   node tools/extract_retrieval_corpus.mjs
 *
 * The widget exposes its own chunk texts on window.__ragRetrieval, so what
 * gets embedded is exactly what a visitor sees. Re-run this and
 * export_slide_data.py whenever RETR_DOC or the chunk parameters change.
 * Needs playwright; the output is committed so the site build does not.
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = process.env.PORT || 8912;
const BROWSER = process.env.BROWSER ||
  '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser';

const b = await chromium.launch({ executablePath: BROWSER, headless: true });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto(`http://localhost:${PORT}/play/`, { waitUntil: 'networkidle' });
await p.waitForTimeout(1500);
const data = await p.evaluate(() => window.__ragRetrieval);
if (!data || !data.chunks?.length) throw new Error('playground did not expose its chunks');
fs.writeFileSync(path.join(ROOT, 'tools', 'retrieval-corpus.json'),
                 JSON.stringify(data, null, 1) + '\n');
console.log(`  ${data.chunks.length} chunks, ${data.presets.length} presets -> tools/retrieval-corpus.json`);
await b.close();
