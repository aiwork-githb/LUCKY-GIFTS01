// Renders frames with headless Chromium in parallel, writes JPEG frames + roulette tick timings.
import { chromium } from 'playwright';
import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
const dir = path.dirname(fileURLToPath(import.meta.url));
const outDir = process.argv[2] || path.join(dir, 'frames');
const only = process.argv[3] ? process.argv[3].split(',').map(Number) : null;
const WORKERS = +(process.env.WORKERS || 4);
fs.mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch();
const url = 'file://' + path.join(dir, 'index.html');
const total = 25 * 30;
const frames = only || [...Array(total).keys()];
let done = 0; const t0 = Date.now();
async function worker(w) {
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  page.on('pageerror', e => { console.error('PAGE ERROR', e); process.exit(1); });
  await page.goto(url);
  await page.evaluate(() => document.fonts.ready);
  if (w === 0) fs.writeFileSync(path.join(dir, 'ticks.json'), JSON.stringify(await page.evaluate(() => ({ ticks: window.TICKS, meta: window.META }))));
  for (let i = w; i < frames.length; i += WORKERS) {
    const f = frames[i];
    const data = await page.evaluate(f => window.frameJPEG(f), f);
    fs.writeFileSync(path.join(outDir, `f${String(f).padStart(5, '0')}.jpg`), Buffer.from(data.split(',')[1], 'base64'));
    if (++done % 50 === 0) console.log(`${done}/${frames.length} ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
}
await Promise.all([...Array(Math.min(WORKERS, frames.length)).keys()].map(worker));
await browser.close();
console.log('done', ((Date.now() - t0) / 1000).toFixed(1) + 's');
