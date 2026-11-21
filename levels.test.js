'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');

const root = __dirname;
const campaign = fs.readFileSync(path.join(root, 'campaign.js'), 'utf8');
const window = {};
vm.runInNewContext(fs.readFileSync(path.join(root, 'levels.js'), 'utf8'), { window });
const chapters = vm.runInNewContext(
  campaign.slice(campaign.indexOf('var CHAPTERS = '), campaign.indexOf('var PIN_TO_ID = ')) + 'CHAPTERS'
);

test('every campaign level plays its story before opening the correct game stage', () => {
  let intro, finishIntro, mission, music;
  const context = {
    window: {
      TrentMusic: { startLevel: (chapter, stage) => { music = { chapter, stage }; } },
      TrentChapter6: { startMission: (score, options) => { mission = { score, options }; } }
    },
    URL,
    location: { href: 'https://example.test/game/' },
    closeMission() {},
    playIntro(data, done) { intro = data; finishIntro = done; },
    openMissionFrame(url) { mission = new URL(url); }
  };
  vm.runInNewContext(campaign.slice(
    campaign.indexOf('function launchMissionLevel('),
    campaign.indexOf('function launchQuizPractice(')
  ), context);

  for (const chapter of chapters) {
    for (const [index, level] of window.TrentLevels[chapter.id].entries()) {
      assert.ok(level, `${chapter.id} level ${index + 1} has no story`);
      assert.equal(level.lines.length, 3);
      assert.ok(level.lines.every(line => typeof line === 'string' && line.length));
      assert.ok(fs.existsSync(path.join(root, 'assets', 'level-video', level.id + '.mp4')), level.id);
      const run = { chapter, levels: window.TrentLevels[chapter.id], levelIndex: index, score: 0, seen: new Set() };
      context.launchMissionLevel(run);
      assert.equal(intro.title, level.title);
      assert.equal(intro.videoPath, './assets/level-video/' + level.id + '.mp4');
      assert.equal(intro.allowSkip, false);
      assert.equal(intro.musicLevel, level.original ? 'main' : level.id);
      finishIntro();
      const stage = level.original ? null : level.id;
      assert.equal(music.stage, stage || 'main');
      if (chapter.id === 'shelf') {
        assert.equal(mission.options.stage || null, stage);
        assert.equal(mission.options.sequence, index + 1);
      } else {
        assert.equal(mission.searchParams.get('stage'), stage);
        assert.equal(mission.searchParams.get('sequence'), String(index + 1));
      }
      context.launchMissionLevel(run);
      assert.equal(intro.allowSkip, true);
    }
  }
});

test('the standalone final fight still opens without a level intro', () => {
  let mission;
  const context = {
    window: {},
    URL,
    location: { href: 'https://example.test/game/' },
    openMissionFrame(url) { mission = new URL(url); }
  };
  vm.runInNewContext(campaign.slice(
    campaign.indexOf('function launchFinalFight('),
    campaign.indexOf('function launchQuizPractice(')
  ), context);
  context.launchFinalFight(chapters.find(chapter => chapter.id === 'chimney'), true);
  assert.equal(mission.searchParams.get('stage'), 'final-fight');
  assert.equal(mission.searchParams.has('sequence'), false);
});
