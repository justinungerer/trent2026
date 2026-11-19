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
        body: fs.readFileSync(file, 'utf8').replace(/\}\)\(\);\s*$/, hooks + '\nwindow.menuFightState=()=>({state,mode:fight.state().mode,gunfire:!!gunfire});' +
          'window.prepareWarning=(late)=>{fight.start();fight.begin();const b=fight.state();if(late)b.enemy=100;b.timer=.02;fight.update(.02);};' +
          'window.stepWarning=(dt)=>{fight.update(dt);return fight.state();};' +
          'window.fighterBrightness=()=>{render(0);return ctx.getImageData(canvas.width/2-4,canvas.height*.31,8,8).data.reduce((sum,v,i)=>sum+(i%4===3?0:v),0);};\n})();')
      });
      if (pathname.endsWith('/night-broadcast/game.js')) return route.fulfill({
        contentType: 'application/javascript',
        body: fs.readFileSync(file, 'utf8').replace(/\}\)\(\);\s*$/,
          'window.radioControl=(dial)=>{const p=dial?radioPoint(DIAL_U):knobCenter();return {x:view.ox+p.x*view.s,y:view.oy+p.y*view.s,freq};};\n})();')
      });
      if (/\.(mp3|mp4|wav)$/.test(pathname)) return route.fulfill({ status: 204 });
      return fs.existsSync(file) ? route.fulfill({ path: file }) : route.fulfill({ status: 404 });
    });
    await page.goto('http://localhost/');
    async function usePassword(pin) {
      await page.evaluate(() => showStart());
      await page.locator('#pin').fill(pin);
      await page.locator('#campaign-start').click();
    }
    await usePassword('SKY');
    assert.equal(await page.getByRole('button', { name: /^Continue at / }).count(), 1);
    assert.equal(await page.locator('.chapter-minigame, .chapter-final-fight, .chapter-level').count(), 0);
    assert.equal(await page.getByRole('button', { name: 'Opening film' }).count(), 0);
    assert.equal(await page.getByRole('button', { name: /^Replay without quiz/ }).count(), 1);
    assert.equal(await page.getByRole('button', { name: /^Replay with quiz/ }).count(), 1);
    await page.getByRole('button', { name: /^Replay without quiz/ }).click();
    assert.equal(await page.locator('#cinema').getAttribute('data-chapter'), 'night');
    await page.evaluate(() => introDone());
    assert.equal(await page.locator('#intro-title').textContent(), 'Find the Carrier');
    await page.evaluate(() => introDone());
    await page.evaluate(() => finishMission());
    assert.equal(await page.evaluate(() => active.levelIndex), 1);
    await page.setViewportSize({ width: 568, height: 320 });
    const radioFrame = page.frameLocator('#game');
    await radioFrame.locator('#start').click();
    const radio = page.frames().find(f => new URL(f.url()).pathname.endsWith('/night-broadcast/'));
    assert.equal(new URL(radio.url()).searchParams.get('sequence'), '2');
    const canvas = await radioFrame.locator('#radio').boundingBox();
    async function quickTuningDrag(dial, delta) {
      const before = await radio.evaluate(value => radioControl(value), dial);
      const x = canvas.x + before.x, y = canvas.y + before.y;
      await page.mouse.move(x, y);
      await page.mouse.down();
      await page.mouse.move(x + delta, y);
      await page.mouse.up();
      const after = await radio.evaluate(value => radioControl(value), dial);
      assert.ok((after.freq - before.freq) * Math.sign(delta) > .03);
    }
    await quickTuningDrag(true, 65);
    await quickTuningDrag(false, -45);
    await page.evaluate(() => finishMission());
    await page.setViewportSize({ width: 390, height: 844 });
    assert.equal(await page.locator('#intro-title').textContent(), 'Confirm the Dispatch');
    await page.evaluate(() => { introDone(); finishMission(); });
    assert.equal(await page.getByRole('heading', { name: 'Chapter menu' }).isVisible(), true);
    assert.equal(await page.evaluate(() => localStorage.getItem(PIN_KEY)), 'SKY');
    await page.evaluate(() => {
      const startQuiz = TrentTrivia.start;
      TrentTrivia.start = function(chapter, hooks) {
        window.startedQuiz = chapter.id;
        return startQuiz(chapter, hooks);
      };
    });
    await page.getByRole('button', { name: /^Replay with quiz/ }).click();
    await page.evaluate(() => introDone());
    assert.equal(await page.evaluate(() => window.startedQuiz), 'night');
    await usePassword('SKY');
    await page.getByRole('button', { name: /^Continue at / }).click();
    await page.evaluate(() => introDone());
    assert.equal(await page.evaluate(() => window.startedQuiz), 'frost');
    await usePassword(await page.evaluate(() => COMPLETION_PIN));
    assert.equal(await page.getByRole('button', { name: /^Continue at / }).count(), 0);
    assert.equal(await page.getByRole('button', { name: /^Replay without quiz/ }).count(), 10);
    assert.equal(await page.locator('.chapter-final-fight').count(), 0);
    await usePassword(await page.evaluate(() => TEST_PIN));
    assert.equal(await page.getByRole('button', { name: 'Final fight only · The Chimney Road', exact: true }).count(), 1);
    assert.equal(await page.getByRole('button', { name: 'Opening film' }).count(), 1);
    assert.equal(await page.getByRole('button', { name: 'Ending video' }).count(), 1);
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
    const fightFrame = page.frames().find(f => f.url().includes('stage=final-fight'));
    await fightFrame.waitForFunction(() => boxAssetsReady(), null, { polling: 50 });
    async function holdThroughSwing(buttonId, late, warningText) {
      await fightFrame.evaluate(value => prepareWarning(value), late);
      await frame.locator('#box-cue').getByText(warningText, { exact: false }).waitFor();
      const initial = await fightFrame.evaluate(() => stepWarning(0));
      assert.equal(initial.phase, 'tell');
      assert.equal(initial.timer, 1);
      const warningBrightness = await fightFrame.evaluate(() => fighterBrightness());
      const control = frame.locator(buttonId);
      const box = await control.boundingBox();
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      try {
        const beforeImpact = await fightFrame.evaluate(() => stepWarning(.99));
        assert.equal(beforeImpact.phase, 'tell');
        assert.equal(beforeImpact.hp, initial.hp);
        assert.ok(await fightFrame.evaluate(() => fighterBrightness()) > warningBrightness);
        const afterImpact = await fightFrame.evaluate(() => stepWarning(.02));
        assert.equal(afterImpact.phase, 'strike');
        assert.equal(afterImpact.hp, initial.hp);
        assert.equal(afterImpact.hitVision, 0);
      } finally {
        await page.mouse.up();
      }
      const released = await fightFrame.evaluate(() => stepWarning(0));
      assert.equal(released.block || released.dodgeHeld, false);
    }
    await holdThroughSwing('#box-right', false, 'Left hook');
    await holdThroughSwing('#box-block', true, 'Uppercut');
    const result = await fightFrame.evaluate(() => testBoxing());
    assert.ok(result.seconds > 80 && result.seconds < 190);
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
    console.log('PASS: regular replay and continue routing, level 2 radio dial and knob, master menu, direct fight, phone rotation, one-second warnings, held dodge and block, full bout, practice return, no completion reward, test selector.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
