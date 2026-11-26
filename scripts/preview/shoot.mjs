#!/usr/bin/env node
/**
 * Renders docs/preview-*.png from the real client.js inside a mock DSH shell.
 *
 *   node scripts/preview/shoot.mjs
 *
 * The shell markup, colours and class names mirror the host's sidebar so the
 * plugin's own CSS is what you see; only the surrounding conversation is mock.
 * Requires Google Chrome and playwright-core from the DSH installation.
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..', '..');
// Point these at your own Playwright core and Chrome if the defaults miss.
const PLAYWRIGHT = process.env.PLAYWRIGHT_CORE
  || 'D:/Programs/DSH Desktop/dsh-desktop/node_modules/playwright-core/index.mjs';
const CHROME = process.env.CHROME_PATH
  || 'C:/Program Files/Google/Chrome/Application/chrome.exe';

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
};

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1');
  let file;
  if (url.pathname === '/' || url.pathname === '/index.html') file = path.join(here, 'index.html');
  else if (url.pathname === '/client.js') file = path.join(root, 'client.js');
  else if (url.pathname.startsWith('/vendor/')) file = path.join(here, url.pathname);
  else file = path.join(here, url.pathname);
  fs.readFile(file, (err, buf) => {
    if (err) { res.writeHead(404); res.end('not found'); return; }
    res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' });
    res.end(buf);
  });
});

await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const port = server.address().port;
console.log('serving on ' + port);

const { chromium } = await import(pathToFileURL(PLAYWRIGHT).href);
const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const shots = [
  { file: 'preview-docked.png', query: 'mode=docked&lang=zh' },
  { file: 'preview-float.png', query: 'mode=float&lang=zh' },
  { file: 'preview-en.png', query: 'mode=docked&lang=en' },
];

for (const shot of shots) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('http://127.0.0.1:' + port + '/index.html?' + shot.query, { waitUntil: 'load' });
  await page.waitForSelector('.fi-root', { timeout: 5000 });
  await page.waitForTimeout(500);
  const tiles = await page.$$eval('.fi-tile', (nodes) => nodes.map((n) => n.getAttribute('aria-label')));
  const hidden = await page.$$eval('[data-slot="sidebar"] button', (nodes) =>
    nodes.filter((n) => n.style.display === 'none').length);
  const out = path.join(root, 'docs', shot.file);
  await page.screenshot({ path: out });
  console.log(shot.file + ': tiles=' + JSON.stringify(tiles) + ' hidden=' + hidden +
    (errors.length ? ' errors=' + errors.join(' | ') : ''));
  await page.close();
}

await browser.close();
server.close();
console.log('done');
