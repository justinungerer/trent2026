/* D-Day prologue. Walk Trent from the landing craft to the seawall.
   Painted sprites in art/. Layout is documented in art/ART-SOURCES.md.

   Walk speed is 360, one and a half times the previous 240. An open beach
   is a short run. Waves, mines, and soldiers make a careful crossing longer. */
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
  var movementNote = document.getElementById('movement-note');
  var contactObstacle = null;
  var movementNotice = '';
  var startSheet = document.getElementById('start-sheet');
  var pauseSheet = document.getElementById('pause-sheet');
  var loseSheet = document.getElementById('lose-sheet');
  var winSheet = document.getElementById('win-sheet');
  var winTimeEl = document.getElementById('win-time');
  var winHoldEl = document.getElementById('win-hold');
  var portraitEl = document.getElementById('portrait');
  var statusEl = document.getElementById('status');

  var BEACH_W = 840;
  var RADIUS = 18;
  var MIN_X = 280;
  var START_X = 430;
  var START_Y = 340;
  var GOAL_X = 6960;
  var SPEED = 360;
  var SHOT_SPEED = 700;
  var FIRE_GAP = 0.42;
  var SOLDIER_RANGE = 640;
  var TOTAL_METERS = 80;
  var stage = new URLSearchParams(location.search).get('stage');
  var rally = stage === 'ramp-and-rally';
  var breach = stage === 'through-the-seawall';
  var dispatches = [];
  var STUMBLE_TIME = 1.05;
  var START_AMMO = 10;
  var AMMO_PER_PICKUP = 2;
  var SURF_SPEED = 220;

  var obstacles = [];
  var waves = [];

  var smokes = [
    { x: 2680, w: 920 },
    { x: 4760, w: 860 }
  ];

  var mines = [
    { x: 1560, y: 204, r: 16 },
    { x: 2520, y: 214, r: 16 },
    { x: 3080, y: 118, r: 16 },
    { x: 4200, y: 78, r: 16 },
    { x: 5100, y: 150, r: 16 },
    { x: 6100, y: 72, r: 16 }
  ];
  var packs = [
    { x: 2060, y: 42, r: 14 },
    { x: 3580, y: 228, r: 14 },
    { x: 5980, y: 48, r: 14 }
  ];
  if (rally || breach) {
    GOAL_X = rally ? 3650 : 4380;
    TOTAL_METERS = rally ? 44 : 56;
    if (breach) {
      dispatches = [{ x: 1600, y: 210 }, { x: 2600, y: 420 }, { x: 3370, y: 625 }];
      mines = mines.filter(function (mine) { return mine.x < GOAL_X; });
      packs = packs.filter(function (pack) { return pack.x < GOAL_X; });
    }
    document.getElementById('landing-title').textContent = rally ? 'Ramp and Rally' : 'Through the Seawall';
    document.getElementById('landing-goal').textContent = rally
      ? 'Recover all three sealed dispatches, then carry them to the shingle ridge.'
      : 'Recover all three dispatches from the breach and carry them to the shelter.';
    document.getElementById('landing-win-title').textContent = rally ? 'Dispatch delivered' : 'Shelter reached';
  }
  var puffs = buildPuffs();

  var state = 'title';
  var pausedState = 'play';
  if (!breach) {
    GOAL_X = START_X + 2 * (GOAL_X - START_X);
    TOTAL_METERS *= 2;
  }
  var WALL_X = GOAL_X + 42;
  var hearts = [];
  var openings = breach ? [570, 345, 125, 620, 240] : [140, 530, 280, 620, 390];
  var firstColumnX = START_X + 630;
  // Leave 30 units after the last log, which extends 415 units past its column.
  var lastColumnX = GOAL_X - 445;
  var columns = rally ? 9 : breach ? 5 : Math.ceil((lastColumnX - firstColumnX) / 650) + 1;
  var columnSpacing = rally || breach ? 650 : (lastColumnX - firstColumnX) / (columns - 1);
  for (var column = 0; column < columns; column++) {
    var gateX = firstColumnX + column * columnSpacing;
    var gapY = openings[column % openings.length];
    obstacles.push(
      { kind: 'wire', x: gateX, y: 0, w: 54, h: gapY },
      { kind: 'wire', x: gateX, y: gapY + 160, w: 54, h: BEACH_W - gapY - 160 },
      { kind: 'log', x: gateX + 170, y: gapY < 400 ? gapY + 245 : gapY - 165, w: 245, h: 42 },
      { kind: 'hedgehog', x: gateX + 95, y: gapY + 20, r: 22 }
    );
    if (column % 2 === 0) mines.push({ x: gateX + 355, y: gapY + 18, r: 16 });
    // The seawall crossing adds one extra heart for every two regular ones.
    if (column % 2 === 0 || (!rally && !breach && column % 4 === 1)) {
      hearts.push({ x: gateX + 460, y: gapY + 110, r: 18 });
    }
    if (rally || column % 3 === 1) packs.push({ x: gateX + 320, y: gapY + 103, r: 14 });
    if (breach) obstacles.push({ kind: 'crater', x: gateX + 315, y: gapY > 400 ? 200 : 680, r: 45 });
  }
  if (rally) dispatches = [{ x: 1940, y: 470 }, { x: 3890, y: 270 }, { x: 5970, y: 410 }];
  if (!rally && !breach) dispatches = [{ x: 2400, y: 410 }, { x: 6400, y: 260 }, { x: 10500, y: 560 }];
  if (!rally && !breach) document.getElementById('landing-goal').textContent = 'Recover all three dispatches and carry them across the shingle ground to the seawall.';
  var mineCount = mines.length;
  for (var mineIndex = 0; mineIndex < mineCount; mineIndex++) {
    var extraMine = { x: START_X + 500 + mineIndex * (GOAL_X - START_X - 800) / mineCount, y: 180 + mineIndex % 4 * 150, r: 16 };
    if (!placePickup(extraMine, mines)) throw new Error('No open beach position for mine');
    mines.push(extraMine);
  }
  var placed = mines.slice();
  packs.concat(hearts, dispatches).forEach(function (item) {
    if (!placePickup(item, placed)) throw new Error('No open beach position for pickup');
    placed.push(item);
  });
  var player = { x: START_X, y: START_Y, stumbles: 0, step: 0, facing: 1 };
  var seaTime = 0;
  var visualTime = 0;
  var stumbleT = 0;
  var lean = 0;
  var shake = 0;
  var cameraX = 0;
  var cameraY = 0;
  var nextWave = 1.2;
  var waveLane = 0;
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
  var ammo = START_AMMO;
  var surfHold = -1;
  var ammoEl = document.getElementById('ammo');
  var flash = 0;
  var shots = [];
  var hazards = [];
  var soldiers = [];
  var soldierMask = null;
  var soldierFrames = 0;
  var dragging = false;
  var dragId = null;
  var dragX = 0;
  var dragY = 0;
  var originX = 0;
  var originY = 0;
  var lastFrame = 0;

  var motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* trent.webp: 14 equal frames, feet on one baseline.
     idle 2, walk 6, brace 2, stumble 4. Anchor is the feet. */
  var TRENT = { w: 539, h: 574, anchorX: 327, anchorY: 564 };
  /* soldier.webp: 10 equal frames, feet on one baseline.
     walk 4, fire 2, hit 2, wrap 2. Anchor is the feet. */
  var SOLDIER = { w: 516, h: 552, anchorX: 206, anchorY: 539 };
  /* Painted bounds of each soldier frame, left top right bottom.
     Used only when the bitmap itself cannot be read. */
  var SOLDIER_BOX = [
    [26, 19, 369, 539],
    [85, 19, 354, 539],
    [17, 19, 370, 540],
    [89, 19, 373, 539],
    [97, 19, 442, 539],
    [102, 19, 478, 539],
    [65, 19, 364, 539],
    [101, 18, 498, 538],
    [95, 19, 367, 539],
    [28, 289, 381, 539]
  ];
  var trentImg = new Image();
  var soldierImg = new Image();
  var beachImg = new Image();
  var craftImg = new Image();
  var wallImg = new Image();
  var hedgehogImg = new Image();
  var wireImg = new Image();
  trentImg.src = 'art/trent.webp';
  soldierImg.addEventListener('load', buildSoldierMask);
  soldierImg.src = 'art/soldier.webp';
  if (imageReady(soldierImg)) buildSoldierMask();
  beachImg.src = breach ? 'art/seawall-breach.webp' : rally ? 'art/beach-ground.webp' : 'art/shingle-staging.webp';
  craftImg.src = 'art/craft.webp';
  wallImg.src = 'art/seawall.webp';
  hedgehogImg.src = 'art/hedgehog.webp';
  wireImg.src = 'art/wire.webp';
  var mineImg = new Image();
  var logImg = new Image();
  var heartImg = new Image();
  logImg.src = 'art/painted-log.webp';
  heartImg.src = '../chapter-2/art/painted-heart.webp';
  var crateImg = new Image();
  var dispatchImg = new Image();
  var craterImg = new Image();
  craterImg.src = 'art/painted-crater.webp';
  if (dispatches.length) dispatchImg.src = '../chapter-2/art/mail.webp';
  mineImg.src = 'art/mine.webp';
  crateImg.src = 'art/crate.webp';

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
    dispatches.forEach(function (item) { item.taken = false; });
    hearts.forEach(function (item) { item.taken = false; });
    mines.forEach(function (mine) { mine.spent = false; });
    waves = [];
    nextWave = 1.2;
    waveLane = 0;
    cameraY = 0;
    player.x = START_X;
    player.y = START_Y;
    frameCamera();
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
    ammo = START_AMMO;
    flash = 0;
    shots = [];
    var p;
    for (p = 0; p < packs.length; p++) packs[p].taken = false;
    surfHold = -1;
    hazards = [];
    soldiers = makeSoldiers();
    clearFireHold();
    renderHud();
  }

  function crestPose(wave) {
    return wave.x1 - (seaTime - wave.born) * SURF_SPEED;
  }

  function crestShape(wave) {
    return { mid: wave.reach, amp: wave.amp };
  }

  function crestPoint(head, mid, amp, t) {
    var a = (t - 0.5) * Math.PI;
    return {
      x: head + (1 - Math.cos(a)) * 130,
      y: mid + Math.sin(a) * amp
    };
  }

  function crestTouchIndex() {
    var i;
    var wave;
    var shape;
    var head;
    var s;
    var p;
    var dx;
    var dy;
    for (i = 0; i < waves.length; i++) {
      wave = waves[i];
      if (player.x < wave.x0 || player.x > wave.x1) continue;
      shape = crestShape(wave);
      head = crestPose(wave);
      for (s = 0; s <= 12; s++) {
        p = crestPoint(head, shape.mid, shape.amp, s / 12);
        if (p.x < wave.x0 || p.x > wave.x1) continue;
        dx = player.x - p.x;
        dy = player.y - p.y;
        if (dx * dx + dy * dy < 32 * 32) return i;
      }
    }
    return -1;
  }

  function heldInZone() {
    return surfHold >= 0 && crestTouchIndex() === surfHold;
  }

  function isBracing() {
    return bracePointer || keyBrace;
  }

  function hitsObstacle(o, x, y) {
    var dx;
    var dy;
    var rad;
    if (o.w !== undefined) {
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
    if (x < MIN_X) return true;
    if (y < RADIUS || y > BEACH_W - RADIUS) return true;
    return Boolean(blockingObstacle(x, y));
  }

  function blockingObstacle(x, y) {
    return obstacles.find(function (obstacle) { return hitsObstacle(obstacle, x, y); });
  }

  function placePickup(item, occupied) {
    var originX = item.x;
    var originY = item.y;
    for (var step = 0; step < 320; step++) {
      var ring = step ? 30 * Math.ceil(step / 12) : 0;
      var angle = step * Math.PI / 6;
      var x = originX + ring * Math.cos(angle);
      var y = originY + ring * Math.sin(angle);
      if (x < MIN_X + 40 || x > GOAL_X - 45 || y < 44 || y > BEACH_W - 44) continue;
      if (obstacles.some(function (ob) {
        if (ob.w !== undefined) return Math.hypot(x - clamp(x, ob.x, ob.x + ob.w), y - clamp(y, ob.y, ob.y + ob.h)) < 52;
        return Math.hypot(x - ob.x, y - ob.y) < ob.r + 52;
      })) continue;
      if (occupied.some(function (other) { return Math.hypot(x - other.x, y - other.y) < 86; })) continue;
      item.x = x;
      item.y = y;
      return true;
    }
    return false;
  }

  function tryMove(dx, dy) {
    var nx = player.x + dx;
    var ny = player.y + dy;
    if (nx > GOAL_X) {
      var missing = dispatches.filter(function (item) { return !item.taken; }).length;
      if (missing) movementNotice = 'Find ' + missing + (missing === 1 ? ' more dispatch' : ' more dispatches');
    }
    if (nx > GOAL_X) nx = GOAL_X;
    if (!blocked(nx, ny)) {
      player.x = nx;
      player.y = ny;
      return;
    }
    contactObstacle = blockingObstacle(nx, ny) || null;
    var names = { wire: 'Barbed wire', log: 'Fallen log', crater: 'Crater', hedgehog: 'Steel barrier' };
    movementNotice = contactObstacle ? names[contactObstacle.kind] + ' ahead. Go around.' : 'Edge of the beach';
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
    if (ammoEl) ammoEl.textContent = String(ammo);
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
    var copy;
    if (state === 'lose' || state === 'win') return;
    copy = document.getElementById('lose-copy');
    if (copy) copy.textContent = 'Three stumbles. Trent gets up at the landing craft and can try the beach again.';
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
    spots = spots.filter(function (spot) { return spot.x < GOAL_X; });
    spots = spots.concat(spots.map(function (spot) { return Object.assign({}, spot); }));
    spots.forEach(function (spot, index) {
      spot.x = START_X + 650 + index * (GOAL_X - START_X - 1050) / spots.length;
      spot.y = 90 + index % 5 * 150;
    });
    var list = [];
    var i;
    var home;
    var lo;
    var hi;
    for (i = 0; i < spots.length; i++) {
      if (spots[i].x >= GOAL_X) continue;
      home = spots[i].y;
      lo = clamp(home - 72, 18, BEACH_W - 18);
      hi = clamp(home + 72, 18, BEACH_W - 18);
      if (hi - lo < 88) {
        if (lo <= 18) hi = Math.min(BEACH_W - 18, lo + 110);
        else lo = Math.max(18, hi - 110);
      }
      list.push({
        x: spots[i].x,
        y: home,
        lo: lo,
        hi: hi,
        vy: (i % 2 === 0 ? 1 : -1) * (44 + (i % 4) * 8),
        walk: i * 0.17,
        wrap: spots[i].wrap,
        mode: 'stand',
        t: 0,
        cool: 2 * (1.1 + (i % 4) * 0.45),
        facing: -1,
        away: 1
      });
    }
    return list;
  }

  function buildSoldierMask() {
    var w = SOLDIER.w;
    var h = SOLDIER.h;
    var frames;
    var c;
    var g;
    var data;
    var bits;
    var frame;
    var px;
    var py;
    var src;
    var idx;
    if (soldierMask || !imageReady(soldierImg)) return;
    frames = Math.max(1, Math.round(soldierImg.naturalWidth / w));
    c = document.createElement('canvas');
    c.width = w * frames;
    c.height = h;
    g = c.getContext('2d');
    if (!g) return;
    g.drawImage(soldierImg, 0, 0, c.width, c.height);
    try {
      data = g.getImageData(0, 0, c.width, c.height).data;
    } catch (ignoreMask) {
      return;
    }
    bits = new Uint8Array(Math.ceil((w * h * frames) / 8));
    idx = 0;
    for (frame = 0; frame < frames; frame++) {
      for (py = 0; py < h; py++) {
        for (px = 0; px < w; px++) {
          src = py * (w * frames) + frame * w + px;
          if (data[src * 4 + 3] > 16) bits[idx >> 3] |= 1 << (idx & 7);
          idx += 1;
        }
      }
    }
    soldierFrames = frames;
    soldierMask = bits;
  }

  function moveActiveSoldiers(dt) {
    var i;
    var s;
    for (i = 0; i < soldiers.length; i++) {
      s = soldiers[i];
      if (s.mode !== 'stand') continue;
      s.facing = player.x < s.x ? -1 : 1;
      s.walk += dt;
      if (s.hi - s.lo < 1) continue;
      s.y += s.vy * dt;
      if (s.y <= s.lo) {
        s.y = s.lo;
        s.vy = Math.abs(s.vy);
      } else if (s.y >= s.hi) {
        s.y = s.hi;
        s.vy = -Math.abs(s.vy);
      }
    }
  }

  function aimUnit() {
    var m = Math.hypot(aim.x, aim.y);
    if (m < 0.05) return { x: player.facing < 0 ? -1 : 1, y: 0 };
    return { x: aim.x / m, y: aim.y / m };
  }

  function stopSoldier(s) {
    s.t = 0;
    if (s.wrap && placePickup(s, mines.concat(packs, hearts, dispatches,
      soldiers.filter(function (other) { return other !== s && other.mode === 'parcel'; })))) {
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
      s.cool = 2 * (2.15 + Math.random() * 2.2);
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
        /* Brace stops rifle fire. A grenade, in the air or when it bursts, still lands. */
        if (h.kind === 'gunfire' && isBracing()) {
          h.spent = true;
          remove = true;
        } else {
          h.spent = true;
          if (h.kind !== 'burst') remove = true;
          if (state === 'play') {
            if (!reduceMotion()) shake = 7;
            startStumble();
          }
        }
      }
      if (remove) hazards.splice(i, 1);
    }
  }

  function soldierPixel(s, wx, wy) {
    var destH = 112 * unit();
    var sc = destH / SOLDIER.h;
    var face = s.facing < 0 ? -1 : 1;
    var lift = 14 * unit();
    return {
      x: (wx - s.x) * face * (scale / sc) + SOLDIER.anchorX,
      y: ((wy - s.y) * scale - lift) / sc + SOLDIER.anchorY,
      rad: 2.5 / sc
    };
  }

  function soldierOpaque(frame, px, py) {
    var ix = Math.round(px);
    var iy = Math.round(py);
    var idx;
    if (!soldierMask || frame < 0 || frame >= soldierFrames) return false;
    if (ix < 0 || iy < 0 || ix >= SOLDIER.w || iy >= SOLDIER.h) return false;
    idx = (frame * SOLDIER.h + iy) * SOLDIER.w + ix;
    return (soldierMask[idx >> 3] & (1 << (idx & 7))) !== 0;
  }

  function bulletStampHits(frame, px, py, rad) {
    var r;
    var y;
    var x;
    var box;
    r = Math.ceil(rad);
    if (soldierMask) {
      if (px + r < 0 || py + r < 0 || px - r >= SOLDIER.w || py - r >= SOLDIER.h) return false;
      for (y = -r; y <= r; y++) {
        for (x = -r; x <= r; x++) {
          if (x * x + y * y > rad * rad) continue;
          if (soldierOpaque(frame, px + x, py + y)) return true;
        }
      }
      return false;
    }
    box = SOLDIER_BOX[frame] || SOLDIER_BOX[0];
    return px >= box[0] - rad && px <= box[2] + rad && py >= box[1] - rad && py <= box[3] + rad;
  }

  /* The bullet is the drawn streak. Any overlap with the painted soldier counts. */
  function shotMeetsSoldier(x0, y0, x1, y1, s) {
    var a;
    var b;
    var dist;
    var stride;
    var cover;
    var steps;
    var i;
    var t;
    var frame;
    if (scale < 0.001) return false;
    a = soldierPixel(s, x0, y0);
    b = soldierPixel(s, x1, y1);
    dist = Math.hypot(b.x - a.x, b.y - a.y);
    stride = Math.max(1, a.rad * 0.85);
    cover = Math.hypot(stride * 0.5, a.rad);
    if (Math.max(a.x, b.x) + cover < 0 || Math.max(a.y, b.y) + cover < 0) return false;
    if (Math.min(a.x, b.x) - cover >= SOLDIER.w || Math.min(a.y, b.y) - cover >= SOLDIER.h) return false;
    steps = Math.max(1, Math.ceil(dist / stride));
    frame = soldierIndex(s);
    for (i = 0; i <= steps; i++) {
      t = i / steps;
      if (bulletStampHits(frame, a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, cover)) return true;
    }
    return false;
  }

  function updateShots(dt) {
    var i;
    var j;
    var shot;
    var s;
    var k;
    var back;
    var x0;
    var y0;
    var hit;
    for (i = shots.length - 1; i >= 0; i--) {
      hit = false;
      shot = shots[i];
      shot.life -= dt;
      shot.x += shot.vx * dt;
      shot.y += shot.vy * dt;
      k = Math.hypot(shot.vx, shot.vy) || 1;
      back = Math.max(12, Math.hypot(shot.vx * dt, shot.vy * dt));
      x0 = shot.x - (shot.vx / k) * back;
      y0 = shot.y - (shot.vy / k) * back;
      for (j = 0; j < soldiers.length; j++) {
        s = soldiers[j];
        if (s.mode !== 'stand') continue;
        if (shotMeetsSoldier(x0, y0, shot.x, shot.y, s)) {
          stopSoldier(s);
          shots.splice(i, 1);
          hit = true;
          break;
        }
      }
      if (hit) continue;
      /* The figure is drawn well above the feet, so a shot through the
         helmet is above the sand before it leaves the picture. */
      if (shot.life <= 0 || shot.y < -280 || shot.y > BEACH_W + 60 || shot.x < -240 || shot.x > WALL_X + 80) {
        shots.splice(i, 1);
      }
    }
  }

  function tryShoot() {
    var dir;
    if (state !== 'play') return;
    if (fireLeft > 0) return;
    if (!fireQueued && !keyFire && !firePointer) return;
    fireQueued = false;
    if (ammo <= 0) return;
    ammo -= 1;
    renderHud();
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

  function updateSurf(dt) {
    var hit;
    if (isBracing()) {
      surfHold = -1;
      return;
    }
    if (state !== 'play') return;
    hit = crestTouchIndex();
    if (hit >= 0) surfHold = hit;
    if (!heldInZone()) {
      surfHold = -1;
      return;
    }
    pushBack(waves[surfHold].push * dt);
  }

  function updateMinesAndPacks() {
    var i;
    var mine;
    var pack;
    var s;
    var dx;
    var dy;
    for (i = 0; i < mines.length; i++) {
      mine = mines[i];
      if (mine.spent) continue;
      dx = player.x - mine.x;
      dy = player.y - mine.y;
      if (dx * dx + dy * dy > (mine.r + RADIUS) * (mine.r + RADIUS)) continue;
      mine.spent = true;
      hazards.push({ kind: 'burst', x: mine.x, y: mine.y, r: 52, t: 0, life: .3, spent: true });
      if (!reduceMotion()) shake = 12;
      startStumble();
      return true;
    }
    for (i = soldiers.length - 1; i >= 0; i--) {
      s = soldiers[i];
      if (s.mode !== 'parcel') continue;
      dx = player.x - s.x;
      dy = player.y - s.y;
      if (dx * dx + dy * dy > 40 * 40) continue;
      ammo += AMMO_PER_PICKUP;
      soldiers.splice(i, 1);
      say('Two more bullets.');
    }
    for (i = 0; i < packs.length; i++) {
      pack = packs[i];
      if (pack.taken) continue;
      dx = player.x - pack.x;
      dy = player.y - pack.y;
      if (dx * dx + dy * dy > (pack.r + RADIUS) * (pack.r + RADIUS)) continue;
      pack.taken = true;
      ammo += AMMO_PER_PICKUP;
      say('Two more bullets.');
    }
    return false;
  }

  function updatePlay(dt) {
    contactObstacle = null;
    movementNotice = '';
    updateTravelingWave();
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
    updateSurf(dt);
    if (!bracing && surfHold < 0) {
      if (stick.x || stick.y) tryMove(stick.x * SPEED * dt, stick.y * SPEED * dt);
    } else if (surfHold >= 0) {
      movementNotice = 'Wave pushing back. Hold Brace.';
    } else if (stick.x || stick.y) {
      movementNotice = 'Braced. Release Brace to walk.';
    }
    if (updateMinesAndPacks()) return;
    hearts.forEach(function (item) {
      if (!item.taken && player.stumbles > 0 && Math.hypot(player.x - item.x, player.y - item.y) < 38) {
        item.taken = true;
        player.stumbles--;
        say('Life recovered.');
      }
    });
    dispatches.forEach(function (item) {
      if (!item.taken && Math.hypot(player.x - item.x, player.y - item.y) < 36) {
        item.taken = true;
        say('Dispatch recovered.');
      }
    });
    if (player.x >= GOAL_X - 24) {
      var missingDispatches = dispatches.filter(function (item) { return !item.taken; }).length;
      if (missingDispatches) movementNotice = 'Collect ' + missingDispatches + (missingDispatches === 1 ? ' more dispatch' : ' more dispatches') + ' to complete this level.';
    }
    moved = Math.hypot(player.x - beforeX, player.y - beforeY);
    moving = !bracing && moved > 0.01;
    if (moving) player.step += moved * 0.09;
    if (lean > 0) lean = Math.max(0, lean - dt);
    if (player.x >= GOAL_X && dispatches.every(function (item) { return item.taken; })) {
      win();
      return;
    }
    tickWeapons(dt);
    tryShoot();
    moveActiveSoldiers(dt);
    updateShots(dt);
    updateSoldiers(dt, true);
    updateHazards(dt);
  }

  function updateStumble(dt) {
    stumbleT += dt;
    tickWeapons(dt);
    moveActiveSoldiers(dt);
    updateShots(dt);
    updateSoldiers(dt, false);
    updateHazards(dt);
    updateSurf(dt);
    if (stumbleT < STUMBLE_TIME) return;
    if (player.stumbles >= 3) lose();
    else state = 'play';
  }

  function updateTravelingWave() {
    var wave = waves[0];
    if (wave && crestPose(wave) + 130 < wave.x0) {
      waves = [];
      surfHold = -1;
    }
    if (waves.length || seaTime < nextWave) return;
    var ys = [0.72, 0.27, 0.55, 0.38];
    var reach = clamp(cameraY + (cssH * ys[waveLane % ys.length] - sandTop) / scale, 75, BEACH_W - 75);
    waves = [{ x0: cameraX, x1: cameraX + cssW / scale + 25, born: seaTime,
      reach: reach, amp: [94, 134, 112, 120][waveLane % 4], push: 360 }];
    waveLane++;
    nextWave = seaTime + cssW / scale / SURF_SPEED + 2;
  }

  function braceNeeded() {
    var i;
    var wave;
    var shape;
    var head;
    var s;
    var p;
    var dx;
    var dy;
    if (state !== 'play') return false;
    if (surfHold >= 0) return true;
    for (i = 0; i < waves.length; i++) {
      wave = waves[i];
      if (player.x < wave.x0 - 20 || player.x > wave.x1 + 20) continue;
      shape = crestShape(wave);
      head = crestPose(wave);
      for (s = 0; s <= 8; s++) {
        p = crestPoint(head, shape.mid, shape.amp, s / 8);
        dx = p.x - player.x;
        dy = p.y - player.y;
        if (dx > -40 && dx < 150 && dx * dx + dy * dy < 120 * 120) return true;
      }
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
  function worldToY(y) { return sandTop + (y - cameraY) * scale; }

  function frameCamera() {
    var view = cssW / Math.max(scale, 0.001);
    cameraX = player.x - view / 2;
    var screenY = worldToY(player.y);
    if (screenY > cssH * .75) cameraY += (screenY - cssH * .75) / scale;
    if (screenY < cssH * .25) cameraY -= (cssH * .25 - screenY) / scale;
    cameraY = clamp(cameraY, 0, BEACH_W - (cssH - sandTop) / scale);
  }

  function imageReady(img) {
    return !!(img && img.complete && img.naturalWidth > 0);
  }

  function drawBeach() {
    if (!imageReady(beachImg)) return;
    var iw = beachImg.naturalWidth;
    var ih = beachImg.naturalHeight;
    var width = Math.max(cssW * 1.15, cssH * iw / ih);
    var travel = clamp((cameraX + 180) / (WALL_X + 180), 0, 1);
    var x = -(width - cssW) * travel;
    var split = Math.round(ih * .24);
    var top = worldToY(0);
    if (top > 0) ctx.drawImage(beachImg, 0, 0, iw, split, x, 0, width, top + 1);
    ctx.drawImage(beachImg, 0, split, iw, ih - split, x, top, width, BEACH_W * scale);
  }

  function drawCraft() {
    var w;
    var h;
    var rampX;
    var baseY;
    if (!rally || !imageReady(craftImg)) return;
    w = 260 * unit();
    h = w * (craftImg.naturalHeight / craftImg.naturalWidth);
    rampX = worldToX(500);
    baseY = worldToY(START_Y + 90);
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
    if (!imageReady(wireImg)) return;
    var x = worldToX(o.x);
    var w = o.w * scale;
    ctx.save();
    ctx.globalAlpha = Math.max(.75, alpha);
    for (var y = o.y; y < o.y + o.h; y += 54) {
      var h = Math.min(54, o.y + o.h - y) * scale;
      var top = worldToY(y);
      if (top + h > 0 && top < cssH) ctx.drawImage(wireImg, x, top, w, h);
    }
    ctx.restore();
  }

  function drawBlockingGround() {
    ctx.save();
    ctx.globalAlpha = .5;
    obstacles.forEach(function (o) {
      if (state !== 'play' || contactObstacle !== o) return;
      var x = worldToX(o.x);
      var y = worldToY(o.y);
      var width = (o.w || o.r * 2) * scale;
      var height = (o.h || o.r * 2) * scale;
      if (x + width < 0 || x - width > cssW || y + height < 0 || y - height > cssH) return;
      ctx.beginPath();
      if (o.w !== undefined) ctx.rect(x, y, width, height);
      else ctx.arc(x, y, o.r * scale, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(240, 153, 60, .30)';
      ctx.fill();
      ctx.strokeStyle = '#ffc16d';
      ctx.lineWidth = 3;
      ctx.stroke();
    });
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
      if (!drawPainted(craterImg, o.x, o.y, o.r * 2.9)) drawCrater(o, alpha);
    }
    for (i = 0; i < obstacles.length; i++) {
      o = obstacles[i];
      if (o.kind === 'crater') continue;
      if (o.kind === 'log') {
        if (imageReady(logImg)) ctx.drawImage(logImg, worldToX(o.x), worldToY(o.y), o.w * scale, o.h * scale);
        else { ctx.fillStyle = '#49382c'; ctx.fillRect(worldToX(o.x), worldToY(o.y), o.w * scale, o.h * scale); }
        continue;
      }
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
    y = worldToY(0);
    h = BEACH_W * scale;
    if (x <= cssW + 40) ctx.drawImage(wallImg, x, y, w, h);
    if (!rally && !breach) {
      var startWallX = worldToX(MIN_X) - w * .92;
      ctx.drawImage(wallImg, startWallX, y, w, h);
    }
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

  function traceCrest(wave, head, mid, amp) {
    var steps = 16;
    var s;
    var p;
    var started = false;
    var any = false;
    ctx.beginPath();
    for (s = 0; s <= steps; s++) {
      p = crestPoint(head, mid, amp, s / steps);
      if (p.x < wave.x0 || p.x > wave.x1) {
        started = false;
        continue;
      }
      if (!started) {
        ctx.moveTo(worldToX(p.x), worldToY(p.y));
        started = true;
        any = true;
      } else ctx.lineTo(worldToX(p.x), worldToY(p.y));
    }
    return any;
  }

  function drawSurf() {
    var i;
    var wave;
    var shape;
    var head;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (i = 0; i < waves.length; i++) {
      wave = waves[i];
      if (worldToX(wave.x1) < -50 || worldToX(wave.x0) > cssW + 50) continue;
      shape = crestShape(wave);
      head = crestPose(wave);
      if (!traceCrest(wave, head, shape.mid, shape.amp)) continue;
      ctx.strokeStyle = 'rgba(118, 164, 174, 0.5)';
      ctx.lineWidth = Math.max(4, 34 * scale);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(248, 252, 252, 0.95)';
      ctx.lineWidth = Math.max(1.5, 4 * scale);
      ctx.stroke();
      if (!traceCrest(wave, head + 18, shape.mid + 4, shape.amp * 0.62)) continue;
      ctx.strokeStyle = 'rgba(232, 246, 246, 0.75)';
      ctx.lineWidth = Math.max(1.5, 2.5 * scale);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawPainted(img, x, y, worldW) {
    var px;
    var py;
    var dw;
    var dh;
    if (!imageReady(img)) return false;
    dw = worldW * scale;
    dh = dw * (img.naturalHeight / img.naturalWidth);
    px = worldToX(x);
    py = worldToY(y);
    if (px < -dw || px > cssW + dw) return true;
    ctx.drawImage(img, px - dw * 0.5, py - dh * 0.62, dw, dh);
    return true;
  }

  function drawCartoonMine(x, y) {
    var px = worldToX(x);
    var py = worldToY(y);
    var rad = 15 * scale;
    if (px < -40 || px > cssW + 40) return;
    ctx.fillStyle = 'rgba(176, 154, 116, 0.95)';
    ctx.beginPath();
    ctx.ellipse(px, py + rad * 0.55, rad * 1.4, rad * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#5e6848';
    ctx.beginPath();
    ctx.arc(px, py, rad, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#243028';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(px, py - rad);
    ctx.lineTo(px, py - rad - 8);
    ctx.moveTo(px - rad * 0.75, py + rad * 0.15);
    ctx.lineTo(px - rad - 7, py + rad * 0.6);
    ctx.moveTo(px + rad * 0.75, py + rad * 0.15);
    ctx.lineTo(px + rad + 7, py + rad * 0.6);
    ctx.stroke();
  }

  function drawCartoonCrate(x, y) {
    var px = worldToX(x);
    var py = worldToY(y);
    if (px < -40 || px > cssW + 40) return;
    ctx.fillStyle = '#8d5a32';
    ctx.fillRect(px - 13, py - 10, 26, 18);
    ctx.strokeStyle = '#4a3018';
    ctx.lineWidth = 2;
    ctx.strokeRect(px - 13, py - 10, 26, 18);
    ctx.fillStyle = '#e2c07a';
    ctx.fillRect(px - 2, py - 10, 4, 18);
    ctx.fillStyle = '#d7a441';
    ctx.beginPath();
    ctx.ellipse(px - 6, py - 2, 5, 2, -0.5, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawMinesAndPacks() {
    var i;
    var mine;
    var pack;
    for (i = 0; i < mines.length; i++) {
      mine = mines[i];
      if (mine.spent) continue;
      if (!drawPainted(mineImg, mine.x, mine.y, 62)) drawCartoonMine(mine.x, mine.y);
    }
    for (i = 0; i < packs.length; i++) {
      pack = packs[i];
      if (pack.taken) continue;
      if (!drawPainted(crateImg, pack.x, pack.y, 54)) drawCartoonCrate(pack.x, pack.y);
    }
    dispatches.forEach(function (item) {
      if (item.taken) return;
      drawPainted(dispatchImg, item.x, item.y, 52);
      ctx.fillStyle = '#fff3c7';
      ctx.textAlign = 'center';
      ctx.font = 'bold 13px system-ui';
      ctx.fillText('DISPATCH', worldToX(item.x), worldToY(item.y) - 34);
    });
    hearts.forEach(function (item) {
      if (!item.taken) drawPainted(heartImg, item.x, item.y, 46);
    });
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
    var feetX = worldToX(player.x);
    var feetY = worldToY(player.y);
    var depth = 0.84 + 0.18 * clamp(player.y / BEACH_W, 0, 1);
    ctx.fillStyle = 'rgba(33, 30, 26, 0.37)';
    ctx.beginPath();
    ctx.ellipse(feetX, feetY + 2, Math.max(8, destW * .21 * depth), Math.max(2.5, destH * .037), 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.translate(worldToX(player.x), worldToY(player.y));
    ctx.scale(face * depth, depth);
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
    n = reduceMotion() ? 0 : Math.floor(s.walk / 0.12) % 4;
    return n;
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
    ctx.translate(x, y);
    ctx.rotate(Math.atan2(dir.y, dir.x));
    ctx.scale(2, 2);
    ctx.fillStyle = '#ff3030';
    ctx.strokeStyle = '#16384c';
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(16, 0);
    ctx.lineTo(3, 7);
    ctx.lineTo(3, 3);
    ctx.lineTo(-13, 3);
    ctx.lineTo(-13, -3);
    ctx.lineTo(3, -3);
    ctx.lineTo(3, -7);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    if (flash > 0) {
      ctx.fillStyle = 'rgba(244, 231, 176, 0.95)';
      ctx.beginPath();
      ctx.arc(worldToX(player.x + dir.x * 20), worldToY(player.y + dir.y * 20) - 16 * unit(), 8, 0, Math.PI * 2);
      ctx.fill();
    }
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
    drawSurf();
    drawBlockingGround();
    drawMinesAndPacks();
    drawSoldiers();
    drawHazards();
    drawShots();
    drawTrent();
    drawAim();
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
    scale = sandH / 280;
  }

  function portraitWanted() {
    return window.TrentOrientation.blocked(true);
  }

  function syncPortrait() {
    var show = portraitWanted();
    portraitEl.hidden = !show || window.TrentOrientation.embedded;
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
    var notice = state === 'play' ? movementNotice : '';
    if (movementNote.textContent !== notice) movementNote.textContent = notice;
    movementNote.hidden = !notice;
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

  resize();
  resetWorld();
  syncPortrait();
  lastFrame = performance.now();
  requestAnimationFrame(loop);
})();
