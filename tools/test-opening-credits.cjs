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
    await page.evaluate(() => showLogo());
    const credits = page.getByRole('region', { name: 'Opening credits' });
    const rows = credits.locator('.credit-reel > div');
    assert.equal(await rows.count(), 18);
    for (const row of await rows.all()) {
      assert.equal(await row.locator('dd').evaluate(element => element.firstChild.textContent), 'Justin Ungerer');
    }
    assert.equal(await credits.locator('.credit-note').textContent(), '(except 1 track)');
    const animation = await credits.locator('.credit-reel').evaluate(reel => {
      const effect = reel.getAnimations()[0].effect;
      return { duration: effect.getTiming().duration, iterations: effect.getTiming().iterations };
    });
    assert.deepEqual(animation, { duration: 84000, iterations: Infinity });
    for (const index of [0, 17]) {
      const position = await credits.evaluate((windowElement, rowIndex) => {
        const reel = windowElement.querySelector('.credit-reel');
        const row = reel.children[rowIndex];
        const animation = reel.getAnimations()[0];
        animation.pause();
        animation.currentTime = 84000 * (windowElement.clientHeight + row.offsetTop +
          row.offsetHeight / 2 - windowElement.clientHeight / 2) /
          (windowElement.clientHeight + reel.offsetHeight);
        const windowBox = windowElement.getBoundingClientRect();
        const rowBox = row.getBoundingClientRect();
        return { center: rowBox.top + rowBox.height / 2, windowCenter: windowBox.top + windowBox.height / 2 };
      }, index);
      assert.ok(Math.abs(position.center - position.windowCenter) < 2);
    }

    await page.emulateMedia({ reducedMotion: 'reduce' });
    assert.equal(await credits.locator('.credit-reel').evaluate(reel => reel.getAnimations().length), 0);
    const scroll = await credits.evaluate(element => {
      element.scrollTop = element.scrollHeight;
      return { scrollTop: element.scrollTop, max: element.scrollHeight - element.clientHeight };
    });
    assert.ok(scroll.max > 0 && Math.abs(scroll.scrollTop - scroll.max) <= 1);
    await page.locator('#logo-begin').tap();
    assert.match(await page.locator('.opening-film video').getAttribute('src'), /opening\.mp4/);
    console.log('PASS: 84-second credits, names, reduced motion, and immediate Begin.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
