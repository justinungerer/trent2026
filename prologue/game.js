/* D-Day prologue. Walk Trent from the landing craft to the seawall.
   Painted sprites in art/. Layout is documented in art/ART-SOURCES.md.

   Walk speed clears an open beach in about half a minute. Waves, detours,
   and soldiers make a careful run longer, still under three minutes. */
'use strict';

(function () {
  var canvas = document.getElementById('beach');
  var ctx = canvas.getContext('2d');
  var distanceEl = document.getElementById('distance');
  var marksEl = document.getElementById('marks');
  var pauseBtn = document.getElementById('pause');
  var braceBtn = document.getElementById('brace');
  var fireBtn = document.getElementById('fire');
  var hintEl = document.getElementById('hint');
  var startSheet = document.getElementById('start-sheet');
  var pauseSheet = document.getElementById('pause-sheet');
  var loseSheet = document.getElementById('lose-sheet');
  var winSheet = document.getElementById('win-sheet');
  var winTimeEl = document.getElementById('win-time');
  var winHoldEl = document.getElementById('win-hold');
  var portraitEl = document.getElementById('portrait');
  var statusEl = document.getElementById('status');

  var BEACH_W = 280;
  var RADIUS = 18;
  var MIN_X = 280;
  var START_X = 430;
  var START_Y = 124;
  var WALL_X = 7000;
  var GOAL_X = 6960;
  var SPEED = 240;
  var SHOT_SPEED = 700;
  var FIRE_GAP = 0.42;
  var SOLDIER_RANGE = 640;
  var TOTAL_METERS = 80;
  var STUMBLE_TIME = 1.05;
  var BRACED_PUSH = 0.18;

  /* Surf cycle, as a fraction of the period:
     calm until warnAt, foam climbs until hitAt, then the wash recedes. */
  var SURF = { period: 4.4, warnAt: 0.5, hitAt: 0.78, washEnd: 0.92 };

  var obstacles = [
    { kind: 'wire', x: 1160, y: 0, w: 50, h: 162 },
    { kind: 'hedgehog', x: 1720, y: 66, r: 26 },
    { kind: 'hedgehog', x: 1940, y: 176, r: 28 },
    { kind: 'hedgehog', x: 1740, y: 248, r: 24 },
    { kind: 'crater', x: 2920, y: 80, r: 36 },
    { kind: 'crater', x: 3160, y: 198, r: 40 },
    { kind: 'crater', x: 3000, y: 252, r: 22 },
    { kind: 'wire', x: 4040, y: 176, w: 52, h: 104 },
    { kind: 'hedgehog', x: 4360, y: 54, r: 22 },
    { kind: 'crater', x: 5000, y: 68, r: 32 },
    { kind: 'crater', x: 5220, y: 214, r: 36 },
    { kind: 'hedgehog', x: 5740, y: 206, r: 26 }
  ];

  /* reach is the dry line: y >= reach is in the wave. reach 0 covers the
     whole beach. Those full-width zones are longer than one calm gap, so
     Trent has to brace. The other zones can be walked on the high sand. */
  var waves = [
    { x0: 520, x1: 980, reach: 178, push: 280, offset: 0.4 },
    { x0: 1080, x1: 1700, reach: 0, push: 360, offset: 1.5 },
    { x0: 2140, x1: 2580, reach: 188, push: 260, offset: 0.9 },
    { x0: 2760, x1: 3520, reach: 150, push: 320, offset: 2.0 },
    { x0: 3920, x1: 4640, reach: 0, push: 380, offset: 0.6 },
    { x0: 4860, x1: 5560, reach: 158, push: 300, offset: 1.8 },
    { x0: 6120, x1: 6880, reach: 0, push: 420, offset: 1.2 }
  ];

  var smokes = [
    { x: 2680, w: 920 },
    { x: 4760, w: 860 }
  ];

  var puffs = buildPuffs();

  var state = 'title';
  var pausedState = 'play';
  var player = { x: START_X, y: START_Y, stumbles: 0, step: 0, facing: 1 };
  var seaTime = 0;
  var visualTime = 0;
  var stumbleT = 0;
  var lean = 0;
  var shake = 0;
  var cameraX = 0;
  var cssW = 844;
  var cssH = 390;
  var dpr = 1;
  var sandTop = 100;
  var sandH = 200;
  var scale = 1;
  var runStart = 0;
  var pauseAccum = 0;
  var pauseBegan = 0;
  var victorySent = false;
  var stick = document.getElementById('stick');
  var stickKnob = document.getElementById('stick-knob');
  var rotateHold = false;

  var keys = new Set();
  var keyBrace = false;
  var bracePointer = false;
  var keyFire = false;
  var firePointer = false;
  var fireQueued = false;
  var aim = { x: 1, y: 0 };
  var fireLeft = 0;
  var flash = 0;
  var shots = [];
  var hazards = [];
  var soldiers = [];
  var dragging = false;
  var dragId = null;
  var dragX = 0;
  var dragY = 0;
  var originX = 0;
  var originY = 0;
  var lastFrame = 0;

  var motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  var portraitQuery = window.matchMedia('(orientation: portrait)');

  /* trent.webp: 14 equal frames, feet on one baseline.
     idle 2, walk 6, brace 2, stumble 4. Anchor is the feet. */
  var TRENT = { w: 539, h: 574, anchorX: 327, anchorY: 564 };
  /* soldier.webp: 10 equal frames, feet on one baseline.
     walk 4, fire 2, hit 2, wrap 2. Anchor is the feet. */
  var SOLDIER = { w: 516, h: 552, anchorX: 206, anchorY: 539 };
  var trentImg = new Image();
  var soldierImg = new Image();
  var beachImg = new Image();
  var craftImg = new Image();
  var wallImg = new Image();
  var hedgehogImg = new Image();
  var wireImg = new Image();
  trentImg.src = 'art/trent.webp';
  soldierImg.src = 'art/soldier.webp';
  beachImg.src = 'art/beach.webp';
  craftImg.src = 'art/craft.webp';
  wallImg.src = 'art/seawall.webp';
  hedgehogImg.src = 'art/hedgehog.webp';
  wireImg.src = 'art/wire.webp';

  var moving = false;

  function reduceMotion() {
    return motionQuery.matches;
  }

  function clamp(v, a, b) {
    if (v < a) return a;
    if (v > b) return b;
    return v;
  }

  function unit() {
    return clamp(cssH / 390, 0.85, 1.25);
  }

  function buildPuffs() {
    var list = [];
    var s;
    var i;
    for (s = 0; s < smokes.length; s++) {
      for (i = 0; i < 12; i++) {
        list.push({
          x: smokes[s].x + ((i + 0.35) / 12) * smokes[s].w,
          y: 24 + ((i * 97 + s * 40) % 230),
          rad: 84 + (i % 4) * 28,
          phase: i * 1.4 + s
        });
      }
    }
    return list;
  }

  function resetWorld() {
    player.x = START_X;
    player.y = START_Y;
    player.stumbles = 0;
    player.step = 0;
    player.facing = 1;
    moving = false;
    seaTime = 0;
    stumbleT = 0;
    lean = 0;
    shake = 0;
    aim.x = 1;
    aim.y = 0;
    fireLeft = 0;
    flash = 0;
    shots = [];
    hazards = [];
    soldiers = makeSoldiers();
    clearFireHold();
    var i;
    for (i = 0; i < waves.length; i++) {
      waves[i].prevU = phaseU(waves[i], 0);
    }
    renderHud();
  }

  function phaseU(wave, time) {
    var local = (time + wave.offset) % SURF.period;
    if (local < 0) local += SURF.period;
    return local / SURF.period;
  }

  function surfMode(u) {
    if (u < SURF.warnAt || u >= SURF.washEnd) return 'calm';
    if (u < SURF.hitAt) return 'warn';
    return 'wash';
  }

  function foamAmount(u) {
    if (u < SURF.warnAt || u >= SURF.washEnd) return 0;
    if (reduceMotion()) return 1;
    if (u < SURF.hitAt) {
      var t = (u - SURF.warnAt) / (SURF.hitAt - SURF.warnAt);
      return t * t;
    }
    return 1 - (u - SURF.hitAt) / (SURF.washEnd - SURF.hitAt);
  }

  function isBracing() {
    return bracePointer || keyBrace;
  }

  function hitsObstacle(o, x, y) {
    var dx;
    var dy;
    var rad;
    if (o.kind === 'wire') {
      dx = x - clamp(x, o.x, o.x + o.w);
      dy = y - clamp(y, o.y, o.y + o.h);
      return dx * dx + dy * dy < RADIUS * RADIUS;
    }
    dx = x - o.x;
    dy = y - o.y;
    rad = RADIUS + o.r;
    return dx * dx + dy * dy < rad * rad;
  }

  function blocked(x, y) {
    var i;
    if (x < MIN_X) return true;
    if (y < RADIUS || y > BEACH_W - RADIUS) return true;
    for (i = 0; i < obstacles.length; i++) {
      if (hitsObstacle(obstacles[i], x, y)) return true;
    }
    return false;
  }

  function tryMove(dx, dy) {
    var nx = player.x + dx;
    var ny = player.y + dy;
    if (nx > GOAL_X) nx = GOAL_X;
    if (!blocked(nx, ny)) {
      player.x = nx;
      player.y = ny;
      return;
    }
    if (!blocked(nx, player.y)) {
      player.x = nx;
      return;
    }
    if (!blocked(player.x, ny)) player.y = ny;
  }

  function pushBack(dist) {
    var left = dist;
    var step;
    while (left > 0.5) {
      step = Math.min(4, left);
      if (blocked(player.x - step, player.y)) break;
      player.x -= step;
      left -= step;
    }
  }

  function keyboardVector() {
    var x = 0;
    var y = 0;
    var m;
    if (keys.has('arrowleft') || keys.has('a')) x -= 1;
    if (keys.has('arrowright') || keys.has('d')) x += 1;
    if (keys.has('arrowup') || keys.has('w')) y -= 1;
    if (keys.has('arrowdown') || keys.has('s')) y += 1;
    if (x === 0 && y === 0) return { x: 0, y: 0 };
    m = Math.hypot(x, y);
    return { x: x / m, y: y / m };
  }

  function touchVector() {
    var m;
    var u;
    if (!dragging) return { x: 0, y: 0 };
    m = Math.hypot(dragX, dragY);
    if (m < 16) return { x: 0, y: 0 };
    u = Math.min(1, (m - 16) / 56);
    return { x: (dragX / m) * u, y: (dragY / m) * u };
  }

  function controlVector() {
    var keysVec = keyboardVector();
    if (keysVec.x !== 0 || keysVec.y !== 0) return keysVec;
    return touchVector();
  }

  function smokeCover(x) {
    var cover = 0;
    var i;
    var fade;
    for (i = 0; i < smokes.length; i++) {
      if (x < smokes[i].x || x > smokes[i].x + smokes[i].w) continue;
      fade = Math.min(48, x - smokes[i].x, smokes[i].x + smokes[i].w - x) / 48;
      cover = Math.max(cover, 0.92 * clamp(fade, 0, 1));
    }
    return cover;
  }

  function obstacleAlpha(x, y) {
    var dist = Math.hypot(x - player.x, y - player.y);
    var reveal = 1;
    if (dist < 168) reveal = Math.max(0, (dist - 40) / 128);
    return 1 - smokeCover(x) * reveal * 0.94;
  }

  function metersLeft() {
    var span = GOAL_X - START_X;
    var left = Math.max(0, GOAL_X - player.x);
    return Math.round((left / span) * TOTAL_METERS);
  }

  function renderHud() {
    var dots;
    var i;
    distanceEl.textContent = metersLeft() + ' m';
    dots = marksEl.querySelectorAll('i');
    for (i = 0; i < dots.length; i++) {
      dots[i].classList.toggle('used', i < player.stumbles);
    }
    marksEl.setAttribute('aria-label', player.stumbles + ' of 3 stumbles');
  }

  function elapsedMs() {
    var now = performance.now();
    var paused = pauseAccum;
    if (state === 'pause') paused += now - pauseBegan;
    return Math.max(0, now - runStart - paused);
  }

  function formatClock(totalSeconds) {
    var m = Math.floor(totalSeconds / 60);
    var s = totalSeconds % 60;
    return m + ':' + String(s).padStart(2, '0');
  }

  function say(text) {
    statusEl.textContent = text;
  }

  function beginRun() {
    resetWorld();
    runStart = performance.now();
    pauseAccum = 0;
    state = 'play';
    startSheet.hidden = true;
    pauseSheet.hidden = true;
    loseSheet.hidden = true;
    winSheet.hidden = true;
    winHoldEl.hidden = true;
    say('On the beach.');
  }

  function openPause() {
    if (state !== 'play' && state !== 'stumble') return;
    pausedState = state;
    pauseBegan = performance.now();
    state = 'pause';
    pauseSheet.hidden = false;
    keyBrace = false;
    bracePointer = false;
    braceBtn.classList.remove('held');
    clearFireHold();
    dragging = false;
    dragX = 0;
    dragY = 0;
  }

  function closePause() {
    if (state !== 'pause') return;
    pauseAccum += performance.now() - pauseBegan;
    state = pausedState || 'play';
    pauseSheet.hidden = true;
    lastFrame = performance.now();
  }

  function startStumble() {
    player.stumbles += 1;
    state = 'stumble';
    stumbleT = 0;
    player.facing = 1;
    renderHud();
    say('Stumble ' + player.stumbles + ' of 3.');
  }

  function lose() {
    if (state === 'lose' || state === 'win') return;
    state = 'lose';
    loseSheet.hidden = false;
    say('Three stumbles. Back at the landing craft.');
  }

  function win() {
    var seconds;
    if (state === 'win') return;
    seconds = Math.max(0, Math.round(elapsedMs() / 1000));
    state = 'win';
    player.x = GOAL_X;
    winTimeEl.textContent = 'Time on the sand: ' + formatClock(seconds);
    winHoldEl.hidden = true;
    winSheet.hidden = false;
    say('The seawall. ' + seconds + ' seconds.');
    if (!victorySent) {
      victorySent = true;
      window.dispatchEvent(new CustomEvent('prologue:complete', {
        detail: { seconds: seconds }
      }));
      if (window.parent !== window) {
        var relay = { type: 'prologue:complete', detail: { seconds: seconds } };
        try {
          var relayRun = new URLSearchParams(location.search).get('runId');
          if (relayRun) relay.runId = relayRun;
        } catch (ignoreRelay) {}
        window.parent.postMessage(relay, (location.protocol === 'http:' || location.protocol === 'https:') ? location.origin : '*');
      }
    }
  }

  function strike(wave) {
    if (state !== 'play') return;
    if (player.x < wave.x0 || player.x > wave.x1) return;
    if (player.y < wave.reach) return;
    if (isBracing()) {
      pushBack(wave.push * BRACED_PUSH);
      lean = 0.28;
      return;
    }
    pushBack(wave.push);
    if (!reduceMotion()) shake = 9;
    startStumble();
  }

  function updateWaves() {
    var i;
    var u;
    var wave;
    for (i = 0; i < waves.length; i++) {
      wave = waves[i];
      u = phaseU(wave, seaTime);
      if (wave.prevU < SURF.hitAt && u >= SURF.hitAt && u < SURF.washEnd) strike(wave);
      wave.prevU = u;
    }
  }

  function clearFireHold() {
    keyFire = false;
    firePointer = false;
    fireQueued = false;
    fireBtn.classList.remove('held');
  }

  function makeSoldiers() {
    var spots = [
      { x: 1320, y: 36, wrap: false },
      { x: 1880, y: 118, wrap: true },
      { x: 2360, y: 64, wrap: false },
      { x: 3300, y: 40, wrap: true },
      { x: 3800, y: 214, wrap: false },
      { x: 4480, y: 136, wrap: true },
      { x: 5400, y: 42, wrap: false },
      { x: 6400, y: 176, wrap: true }
    ];
    var list = [];
    var i;
    for (i = 0; i < spots.length; i++) {
      list.push({
        x: spots[i].x,
        y: spots[i].y,
        wrap: spots[i].wrap,
        mode: 'stand',
        t: 0,
        cool: 1.1 + (i % 4) * 0.45,
        facing: -1,
        away: 1
      });
    }
    return list;
  }

  function aimUnit() {
    var m = Math.hypot(aim.x, aim.y);
    if (m < 0.05) return { x: player.facing < 0 ? -1 : 1, y: 0 };
    return { x: aim.x / m, y: aim.y / m };
  }

  function stopSoldier(s) {
    s.t = 0;
    if (s.wrap) {
      s.mode = 'parcel';
      return;
    }
    s.mode = 'back';
    s.away = player.x <= s.x ? 1 : -1;
  }

  function soldierAttack(s) {
    var dx = player.x - s.x;
    var dy = player.y - s.y;
    var dist = Math.hypot(dx, dy) || 1;
    var ang;
    if (Math.random() < 0.55) {
      ang = Math.atan2(dy, dx) + (Math.random() - 0.5) * 0.22;
      hazards.push({
        kind: 'gunfire',
        x: s.x + (dx / dist) * 22,
        y: s.y + (dy / dist) * 22,
        vx: Math.cos(ang) * 520,
        vy: Math.sin(ang) * 520,
        life: 1.45,
        spent: false,
        hop: 0
      });
      return;
    }
    hazards.push({
      kind: 'grenade',
      x: s.x,
      y: s.y,
      x0: s.x,
      y0: s.y,
      tx: clamp(player.x + (Math.random() - 0.5) * 120, MIN_X, GOAL_X),
      ty: clamp(player.y + (Math.random() - 0.5) * 80, 24, BEACH_W - 24),
      t: 0,
      flight: 0.9 + Math.random() * 0.35,
      life: 0.3,
      r: 34,
      hop: 0,
      spent: false
    });
  }

  function updateSoldiers(dt, allowFire) {
    var i;
    var s;
    var dx;
    var dy;
    var dist;
    for (i = soldiers.length - 1; i >= 0; i--) {
      s = soldiers[i];
      if (s.mode === 'gone') {
        soldiers.splice(i, 1);
        continue;
      }
      if (s.mode === 'back') {
        s.t += dt;
        s.x += s.away * 150 * dt;
        if (s.t > 0.62) s.mode = 'gone';
        continue;
      }
      if (s.mode === 'parcel') {
        if (s.t < 1) s.t = Math.min(1, s.t + dt / 0.28);
        continue;
      }
      s.facing = player.x < s.x ? -1 : 1;
      if (!allowFire) continue;
      s.cool -= dt;
      if (s.cool > 0) continue;
      dx = player.x - s.x;
      dy = player.y - s.y;
      dist = Math.hypot(dx, dy);
      if (dist > SOLDIER_RANGE) {
        s.cool = 0.4;
        continue;
      }
      s.cool = 2.15 + Math.random() * 2.2;
      if (Math.random() < 0.8) soldierAttack(s);
    }
  }

  function hazardHits(h, hitR) {
    var dx = h.x - player.x;
    var dy = h.y - player.y;
    return dx * dx + dy * dy < hitR * hitR;
  }

  function updateHazards(dt) {
    var i;
    var h;
    var u;
    var hitR;
    var remove;
    for (i = hazards.length - 1; i >= 0; i--) {
      h = hazards[i];
      remove = false;
      hitR = 0;
      if (h.kind === 'gunfire') {
        h.life -= dt;
        h.x += h.vx * dt;
        h.y += h.vy * dt;
        hitR = 22;
        if (h.life <= 0 || h.y < -40 || h.y > BEACH_W + 40 || h.x < MIN_X - 240 || h.x > WALL_X + 80) remove = true;
      } else if (h.kind === 'grenade') {
        h.t += dt;
        u = h.t / h.flight;
        if (u >= 1) {
          h.kind = 'burst';
          h.x = h.tx;
          h.y = h.ty;
          h.t = 0;
          h.life = 0.3;
          h.hop = 0;
          hitR = h.r;
        } else {
          h.x = h.x0 + (h.tx - h.x0) * u;
          h.y = h.y0 + (h.ty - h.y0) * u;
          h.hop = Math.sin(Math.min(1, u) * Math.PI);
          hitR = 18;
        }
      } else {
        h.t += dt;
        h.life -= dt;
        hitR = h.r;
        if (h.life <= 0) remove = true;
      }
      if (!remove && !h.spent && hitR > 0 && hazardHits(h, hitR)) {
        h.spent = true;
        if (h.kind !== 'burst') remove = true;
        if (state === 'play') {
          if (!reduceMotion()) shake = 7;
          startStumble();
        }
      }
      if (remove) hazards.splice(i, 1);
    }
  }

  function updateShots(dt) {
    var i;
    var j;
    var shot;
    var s;
    var dx;
    var dy;
    for (i = shots.length - 1; i >= 0; i--) {
      shot = shots[i];
      shot.life -= dt;
      shot.x += shot.vx * dt;
      shot.y += shot.vy * dt;
      if (shot.life <= 0 || shot.y < -30 || shot.y > BEACH_W + 30 || shot.x < -200 || shot.x > WALL_X + 40) {
        shots.splice(i, 1);
        continue;
      }
      for (j = 0; j < soldiers.length; j++) {
        s = soldiers[j];
        if (s.mode !== 'stand') continue;
        dx = shot.x - s.x;
        dy = shot.y - s.y;
        if (dx * dx + dy * dy < 32 * 32) {
          stopSoldier(s);
          shots.splice(i, 1);
          break;
        }
      }
    }
  }

  function tryShoot() {
    var dir;
    if (state !== 'play') return;
    if (fireLeft > 0) return;
    if (!fireQueued && !keyFire && !firePointer) return;
    fireQueued = false;
    fireLeft = FIRE_GAP;
    flash = 0.08;
    dir = aimUnit();
    shots.push({
      x: player.x + dir.x * 18,
      y: player.y + dir.y * 18,
      vx: dir.x * SHOT_SPEED,
      vy: dir.y * SHOT_SPEED,
      life: 1.05
    });
  }

  function tickWeapons(dt) {
    if (fireLeft > 0) fireLeft = Math.max(0, fireLeft - dt);
    if (flash > 0) flash = Math.max(0, flash - dt);
  }

  function updatePlay(dt) {
    var stick = controlVector();
    var beforeX = player.x;
    var beforeY = player.y;
    var moved;
    var bracing = isBracing();
    if (stick.x !== 0 || stick.y !== 0) {
      hintEl.hidden = true;
      aim.x = stick.x;
      aim.y = stick.y;
      if (stick.x < -0.25) player.facing = -1;
      else if (stick.x > 0.25) player.facing = 1;
    }
    if (!bracing) tryMove(stick.x * SPEED * dt, stick.y * SPEED * dt);
    moved = Math.hypot(player.x - beforeX, player.y - beforeY);
    moving = !bracing && moved > 0.01;
    if (moving) player.step += moved * 0.09;
    if (lean > 0) lean = Math.max(0, lean - dt);
    if (player.x >= GOAL_X) {
      win();
      return;
    }
    tickWeapons(dt);
    tryShoot();
    updateShots(dt);
    updateSoldiers(dt, true);
    updateHazards(dt);
    updateWaves();
  }

  function updateStumble(dt) {
    stumbleT += dt;
    tickWeapons(dt);
    updateShots(dt);
    updateSoldiers(dt, false);
    updateHazards(dt);
    updateWaves();
    if (stumbleT < STUMBLE_TIME) return;
    if (player.stumbles >= 3) lose();
    else state = 'play';
  }

  function braceNeeded() {
    var i;
    var wave;
    var mode;
    if (state !== 'play') return false;
    for (i = 0; i < waves.length; i++) {
      wave = waves[i];
      mode = surfMode(phaseU(wave, seaTime));
      if (mode === 'calm') continue;
      if (player.x < wave.x0 || player.x > wave.x1) continue;
      if (player.y < wave.reach) continue;
      return true;
    }
    return false;
  }

  function refreshBrace() {
    var hot = braceNeeded();
    var held = isBracing() && (state === 'play' || state === 'stumble');
    braceBtn.classList.toggle('warn', hot && !held);
    braceBtn.classList.toggle('held', held);
    braceBtn.setAttribute('aria-pressed', held ? 'true' : 'false');
  }

  function refreshFire() {
    var held = (keyFire || firePointer) && (state === 'play' || state === 'stumble');
    fireBtn.classList.toggle('held', held);
    fireBtn.setAttribute('aria-pressed', held ? 'true' : 'false');
  }

  function worldToX(x) { return (x - cameraX) * scale; }
  function worldToY(y) { return sandTop + y * scale; }

  function frameCamera() {
    var view = cssW / Math.max(scale, 0.001);
    var cam = player.x - view * 0.34;
    var minCam = -180;
    var maxCam = WALL_X + 220 - view;
    if (maxCam < minCam) cam = minCam;
    else cam = clamp(cam, minCam, maxCam);
    cameraX = cam;
  }

  function imageReady(img) {
    return !!(img && img.complete && img.naturalWidth > 0);
  }

  function drawBeach() {
    var iw;
    var ih;
    var destW;
    var destH;
    var span;
    var t;
    var x;
    if (!imageReady(beachImg)) return;
    iw = beachImg.naturalWidth;
    ih = beachImg.naturalHeight;
    destH = cssH;
    destW = Math.max(cssW * 1.12, destH * (iw / ih));
    span = Math.max(1, WALL_X + 180);
    t = clamp((cameraX + 180) / span, 0, 1);
    x = -(destW - cssW) * t;
    ctx.drawImage(beachImg, x, 0, destW, destH);
  }

  function drawCraft() {
    var w;
    var h;
    var rampX;
    var baseY;
    if (!imageReady(craftImg)) return;
    w = 260 * unit();
    h = w * (craftImg.naturalHeight / craftImg.naturalWidth);
    rampX = worldToX(500);
    baseY = worldToY(214);
    ctx.drawImage(craftImg, rampX - w, baseY - h, w, h);
  }

  function drawCrater(o, alpha) {
    var x = worldToX(o.x);
    var y = worldToY(o.y);
    var rx = o.r * scale * 1.2;
    var ry = Math.max(4, o.r * scale * 0.7);
    if (rx < 2) return;
    var g = ctx.createRadialGradient(x - rx * 0.2, y - ry * 0.25, ry * 0.15, x, y, rx);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = 'rgba(86, 84, 78, 0.35)';
    ctx.beginPath();
    ctx.ellipse(x, y + ry * 0.2, rx * 1.08, ry * 1.05, 0, 0, Math.PI * 2);
    ctx.fill();
    g.addColorStop(0, '#4e504c');
    g.addColorStop(0.72, '#3a3c38');
    g.addColorStop(1, '#9a968e');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(236, 232, 224, 0.55)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(x, y, rx * 0.9, ry * 0.88, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  function drawWire(o, alpha) {
    var dh;
    var dw;
    var cx;
    var top;
    if (!imageReady(wireImg)) return;
    dh = o.h * scale;
    dw = dh * (wireImg.naturalWidth / wireImg.naturalHeight);
    cx = worldToX(o.x + o.w / 2);
    top = worldToY(o.y);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.drawImage(wireImg, cx - dw / 2, top, dw, dh);
    ctx.restore();
  }

  function drawHedgehog(o, alpha) {
    var d;
    if (!imageReady(hedgehogImg)) return;
    d = o.r * scale * 3.1;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.drawImage(hedgehogImg, worldToX(o.x) - d / 2, worldToY(o.y) - d / 2, d, d);
    ctx.restore();
  }

  function drawObstacles() {
    var i;
    var o;
    var alpha;
    for (i = 0; i < obstacles.length; i++) {
      o = obstacles[i];
      if (o.kind !== 'crater') continue;
      alpha = obstacleAlpha(o.x, o.y);
      if (alpha < 0.04) continue;
      drawCrater(o, alpha);
    }
    for (i = 0; i < obstacles.length; i++) {
      o = obstacles[i];
      if (o.kind === 'crater') continue;
      alpha = obstacleAlpha(o.kind === 'wire' ? o.x + o.w / 2 : o.x, o.kind === 'wire' ? o.y + o.h / 2 : o.y);
      if (alpha < 0.04) continue;
      if (o.kind === 'wire') drawWire(o, alpha);
      else drawHedgehog(o, alpha);
    }
  }

  function drawWall() {
    var h;
    var w;
    var x;
    var y;
    if (!imageReady(wallImg)) return;
    h = sandH * 1.08;
    w = h * (wallImg.naturalWidth / wallImg.naturalHeight);
    x = worldToX(WALL_X) - w * 0.06;
    y = sandTop + sandH - h + 12;
    if (x > cssW + 40) return;
    ctx.drawImage(wallImg, x, y, w, h);
  }

  function drawSmoke() {
    var i;
    var puff;
    var driftX;
    var driftY;
    var x;
    var y;
    var rad;
    var g;
    for (i = 0; i < puffs.length; i++) {
      puff = puffs[i];
      driftX = 0;
      driftY = 0;
      if (!reduceMotion()) {
        driftX = Math.sin(visualTime * 0.45 + puff.phase) * 18;
        driftY = Math.cos(visualTime * 0.32 + puff.phase) * 8;
      }
      x = worldToX(puff.x) + driftX;
      y = worldToY(puff.y) + driftY;
      rad = puff.rad * scale;
      if (rad < 2 || x < -rad || x > cssW + rad) continue;
      g = ctx.createRadialGradient(x, y, rad * 0.15, x, y, rad);
      g.addColorStop(0, 'rgba(214, 218, 214, 0.42)');
      g.addColorStop(0.55, 'rgba(186, 192, 188, 0.22)');
      g.addColorStop(1, 'rgba(186, 192, 188, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, rad, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawFoam() {
    var i;
    var wave;
    var u;
    var amount;
    var edge;
    var steps;
    var n;
    var x;
    var y;
    var wobble;
    for (i = 0; i < waves.length; i++) {
      wave = waves[i];
      u = phaseU(wave, seaTime);
      amount = foamAmount(u);
      if (amount <= 0.02) continue;
      if (worldToX(wave.x1) < -20 || worldToX(wave.x0) > cssW + 20) continue;
      edge = BEACH_W - (BEACH_W - wave.reach) * amount;
      steps = 10;
      ctx.beginPath();
      for (n = 0; n <= steps; n++) {
        x = wave.x0 + (wave.x1 - wave.x0) * (n / steps);
        wobble = reduceMotion() ? 0 : Math.sin(x * 0.04 + visualTime * 3) * 5;
        y = worldToY(edge + wobble);
        if (n === 0) ctx.moveTo(worldToX(x), y);
        else ctx.lineTo(worldToX(x), y);
      }
      ctx.lineTo(worldToX(wave.x1), worldToY(BEACH_W));
      ctx.lineTo(worldToX(wave.x0), worldToY(BEACH_W));
      ctx.closePath();
      ctx.fillStyle = 'rgba(210, 230, 232, 0.5)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(246, 252, 252, 0.9)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (n = 0; n <= steps; n++) {
        x = wave.x0 + (wave.x1 - wave.x0) * (n / steps);
        wobble = reduceMotion() ? 0 : Math.sin(x * 0.04 + visualTime * 3) * 5;
        y = worldToY(edge + wobble);
        if (n === 0) ctx.moveTo(worldToX(x), y);
        else ctx.lineTo(worldToX(x), y);
      }
      ctx.stroke();
    }
  }

  function trentIndex() {
    var pose = state === 'pause' ? pausedState : state;
    var n;
    if (pose === 'stumble') {
      n = Math.min(3, Math.floor((stumbleT / STUMBLE_TIME) * 4));
      return 10 + n;
    }
    if (pose === 'play' && isBracing()) {
      n = reduceMotion() ? 0 : Math.floor(visualTime / 0.18) % 2;
      return 8 + n;
    }
    if (pose === 'play' && moving) {
      n = reduceMotion() ? 0 : Math.floor(player.step / 1.35) % 6;
      return 2 + n;
    }
    n = reduceMotion() ? 0 : Math.floor(visualTime / 0.48) % 2;
    return n;
  }

  function drawTrent() {
    var index;
    var destH;
    var destW;
    var s;
    var face;
    if (!imageReady(trentImg)) return;
    index = trentIndex();
    destH = 112 * unit();
    destW = destH * (TRENT.w / TRENT.h);
    s = destH / TRENT.h;
    face = player.facing < 0 ? -1 : 1;
    ctx.save();
    ctx.translate(worldToX(player.x), worldToY(player.y));
    ctx.scale(face, 1);
    ctx.drawImage(
      trentImg,
      index * TRENT.w, 0, TRENT.w, TRENT.h,
      -TRENT.anchorX * s, -TRENT.anchorY * s, destW, destH
    );
    ctx.restore();
  }

  function soldierFiring(s) {
    var i;
    var h;
    var dx;
    var dy;
    var age;
    for (i = 0; i < hazards.length; i++) {
      h = hazards[i];
      if (h.kind === 'grenade') {
        dx = h.x0 - s.x;
        dy = h.y0 - s.y;
        if (dx * dx + dy * dy < 9 && h.t < 0.24) return true;
      } else if (h.kind === 'gunfire') {
        age = 1.45 - h.life;
        if (age >= 0 && age < 0.24) {
          dx = h.x - s.x;
          dy = h.y - s.y;
          if (dx * dx + dy * dy < 180 * 180) return true;
        }
      }
    }
    return false;
  }

  function soldierIndex(s) {
    var n;
    if (s.mode === 'parcel') {
      n = (!reduceMotion() && s.t < 0.14) ? 0 : 1;
      return 8 + n;
    }
    if (s.mode === 'back') {
      if (s.t < 0.24) {
        n = reduceMotion() ? 0 : (s.t < 0.12 ? 0 : 1);
        return 6 + n;
      }
      n = reduceMotion() ? 0 : Math.floor((s.t - 0.24) / 0.12) % 4;
      return n;
    }
    if (soldierFiring(s)) {
      n = reduceMotion() ? 0 : Math.floor(visualTime / 0.12) % 2;
      return 4 + n;
    }
    return 0;
  }

  function drawSoldier(s) {
    var x;
    var y;
    var index;
    var destH;
    var destW;
    var sc;
    var face;
    if (!imageReady(soldierImg)) return;
    x = worldToX(s.x);
    y = worldToY(s.y);
    if (x < -180 || x > cssW + 180) return;
    index = soldierIndex(s);
    destH = 112 * unit();
    destW = destH * (SOLDIER.w / SOLDIER.h);
    sc = destH / SOLDIER.h;
    if (s.mode === 'back' && s.t >= 0.24) face = s.away < 0 ? -1 : 1;
    else face = s.facing < 0 ? -1 : 1;
    ctx.save();
    ctx.globalAlpha = s.mode === 'back' ? Math.max(0, 1 - s.t / 0.62) : 1;
    ctx.translate(x, y);
    ctx.scale(face, 1);
    ctx.drawImage(
      soldierImg,
      index * SOLDIER.w, 0, SOLDIER.w, SOLDIER.h,
      -SOLDIER.anchorX * sc, -SOLDIER.anchorY * sc, destW, destH
    );
    ctx.restore();
  }

  function drawSoldiers() {
    var i;
    for (i = 0; i < soldiers.length; i++) drawSoldier(soldiers[i]);
  }

  function drawHazards() {
    var i;
    var h;
    var x;
    var y;
    var k;
    var lift;
    var rad;
    var head;
    var tail;
    for (i = 0; i < hazards.length; i++) {
      h = hazards[i];
      x = worldToX(h.x);
      if (x < -50 || x > cssW + 50) continue;
      y = worldToY(h.y);
      if (h.kind === 'gunfire') {
        k = Math.hypot(h.vx, h.vy) || 1;
        head = { x: x, y: y - 10 * unit() };
        tail = {
          x: worldToX(h.x - (h.vx / k) * 16),
          y: worldToY(h.y - (h.vy / k) * 16) - 10 * unit()
        };
        ctx.lineCap = 'round';
        ctx.strokeStyle = '#1c2430';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(tail.x, tail.y);
        ctx.lineTo(head.x, head.y);
        ctx.stroke();
        ctx.strokeStyle = '#f7f4ec';
        ctx.lineWidth = 2.5;
        ctx.stroke();
      } else if (h.kind === 'grenade') {
        lift = (h.hop || 0) * 28 * unit();
        ctx.fillStyle = 'rgba(36, 40, 36, 0.35)';
        ctx.beginPath();
        ctx.ellipse(x, y, 8, 3.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#3e463c';
        ctx.beginPath();
        ctx.arc(x, y - lift, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#d9d3c4';
        ctx.beginPath();
        ctx.arc(x - 2, y - lift - 2, 1.8, 0, Math.PI * 2);
        ctx.fill();
      } else if (h.kind === 'burst') {
        rad = (8 + (h.t / 0.3) * h.r) * scale;
        ctx.strokeStyle = 'rgba(239, 230, 214, ' + Math.max(0, 1 - h.t / 0.3) + ')';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(x, y, Math.max(2, rad), 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = 'rgba(214, 210, 200, ' + (0.28 * Math.max(0, 1 - h.t / 0.3)) + ')';
        ctx.beginPath();
        ctx.arc(x, y, Math.max(2, rad * 0.7), 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function drawShots() {
    var i;
    var shot;
    var k;
    var x;
    var y;
    for (i = 0; i < shots.length; i++) {
      shot = shots[i];
      k = Math.hypot(shot.vx, shot.vy) || 1;
      x = worldToX(shot.x);
      y = worldToY(shot.y) - 14 * unit();
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#16384c';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(worldToX(shot.x - (shot.vx / k) * 12), worldToY(shot.y - (shot.vy / k) * 12) - 14 * unit());
      ctx.lineTo(x, y);
      ctx.stroke();
      ctx.strokeStyle = '#f0d7a8';
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }
  }

  function drawAim() {
    var dir;
    var x;
    var y;
    if (state === 'title' || state === 'win' || state === 'lose') return;
    dir = aimUnit();
    x = worldToX(player.x + dir.x * 42);
    y = worldToY(player.y + dir.y * 42) - 16 * unit();
    ctx.save();
    ctx.fillStyle = 'rgba(243, 239, 228, 0.95)';
    ctx.strokeStyle = '#16384c';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    if (flash > 0) {
      ctx.fillStyle = 'rgba(244, 231, 176, 0.95)';
      ctx.beginPath();
      ctx.arc(worldToX(player.x + dir.x * 20), worldToY(player.y + dir.y * 20) - 16 * unit(), 8, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function render() {
    var jx = 0;
    var jy = 0;
    if (cssW < 2 || cssH < 2) return;
    frameCamera();
    if (shake > 0.4 && !reduceMotion()) {
      jx = (Math.random() - 0.5) * shake;
      jy = (Math.random() - 0.5) * shake;
      shake *= 0.86;
    } else {
      shake = 0;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssW, cssH);
    ctx.translate(jx, jy);
    drawBeach();
    drawObstacles();
    drawCraft();
    drawWall();
    drawSmoke();
    drawFoam();
    drawSoldiers();
    drawHazards();
    drawShots();
    drawAim();
    drawTrent();
  }

  function resize() {
    var rect = canvas.getBoundingClientRect();
    cssW = Math.max(1, rect.width);
    cssH = Math.max(1, rect.height);
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    sandTop = cssH * 0.27;
    sandH = cssH * 0.52;
    scale = sandH / BEACH_W;
  }

  function portraitWanted() {
    return portraitQuery.matches || window.innerHeight > window.innerWidth + 20;
  }

  function syncPortrait() {
    var show = portraitWanted();
    portraitEl.hidden = !show;
    if (show && (state === 'play' || state === 'stumble')) {
      rotateHold = true;
      openPause();
    } else if (!show && rotateHold && state === 'pause') {
      rotateHold = false;
      closePause();
    }
  }

  function loop(now) {
    var dt = (now - lastFrame) / 1000;
    lastFrame = now;
    if (dt < 0) dt = 0;
    if (dt > 0.05) dt = 0.05;
    if (!reduceMotion() && state !== 'pause') visualTime += dt;
    if (state === 'play') {
      seaTime += dt;
      updatePlay(dt);
    } else if (state === 'stumble') {
      seaTime += dt;
      updateStumble(dt);
    }
    if (state === 'play' || state === 'stumble' || state === 'pause') renderHud();
    refreshBrace();
    refreshFire();
    render();
    requestAnimationFrame(loop);
  }

  function leftHalf(event) {
    var rect = canvas.getBoundingClientRect();
    return (event.clientX - rect.left) <= rect.width * 0.5;
  }

  stick.addEventListener('pointerdown', function (event) {
    if (event.button !== 0) return;
    if (state !== 'play') return;
    dragging = true;
    dragId = event.pointerId;
    hintEl.hidden = true;
    moveStick(event);
    if (stick.setPointerCapture) stick.setPointerCapture(event.pointerId);
  });

  function moveStick(event) {
    var rect = stick.getBoundingClientRect();
    var x = event.clientX - (rect.left + rect.width / 2);
    var y = event.clientY - (rect.top + rect.height / 2);
    var max = rect.width * 0.33;
    var reach = Math.hypot(x, y) || 1;
    var limit = Math.min(1, max / reach);
    dragX = x * limit;
    dragY = y * limit;
    stickKnob.style.transform = 'translate(' + dragX + 'px,' + dragY + 'px)';
  }

  window.addEventListener('pointermove', function (event) {
    if (!dragging || event.pointerId !== dragId) return;
    moveStick(event);
  });

  function endDrag(event) {
    if (!dragging || event.pointerId !== dragId) return;
    dragging = false;
    dragId = null;
    dragX = 0;
    dragY = 0;
    stickKnob.style.transform = '';
  }

  window.addEventListener('pointerup', endDrag);
  window.addEventListener('pointercancel', endDrag);
  canvas.addEventListener('contextmenu', function (event) { event.preventDefault(); });

  fireBtn.addEventListener('pointerdown', function (event) {
    if (event.button !== 0) return;
    event.preventDefault();
    firePointer = true;
    fireQueued = true;
    hintEl.hidden = true;
    if (fireBtn.setPointerCapture) fireBtn.setPointerCapture(event.pointerId);
  });
  fireBtn.addEventListener('pointerup', function () { firePointer = false; });
  fireBtn.addEventListener('pointercancel', function () { firePointer = false; });
  fireBtn.addEventListener('contextmenu', function (event) { event.preventDefault(); });

  braceBtn.addEventListener('pointerdown', function (event) {
    if (event.button !== 0) return;
    event.preventDefault();
    bracePointer = true;
    if (braceBtn.setPointerCapture) braceBtn.setPointerCapture(event.pointerId);
  });
  braceBtn.addEventListener('pointerup', function () { bracePointer = false; });
  braceBtn.addEventListener('pointercancel', function () { bracePointer = false; });
  braceBtn.addEventListener('contextmenu', function (event) { event.preventDefault(); });

  window.addEventListener('keydown', function (event) {
    var move = event.key === 'ArrowUp' || event.key === 'ArrowDown' || event.key === 'ArrowLeft' || event.key === 'ArrowRight';
    if (move) event.preventDefault();
    if (event.code === 'Space' && (state === 'play' || state === 'stumble')) {
      event.preventDefault();
      keyBrace = true;
      hintEl.hidden = true;
    }
    if ((event.key === 'f' || event.key === 'F') && state === 'play') {
      event.preventDefault();
      if (!event.repeat) fireQueued = true;
      keyFire = true;
      hintEl.hidden = true;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      if (state === 'play' || state === 'stumble') openPause();
      else if (state === 'pause') closePause();
    }
    keys.add(event.key.toLowerCase());
  });

  window.addEventListener('keyup', function (event) {
    keys.delete(event.key.toLowerCase());
    if (event.code === 'Space') keyBrace = false;
    if (event.key === 'f' || event.key === 'F') keyFire = false;
  });

  window.addEventListener('blur', function () {
    keys.clear();
    keyBrace = false;
    bracePointer = false;
    clearFireHold();
    dragging = false;
    dragX = 0;
    dragY = 0;
  });

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) openPause();
  });
  window.addEventListener('pagehide', function () { openPause(); });

  document.getElementById('start').addEventListener('click', beginRun);
  document.getElementById('resume').addEventListener('click', closePause);
  document.getElementById('retry').addEventListener('click', beginRun);
  document.getElementById('continue').addEventListener('click', function () {
    winHoldEl.hidden = false;
  });
  pauseBtn.addEventListener('click', function () {
    if (state === 'play' || state === 'stumble') openPause();
    else if (state === 'pause') closePause();
  });
  portraitQuery.addEventListener('change', syncPortrait);
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

  resize();
  resetWorld();
  syncPortrait();
  lastFrame = performance.now();
  requestAnimationFrame(loop);
})();
