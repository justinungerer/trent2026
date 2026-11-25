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
          'window.fighterBrightness=()=>{render(0);return ctx.getImageData(canvas.width/2-4,canvas.height*.31,8,8).data.reduce((sum,v,i)=>sum+(i%4===3?0:v),0);};' +
          'window.facePixels=(ratio)=>{const b=fight.state();b.enemy*=ratio;render(0);b.enemy/=ratio;return Array.from(ctx.getImageData(canvas.width/2-canvas.height*.075,canvas.height*.125,canvas.height*.16,canvas.height*.19).data);};\n})();')
      });
      if (pathname.endsWith('/blackout-run/game.js')) return route.fulfill({
        contentType: 'application/javascript',
        body: fs.readFileSync(file, 'utf8').replace(/\}\)\(\);\s*$/,
          "window.clearSkiLevel=()=>{if(state!=='run')throw Error('Ski run has not started');" +
          "run.course.markers.forEach(marker=>run.collected.add(marker.id));run.z=DISTANCE-.01;" +
          "step(run,1/60,{brake:false,steer:0});if(!run.finished)throw Error('Ski run did not clear');finish();};" +
          "window.skiStatus=()=>({level:run.index,falls:run.fallLimit});\n})();")
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
    const locked = page.getByRole('button', { name: /Chapter 10.*The Chimney Road.*Locked/ });
    assert.equal(await locked.isDisabled(), true);
    assert.ok(await locked.evaluate(button => Number(getComputedStyle(button).opacity) < 1));
    assert.equal(await page.getByRole('button', { name: /^Continue at / }).count(), 1);
    assert.equal(await page.locator('.chapter-minigame, .chapter-final-fight, .chapter-level').count(), 0);
    assert.equal(await page.getByRole('button', { name: 'Opening film' }).count(), 0);
    assert.equal(await page.getByRole('button', { name: /^Replay without quiz/ }).count(), 1);
    assert.equal(await page.getByRole('button', { name: /^Replay with quiz/ }).count(), 1);
    await page.getByRole('button', { name: /^Replay without quiz/ }).click();
    assert.equal(await page.locator('#cinema').getAttribute('data-chapter'), 'night');
    await page.evaluate(() => introDone());
    const skiFrame = page.frameLocator('#game');
    const skiLevels = [
      ['the-broken-dispatch', 'The Broken Dispatch'],
      ['lights-across-the-valley', 'Lights Across the Valley'],
      ['beat-the-blackout', 'Beat the Blackout']
    ];
    for (const [i, [stage, title]] of skiLevels.entries()) {
      await page.waitForFunction(title => document.querySelector('#intro-title').textContent === title, title, { polling: 50 });
      await page.evaluate(() => introDone());
      await page.waitForFunction(stage => document.getElementById('game').contentWindow.location.search.includes('stage=' + stage), stage, { polling: 50 });
      assert.ok(await skiFrame.locator('#levels').isHidden());
      await skiFrame.locator('#start').click();
      await skiFrame.locator('#start-sheet').waitFor({ state: 'hidden' });
      assert.ok(await page.locator('#turn-gate').isHidden());
      const skiing = page.frames().find(frame => new URL(frame.url()).pathname.endsWith('/blackout-run/'));
      assert.equal(new URL(skiing.url()).searchParams.get('sequence'), String(i + 1));
      assert.deepEqual(await skiing.evaluate(() => skiStatus()), { level: i, falls: 3 });
      if (i === 0) {
        await page.setViewportSize({ width: 844, height: 390 });
        await page.locator('#turn-gate').waitFor();
        assert.match(await page.locator('#turn-heading').textContent(), /upright/);
        await page.setViewportSize({ width: 390, height: 844 });
        await page.locator('#turn-gate').waitFor({ state: 'hidden' });
      }
      await skiing.evaluate(() => clearSkiLevel()).catch(async error => {
        // The completion message can remove the iframe before evaluation returns.
        if (await page.evaluate(index => active?.levelIndex === index, i)) throw error;
      });
    }
    await page.getByRole('heading', { name: 'Chapter menu' }).waitFor();
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
    assert.equal(await page.locator('.chapter-locked').count(), 0);
    assert.equal(await page.getByRole('button', { name: 'Final fight only · The Chimney Road', exact: true }).count(), 1);
    assert.equal(await page.getByRole('button', { name: 'Opening film' }).count(), 1);
    assert.equal(await page.getByRole('button', { name: 'Ending video' }).count(), 1);
    const savedPin = await page.evaluate(() => localStorage.getItem(PIN_KEY));
    await page.locator('.chapter-final-fight').click();
    assert.equal(await page.locator('#turn-gate').isVisible(), false);
    await page.waitForFunction(() => document.querySelector('#game').src.includes('stage=final-fight'), null, { polling: 50 });
    const frame = page.frameLocator('#game');
    await frame.locator('#box-start').waitFor();
    assert.match(await page.locator('#soundtrack').getAttribute('src'), /\/metallica-enter-sandman\.mp3$/);
    assert.equal(await frame.locator('#box-title').textContent(), 'Hitler guards the sleigh');
    assert.equal(await frame.locator('#start-sheet').isVisible(), false);
    assert.deepEqual(await page.frames().find(f => f.url().includes('stage=final-fight')).evaluate(() => menuFightState()), { state: 'boxing', mode: 'intro', gunfire: false });
    assert.equal(await page.evaluate(() => active.practice && active.finalFight), true);
    const fightFrame = page.frames().find(f => f.url().includes('stage=final-fight'));
    await frame.locator('#box-start').click();
    assert.equal(await page.locator('#turn-gate').isVisible(), true);
    assert.equal(await fightFrame.evaluate(() => menuFightState().mode), 'intro');
    await page.setViewportSize({ width: 844, height: 390 });
    await fightFrame.waitForFunction(() => menuFightState().mode === 'fight' && boxAssetsReady(), null, { polling: 50 });
    async function holdThroughSwing(buttonId, late, warningText) {
      await fightFrame.evaluate(value => prepareWarning(value), late);
      await frame.locator('#box-cue').getByText(warningText, { exact: false }).waitFor();
      const initial = await fightFrame.evaluate(() => stepWarning(0));
      assert.equal(initial.phase, 'tell');
      assert.equal(initial.timer, 2);
      const warningBrightness = await fightFrame.evaluate(() => fighterBrightness());
      const control = frame.locator(buttonId);
      const box = await control.boundingBox();
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      try {
        await fightFrame.evaluate(() => stepWarning(1.61));
        assert.ok(await fightFrame.evaluate(() => fighterBrightness()) > warningBrightness);
        await fightFrame.evaluate(() => stepWarning(.18));
        assert.equal(await fightFrame.evaluate(() => fighterBrightness()), warningBrightness);
        const beforeImpact = await fightFrame.evaluate(() => stepWarning(.20));
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
    await fightFrame.evaluate(() => prepareWarning(false));
    for (const threshold of [.75, .50, .25]) {
      const before = await fightFrame.evaluate(value => facePixels(value), threshold + .001);
      const after = await fightFrame.evaluate(value => facePixels(value), threshold);
      assert.notDeepEqual(after, before);
    }
    const result = await fightFrame.evaluate(() => testBoxing());
    assert.ok(result.seconds > 80 && result.seconds < 190);
    await page.waitForFunction(() => !document.querySelector('#app').hidden, null, { polling: 50 });
    assert.equal(await page.evaluate(() => localStorage.getItem(PIN_KEY)), savedPin);
    assert.equal(await page.locator('#ending').isHidden(), true);
    assert.doesNotMatch(await page.locator('#soundtrack').getAttribute('src'), /enter-sandman/);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(() => showChapterMenu(10, false, true));
    await page.locator('#test-mode').click();
    const picker = page.getByLabel('Test level · The Chimney Road', { exact: true });
    assert.equal(await picker.locator('option').count(), 4);
    await picker.selectOption('final-fight');
    await page.getByRole('button', { name: 'Play level · The Chimney Road', exact: true }).click();
    assert.equal(await page.evaluate(() => active.finalFight && active.practice), true);
    assert.ok(await page.evaluate(() => document.getElementById('game').src.includes('stage=final-fight')));
    const levelsToStart = await page.evaluate(() => CHAPTERS.flatMap(chapter =>
      TrentLevels[chapter.id].map((level, index) => {
        const url = new URL(chapter.path, location.href);
        url.searchParams.set('sequence', index + 1);
        if (level && !level.original) url.searchParams.set('stage', level.id);
        return { game: url.pathname.split('/')[1], url: url.href };
      })
    ));
    assert.equal(levelsToStart.length, 33);
    for (const { game, url } of levelsToStart) {
      const landscape = game !== 'frosted-skies' && game !== 'blackout-run';
      const sheet = { 'frosted-skies': '#sheet', 'shelf-escape': '#sheet', 'chapter-2': '#panel' }[game] || '#start-sheet';
      const accept = sheet === '#sheet' ? '#action' : '#start';
      await page.evaluate(({ game, url }) => {
        closeMission();
        openMissionFrame(url, game);
      }, { game, url });
      const gameFrame = page.frameLocator('#game');
      await page.waitForFunction(game => document.getElementById('game').contentWindow.location.pathname === '/' + game + '/', game, { polling: 50 });
      await gameFrame.locator(accept).waitFor();
      assert.equal(await page.locator('#turn-gate').isHidden(), true, game);
      const cardWidth = await gameFrame.locator(sheet + ' .card').evaluate(card => card.getBoundingClientRect().width);
      assert.ok(cardWidth <= 390, game + ' portrait card overflows');
      if (game === 'holding-camp') {
        await gameFrame.locator(accept).evaluate(button => {
          const win = button.ownerDocument.defaultView;
          const current = new URL(win.location.href);
          current.searchParams.delete('briefing');
          win.history.replaceState(null, '', current.href);
        });
        await page.evaluate(() => Object.defineProperty(window, 'orientation', { value: 0, configurable: true }));
      }
      await gameFrame.locator(accept).tap();
      if (landscape) {
        assert.equal(await page.locator('#turn-gate').isVisible(), true, game);
        assert.equal(await gameFrame.locator(sheet).isVisible(), true, game + ' started before rotation');
        await page.setViewportSize({ width: 844, height: 390 });
        if (game === 'holding-camp') {
          assert.equal(await page.locator('#turn-gate').isVisible(), true, game);
          await page.evaluate(() => Object.defineProperty(window, 'orientation', { value: 90, configurable: true }));
        }
      }
      await gameFrame.locator(sheet).waitFor({ state: 'hidden' });
      assert.equal(await page.locator('#turn-gate').isHidden(), true, game);
      await page.evaluate(() => closeMission());
      if (landscape) {
        assert.match(await page.locator('#turn-heading').textContent(), /upright/);
        await page.setViewportSize({ width: 390, height: 844 });
        if (game === 'holding-camp') {
          await page.evaluate(() => {
            delete window.orientation;
            window.dispatchEvent(new Event('orientationchange'));
          });
        }
        await page.locator('#turn-gate').waitFor({ state: 'hidden' });
      }
    }
    await page.setViewportSize({ width: 844, height: 390 });
    await page.evaluate(() => {
      delete TrentOrientation.acceptMissionInstructions;
      openMissionFrame('./holding-camp/', 'Holding Camp');
      missionInstructionsAccepted = true;
      syncTurn();
    });
    const legacyCamp = page.frameLocator('#game');
    await legacyCamp.locator('#start').tap();
    await legacyCamp.locator('#start-sheet').waitFor({ state: 'hidden' });
    for (const [game, accept, sheet, gameplayGate] of [
      ['prologue', '#start', '#start-sheet', '#portrait'],
      ['shelf-escape', '#action', '#sheet', '#turn-gate'],
      ['frosted-skies', '#action', '#sheet', '#turn-gate']
    ]) {
      await page.setViewportSize({ width: 844, height: 390 });
      await page.goto('http://localhost/' + game + '/');
      await page.locator('.briefing-turn').waitFor();
      assert.equal(await page.locator(gameplayGate).isHidden(), true, game);
      await page.setViewportSize({ width: 390, height: 844 });
      await page.locator('.briefing-turn').waitFor({ state: 'hidden' });
      await page.locator(accept).click();
      if (game !== 'frosted-skies') {
        await page.locator(gameplayGate).waitFor();
        const gateOnTop = await page.locator(gameplayGate).evaluate(gate =>
          gate.contains(document.elementFromPoint(innerWidth / 2, innerHeight / 2)));
        assert.equal(gateOnTop, true, game);
        assert.equal(await page.locator(sheet).isVisible(), true, game);
        await page.setViewportSize({ width: 844, height: 390 });
      }
      await page.locator(sheet).waitFor({ state: 'hidden' });
      assert.equal(await page.locator(gameplayGate).isHidden(), true, game);
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('http://localhost/?play=chapter-2');
    const playChapter = page.getByRole('button', { name: 'Play Chapter 2' });
    await playChapter.tap();
    assert.equal(await page.locator('#intro-title').textContent(), 'Frosted Skies');
    assert.match(await page.locator('#intro-video').getAttribute('src'), /intro-video\/frost\.mp4/);
    await page.evaluate(() => introDone());
    const frostFrame = page.frameLocator('#game');
    for (const [index, stage, title] of [
      [1, 'the-scout-screen', 'The Scout Screen'],
      [2, 'workshop-approach', 'Workshop Approach'],
      [3, null, 'Frosted Skies']
    ]) {
      if (title) {
        await page.getByRole('heading', { name: title, exact: true }).waitFor();
        const filmId = stage || 'defend-the-workshop';
        assert.ok((await page.locator('#intro-video').getAttribute('src')).includes('/level-video/' + filmId + '.mp4'));
        await page.evaluate(() => introDone());
      }
      await page.waitForFunction(index => {
        const search = document.getElementById('game').contentWindow.location.search;
        return new URLSearchParams(search).get('sequence') === String(index);
      }, index, { polling: 50 });
      const frost = page.frames().find(frame => frame.url().includes('/frosted-skies/'));
      assert.equal(new URL(frost.url()).searchParams.get('stage'), stage);
      await frostFrame.locator('#action').tap();
      await frostFrame.locator('#sheet').waitFor({ state: 'hidden' });
      assert.equal(await page.locator('#turn-gate').isHidden(), true);
      await frost.evaluate(() => clearFlight('Level cleared.'));
      await frostFrame.getByRole('button', { name: 'Continue', exact: true }).tap();
    }
    await playChapter.waitFor();
    assert.equal(await page.evaluate(() => active), null);
    assert.equal(await page.locator('.quiz-modal').count(), 0);
    console.log('PASS: the Chapter 2 share link plays all three existing films and all three levels in order without a quiz.');
    const replays = await page.evaluate(() => CHAPTERS.map(chapter => ({
      slug: chapter.number ? 'chapter-' + chapter.number : 'prologue',
      id: chapter.id,
      title: chapter.title
    })));
    assert.equal(replays.length, 11);
    for (const chapter of replays) {
      await page.goto('http://localhost/play/' + chapter.slug.replace('-', '') + '/');
      await page.waitForURL('**/#play=' + chapter.slug);
      await page.getByRole('button', { name: /^Play (the Prologue|Chapter \d+)$/ }).tap();
      assert.equal(await page.locator('#intro-title').textContent(), chapter.title);
      await page.evaluate(() => introDone());
      assert.deepEqual(await page.evaluate(() => [active.chapter.id, active.levels.length, active.score]), [chapter.id, 3, 0]);
      assert.equal(await page.locator('.quiz-card').count(), 0);
    }

    await page.goto('http://localhost/play/chapter2quiz/');
    await page.waitForURL('**/#play=chapter-2&quiz=1');
    for (const correctCount of [4, 5]) {
      await playChapter.tap();
      await page.evaluate(() => introDone());
      await page.getByRole('button', { name: 'Begin questions' }).tap();
      assert.equal(await page.evaluate(() => active), null);
      await page.evaluate(async correctCount => {
        const bank = await TrentTrivia.load();
        for (let i = 0; i < 10; i++) {
          const prompt = document.querySelector('.quiz-question').textContent;
          const image = document.querySelector('.quiz-picture');
          if (image) {
            await image.decode();
            for (let tries = 0; document.querySelector('.choice').disabled && tries < 100; tries++) {
              await new Promise(resolve => setTimeout(resolve, 20));
            }
          }
          const question = bank.find(entry => entry.prompt === prompt &&
            (entry.imagePath || '') === (image ? image.getAttribute('src') : ''));
          const choices = [...document.querySelectorAll('.choice')];
          const correct = choices.find(button => button.querySelector('.choice-text').textContent ===
            question.choices.find(answer => answer.correct).text);
          if (i < correctCount) correct.click();
          else choices.filter(button => button !== correct).slice(0, 2).forEach(button => button.click());
          document.querySelector('.quiz-review button').click();
        }
      }, correctCount);
      if (correctCount === 4) {
        await page.getByRole('heading', { name: 'Briefing failed' }).waitFor();
        assert.equal(await page.evaluate(() => active), null);
        await page.getByRole('button', { name: 'Start screen' }).tap();
      } else {
        await page.getByRole('heading', { name: 'Quiz passed' }).waitFor();
        await page.getByRole('button', { name: 'Continue to minigame' }).tap();
        assert.deepEqual(await page.evaluate(() => [active.chapter.id, active.levelIndex, active.levels.length]),
          ['frost', 0, 3]);
      }
    }
    await page.goto('http://localhost/play/finalboss/');
    await page.waitForURL('**/chimney-road/#final-fight');
    await page.locator('#box-start').waitFor();
    assert.equal(await page.locator('#start-sheet').isHidden(), true);
    assert.deepEqual(await page.evaluate(() => menuFightState()), { state: 'boxing', mode: 'intro', gunfire: false });
    console.log('PASS: path-only links for all 11 quiz-free replays, the required quiz, and the direct final boss.');
    assert.deepEqual(errors, []);
    console.log('PASS: touch starts across all 33 minigame levels, normalized URLs, missed rotation events, and standalone links.');
    console.log('PASS: regular replay and continue routing, three portrait Blackout Run levels, master menu, direct fight, phone rotation, two-second warnings and two flashes, injury thresholds, held dodge and block, full bout, practice return, no completion reward, test selector.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
