/* D-Day prologue. Walk Trent from the landing craft to the seawall.
   Original Canvas 2D art. No assets and no network.

   A straight walk is about a minute. Smoke, detours, and bracing
   keep a careful run near a minute and a half, under three minutes. */
'use strict';

(function () {
  var canvas = document.getElementById('beach');
  var ctx = canvas.getContext('2d');
  var distanceEl = document.getElementById('distance');
  var marksEl = document.getElementById('marks');
  var pauseBtn = document.getElementById('pause');
  var braceBtn = document.getElementById('brace');
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
  var SPEED = 120;
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

  var specks = buildSpecks();
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
  var portraitDismissed = false;

  var keys = new Set();
  var keyBrace = false;
  var bracePointer = false;
  var dragging = false;
  var dragId = null;
  var dragX = 0;
  var dragY = 0;
  var originX = 0;
  var originY = 0;
  var lastFrame = 0;

  var motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  var portraitQuery = window.matchMedia('(orientation: portrait)');

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

  function buildSpecks() {
    var list = [];
    var i;
    for (i = 0; i < 460; i++) {
      list.push({
        x: (i * 137) % 7400,
        y: (i * 61) % BEACH_W,
        r: 0.7 + (i % 5) * 0.35,
        dark: i % 3 === 0
      });
    }
    return list;
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
    seaTime = 0;
    stumbleT = 0;
    lean = 0;
    shake = 0;
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

  function updatePlay(dt) {
    var stick = controlVector();
    var beforeX = player.x;
    var beforeY = player.y;
    var moved;
    if (stick.x !== 0 || stick.y !== 0) hintEl.hidden = true;
    tryMove(stick.x * SPEED * dt, stick.y * SPEED * dt);
    moved = Math.hypot(player.x - beforeX, player.y - beforeY);
    if (moved > 0.01) {
      player.step += moved * 0.09;
      if (stick.x < -0.25) player.facing = -1;
      else if (stick.x > 0.25) player.facing = 1;
    }
    if (lean > 0) lean = Math.max(0, lean - dt);
    if (player.x >= GOAL_X) {
      win();
      return;
    }
    updateWaves();
  }

  function stumbleBend(t) {
    var u = t / STUMBLE_TIME;
    if (u < 0.34) return easeOut(u / 0.34);
    if (u < 0.52) return 1;
    return 1 - easeIn((u - 0.52) / 0.48);
  }

  function easeOut(t) { return 1 - (1 - t) * (1 - t); }
  function easeIn(t) { return t * t; }

  function updateStumble(dt) {
    stumbleT += dt;
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

  function drawSky() {
    var sky = ctx.createLinearGradient(0, 0, 0, sandTop + 20);
    var sunX = cssW * 0.7;
    var sunY = sandTop * 0.42;
    var sun;
    sky.addColorStop(0, '#2a4668');
    sky.addColorStop(0.55, '#7ea4bc');
    sky.addColorStop(1, '#e7b08a');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, cssW, sandTop + 30);

    sun = ctx.createRadialGradient(sunX, sunY, 6, sunX, sunY, 110);
    sun.addColorStop(0, 'rgba(255, 236, 214, 0.95)');
    sun.addColorStop(1, 'rgba(255, 236, 214, 0)');
    ctx.fillStyle = sun;
    ctx.beginPath();
    ctx.arc(sunX, sunY, 110, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(244, 228, 214, 0.45)';
    ctx.beginPath();
    ctx.ellipse(cssW * 0.18, sandTop * 0.35, 70, 18, 0, 0, Math.PI * 2);
    ctx.ellipse(cssW * 0.28, sandTop * 0.32, 46, 14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cssW * 0.86, sandTop * 0.28, 54, 14, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawRidge() {
    ctx.fillStyle = '#7d6e64';
    ctx.beginPath();
    ctx.moveTo(0, sandTop + 10);
    ctx.quadraticCurveTo(cssW * 0.22, sandTop - cssH * 0.07, cssW * 0.5, sandTop + 6);
    ctx.quadraticCurveTo(cssW * 0.78, sandTop - cssH * 0.045, cssW, sandTop + 12);
    ctx.lineTo(cssW, sandTop + 42);
    ctx.lineTo(0, sandTop + 42);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(92, 78, 70, 0.35)';
    ctx.beginPath();
    ctx.moveTo(0, sandTop + 28);
    ctx.quadraticCurveTo(cssW * 0.4, sandTop + 8, cssW, sandTop + 30);
    ctx.lineTo(cssW, sandTop + 42);
    ctx.lineTo(0, sandTop + 42);
    ctx.fill();
  }

  function drawSand() {
    var sand = ctx.createLinearGradient(0, sandTop, 0, sandTop + sandH);
    var wetTop = worldToY(162);
    var i;
    var speck;
    var sx;
    var sy;
    sand.addColorStop(0, '#d2cdc2');
    sand.addColorStop(0.45, '#b7b3a8');
    sand.addColorStop(1, '#8d918c');
    ctx.fillStyle = sand;
    ctx.fillRect(0, sandTop, cssW, sandH);

    ctx.fillStyle = 'rgba(62, 70, 68, 0.28)';
    ctx.fillRect(0, wetTop, cssW, sandTop + sandH - wetTop);

    for (i = 0; i < specks.length; i++) {
      speck = specks[i];
      sx = worldToX(speck.x);
      if (sx < -4 || sx > cssW + 4) continue;
      sy = worldToY(speck.y);
      ctx.fillStyle = speck.dark ? 'rgba(70, 68, 62, 0.28)' : 'rgba(236, 232, 224, 0.35)';
      ctx.beginPath();
      ctx.arc(sx, sy, speck.r * scale, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawShallows() {
    ctx.fillStyle = 'rgba(32, 96, 122, 0.5)';
    ctx.beginPath();
    ctx.moveTo(worldToX(-120), worldToY(30));
    ctx.lineTo(worldToX(300), worldToY(78));
    ctx.lineTo(worldToX(390), worldToY(BEACH_W));
    ctx.lineTo(worldToX(-120), worldToY(BEACH_W));
    ctx.closePath();
    ctx.fill();
  }

  function drawForegroundSea() {
    var seaTop = sandTop + sandH;
    var sea = ctx.createLinearGradient(0, seaTop, 0, cssH);
    var i;
    var x;
    var y;
    var shift;
    sea.addColorStop(0, '#4e90a8');
    sea.addColorStop(1, '#1a455e');
    ctx.fillStyle = sea;
    ctx.fillRect(0, seaTop - 2, cssW, cssH - seaTop + 4);

    ctx.strokeStyle = 'rgba(232, 244, 246, 0.6)';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    for (i = 0; i < 3; i++) {
      shift = reduceMotion() ? 0 : visualTime * 1.3 + i;
      y = seaTop + 12 + i * Math.max(12, cssH * 0.035);
      ctx.beginPath();
      for (x = 0; x <= cssW; x += 22) {
        y = seaTop + 12 + i * Math.max(12, cssH * 0.035) + Math.sin(x * 0.02 + shift) * 3;
        if (x === 0) ctx.moveTo(0, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }

  function drawCraft() {
    var s = unit();
    ctx.save();
    ctx.translate(worldToX(400), worldToY(156));
    ctx.scale(s, s);

    ctx.fillStyle = 'rgba(24, 36, 44, 0.28)';
    ctx.beginPath();
    ctx.ellipse(-78, 10, 96, 16, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#6d654c';
    ctx.beginPath();
    ctx.moveTo(18, 6);
    ctx.lineTo(-86, -6);
    ctx.lineTo(-86, -46);
    ctx.lineTo(-6, -16);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#3e3a30';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#4c5a46';
    ctx.beginPath();
    ctx.moveTo(-78, -16);
    ctx.lineTo(-176, -30);
    ctx.quadraticCurveTo(-214, -78, -158, -112);
    ctx.lineTo(-64, -104);
    ctx.lineTo(-52, -36);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#3c4a38';
    ctx.fillRect(-162, -96, 86, 40);
    ctx.fillStyle = '#2f3b2e';
    ctx.fillRect(-162, -96, 86, 8);

    ctx.strokeStyle = '#8b987f';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-172, -48);
    ctx.quadraticCurveTo(-120, -40, -70, -34);
    ctx.stroke();

    ctx.fillStyle = '#c5b8a2';
    ctx.beginPath();
    ctx.arc(-118, -78, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#4c5a46';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#9aa098';
    ctx.fillRect(-138, -108, 7, 16);
    ctx.restore();
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
    var posts = 5;
    var pts = [];
    var i;
    var p;
    var prev;
    var strand;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.lineCap = 'round';
    for (i = 0; i < posts; i++) {
      pts.push({
        x: worldToX(o.x + o.w * 0.55),
        y: worldToY(o.y + o.h * (i / (posts - 1)))
      });
    }
    ctx.strokeStyle = '#4a3c34';
    ctx.lineWidth = Math.max(3, 4 * scale);
    for (i = 0; i < pts.length; i++) {
      p = pts[i];
      ctx.beginPath();
      ctx.moveTo(p.x, p.y - 12);
      ctx.lineTo(p.x, p.y + 8);
      ctx.stroke();
    }
    ctx.strokeStyle = '#2e2622';
    ctx.lineWidth = Math.max(1.5, 2 * scale);
    for (strand = 0; strand < 3; strand++) {
      ctx.beginPath();
      for (i = 0; i < pts.length; i++) {
        p = pts[i];
        if (i === 0) ctx.moveTo(p.x, p.y - 8 + strand * 6);
        else {
          prev = pts[i - 1];
          ctx.quadraticCurveTo(
            (prev.x + p.x) / 2 + 5,
            (prev.y + p.y) / 2 - 7 + strand * 6,
            p.x,
            p.y - 8 + strand * 6
          );
        }
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawHedgehog(o, alpha) {
    var x = worldToX(o.x);
    var y = worldToY(o.y);
    var r = o.r * scale;
    var i;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y);
    ctx.fillStyle = 'rgba(36, 38, 40, 0.28)';
    ctx.beginPath();
    ctx.ellipse(0, r * 0.45, r * 0.95, r * 0.36, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineCap = 'round';
    for (i = 0; i < 3; i++) {
      ctx.save();
      ctx.rotate((Math.PI / 3) * i);
      ctx.strokeStyle = '#5e6468';
      ctx.lineWidth = Math.max(4, r * 0.32);
      ctx.beginPath();
      ctx.moveTo(-r, 0);
      ctx.lineTo(r, 0);
      ctx.stroke();
      ctx.strokeStyle = '#c5c8ca';
      ctx.lineWidth = Math.max(1.5, r * 0.08);
      ctx.beginPath();
      ctx.moveTo(-r * 0.8, -r * 0.08);
      ctx.lineTo(r * 0.8, -r * 0.08);
      ctx.stroke();
      ctx.restore();
    }
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
    var x = worldToX(WALL_X);
    var top = sandTop - cssH * 0.06;
    var bottom = worldToY(BEACH_W) + 6;
    var width = Math.max(160, cssW - x + 40);
    var g = ctx.createLinearGradient(x, top, x + 40, bottom);
    var seam;
    if (x > cssW + 20) return;
    g.addColorStop(0, '#dddcd4');
    g.addColorStop(0.55, '#c2c1ba');
    g.addColorStop(1, '#8f8f8a');
    ctx.fillStyle = g;
    ctx.fillRect(x, top, width, bottom - top);

    ctx.strokeStyle = 'rgba(60, 62, 64, 0.35)';
    ctx.lineWidth = 2;
    for (seam = x + 22; seam < x + width; seam += 48) {
      ctx.beginPath();
      ctx.moveTo(seam, top + 14);
      ctx.lineTo(seam, bottom - 8);
      ctx.stroke();
    }

    ctx.fillStyle = '#e6e4dc';
    ctx.fillRect(x - 8, top, Math.min(width + 8, cssW - x + 20), 14);
    ctx.fillStyle = '#9a9a94';
    ctx.fillRect(x, bottom - 28, Math.min(70, width), 28);

    ctx.fillStyle = '#aea89c';
    ctx.beginPath();
    ctx.moveTo(x - 36, bottom - 4);
    ctx.lineTo(x + 24, bottom - 30);
    ctx.lineTo(x + 90, bottom - 4);
    ctx.closePath();
    ctx.fill();
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

  function drawTrent() {
    var s = unit();
    var bend = state === 'stumble' ? stumbleBend(stumbleT) : 0;
    var bracing = isBracing() && state === 'play';
    var step = Math.sin(player.step);
    var bob = reduceMotion() ? 0 : step * 1.4 * (1 - bend);
    var spread = bracing ? 8 : 5;
    var leg = bracing ? 0.4 : step;
    ctx.save();
    ctx.translate(worldToX(player.x), worldToY(player.y) + bob);
    ctx.scale(s, s);

    ctx.fillStyle = 'rgba(40, 36, 32, 0.28)';
    ctx.beginPath();
    ctx.ellipse(0, 3, 16, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.rotate(-bend * 0.9);
    if (player.facing < 0 && state !== 'stumble') ctx.scale(-1, 1);
    if (bracing || lean > 0) ctx.translate(0, 5);

    ctx.fillStyle = '#3a4148';
    roundLeg(-spread, -30, leg * 7);
    roundLeg(spread * 0.3, -30, -leg * 7);

    ctx.fillStyle = '#241e1a';
    ctx.beginPath();
    ctx.ellipse(-spread + leg * 5, -4, 6, 4, 0, 0, Math.PI * 2);
    ctx.ellipse(spread * 0.2 - leg * 5, -4, 6, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#5c5146';
    ctx.fillRect(-16, -54, 12, 18);

    ctx.fillStyle = '#4e3122';
    ctx.beginPath();
    ctx.moveTo(-7, -58);
    ctx.lineTo(-16, -28);
    ctx.lineTo(15, -28);
    ctx.lineTo(8, -58);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#6e4630';
    ctx.beginPath();
    ctx.moveTo(-4, -58);
    ctx.lineTo(-12, -30);
    ctx.lineTo(8, -30);
    ctx.lineTo(8, -58);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(78, 49, 34, 0.7)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-2, -52);
    ctx.lineTo(-6, -32);
    ctx.moveTo(3, -52);
    ctx.lineTo(1, -32);
    ctx.stroke();

    ctx.strokeStyle = '#31475c';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-4, -56);
    ctx.quadraticCurveTo(0, -50, 6, -56);
    ctx.stroke();

    ctx.strokeStyle = '#6e4630';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    if (bracing) {
      ctx.moveTo(-8, -50);
      ctx.lineTo(-16, -36);
      ctx.moveTo(8, -50);
      ctx.lineTo(18, -40);
    } else {
      ctx.moveTo(-8, -50);
      ctx.lineTo(-12, -34 + leg * 3);
      ctx.moveTo(7, -50);
      ctx.lineTo(11, -34 - leg * 3);
    }
    ctx.stroke();

    ctx.fillStyle = '#e0b08a';
    ctx.beginPath();
    ctx.arc(1, -66, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2c241c';
    ctx.beginPath();
    ctx.arc(4, -67, 0.9, 0, Math.PI * 2);
    ctx.arc(7.5, -67, 0.9, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#5e6849';
    ctx.beginPath();
    ctx.arc(1, -70, 9, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = '#7d8664';
    ctx.beginPath();
    ctx.ellipse(-1, -74, 4, 2.5, -0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#3e3428';
    ctx.beginPath();
    ctx.ellipse(2, -64, 11, 3.2, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  function roundLeg(x, y, swing) {
    ctx.fillRect(x + swing * 0.15, y, 7, 26);
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
    drawSky();
    drawRidge();
    drawSand();
    drawShallows();
    drawForegroundSea();
    drawObstacles();
    drawCraft();
    drawWall();
    drawSmoke();
    drawFoam();
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
    var show = portraitWanted() && !portraitDismissed;
    var wasShowing = !portraitEl.hidden;
    portraitEl.hidden = !show;
    if (show && !wasShowing && (state === 'play' || state === 'stumble')) openPause();
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
    render();
    requestAnimationFrame(loop);
  }

  function leftHalf(event) {
    var rect = canvas.getBoundingClientRect();
    return (event.clientX - rect.left) <= rect.width * 0.5;
  }

  canvas.addEventListener('pointerdown', function (event) {
    if (event.button !== 0) return;
    if (state !== 'play') return;
    if (!leftHalf(event)) return;
    dragging = true;
    dragId = event.pointerId;
    originX = event.clientX;
    originY = event.clientY;
    dragX = 0;
    dragY = 0;
    hintEl.hidden = true;
    if (canvas.setPointerCapture) canvas.setPointerCapture(event.pointerId);
  });

  window.addEventListener('pointermove', function (event) {
    if (!dragging || event.pointerId !== dragId) return;
    dragX = event.clientX - originX;
    dragY = event.clientY - originY;
  });

  function endDrag(event) {
    if (!dragging || event.pointerId !== dragId) return;
    dragging = false;
    dragId = null;
    dragX = 0;
    dragY = 0;
  }

  window.addEventListener('pointerup', endDrag);
  window.addEventListener('pointercancel', endDrag);
  canvas.addEventListener('contextmenu', function (event) { event.preventDefault(); });

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
  });

  window.addEventListener('blur', function () {
    keys.clear();
    keyBrace = false;
    bracePointer = false;
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
  document.getElementById('dismiss-portrait').addEventListener('click', function () {
    portraitDismissed = true;
    syncPortrait();
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
