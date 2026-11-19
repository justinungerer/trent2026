const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { webkit } = require('playwright');
const root = path.resolve(__dirname, '..');
const hooks = fs.readFileSync(path.join(__dirname, 'test-chimney-expansion.cjs'), 'utf8').split('hook=String.raw`')[1].split('`;')[0];

(async () => {
  const browser = await webkit.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => { window.requestAnimationFrame = () => 0; });
    await page.route('http://localhost/**', route => {
      const pathname = new URL(route.request().url()).pathname;
      const file = path.join(root, pathname.endsWith('/') ? pathname + 'index.html' : pathname);
      if (pathname.endsWith('/chimney-road/game.js')) return route.fulfill({
        contentType: 'application/javascript',
        body: fs.readFileSync(file, 'utf8').replace(/\}\)\(\);\s*$/, hooks + '\nwindow.menuFightState=()=>({state,mode:fight.state().mode,gunfire:!!gunfire});\n})();')
      });
      if (/\.(mp3|mp4|wav)$/.test(pathname)) return route.fulfill({ status: 204 });
      return fs.existsSync(file) ? route.fulfill({ path: file }) : route.fulfill({ status: 404 });
    });
    await page.goto('http://localhost/');
    await page.evaluate(() => showChapterMenu(9, false, false));
    assert.equal(await page.locator('.chapter-final-fight').isDisabled(), true);
    assert.equal(await page.locator('.chapter-final-fight').textContent(), '—');
    await page.evaluate(() => showChapterMenu(10, false, false));
    assert.equal(await page.getByRole('button', { name: 'Final fight only · The Chimney Road', exact: true }).count(), 1);
    assert.equal(await page.locator('.chapter-level').count(), 0);
    const savedPin = await page.evaluate(() => localStorage.getItem(PIN_KEY));
    await page.locator('.chapter-final-fight').click();
    assert.equal(await page.locator('#turn-gate').isVisible(), true);
    await page.setViewportSize({ width: 844, height: 390 });
    await page.waitForFunction(() => document.querySelector('#game').src.includes('stage=final-fight'), null, { polling: 50 });
    const frame = page.frameLocator('#game');
    await frame.locator('#box-start').waitFor();
    assert.equal(await frame.locator('#box-title').textContent(), 'Hitler guards the sleigh');
    assert.equal(await frame.locator('#start-sheet').isVisible(), false);
    assert.deepEqual(await page.frames().find(f => f.url().includes('stage=final-fight')).evaluate(() => menuFightState()), { state: 'boxing', mode: 'intro', gunfire: false });
    assert.equal(await page.evaluate(() => active.practice && active.finalFight), true);
    const result = await page.frames().find(f => f.url().includes('stage=final-fight')).evaluate(() => testBoxing());
    assert.ok(result.seconds > 290 && result.seconds < 330);
    await page.waitForFunction(() => !document.querySelector('#app').hidden, null, { polling: 50 });
    assert.equal(await page.evaluate(() => localStorage.getItem(PIN_KEY)), savedPin);
    assert.equal(await page.locator('#ending').isHidden(), true);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(() => showChapterMenu(10, false, true));
    await page.locator('#test-mode').click();
    const picker = page.getByLabel('Test level · The Chimney Road', { exact: true });
    assert.equal(await picker.locator('option').count(), 4);
    await picker.selectOption('final-fight');
    await page.getByRole('button', { name: 'Play level · The Chimney Road', exact: true }).click();
    assert.equal(await page.evaluate(() => active.finalFight && active.practice), true);
    assert.ok(await page.evaluate(() => pendingMissionUrl.includes('stage=final-fight')));
    assert.deepEqual(errors, []);
    console.log('PASS: unlock gating, direct fight, phone rotation, full bout, practice return, no completion reward, test selector.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
