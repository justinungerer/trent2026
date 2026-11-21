'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { webkit } = require('playwright');

const root = path.resolve(__dirname, '..');

(async () => {
  const browser = await webkit.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    await page.route('http://localhost/**', route => {
      const pathname = new URL(route.request().url()).pathname;
      const file = path.join(root, pathname.endsWith('/') ? pathname + 'index.html' : pathname);
      if (/\.(mp3|mp4|wav)$/.test(pathname)) return route.fulfill({ status: 204 });
      return fs.existsSync(file) ? route.fulfill({ path: file }) : route.fulfill({ status: 404 });
    });
    await page.goto('http://localhost/');
    const help = page.locator('#start-rules');
    const start = page.locator('#campaign-start');
    const password = page.locator('#pin');
    assert.ok((await help.boundingBox()).y < (await password.boundingBox()).y);
    assert.ok((await password.boundingBox()).y < (await start.boundingBox()).y);
    await help.tap();
    const rules = page.getByRole('dialog', { name: 'How to play' });
    assert.match(await rules.textContent(), /ten chapters, each with its own unique minigame/i);
    assert.match(await rules.textContent(), /three levels of increasing difficulty/i);
    await rules.getByRole('button', { name: 'Close' }).tap();
    assert.equal(await page.evaluate(() => document.activeElement.id), 'start-rules');
    await password.fill('NIGHT');
    await password.press('Enter');
    await page.getByRole('heading', { name: 'Chapter menu' }).waitFor();
    await page.evaluate(() => showStart());
    await password.fill('');
    await start.tap();
    assert.match(await page.locator('.opening-film video').getAttribute('src'), /cast\.mp4/);
    console.log('PASS: start screen order, setup text, focus, password submission, and new game.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
