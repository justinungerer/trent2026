/* Chapter 8 — The Holding Camp.
   Side-view yard brawler. Santa walks the lane, jabs, and uppercuts.
   Painted strips live in art/brawl-*.webp. Feet share one anchor.
   No blood. Beaten guards flash and vanish. */
'use strict';

(function () {
  var canvas = document.getElementById('yard');
  var ctx = canvas.getContext('2d');
  var gateEl = document.getElementById('gate');
  var pipsEl = document.getElementById('pips');
  var pauseBtn = document.getElementById('pause');
  var hintEl = document.getElementById('hint');
  var startSheet = document.getElementById('start-sheet');
  var pauseSheet = document.getElementById('pause-sheet');
  var winSheet = document.getElementById('win-sheet');
  var loseSheet = document.getElementById('lose-sheet');
  var winTimeEl = document.getElementById('win-time');
  var portraitEl = document.getElementById('portrait');
  var statusEl = document.getElementById('status');

  /* Higher-resolution phone landscape. Old view was 844×390.
     Old walk was the gate at 752 minus the start at 88 = 664.
     This lane is five times that distance, in the same screen-widths. */
  var VIEW_W = 1280;
  var CAMERA_MARGIN = VIEW_W / 3;
  var VIEW_H = 592;
  var stage = new URLSearchParams(location.search).get('stage');
  var cellPassage = stage === 'the-cell-passage';
  var gateFight = stage === 'hold-the-gate';
  var keyTaken = false;
  var BAND_TOP = Math.round(VIEW_H * 0.22);
  var BAND_H = Math.round(VIEW_H * 0.75);
  var BAND_BOT = BAND_TOP + BAND_H;
  var OLD_WALK = 664;
  var OLD_VIEW = 844;
  var yardPassage = !cellPassage && !gateFight;
  var GATE_GUARD_LIMIT = 2;
  var WALK = cellPassage ? 8520 : gateFight ? 1770 * 3 : Math.round(Math.round(OLD_WALK * 5 * (VIEW_W / OLD_VIEW)) * 3 * .8);
  var START_X = 340;
  var OUTBOUND = 1;
  var GATE_X = START_X + WALK;
  var EXIT_X = cellPassage ? START_X + WALK / 2 : GATE_X;
  var EXIT_Y = BAND_TOP + 156;
  var WORLD_R = GATE_X + 240;
  var SANTA_H = Math.round(VIEW_H * 0.28);
  var MAX_HP = 5 + (window.TrentMissionBonus || 0);
  var MAX_STAMINA = 10;
  var STAMINA_REFILL = (MAX_STAMINA / 5) * 0.75;
  var staminaEl = document.getElementById('stamina');
  var staminaMeter = document.getElementById('stamina-meter');
  var FR = window.CAMP_FRAMES;

  var KIND = {
    light: { hp: 2, h: 0.9, speed: 168, wind: 0.3, reach: 64, cool: 0.7, jab: 0.82 },
    mid: { hp: 4, h: 1.02, speed: 124, wind: 0.28, reach: 74, cool: 0.78, jab: 0.55 },
    heavy: { hp: 6, h: 1.16, speed: 86, wind: 0.4, reach: 88, cool: 0.95, jab: 0.4 },
    warden: { hp: 10, h: 1.24, speed: 112, wind: 0.48, reach: 94, cool: 0.9, jab: 0.65, boss: 'Key Warden' },
    enforcer: { hp: 12, h: 1.34, speed: 98, wind: 0.62, reach: 108, cool: 1.05, jab: 0.35, boss: 'Yard Enforcer' }
  };

  var CLIP = {
    santa: {
      idle: { ms: 180, loop: true },
      walk: { ms: 91, loop: true },
      punch: { ms: 50, hit: 2, dmg: 1, reach: 92, cool: 0.1 },
      upper: { ms: 120, hit: 2, dmg: 3, reach: 84, cool: 0.26 },
      hit: { ms: 140, hold: true },
      defeat: { ms: 200, hold: true }
    },
    light: {
      idle: { ms: 240, loop: true },
      walk: { ms: 110, loop: true },
      punch: { ms: 48, hit: 2 },
      upper: { ms: 105, hit: 2 },
      hit: { ms: 140, hold: true },
      defeat: { ms: 160, hold: true }
    },
    mid: {
      idle: { ms: 200, loop: true },
      walk: { ms: 130, loop: true },
      punch: { ms: 58, hit: 2 },
      upper: { ms: 115, hit: 2 },
      hit: { ms: 160, hold: true },
      defeat: { ms: 200, hold: true }
    },
    heavy: {
      idle: { ms: 260, loop: true },
      walk: { ms: 160, loop: true },
      punch: { ms: 70, hit: 2 },
      upper: { ms: 120, hit: 2 },
      hit: { ms: 180, hold: true },
      defeat: { ms: 180, hold: true }
    }
  };

  CLIP.warden = CLIP.mid;
  CLIP.enforcer = CLIP.heavy;

  var WAVE_PLAN = [
    { at: 0.08, foes: [{ k: 'light', side: 'right' }, { k: 'light', side: 'left' }] },
    { at: 0.18, foes: [{ k: 'light', side: 'left' }, { k: 'light', side: 'right' }, { k: 'light', side: 'right' }] },
    { at: 0.3, foes: [{ k: 'mid', side: 'right' }, { k: 'mid', side: 'left' }] },
    { at: 0.42, foes: [{ k: 'light', side: 'left' }, { k: 'mid', side: 'right' }, { k: 'light', side: 'right' }] },
    { at: 0.55, foes: [{ k: 'heavy', side: 'right' }, { k: 'light', side: 'left' }, { k: 'light', side: 'left' }] },
    { at: 0.68, foes: [{ k: 'mid', side: 'left' }, { k: 'light', side: 'right' }, { k: 'light', side: 'left' }, { k: 'mid', side: 'right' }] },
    { at: 0.8, foes: [{ k: 'heavy', side: 'left' }, { k: 'mid', side: 'right' }, { k: 'light', side: 'left' }] },
    { at: 0.92, foes: [{ k: 'heavy', side: 'right' }, { k: 'mid', side: 'left' }, { k: 'light', side: 'right' }, { k: 'light', side: 'right' }] }
  ];

  var PICK_PLAN = [
    { at: 0.24, y: 0.62 },
    { at: 0.62, y: 0.4 }
  ];
  var cellKey = { x: GATE_X - 80, y: EXIT_Y };
  if (cellPassage || gateFight) {
    document.getElementById('camp-stage-title').textContent = cellPassage ? 'The Cell Passage' : 'Hold the Gate';
    if (cellPassage) {
      document.getElementById('camp-win-title').textContent = 'The exit is open';
      document.getElementById('camp-win-copy').textContent = 'Santa brought the key back and unlocked the passage door.';
    }
    document.getElementById('camp-goal').textContent = cellPassage
      ? 'Fight across the passage, take the key at the far right, then return to the exit halfway back.'
      : 'Clear both gatehouse groups and reach the yard gate.';
    WAVE_PLAN = cellPassage ? [
      { at: 0.24, foes: [{ k: 'light', side: 'left' }] },
      { at: 0.64, foes: [{ k: 'light', side: 'left' }, { k: 'mid', side: 'right' }] }
    ] : [
      { at: 0.19, foes: [{ k: 'light', side: 'right' }, { k: 'light', side: 'left' }, { k: 'mid', side: 'right' }] },
      { at: 0.66, foes: [{ k: 'mid', side: 'left' }, { k: 'heavy', side: 'right' }, { k: 'light', side: 'right' }, { k: 'mid', side: 'left' }] }
    ];
  }

  // Repeat the authored encounters across three sections.
  var originalPlan = WAVE_PLAN;
  if (cellPassage) {
    WAVE_PLAN = [];
    for (var half = 0; half < 2; half++) {
      originalPlan.forEach(function (wave) {
        WAVE_PLAN.push({ at: (half + wave.at) / 2, foes: wave.foes.concat(wave.foes) });
      });
    }
    WAVE_PLAN.push({ at: 0.94, foes: [{ k: 'warden', side: 'right' }] });
  } else {
    WAVE_PLAN = [];
    for (var section = 0; section < 3; section++) {
      originalPlan.forEach(function (wave) {
        WAVE_PLAN.push({
          at: (section + wave.at) / 3,
          foes: yardPassage ? Array.from({ length: Math.round(wave.foes.length * 1.5) }, function (_, i) {
            return wave.foes[i % wave.foes.length];
          }) : wave.foes,
          batches: gateFight ? 3 : 1,
          extraGroup: gateFight
        });
      });
    }
    if (yardPassage) {
      WAVE_PLAN = WAVE_PLAN.flatMap(function (wave) {
        var split = Math.ceil(wave.foes.length / 2);
        return [
          { at: wave.at, foes: wave.foes.slice(0, split) },
          { at: wave.at + .018, foes: wave.foes.slice(split) }
        ];
      }).filter(function (wave) { return wave.foes.length; });
    }
    WAVE_PLAN.push({ at: 0.98, foes: gateFight ? [
      { k: 'warden', side: 'left' }, { k: 'enforcer', side: 'right' },
      { k: 'light', side: 'left' }, { k: 'mid', side: 'right' }, { k: 'heavy', side: 'right' }
    ] : [{ k: 'enforcer', side: 'right' }] });
  }
  document.getElementById('camp-goal').textContent = cellPassage
    ? 'Fight to the far-right key. Defeat the Key Warden, take his key, and return to the exit halfway back.'
    : gateFight ? 'Clear the guard waves and reinforcements. Up to two enemies fight at once. Defeat both bosses and their three guards to reach the gate.'
    : 'Cross the extended yard, defeat the Yard Enforcer at the far end, and reach the gate.';

  var yardImg = new Image();
  var gateImg = new Image();
  var cocoaImg = new Image();
  var cookieImg = new Image();
  cookieImg.src = 'art/stamina-cookie.webp';
  var keyImg = new Image();
  if (cellPassage) keyImg.src = '../shelf-escape/art/props/depot-key.webp';
  yardImg.src = cellPassage ? 'art/cell-passage.webp' :
    gateFight ? 'art/gatehouse.webp' : 'art/brawl-yard.webp';
  gateImg.src = 'art/brawl-gate.webp';
  cocoaImg.src = 'art/brawl-cocoa.webp';

  var images = {};
  var kindName;
  var animName;
  for (kindName in FR) {
    if (!FR[kindName] || !FR[kindName].idle) continue;
    for (animName in FR[kindName]) {
      if (!FR[kindName][animName] || !FR[kindName][animName].src) continue;
      var spec = FR[kindName][animName];
      if (!images[spec.src]) {
        images[spec.src] = new Image();
        images[spec.src].src = spec.src;
      }
      spec.img = images[spec.src];
    }
  }

  var state = 'title';
  var cssW = 844;
  var cssH = 390;
  var dpr = 1;
  var view = { s: 1, ox: 0, oy: 0 };
  var played = 0;
  var victorySent = false;
  var rotateHold = false;
  var visualTime = 0;
  var lastFrame = 0;
  var shake = 0;
  var cam = 0;
  var held = { left: false, right: false, up: false, down: false };
  var pointers = {};
  var santa;
  var foes;
  var waves;
  var picks;
  var flakes = [];
  var n;

  for (n = 0; n < 28; n++) {
    flakes.push({
      x: Math.random() * VIEW_W,
      y: Math.random() * VIEW_H,
      v: 14 + Math.random() * 22,
      r: 1.1 + Math.random() * 1.6,
      drift: Math.random() * 6 - 3
    });
  }

  var motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

  function reduceMotion() {
    return motionQuery.matches;
  }

  function imageReady(img) {
    return !!(img && img.complete && img.naturalWidth > 0);
  }

  function say(text) {
    statusEl.textContent = text;
  }

  function sfx(kind) {
    if (window.TrentSfx) window.TrentSfx.play(kind);
  }

  function clamp(v, a, b) {
    if (v < a) return a;
    if (v > b) return b;
    return v;
  }

  function makeWaves() {
    var out = [];
    var i;
    var j;
    var src;
    var foesPlan;
    for (i = 0; i < WAVE_PLAN.length; i++) {
      src = WAVE_PLAN[i];
      foesPlan = [];
      for (j = 0; j < src.foes.length; j++) {
        foesPlan.push({ k: src.foes[j].k, side: src.foes[j].side });
      }
      out.push({ at: src.at, foes: foesPlan, spawned: false, members: [], pending: [], extraGroup: !!src.extraGroup, batches: src.batches || 1, sent: 0, nextAt: 0 });
    }
    return out;
  }

  function makePicks() {
    var out = [];
    var i;
    var src;
    for (i = 0; i < PICK_PLAN.length; i++) {
      src = PICK_PLAN[i];
      out.push({
        x: START_X + OUTBOUND * src.at * WALK,
        y: BAND_TOP + BAND_H * src.y,
        got: false
      });
    }
    for (var slot = 1; slot <= (cellPassage || yardPassage ? 8 : 6); slot++) {
      out.push({
        x: START_X + slot * WALK / (cellPassage || yardPassage ? 9 : 7),
        y: BAND_TOP + BAND_H * (slot % 2 ? .5 : .73),
        got: false, stamina: true
      });
    }
    return out;
  }

  function freshSanta() {
    return {
      x: START_X,
      y: BAND_TOP + BAND_H * 0.62,
      face: OUTBOUND,
      hp: MAX_HP,
      stamina: MAX_STAMINA,
      staminaWarning: 0,
      atk: '',
      atkT: 0,
      cool: 0,
      stun: 0,
      down: 0,
      iframe: 0,
      buffer: '',
      anim: 'idle',
      animT: 0,
      hitDone: false
    };
  }

  function depthMul(y) {
    var t = (y - BAND_TOP) / BAND_H;
    return 0.8 + 0.2 * clamp(t, 0, 1);
  }

  function swingDur(kind, anim) {
    return FR[kind][anim].n * CLIP[kind][anim].ms / 1000;
  }

  function hitAt(kind, anim) {
    var nframes = FR[kind][anim].n;
    var frame = CLIP[kind][anim].hit || 0;
    if (frame > nframes - 1) frame = nframes - 1;
    return frame * CLIP[kind][anim].ms / 1000;
  }

  function clipFrame(kind, anim, time) {
    var spec = CLIP[kind][anim];
    var count = FR[kind][anim].n;
    var i = Math.floor(time * 1000 / spec.ms);
    if (i < 0) i = 0;
    if (spec.loop) return i % count;
    if (i >= count) return count - 1;
    return i;
  }

  function pipsText() {
    var text = '';
    var i;
    var hp = santa.hp;
    if (santa.down > 0) hp = 0;
    for (i = 0; i < hp; i++) text += '♥';
    for (; i < MAX_HP; i++) text += '♡';
    return text;
  }

  function living() {
    var i;
    var count = 0;
    for (i = 0; i < foes.length; i++) {
      if (foes[i].state !== 'gone') count += 1;
    }
    return count;
  }

  function waveClear(wave) {
    var i;
    if (!wave.spawned || wave.sent < wave.batches || wave.pending.length) return false;
    for (i = 0; i < wave.members.length; i++) {
      if (wave.members[i].state !== 'gone') return false;
    }
    return true;
  }

  function allClear() {
    var i;
    for (i = 0; i < waves.length; i++) {
      if (!waveClear(waves[i])) return false;
    }
    return true;
  }

  function frontX() {
    if (cellPassage) return GATE_X + 40;
    for (var i = 0; i < waves.length; i++) {
      if (!waveClear(waves[i])) return Math.min(GATE_X, START_X + waves[i].at * WALK + VIEW_W * 0.55);
    }
    return GATE_X + 40;
  }

  function initialCamera() {
    return 0;
  }

  function exitLabel() {
    return keyTaken ? 'Exit' : 'Exit needs key';
  }

  function renderHud() {
    var left = living();
    if (state === 'win') gateEl.textContent = 'Open';
    else if (cellPassage) gateEl.textContent = exitLabel();
    else if (allClear()) gateEl.textContent = 'The gate';
    else if (left === 1) gateEl.textContent = '1 guard';
    else if (left === 0) {
      var pending = waves.find(function (wave) { return wave.spawned && (wave.pending.length || wave.sent < wave.batches); });
      var nextArrival = pending && pending.pending.length ? pending.pending[0].at : Infinity;
      if (pending && pending.sent < pending.batches) nextArrival = Math.min(nextArrival, pending.nextAt);
      gateEl.textContent = pending ? 'Reinforcements ' + Math.max(0, Math.ceil(nextArrival - played)) + 's' : 'Walk on';
    }
    else gateEl.textContent = left + ' guards';
    pipsEl.textContent = pipsText();
    staminaEl.textContent = Math.floor(santa.stamina) + '/' + MAX_STAMINA;
    staminaMeter.value = santa.stamina;
  }

  function beginRun() {
    keyTaken = false;
    santa = freshSanta();
    foes = [];
    waves = makeWaves();
    picks = makePicks();
    played = 0;
    shake = 0;
    cam = initialCamera();
    victorySent = false;
    state = 'play';
    startSheet.hidden = true;
    pauseSheet.hidden = true;
    winSheet.hidden = true;
    loseSheet.hidden = true;
    hintEl.hidden = false;
    renderHud();
    say(cellPassage || gateFight ? document.getElementById('camp-goal').textContent
      : 'Santa has ' + MAX_HP + ' hit points. The wreath gate is down the yard.');
  }

  function openPause() {
    if (state !== 'play') return;
    state = 'pause';
    pauseSheet.hidden = false;
  }

  function closePause() {
    if (state !== 'pause') return;
    state = 'play';
    pauseSheet.hidden = true;
    lastFrame = performance.now();
  }

  function giveUp() {
    if (state !== 'pause') return;
    state = 'title';
    pauseSheet.hidden = true;
    startSheet.hidden = false;
    say('Gave up. The gate is still shut.');
  }

  function showLose() {
    if (state === 'lose' || state === 'win') return;
    state = 'lose';
    loseSheet.hidden = false;
    say('Santa sits down dizzy. The gate is still shut.');
  }

  function win() {
    var seconds;
    if (state === 'win') return;
    seconds = Math.max(0, Math.round(played));
    state = 'win';
    winTimeEl.textContent = 'Out in ' + seconds + ' seconds.';
    winSheet.hidden = false;
    say((cellPassage ? 'Exit unlocked. ' : 'Through the gate. ') + seconds + ' seconds.');
    sfx('right');
    if (!victorySent) {
      victorySent = true;
      window.dispatchEvent(new CustomEvent('holding-camp:complete', {
        detail: { seconds: seconds }
      }));
      if (window.parent !== window) {
        var relay = { type: 'holding-camp:complete', detail: { seconds: seconds } };
        try {
          var relayRun = new URLSearchParams(location.search).get('runId');
          if (relayRun) relay.runId = relayRun;
        } catch (ignoreRelay) {}
        window.parent.postMessage(relay, (location.protocol === 'http:' || location.protocol === 'https:') ? location.origin : '*');
      }
    }
  }

  function nearestFoe() {
    var best = null;
    var bestD = 1e9;
    var i;
    var e;
    var dx;
    var dy;
    var d;
    for (i = 0; i < foes.length; i++) {
      e = foes[i];
      if (e.state === 'gone' || e.state === 'out' || e.hp <= 0) continue;
      dx = e.x - santa.x;
      dy = e.y - santa.y;
      d = Math.abs(dx) + Math.abs(dy) * 1.4;
      if (Math.abs(dx) < 150 && Math.abs(dy) < 80 && d < bestD) {
        best = e;
        bestD = d;
      }
    }
    return best;
  }

  function beginAttack(name) {
    var cost = name === 'upper' ? 3 : 1;
    if (santa.stamina < cost) {
      santa.buffer = '';
      santa.staminaWarning = 1.25;
      say('Out of stamina.');
      return;
    }
    santa.stamina -= cost;
    var foe = nearestFoe();
    santa.atk = name;
    santa.atkT = 0;
    santa.hitDone = false;
    santa.buffer = '';
    santa.cool = 0;
    if (foe) santa.face = foe.x < santa.x ? -1 : 1;
    else if (held.left && !held.right) santa.face = -1;
    else if (held.right && !held.left) santa.face = 1;
  }

  function requestAttack(name) {
    if (state !== 'play') return;
    if (santa.down > 0) return;
    if (santa.stun > 0 || santa.atk || santa.cool > 0) {
      santa.buffer = name;
      return;
    }
    beginAttack(name);
  }

  function hurtFoe(e, dmg) {
    e.hp -= dmg;
    e.x = clamp(e.x + santa.face * 22, 40, WORLD_R);
    e.y = clamp(e.y + (e.y >= santa.y ? 10 : -10), BAND_TOP + 16, BAND_BOT - 8);
    if (!reduceMotion()) shake = dmg > 1 ? 7 : 4;
    sfx('action');
    if (e.hp <= 0) {
      e.hp = 0;
      e.state = 'out';
      e.t = 0;
      e.anim = 'defeat';
      e.animT = 0;
      e.alpha = 1;
      say('A guard flashes and vanishes.');
    } else {
      e.state = 'hurt';
      e.t = 0.26;
      e.anim = 'hit';
      e.animT = 0;
      say('The mitten lands.');
    }
  }

  function strike() {
    var clip = CLIP.santa[santa.atk];
    var i;
    var e;
    var dx;
    var dy;
    var best = null;
    var bestD = clip.reach;
    for (i = 0; i < foes.length; i++) {
      e = foes[i];
      if (e.state === 'gone' || e.state === 'out' || e.hp <= 0) continue;
      dx = (e.x - santa.x) * santa.face;
      dy = Math.abs(e.y - santa.y);
      if (dx > -12 && dx < bestD && dy < 52) {
        best = e;
        bestD = dx;
      }
    }
    if (best) hurtFoe(best, clip.dmg);
  }

  function hurtSanta(from) {
    if (santa.iframe > 0 || santa.down > 0) return;
    santa.hp -= 1;
    santa.iframe = 0.62;
    santa.stun = 0.2;
    santa.atk = '';
    santa.buffer = '';
    santa.face = from.x < santa.x ? -1 : 1;
    santa.x = clamp(santa.x - santa.face * 34, 48, WORLD_R);
    santa.y = clamp(santa.y + (santa.y < from.y ? -16 : 16), BAND_TOP + 12, BAND_BOT - 8);
    if (!reduceMotion()) shake = 7;
    sfx('wrong');
    if (santa.hp <= 0) {
      santa.hp = 0;
      santa.down = 1.2;
      santa.stun = 0;
      say('Santa sits down dizzy.');
    } else {
      say('Santa staggers. ' + santa.hp + ' hit points left.');
    }
  }

  function foeStrike(e) {
    var dx = (santa.x - e.x) * e.face;
    var dy = Math.abs(santa.y - e.y);
    if (dx > -8 && dx < KIND[e.kind].reach && dy < 46) hurtSanta(e);
  }

  function spawnWave(wave) {
    wave.spawned = true;
    wave.sent++;
    wave.nextAt = played + 5;
    for (var i = 0; i < wave.foes.length; i++) {
      if (yardPassage || gateFight) wave.pending.push({ index: i, at: played + i * .45 });
      else spawnFoe(wave, i);
    }
    // The gatehouse gets a second, individually timed group.
    // Its first guard follows the last original batch by two seconds.
    if (wave.extraGroup && wave.sent === wave.batches) {
      var afterOriginal = played + (wave.foes.length - 1) * .45;
      for (var extra = 0; extra < wave.foes.length * wave.batches; extra++) {
        wave.pending.push({ index: extra % wave.foes.length, at: afterOriginal + (extra + 1) * 2 });
      }
    }
    releaseEntrants(wave);
  }

  function releaseEntrants(wave) {
    while (wave.pending.length && played >= wave.pending[0].at) {
      if (gateFight && living() >= GATE_GUARD_LIMIT) break;
      spawnFoe(wave, wave.pending.shift().index);
      if (gateFight && wave.pending.length) wave.pending[0].at = Math.max(wave.pending[0].at, played + .45);
    }
  }

  function spawnFoe(wave, i) {
    var slots = [0.24, 0.43, 0.63, 0.81];
    var spec = wave.foes[i];
    var e = {
      kind: spec.k,
      x: spec.side === 'right' ? cam + VIEW_W + 36 + i * 38 : cam - 36 - i * 38,
      y: BAND_TOP + BAND_H * slots[i % slots.length],
      face: spec.side === 'right' ? -1 : 1,
      hp: KIND[spec.k].hp,
      state: 'go',
      t: 0,
      cool: 0.35 + i * 0.12,
      anim: 'walk',
      animT: Math.random() * 0.4,
      hitDone: false,
      alpha: 1,
      aimY: 0
    };
    e.x = clamp(e.x, 24, WORLD_R);
    foes.push(e);
    wave.members.push(e);
  }

  function considerSpawns() {
    var i;
    var wave;
    var line;
    for (i = 0; i < waves.length; i++) {
      wave = waves[i];
      releaseEntrants(wave);
      if (waveClear(wave)) continue;
      line = wave.at * WALK;
      if ((!wave.spawned && (santa.x - START_X) * OUTBOUND >= line - 6) ||
          (wave.spawned && wave.sent < wave.batches && played >= wave.nextAt)) spawnWave(wave);
      if (gateFight) return;
    }
  }

  function updateFoe(e, dt) {
    var kind = KIND[e.kind];
    var dx;
    var dy;
    var dist;
    var dur;
    var prev;
    var when;
    if (e.cool > 0) e.cool -= dt;
    if (e.state === 'gone') return;
    if (e.state === 'out') {
      e.anim = 'defeat';
      e.animT += dt;
      e.t += dt;
      if (reduceMotion()) e.alpha = e.t > 0.32 ? 0 : 1;
      else e.alpha = (Math.floor(e.t * 16) % 2) ? 0.12 : 1;
      if (e.t > 0.5) {
        e.state = 'gone';
        e.alpha = 0;
      }
      return;
    }
    if (santa.down > 0) {
      e.anim = 'idle';
      e.animT += dt;
      return;
    }
    if (e.state === 'hurt') {
      e.anim = 'hit';
      e.animT += dt;
      e.t -= dt;
      if (e.t <= 0) e.state = 'go';
      return;
    }
    dx = santa.x - e.x;
    dy = santa.y - e.y;
    if (dx < 0) e.face = -1;
    else e.face = 1;
    if (e.state === 'wind') {
      e.animT = 0;
      e.y += (e.aimY - e.y) * Math.min(1, dt * 1.4);
      e.t -= dt;
      if (e.t <= 0) {
        e.state = 'swing';
        e.t = 0;
        e.hitDone = false;
        e.animT = 0;
      }
      return;
    }
    if (e.state === 'swing') {
      dur = swingDur(e.kind, e.anim);
      prev = e.t;
      e.t += dt;
      e.animT = e.t;
      when = hitAt(e.kind, e.anim);
      if (!e.hitDone && prev < when && e.t >= when) {
        e.hitDone = true;
        foeStrike(e);
      }
      if (e.t >= dur) {
        e.state = 'go';
        e.cool = kind.cool;
        e.anim = 'idle';
        e.animT = 0;
      }
      return;
    }
    if (Math.abs(dx) < kind.reach * 0.88 && Math.abs(dy) < 45 && e.cool <= 0) {
      e.state = 'wind';
      e.anim = !e.attacked || Math.random() < kind.jab ? 'punch' : 'upper';
      e.attacked = true;
      e.t = kind.wind + (e.anim === 'upper' ? 0.2 : 0);
      e.aimY = santa.y;
      e.animT = 0;
      return;
    }
    dist = Math.sqrt(dx * dx + dy * dy) || 1;
    if (Math.abs(dx) > kind.reach * 0.5 || Math.abs(dy) > 34) {
      e.x += dx / dist * kind.speed * dt;
      e.y += dy / dist * kind.speed * 0.92 * dt;
      e.anim = 'walk';
    } else {
      e.anim = 'idle';
    }
    e.animT += dt;
    e.x = clamp(e.x, 20, WORLD_R);
    e.y = clamp(e.y, BAND_TOP + 16, BAND_BOT - 8);
  }

  function separateFoes() {
    var i;
    var j;
    var a;
    var b;
    var dx;
    var push;
    for (i = 0; i < foes.length; i++) {
      for (j = i + 1; j < foes.length; j++) {
        a = foes[i];
        b = foes[j];
        if (a.state === 'gone' || b.state === 'gone' || a.state === 'out' || b.state === 'out') continue;
        dx = b.x - a.x;
        if (Math.abs(dx) < 36 && Math.abs(b.y - a.y) < 28) {
          push = dx >= 0 ? 1 : -1;
          a.x -= push * 10;
          b.x += push * 10;
          if (b.y >= a.y) b.y += 8;
          else a.y += 8;
        }
      }
    }
  }

  function updatePickups() {
    if (cellPassage && !keyTaken && waveClear(waves[waves.length - 1]) && Math.abs(cellKey.x - santa.x) < 48 &&
        Math.abs(cellKey.y - santa.y) < 46) {
      keyTaken = true;
      say('Key collected. Return to the exit halfway back.');
    }
    var i;
    var p;
    for (i = 0; i < picks.length; i++) {
      p = picks[i];
      if (p.got) continue;
      if (Math.abs(p.x - santa.x) < 36 && Math.abs(p.y - santa.y) < 42) {
        if (p.stamina) {
          if (santa.stamina >= MAX_STAMINA) continue;
          santa.stamina = MAX_STAMINA;
          p.got = true;
          sfx('right');
          say('Cookie collected. Stamina restored.');
          continue;
        }
        if (santa.hp >= MAX_HP) continue;
        santa.hp += 1;
        p.got = true;
        sfx('right');
        say('Warm cocoa. Santa has ' + santa.hp + ' hit points.');
      }
    }
  }

  function update(dt) {
    var mx = 0;
    var my = 0;
    var moving;
    var prev;
    var when;
    var clip;
    var i;
    santa.stamina = Math.min(MAX_STAMINA, santa.stamina + STAMINA_REFILL * dt);
    santa.staminaWarning = Math.max(0, santa.staminaWarning - dt);
    if (santa.iframe > 0) santa.iframe -= dt;
    if (santa.cool > 0) santa.cool -= dt;
    if (santa.down > 0) {
      santa.down -= dt;
      santa.anim = 'defeat';
      santa.animT += dt;
      if (santa.down <= 0) showLose();
      return;
    }
    if (santa.stun > 0) {
      santa.stun -= dt;
      santa.anim = 'hit';
      santa.animT += dt;
    }
    if (santa.atk) {
      clip = CLIP.santa[santa.atk];
      prev = santa.atkT;
      santa.atkT += dt;
      santa.anim = santa.atk;
      santa.animT = santa.atkT;
      when = hitAt('santa', santa.atk);
      if (!santa.hitDone && prev < when && santa.atkT >= when) {
        santa.hitDone = true;
        strike();
      }
      if (santa.atkT >= swingDur('santa', santa.atk)) {
        santa.cool = clip.cool;
        santa.atk = '';
        santa.anim = 'idle';
        santa.animT = 0;
      }
    } else if (santa.stun <= 0 && santa.buffer && santa.cool <= 0) {
      beginAttack(santa.buffer);
    }
    if (!santa.atk && santa.stun <= 0) {
      if (held.left) mx -= 1;
      if (held.right) mx += 1;
      if (held.up) my -= 1;
      if (held.down) my += 1;
      if (mx && my) {
        mx *= 0.707;
        my *= 0.707;
      }
      if (mx < 0) santa.face = -1;
      if (mx > 0) santa.face = 1;
      santa.x += mx * 360 * dt;
      santa.y += my * 230 * dt;
      moving = mx !== 0 || my !== 0;
      if (santa.anim !== (moving ? 'walk' : 'idle')) {
        santa.anim = moving ? 'walk' : 'idle';
        santa.animT = 0;
      } else {
        santa.animT += dt;
      }
    }
    santa.y = clamp(santa.y, BAND_TOP + 12, BAND_BOT - 8);
    santa.x = clamp(santa.x, 48, frontX());
    var leftLimit = santa.x - CAMERA_MARGIN * 2;
    var rightLimit = santa.x - CAMERA_MARGIN;
    cam = clamp(clamp(cam, leftLimit, rightLimit), 0, WORLD_R - VIEW_W);
    considerSpawns();
    santa.x = clamp(santa.x, 48, frontX());
    for (i = 0; i < foes.length; i++) updateFoe(foes[i], dt);
    separateFoes();
    for (i = 0; i < foes.length; i++) {
      foes[i].y = clamp(foes[i].y, BAND_TOP + 16, BAND_BOT - 8);
      foes[i].x = clamp(foes[i].x, 20, WORLD_R);
    }
    updatePickups();
    if (cellPassage) {
      if (keyTaken && Math.abs(santa.x - EXIT_X) < 58 && Math.abs(santa.y - EXIT_Y) < 62) win();
    } else if (allClear() && santa.x >= GATE_X - 18) win();
  }

  function drawYard() {
    var fence = FR.yardHorizon || 0.39;
    var drawH;
    var drawW;
    var originY;
    var i;
    var x;
    var start;
    ctx.fillStyle = '#10243c';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    if (!imageReady(yardImg)) return;
    drawH = (VIEW_H - BAND_TOP) / (1 - fence);
    drawW = drawH * (yardImg.naturalWidth / yardImg.naturalHeight);
    originY = BAND_TOP - fence * drawH;
    var offset = cellPassage ? 180 - drawW * 0.255 : 0;
    start = Math.floor((cam - offset) / drawW) - 1;
    for (i = start; i < start + 5; i++) {
      x = Math.round(offset + i * drawW - cam);
      if (cellPassage) {
        ctx.save();
        ctx.translate(x + drawW, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(yardImg, 0, originY, drawW + 1, drawH);
        ctx.restore();
      } else ctx.drawImage(yardImg, x, originY, drawW + 1, drawH);
    }
  }

  function drawSheet(kind, anim, frame, x, y, face, height, alpha) {
    var pack = FR[kind];
    var spec = pack[anim];
    var img = spec.img;
    var s;
    var i;
    if (!imageReady(img)) return;
    s = height / pack.h;
    i = frame;
    if (i < 0) i = 0;
    if (i >= spec.n) i = spec.n - 1;
    ctx.save();
    ctx.globalAlpha = alpha == null ? 1 : alpha;
    ctx.translate(x, y);
    if (face < 0) ctx.scale(-1, 1);
    var sourceFrame = spec.frames ? spec.frames[i] : i + (spec.start || 0);
    var columns = spec.columns || spec.n;
    ctx.drawImage(
      img,
      (sourceFrame % columns) * pack.w, Math.floor(sourceFrame / columns) * pack.h, pack.w, pack.h,
      -pack.ax * s,
      -pack.ay * s,
      pack.w * s,
      pack.h * s
    );
    ctx.restore();
  }

  function shadow(x, y, width, far) {
    ctx.fillStyle = 'rgba(18, 26, 44, ' + (far ? 0.16 : 0.28) + ')';
    ctx.beginPath();
    ctx.ellipse(x, y + 3, width, far ? 5 : 7, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawGate() {
    if (cellPassage) {
      var doorX = EXIT_X - cam;
      var label = exitLabel();
      if (imageReady(gateImg)) {
        var doorHeight = VIEW_H * .33;
        var doorWidth = doorHeight * gateImg.naturalWidth / gateImg.naturalHeight;
        ctx.drawImage(gateImg, doorX - doorWidth / 2, EXIT_Y - doorHeight, doorWidth, doorHeight);
      }
      ctx.save();
      ctx.font = 'bold 24px system-ui';
      ctx.textAlign = 'center';
      var width = ctx.measureText(label).width + 20;
      ctx.fillStyle = '#111b25';
      ctx.fillRect(doorX - width / 2, EXIT_Y - 156, width, 36);
      ctx.fillStyle = keyTaken ? '#c9ffc8' : '#ffe4a3';
      ctx.fillText(label, doorX, EXIT_Y - 130);
      if (!keyTaken) {
        ctx.fillStyle = '#ffe4a3';
        ctx.fillText(waveClear(waves[waves.length - 1]) ? 'Cell key' : 'Defeat the Key Warden', cellKey.x - cam, cellKey.y - 48);
        if (imageReady(keyImg)) ctx.drawImage(keyImg, cellKey.x - cam - 32, cellKey.y - 42, 64, 36);
      }
      ctx.restore();
      return;
    }
    if (!imageReady(gateImg)) return;
    var gh = VIEW_H * 0.58;
    var gw = gh * (gateImg.naturalWidth / gateImg.naturalHeight);
    ctx.drawImage(gateImg, GATE_X - cam - gw * 0.5, BAND_BOT - gh + 8, gw, gh);
  }

  function drawCocoa(p) {
    var bob = reduceMotion() ? 0 : Math.sin(visualTime * 3 + p.x) * 3;
    var s = 46;
    var gh;
    var art = p.stamina ? cookieImg : cocoaImg;
    if (!imageReady(art)) return;
    gh = s * (art.naturalHeight / art.naturalWidth);
    ctx.drawImage(art, p.x - cam - s * 0.5, p.y - gh + bob, s, gh);
  }

  function drawDots(e, height) {
    var i;
    var x0 = e.x - cam - (e.hp - 1) * 6;
    if (e.hp <= 0 || e.state === 'out' || e.state === 'gone') return;
    for (i = 0; i < e.hp; i++) {
      ctx.fillStyle = '#f3d7a2';
      ctx.beginPath();
      ctx.arc(x0 + i * 12, e.y - height - 10, 3.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawSnow() {
    var f;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    for (n = 0; n < flakes.length; n++) {
      f = flakes[n];
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function render() {
    var mag = reduceMotion() ? 0 : shake;
    var list = [];
    var i;
    var e;
    var h;
    var far;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssW, cssH);
    ctx.setTransform(
      dpr * view.s, 0, 0, dpr * view.s,
      dpr * (view.ox + Math.sin(visualTime * 40) * mag),
      dpr * view.oy
    );
    drawYard();
    drawGate();
    if (picks) {
      for (i = 0; i < picks.length; i++) {
        if (!picks[i].got) list.push({ y: picks[i].y, pick: picks[i] });
      }
    }
    if (foes) {
      for (i = 0; i < foes.length; i++) {
        e = foes[i];
        if (e.state === 'gone' || e.alpha <= 0) continue;
        list.push({ y: e.y, foe: e });
      }
    }
    if (santa) list.push({ y: santa.y, hero: true });
    list.sort(function (a, b) { return a.y - b.y; });
    for (i = 0; i < list.length; i++) {
      if (list[i].pick) {
        drawCocoa(list[i].pick);
        continue;
      }
      if (list[i].foe) {
        e = list[i].foe;
        h = SANTA_H * KIND[e.kind].h * depthMul(e.y);
        far = e.y < BAND_TOP + BAND_H * 0.45;
        shadow(e.x - cam, e.y, h * 0.22, far);
        drawSheet(e.kind, e.anim, clipFrame(e.kind, e.anim, e.animT), e.x - cam, e.y, e.face, h, e.alpha);
        if (KIND[e.kind].boss && e.state !== 'gone' && e.state !== 'out') {
          ctx.fillStyle = '#291a1a'; ctx.fillRect(e.x - cam - 60, e.y - h - 22, 120, 10);
          ctx.fillStyle = '#ef5247'; ctx.fillRect(e.x - cam - 60, e.y - h - 22, 120 * Math.max(0, e.hp) / KIND[e.kind].hp, 10);
          ctx.fillStyle = '#fff4d9'; ctx.font = 'bold 16px sans-serif'; ctx.textAlign = 'center';
          ctx.fillText(KIND[e.kind].boss + ' ' + Math.max(0, e.hp) + '/' + KIND[e.kind].hp, e.x - cam, e.y - h - 28);
        }
        drawDots(e, h);
        continue;
      }
      h = SANTA_H * depthMul(santa.y);
      shadow(santa.x - cam, santa.y, h * 0.2, false);
      drawSheet(
        'santa',
        santa.anim,
        clipFrame('santa', santa.anim, santa.animT),
        santa.x - cam,
        santa.y,
        santa.face,
        h,
        (santa.iframe > 0 && !reduceMotion() && Math.floor(visualTime * 16) % 2) ? 0.45 : 1
      );
    }
    if (!reduceMotion()) drawSnow();
    if (santa.staminaWarning > 0) drawStaminaWarning();
  }

  function drawStaminaWarning() {
    ctx.save();
    ctx.font = '800 28px system-ui';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    var text = 'Out of stamina';
    var width = ctx.measureText(text).width;
    var santaX = santa.x - cam;
    var x = santaX + 62;
    if (x + width > VIEW_W - 16) x = santaX - width - 62;
    var y = santa.y - SANTA_H * depthMul(santa.y) * 0.62;
    ctx.lineJoin = 'round';
    ctx.lineWidth = 7;
    ctx.strokeStyle = '#161d29';
    ctx.fillStyle = '#ffe3a6';
    ctx.strokeText(text, x, y);
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  function resize() {
    var rect = canvas.getBoundingClientRect();
    cssW = Math.max(1, rect.width);
    cssH = Math.max(1, rect.height);
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    view.s = Math.min(cssW / VIEW_W, cssH / VIEW_H);
    if (view.s < 0.01) view.s = 0.01;
    view.ox = (cssW - VIEW_W * view.s) / 2;
    view.oy = (cssH - VIEW_H * view.s) / 2;
  }

  function drift(dt) {
    var f;
    if (reduceMotion() || state === 'pause') return;
    for (n = 0; n < flakes.length; n++) {
      f = flakes[n];
      f.y += f.v * dt;
      f.x += f.drift * dt;
      if (f.y > VIEW_H + 4) {
        f.y = -4;
        f.x = Math.random() * VIEW_W;
      }
      if (f.x < -8) f.x = VIEW_W + 4;
      if (f.x > VIEW_W + 8) f.x = -4;
    }
  }

  function loop(now) {
    var dt = (now - lastFrame) / 1000;
    lastFrame = now;
    if (dt < 0) dt = 0;
    if (dt > 0.05) dt = 0.05;
    if (!santa) {
      santa = freshSanta();
      foes = [];
      waves = makeWaves();
      picks = makePicks();
    }
    if (state !== 'pause') visualTime += dt;
    if (state === 'play') {
      played += dt;
      update(dt);
      if (shake > 0) shake = Math.max(0, shake - dt * 22);
    }
    drift(dt);
    renderHud();
    render();
    requestAnimationFrame(loop);
  }

  function portraitWanted() {
    return window.TrentOrientation.blocked(true);
  }

  function syncPortrait() {
    var show = portraitWanted();
    portraitEl.hidden = !show || window.TrentOrientation.embedded;
    if (show && state === 'play') {
      rotateHold = true;
      openPause();
    } else if (!show && rotateHold && state === 'pause') {
      rotateHold = false;
      closePause();
    }
  }

  function bindHold(button, key) {
    button.addEventListener('pointerdown', function (event) {
      if (event.button !== 0) return;
      event.preventDefault();
      held[key] = true;
      pointers[event.pointerId] = key;
      button.classList.add('held');
      hintEl.hidden = true;
      if (button.setPointerCapture) button.setPointerCapture(event.pointerId);
    });
    function release(event) {
      if (pointers[event.pointerId] !== key) return;
      held[key] = false;
      delete pointers[event.pointerId];
      button.classList.remove('held');
    }
    button.addEventListener('pointerup', release);
    button.addEventListener('pointercancel', release);
    button.addEventListener('lostpointercapture', release);
    button.addEventListener('contextmenu', function (event) { event.preventDefault(); });
  }

  function bindAttack(button, name) {
    button.addEventListener('pointerdown', function (event) {
      if (event.button !== 0) return;
      event.preventDefault();
      event.currentTarget.classList.add('held');
      hintEl.hidden = true;
      requestAttack(name);
    });
    function up(event) {
      event.currentTarget.classList.remove('held');
    }
    button.addEventListener('pointerup', up);
    button.addEventListener('pointercancel', up);
    button.addEventListener('contextmenu', function (event) { event.preventDefault(); });
  }

  bindHold(document.getElementById('up'), 'up');
  bindHold(document.getElementById('down'), 'down');
  bindHold(document.getElementById('left'), 'left');
  bindHold(document.getElementById('right'), 'right');
  bindAttack(document.getElementById('punch'), 'punch');
  bindAttack(document.getElementById('upper'), 'upper');

  window.addEventListener('keydown', function (event) {
    var map = {
      arrowleft: 'left',
      arrowright: 'right',
      arrowup: 'up',
      arrowdown: 'down',
      a: 'left',
      d: 'right',
      w: 'up',
      s: 'down'
    };
    var key;
    if (event.key === 'Escape') {
      event.preventDefault();
      if (state === 'play') openPause();
      else if (state === 'pause') closePause();
      return;
    }
    if (event.repeat) return;
    if (event.key === 'j' || event.key === 'J' || event.key === 'z' || event.key === 'Z' || event.key === ' ') {
      event.preventDefault();
      hintEl.hidden = true;
      requestAttack('punch');
      return;
    }
    if (event.key === 'k' || event.key === 'K' || event.key === 'u' || event.key === 'U' || event.key === 'x' || event.key === 'X') {
      event.preventDefault();
      hintEl.hidden = true;
      requestAttack('upper');
      return;
    }
    key = map[event.key.toLowerCase()];
    if (!key) return;
    event.preventDefault();
    held[key] = true;
    hintEl.hidden = true;
  });

  window.addEventListener('keyup', function (event) {
    var map = {
      arrowleft: 'left',
      arrowright: 'right',
      arrowup: 'up',
      arrowdown: 'down',
      a: 'left',
      d: 'right',
      w: 'up',
      s: 'down'
    };
    var key = map[event.key.toLowerCase()];
    if (key) held[key] = false;
  });

  window.addEventListener('blur', function () {
    held.left = false;
    held.right = false;
    held.up = false;
    held.down = false;
  });

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) openPause();
  });
  window.addEventListener('pagehide', function () { openPause(); });

  document.getElementById('start').addEventListener('click', beginRun);
  document.getElementById('resume').addEventListener('click', closePause);
  document.getElementById('give-up').addEventListener('click', giveUp);
  document.getElementById('retry').addEventListener('click', beginRun);
  document.getElementById('retry-lose').addEventListener('click', beginRun);
  pauseBtn.addEventListener('click', function () {
    if (state === 'play') openPause();
    else if (state === 'pause') closePause();
  });
  window.TrentOrientation.subscribe(syncPortrait);
  window.addEventListener('resize', function () {
    resize();
    syncPortrait();
  });
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', function () {
      resize();
      syncPortrait();
    });
  }

  santa = freshSanta();
  cam = initialCamera();
  foes = [];
  waves = makeWaves();
  picks = makePicks();
  resize();
  syncPortrait();
  lastFrame = performance.now();
  requestAnimationFrame(loop);
})();
