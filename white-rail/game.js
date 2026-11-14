/* Chapter 3 — White Rail.
   Side-view handcar chase along a snowy line. Not the overhead yard.
   Pump to keep speed. Steer among three tracks.
   A crate, a gap, or a lowered signal arm is a slip, a jolt.
   Three slips restart the line. The yard mouth wins.
   Holding Pump from the start covers the line in about one minute.
   Sky, rails, handcar, and Trent are painted pictures in art/.
   Snow specks stay on the canvas. No network. */
'use strict';

(function () {
  var canvas = document.getElementById('rail');
  var ctx = canvas.getContext('2d');
  var speedEl = document.getElementById('speed');
  var slipsEl = document.getElementById('slips');
  var distanceEl = document.getElementById('distance');
  var pauseBtn = document.getElementById('pause');
  var trackUpBtn = document.getElementById('track-up');
  var trackDownBtn = document.getElementById('track-down');
  var pumpBtn = document.getElementById('pump');
  var hintEl = document.getElementById('hint');
  var startSheet = document.getElementById('start-sheet');
  var pauseSheet = document.getElementById('pause-sheet');
  var loseSheet = document.getElementById('lose-sheet');
  var winSheet = document.getElementById('win-sheet');
  var winTimeEl = document.getElementById('win-time');
  var portraitEl = document.getElementById('portrait');
  var statusEl = document.getElementById('status');

  if (!canvas || !ctx) return;

  var VIEW_W = 844;
  var VIEW_H = 390;
  var PX = 32;
  var CAR_X = 230;
  var FINISH = 454;
  var DECAY = 0.62;
  var SPEED_FLOOR = 0.45;
  var PUMP_ADD = 1.55;
  var PUMP_COOLDOWN = 0.34;
  var SPEED_MAX = 9.2;
  var START_SPEED = 4.6;
  var SWITCH_TIME = 0.2;
  var NOSE = 1.25;
  var TAIL = 0.5;

  /* y is the near rail. scale sizes the car and the furniture on that track. */
  var LANES = [
    { y: 164, scale: 0.78 },
    { y: 220, scale: 0.92 },
    { y: 276, scale: 1.05 }
  ];

  var PATTERN = [
    { kind: 'crate', lane: 1, x: 34, w: 2.4 },
    { kind: 'crate', lane: 0, x: 58, w: 2.4 },
    { kind: 'gap', lane: 2, x: 82, w: 3.6 },
    { kind: 'arm', lane: 1, x: 108, w: 2.3 },
    { kind: 'crate', lane: 2, x: 132, w: 2.5 },
    { kind: 'gap', lane: 0, x: 156, w: 3.8 },
    { kind: 'crate', lane: 0, x: 182, w: 2.4 },
    { kind: 'crate', lane: 2, x: 183.2, w: 2.5 },
    { kind: 'gap', lane: 1, x: 208, w: 4.0 },
    { kind: 'arm', lane: 0, x: 234, w: 2.3 },
    { kind: 'crate', lane: 2, x: 258, w: 2.6 },
    { kind: 'gap', lane: 0, x: 282, w: 4.0 },
    { kind: 'crate', lane: 1, x: 283.4, w: 2.4 },
    { kind: 'arm', lane: 2, x: 310, w: 2.3 },
    { kind: 'crate', lane: 0, x: 334, w: 2.4 },
    { kind: 'gap', lane: 1, x: 358, w: 4.2 },
    { kind: 'arm', lane: 0, x: 386, w: 2.3 },
    { kind: 'crate', lane: 2, x: 387.2, w: 2.6 },
    { kind: 'gap', lane: 2, x: 410, w: 3.6 },
    { kind: 'crate', lane: 1, x: 432, w: 2.4 }
  ];

  var sheds = [
    { x: 96, w: 12, h: 7.2 },
    { x: 248, w: 16, h: 8.4 },
    { x: 360, w: 11, h: 6.4 }
  ];

  var flakes = buildFlakes();

  /* rails.webp is 1600×900. Sky is the painting above the rails.
     The rail band is the snowy bed. RAIL_ANCHOR is the rail center. */
  var SKY_SRC_H = 668;
  var RAIL_SRC_Y = 640;
  var RAIL_SRC_H = 220;
  var RAIL_ANCHOR = 0.37;
  /* trent.webp: six equal frames, feet on one baseline.
     Order: high, down, forward, low, rising, high. */
  var TRENT = { w: 459, h: 512, anchorX: 168, anchorY: 495, frames: 6 };
  var HAND = { w: 774, h: 431, axleX: 386, axleY: 426, deckY: 214 };

  var railsImg = new Image();
  var handcarImg = new Image();
  var trentImg = new Image();
  railsImg.src = 'art/rails.webp';
  handcarImg.src = 'art/handcar.webp';
  trentImg.src = 'art/trent.webp';

  var state = 'title';
  var pausedState = 'play';
  var distance = 0;
  var speed = 0;
  var slips = 0;
  var fromLane = 1;
  var toLane = 1;
  var laneT = 1;
  var pumpCool = 0;
  var pumpAnim = 1;
  var slipT = 0;
  var shake = 0;
  var safeLane = -1;
  var safeUntil = 0;
  var obstacles = makeObstacles();
  var hintDismissed = false;
  var visualTime = 0;
  var cssW = 844;
  var cssH = 390;
  var dpr = 1;
  var view = { s: 1, ox: 0, oy: 0 };
  var runStart = 0;
  var pauseAccum = 0;
  var pauseBegan = 0;
  var victorySent = false;
  var portraitDismissed = false;
  var lastFrame = 0;
  var pumpHeld = false;
  var spaceHeld = false;
  var pumpId = 0;
  var dragging = false;
  var dragId = 0;
  var dragY = 0;
  var dragAccum = 0;

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

  function wrap(v, m) {
    return ((v % m) + m) % m;
  }

  function imageReady(img) {
    return !!(img && img.complete && img.naturalWidth > 0);
  }

  function buildFlakes() {
    var list = [];
    var i;
    for (i = 0; i < 40; i++) {
      list.push({
        x: ((i * 73) % 1000) / 1000,
        y: ((i * 41) % 1000) / 1000,
        r: 1.1 + (i % 4) * 0.55,
        s: 0.08 + (i % 5) * 0.035,
        a: 0.35 + (i % 4) * 0.12
      });
    }
    return list;
  }

  function makeObstacles() {
    var list = [];
    var i;
    var src;
    for (i = 0; i < PATTERN.length; i++) {
      src = PATTERN[i];
      list.push({
        kind: src.kind,
        lane: src.lane,
        x: src.x,
        w: src.w,
        cleared: false
      });
    }
    return list;
  }

  function wx(worldX) {
    return CAR_X + (worldX - distance) * PX;
  }

  function viewWorldMin() {
    return distance + (-80 - CAR_X) / PX;
  }

  function viewWorldMax() {
    return distance + (VIEW_W + 80 - CAR_X) / PX;
  }

  function onScreen(worldX, worldW) {
    var x0 = wx(worldX);
    var x1 = wx(worldX + (worldW || 0));
    return x1 > -60 && x0 < VIEW_W + 60;
  }

  function smooth(t) {
    return t * t * (3 - 2 * t);
  }

  function visualLane() {
    var t = laneT >= 1 ? 1 : smooth(laneT);
    return clamp(fromLane + (toLane - fromLane) * t, 0, 2);
  }

  function occupiedLane() {
    if (fromLane === toLane || laneT >= 0.58) return toLane;
    return fromLane;
  }

  function laneMetric(v, key) {
    var i = Math.floor(v);
    var f;
    if (i < 0) return LANES[0][key];
    if (i >= 2) return LANES[2][key];
    f = v - i;
    return LANES[i][key] + (LANES[i + 1][key] - LANES[i][key]) * f;
  }

  function railFarY(i) {
    return LANES[i].y - (8 + i * 2);
  }

  function playing() {
    return state === 'play' || (state === 'slip' && slips < 3);
  }

  function say(text) {
    statusEl.textContent = text;
  }

  function renderHud() {
    var kmh = Math.round(Math.max(0, speed) * 3.6) + ' km/h';
    var left = Math.max(0, Math.ceil(FINISH - distance)) + ' m';
    var slipLine = slips + ' / 3';
    if (speedEl.textContent !== kmh) speedEl.textContent = kmh;
    if (distanceEl.textContent !== left) distanceEl.textContent = left;
    if (slipsEl.textContent !== slipLine) slipsEl.textContent = slipLine;
    hintEl.hidden = hintDismissed || (state !== 'play' && state !== 'slip');
  }

  function refreshTrackButtons() {
    var upLimit = toLane <= 0;
    var downLimit = toLane >= 2;
    trackUpBtn.classList.toggle('limit', upLimit);
    trackDownBtn.classList.toggle('limit', downLimit);
    trackUpBtn.setAttribute('aria-disabled', upLimit ? 'true' : 'false');
    trackDownBtn.setAttribute('aria-disabled', downLimit ? 'true' : 'false');
  }

  function refreshPump() {
    var held = (pumpHeld || spaceHeld) && playing();
    pumpBtn.classList.toggle('held', held);
    pumpBtn.setAttribute('aria-pressed', held ? 'true' : 'false');
  }

  function resetWorld() {
    distance = 0;
    speed = 0;
    slips = 0;
    fromLane = 1;
    toLane = 1;
    laneT = 1;
    pumpCool = 0;
    pumpAnim = 1;
    slipT = 0;
    shake = 0;
    safeLane = -1;
    safeUntil = 0;
    obstacles = makeObstacles();
    hintDismissed = false;
    dragging = false;
    dragAccum = 0;
    refreshTrackButtons();
  }

  function beginRun() {
    var keepPump = pumpHeld;
    var keepSpace = spaceHeld;
    resetWorld();
    pumpHeld = keepPump;
    spaceHeld = keepSpace;
    speed = START_SPEED;
    victorySent = false;
    pauseAccum = 0;
    runStart = performance.now();
    lastFrame = runStart;
    state = 'play';
    startSheet.hidden = true;
    pauseSheet.hidden = true;
    loseSheet.hidden = true;
    winSheet.hidden = true;
    renderHud();
    say('On the line.');
    if (document.activeElement && document.activeElement.blur && document.activeElement !== document.body) {
      document.activeElement.blur();
    }
  }

  function openPause() {
    if (state !== 'play' && state !== 'slip') return;
    pausedState = state;
    pauseBegan = performance.now();
    state = 'pause';
    pauseSheet.hidden = false;
    dragging = false;
    dragAccum = 0;
    say('Paused.');
  }

  function closePause() {
    if (state !== 'pause') return;
    pauseAccum += performance.now() - pauseBegan;
    state = pausedState || 'play';
    pauseSheet.hidden = true;
    lastFrame = performance.now();
    say('On the line.');
  }

  function restartLine() {
    pumpHeld = false;
    spaceHeld = false;
    beginRun();
    say('Back at the start of the line.');
  }

  function win() {
    var seconds;
    if (state === 'win' || state === 'lose') return;
    seconds = Math.max(0, Math.round((performance.now() - runStart - pauseAccum) / 1000));
    state = 'win';
    distance = FINISH;
    speed = 0;
    dragging = false;
    winTimeEl.textContent = 'On the line for ' + seconds + (seconds === 1 ? ' second.' : ' seconds.');
    winSheet.hidden = false;
    say('The yard mouth. ' + seconds + ' seconds.');
    if (!victorySent) {
      victorySent = true;
      window.dispatchEvent(new CustomEvent('white-rail:complete', {
        detail: { seconds: seconds }
      }));
    }
  }

  /* Three slips put the car back at the start. No victory event. */
  function failLine() {
    if (state === 'win' || state === 'lose') return;
    resetWorld();
    speed = 0;
    state = 'lose';
    loseSheet.hidden = false;
    say('Three slips. Back at the start of the line.');
  }

  function doPump() {
    if (!playing()) return;
    if (pumpCool > 0) return;
    speed = Math.min(SPEED_MAX, speed + PUMP_ADD);
    pumpCool = PUMP_COOLDOWN;
    pumpAnim = 0;
    hintDismissed = true;
  }

  function changeLane(dir) {
    var next;
    if (!playing()) return;
    next = toLane + dir;
    if (next < 0 || next > 2) return;
    if (next === toLane && laneT >= 1) return;
    fromLane = occupiedLane();
    toLane = next;
    laneT = 0;
    hintDismissed = true;
    refreshTrackButtons();
  }

  function beginSlip(ob) {
    slips += 1;
    speed *= 0.5;
    if (speed < SPEED_FLOOR) speed = SPEED_FLOOR;
    distance = Math.max(0, ob.x - 1.05);
    ob.cleared = true;
    safeLane = ob.lane;
    safeUntil = ob.x + ob.w + 0.45;
    slipT = 0;
    state = 'slip';
    if (slips >= 3) speed = 0;
    if (!reduceMotion()) shake = 8;
    renderHud();
    say('Slip ' + slips + ' of 3.');
  }

  function hitTest(ob) {
    var nose;
    var tail;
    if (ob.cleared) return false;
    if (ob.lane !== occupiedLane()) return false;
    if (ob.lane === safeLane && distance < safeUntil) return false;
    nose = distance + NOSE;
    tail = distance - TAIL;
    return nose > ob.x && tail < ob.x + ob.w;
  }

  function checkHits() {
    var i;
    for (i = 0; i < obstacles.length; i++) {
      if (!hitTest(obstacles[i])) continue;
      beginSlip(obstacles[i]);
      return;
    }
  }

  function integrate(dt) {
    var pumping = pumpHeld || spaceHeld;
    speed += (SPEED_FLOOR - speed) * (1 - Math.exp(-DECAY * dt));
    if (pumpCool > 0) pumpCool -= dt;
    if (pumping) doPump();
    if (pumpAnim < 1) pumpAnim = Math.min(1, pumpAnim + dt / 0.32);
    if (laneT < 1) {
      laneT = Math.min(1, laneT + dt / SWITCH_TIME);
      if (laneT >= 1) fromLane = toLane;
    }
    distance += speed * dt;
    if (distance < 0) distance = 0;
  }

  function updatePlay(dt) {
    integrate(dt);
    if (distance >= FINISH) {
      distance = FINISH;
      win();
      return;
    }
    if (state === 'play') checkHits();
  }

  function updateSlip(dt) {
    slipT += dt;
    if (slips >= 3) {
      speed = 0;
      if (pumpAnim < 1) pumpAnim = Math.min(1, pumpAnim + dt / 0.32);
      if (slipT >= 0.42) failLine();
      return;
    }
    integrate(dt);
    if (distance >= FINISH) {
      distance = FINISH;
      win();
      return;
    }
    if (slipT >= 0.42) state = 'play';
  }

  function updateFlakes(dt) {
    var i;
    var f;
    var wind = speed * 0.02;
    for (i = 0; i < flakes.length; i++) {
      f = flakes[i];
      f.y += f.s * dt;
      f.x -= wind * dt;
      if (f.y > 1.08) f.y = -0.06;
      if (f.x < -0.08) f.x += 1.12;
    }
  }

  function roundRect(x, y, w, h, r) {
    var rr = r || 0;
    if (w < 0) { x += w; w = -w; }
    if (h < 0) { y += h; h = -h; }
    if (rr > w / 2) rr = w / 2;
    if (rr > h / 2) rr = h / 2;
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }

  function drawSky() {
    var destH;
    var tileW;
    var scroll;
    var x;
    if (!imageReady(railsImg)) return;
    destH = VIEW_H + 28;
    tileW = destH * (railsImg.naturalWidth / SKY_SRC_H);
    scroll = distance * PX * 0.18;
    x = -wrap(scroll, tileW);
    while (x < VIEW_W + 1) {
      ctx.drawImage(railsImg, 0, 0, railsImg.naturalWidth, SKY_SRC_H, x, -14, tileW + 1, destH);
      x += tileW;
    }
  }

  function drawShed(s) {
    var x;
    var w;
    var h;
    var y;
    if (!onScreen(s.x, s.w)) return;
    x = wx(s.x);
    w = s.w * PX * 0.55;
    h = s.h * 6.2;
    y = 138;
    ctx.fillStyle = '#6d4a32';
    ctx.fillRect(x, y - h, w, h);
    ctx.fillStyle = '#f4f7fb';
    ctx.beginPath();
    ctx.moveTo(x - 6, y - h + 4);
    ctx.lineTo(x + w * 0.5, y - h - 16);
    ctx.lineTo(x + w + 6, y - h + 4);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#f0c98a';
    ctx.fillRect(x + w * 0.62, y - h * 0.62, w * 0.18, h * 0.22);
  }

  function drawSheds() {
    var i;
    for (i = 0; i < sheds.length; i++) drawShed(sheds[i]);
  }

  function drawWaterTower() {
    var x = wx(168);
    if (x < -40 || x > VIEW_W + 40) return;
    ctx.strokeStyle = '#3e342c';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - 8, 132);
    ctx.lineTo(x - 4, 96);
    ctx.moveTo(x + 8, 132);
    ctx.lineTo(x + 4, 96);
    ctx.stroke();
    ctx.fillStyle = '#6a5344';
    ctx.beginPath();
    ctx.ellipse(x, 92, 16, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f7fbff';
    ctx.beginPath();
    ctx.ellipse(x, 86, 16, 5, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawYardGlow() {
    var near = (distance - (FINISH - 70)) / 70;
    var g;
    if (near <= 0) return;
    if (near > 1) near = 1;
    g = ctx.createRadialGradient(VIEW_W - 30, 168, 8, VIEW_W - 10, 180, 240);
    g.addColorStop(0, 'rgba(255, 214, 160, ' + (0.5 * near) + ')');
    g.addColorStop(1, 'rgba(255, 214, 160, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }

  function drawRailSpan(i, x0, x1) {
    var sx0 = wx(x0);
    var sx1 = wx(x1);
    var sc;
    var destH;
    var destY;
    var tileW;
    var origin;
    var x;
    if (sx1 - sx0 < 1) return;
    if (!imageReady(railsImg)) return;
    sc = LANES[i].scale;
    destH = 64 * sc;
    destY = LANES[i].y - destH * RAIL_ANCHOR;
    tileW = destH * (railsImg.naturalWidth / RAIL_SRC_H);
    origin = CAR_X - distance * PX;
    ctx.save();
    ctx.beginPath();
    ctx.rect(sx0, destY, sx1 - sx0, destH);
    ctx.clip();
    x = origin - wrap(origin, tileW);
    while (x < VIEW_W + 1) {
      ctx.drawImage(
        railsImg,
        0, RAIL_SRC_Y, railsImg.naturalWidth, RAIL_SRC_H,
        x, destY, tileW + 1, destH
      );
      x += tileW;
    }
    ctx.restore();
    if (i === toLane) {
      ctx.fillStyle = 'rgba(236, 196, 120, 0.2)';
      ctx.fillRect(sx0, LANES[i].y - 3, sx1 - sx0, 7);
    }
  }

  function drawRails(i) {
    var gaps = [];
    var n;
    var ob;
    var cursor;
    var vis0 = viewWorldMin();
    var vis1 = viewWorldMax();
    for (n = 0; n < obstacles.length; n++) {
      ob = obstacles[n];
      if (ob.lane === i && ob.kind === 'gap') gaps.push(ob);
    }
    gaps.sort(function (a, b) { return a.x - b.x; });
    cursor = vis0;
    for (n = 0; n < gaps.length; n++) {
      ob = gaps[n];
      if (ob.x + ob.w < vis0) continue;
      if (ob.x > vis1) break;
      if (ob.x > cursor) drawRailSpan(i, cursor, Math.min(ob.x, vis1));
      cursor = Math.max(cursor, ob.x + ob.w);
    }
    if (cursor < vis1) drawRailSpan(i, cursor, vis1);
  }

  function drawGap(ob, i) {
    var x0;
    var x1;
    var yFar;
    var yNear;
    if (!onScreen(ob.x, ob.w)) return;
    x0 = wx(ob.x);
    x1 = wx(ob.x + ob.w);
    yFar = railFarY(i) - 4;
    yNear = LANES[i].y + 16;
    ctx.fillStyle = '#141a22';
    roundRect(x0, yFar, x1 - x0, yNear - yFar, 8);
    ctx.fill();
    ctx.fillStyle = '#0c1016';
    roundRect(x0 + 6, yFar + 6, Math.max(4, x1 - x0 - 12), Math.max(4, yNear - yFar - 14), 6);
    ctx.fill();
    ctx.fillStyle = '#f4f8fb';
    ctx.beginPath();
    ctx.moveTo(x0 - 2, yFar + 2);
    ctx.lineTo(x0 + 10, yFar - 5);
    ctx.lineTo(x0 + 16, yFar + 3);
    ctx.lineTo(x1 - 12, yFar + 2);
    ctx.lineTo(x1, yFar - 4);
    ctx.lineTo(x1 + 4, yFar + 4);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#2a3038';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x0 - 4, LANES[i].y);
    ctx.lineTo(x0 + 8, LANES[i].y - 7);
    ctx.moveTo(x1 + 4, LANES[i].y);
    ctx.lineTo(x1 - 8, LANES[i].y - 6);
    ctx.stroke();
  }

  function drawCrate(ob, i) {
    var sc;
    var w;
    var h;
    var x;
    var y;
    var g;
    if (!onScreen(ob.x, ob.w)) return;
    sc = LANES[i].scale;
    w = Math.max(ob.w * PX, 28 * sc);
    h = 26 * sc;
    x = wx(ob.x + ob.w * 0.5) - w / 2;
    y = LANES[i].y - h + 2;
    ctx.fillStyle = 'rgba(28, 36, 48, 0.25)';
    ctx.beginPath();
    ctx.ellipse(x + w / 2, LANES[i].y + 4, w * 0.42, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    g = ctx.createLinearGradient(x, y, x, y + h);
    g.addColorStop(0, '#e0b276');
    g.addColorStop(0.45, '#b4763e');
    g.addColorStop(1, '#7a4a28');
    ctx.fillStyle = g;
    roundRect(x, y, w, h, 4);
    ctx.fill();
    ctx.strokeStyle = '#4e3018';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(92, 54, 28, 0.85)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + 5, y + 4);
    ctx.lineTo(x + 5, y + h - 4);
    ctx.moveTo(x + w - 5, y + 4);
    ctx.lineTo(x + w - 5, y + h - 4);
    ctx.stroke();
    ctx.fillStyle = '#f7fbff';
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + 2, w * 0.42, 4.5 * sc, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawArm(ob, i) {
    var sc;
    var x0;
    var x1;
    var y;
    var post;
    var glow;
    if (!onScreen(ob.x, ob.w)) return;
    sc = LANES[i].scale;
    x0 = wx(ob.x);
    x1 = wx(ob.x + ob.w);
    y = LANES[i].y - 24 * sc;
    post = x0 + 4;
    ctx.fillStyle = '#3a322c';
    roundRect(post - 3, y - 6, 6, LANES[i].y - y + 10, 2);
    ctx.fill();
    ctx.fillStyle = '#efe6d4';
    roundRect(post, y - 4 * sc, Math.max(8, x1 - post), 8 * sc, 3);
    ctx.fill();
    ctx.strokeStyle = '#2c2824';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    glow = ctx.createRadialGradient(x1 - 2, y, 1, x1 - 2, y, 14 * sc);
    glow.addColorStop(0, 'rgba(255, 176, 96, 0.95)');
    glow.addColorStop(1, 'rgba(255, 120, 70, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x1 - 2, y, 14 * sc, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#c4483a';
    ctx.beginPath();
    ctx.arc(x1 - 2, y, 4.2 * sc, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#6a6258';
    ctx.beginPath();
    ctx.arc(post - 7, y - 8 * sc, 3.2 * sc, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawObstacles(i) {
    var n;
    var ob;
    for (n = 0; n < obstacles.length; n++) {
      ob = obstacles[n];
      if (ob.lane !== i) continue;
      if (ob.kind === 'gap') drawGap(ob, i);
      else if (ob.kind === 'crate') drawCrate(ob, i);
      else if (ob.kind === 'arm') drawArm(ob, i);
    }
  }

  function drawBumper(i) {
    var x = wx(-1.1);
    var y = LANES[i].y;
    if (x < -30 || x > VIEW_W + 20) return;
    ctx.fillStyle = '#4a3428';
    roundRect(x - 3, y - 16, 7, 20, 2);
    ctx.fill();
    ctx.fillStyle = '#d7c3a4';
    roundRect(x - 8, y - 8, 16, 6, 2);
    ctx.fill();
  }

  function drawYard() {
    var left = FINISH - 2.6;
    var right = FINISH + 4.2;
    var x0;
    var x1;
    var opening;
    var g;
    if (!onScreen(left, right - left)) return;
    x0 = wx(left);
    x1 = wx(right);
    opening = wx(FINISH - 1.4);
    g = ctx.createLinearGradient(opening, 118, x1, 250);
    g.addColorStop(0, '#ffd7a8');
    g.addColorStop(1, '#8a5a3c');
    ctx.fillStyle = g;
    ctx.fillRect(opening, 118, Math.max(8, x1 - opening), 176);
    ctx.fillStyle = '#5c3b2a';
    ctx.fillRect(x0, 108, 16, 186);
    ctx.fillRect(x1 - 10, 108, 16, 186);
    ctx.fillStyle = '#f4f7fb';
    ctx.beginPath();
    ctx.moveTo(x0 - 8, 116);
    ctx.quadraticCurveTo((x0 + x1) / 2, 78, x1 + 8, 116);
    ctx.lineTo(x1 + 8, 128);
    ctx.quadraticCurveTo((x0 + x1) / 2, 96, x0 - 8, 128);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#6d4630';
    ctx.fillRect(x0 - 4, 112, x1 - x0 + 18, 12);
    ctx.fillStyle = '#f4efe4';
    ctx.font = '700 15px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('YARD', (x0 + x1) / 2, 118);
    drawLantern(x0 + 8, 136);
    drawLantern(x1 - 2, 136);
  }

  function drawLantern(x, y) {
    var g = ctx.createRadialGradient(x, y, 1, x, y, 16);
    g.addColorStop(0, 'rgba(255, 220, 160, 0.9)');
    g.addColorStop(1, 'rgba(255, 200, 120, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f2c56a';
    ctx.beginPath();
    ctx.arc(x, y, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }

  function trentFrame() {
    var frame;
    if (pumpAnim >= 1) return 0;
    frame = Math.floor(pumpAnim * TRENT.frames);
    if (frame < 0) return 0;
    if (frame > TRENT.frames - 1) return TRENT.frames - 1;
    return frame;
  }

  function slipAngle() {
    var u;
    var kick;
    if (state !== 'slip') {
      if (reduceMotion()) return 0;
      return Math.sin(visualTime * 1.3) * 0.012;
    }
    u = clamp(slipT / 0.42, 0, 1);
    kick = Math.sin(u * Math.PI);
    return kick * (reduceMotion() ? 0.05 : 0.2);
  }

  function drawTrent(footX, footY) {
    var frame;
    var destH;
    var scale;
    if (!imageReady(trentImg)) return;
    frame = trentFrame();
    destH = 84;
    scale = destH / TRENT.h;
    ctx.drawImage(
      trentImg,
      frame * TRENT.w, 0, TRENT.w, TRENT.h,
      footX - TRENT.anchorX * scale, footY - TRENT.anchorY * scale,
      TRENT.w * scale, destH
    );
  }

  function drawHandcar() {
    var v = visualLane();
    var y = laneMetric(v, 'y');
    var sc = laneMetric(v, 'scale');
    var kick = state === 'slip' ? Math.sin(clamp(slipT / 0.42, 0, 1) * Math.PI) : 0;
    var handW = 122;
    var hs;
    var footX;
    var footY;

    ctx.save();
    ctx.translate(CAR_X, y);
    ctx.rotate(slipAngle());
    ctx.scale(sc, sc);

    ctx.fillStyle = 'rgba(30, 40, 52, 0.28)';
    ctx.beginPath();
    ctx.ellipse(0, 8, 40, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    if (kick > 0.04) {
      ctx.fillStyle = 'rgba(255, 255, 255, ' + (0.42 * kick) + ')';
      ctx.beginPath();
      ctx.ellipse(-28, 2, 14 + kick * 12, 6, 0, 0, Math.PI * 2);
      ctx.ellipse(24, 3, 10 + kick * 8, 5, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    if (imageReady(handcarImg)) {
      hs = handW / HAND.w;
      ctx.drawImage(
        handcarImg,
        -HAND.axleX * hs,
        6 - HAND.axleY * hs,
        handW,
        HAND.h * hs
      );
      footX = -8;
      footY = 6 - (HAND.axleY - HAND.deckY) * hs + 3;
    } else {
      footX = -8;
      footY = -18;
    }
    drawTrent(footX, footY);
    ctx.restore();
  }

  function drawSnow() {
    var i;
    var f;
    for (i = 0; i < flakes.length; i++) {
      f = flakes[i];
      ctx.fillStyle = 'rgba(255, 255, 255, ' + f.a + ')';
      ctx.beginPath();
      ctx.arc(f.x * VIEW_W, f.y * VIEW_H, f.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawForeground() {
    var g = ctx.createLinearGradient(0, 318, 0, VIEW_H);
    g.addColorStop(0, 'rgba(232, 240, 247, 0)');
    g.addColorStop(0.4, 'rgba(226, 236, 244, 0.88)');
    g.addColorStop(1, '#d5e2ee');
    ctx.fillStyle = g;
    ctx.fillRect(-20, 318, VIEW_W + 40, VIEW_H - 300);
  }

  function drawWorld() {
    var i;
    drawSky();
    drawSheds();
    drawWaterTower();
    drawYardGlow();
    for (i = 0; i < 3; i++) {
      drawRails(i);
      drawBumper(i);
      drawObstacles(i);
    }
    drawYard();
    drawHandcar();
    drawForeground();
    drawSnow();
  }

  function drawVignette() {
    var v = ctx.createRadialGradient(cssW * 0.5, cssH * 0.45, cssW * 0.2, cssW * 0.5, cssH * 0.5, cssW * 0.72);
    v.addColorStop(0, 'rgba(0, 0, 0, 0)');
    v.addColorStop(1, 'rgba(8, 16, 28, 0.28)');
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, cssW, cssH);
  }

  function shakeOffset() {
    if (reduceMotion() || shake <= 0.15) return { x: 0, y: 0 };
    return {
      x: Math.sin(visualTime * 53) * shake,
      y: Math.cos(visualTime * 46) * shake * 0.62
    };
  }

  function render() {
    var jog = shakeOffset();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#16345c';
    ctx.fillRect(0, 0, cssW, cssH);
    ctx.setTransform(
      dpr * view.s, 0, 0, dpr * view.s,
      dpr * (view.ox + jog.x * view.s),
      dpr * (view.oy + jog.y * view.s)
    );
    drawWorld();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawVignette();
  }

  function resize() {
    var rect = canvas.getBoundingClientRect();
    var s;
    cssW = Math.max(1, rect.width);
    cssH = Math.max(1, rect.height);
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    s = Math.min(cssW / VIEW_W, cssH / VIEW_H);
    if (s < 0.01) s = 0.01;
    view.s = s;
    view.ox = (cssW - VIEW_W * s) / 2;
    view.oy = (cssH - VIEW_H * s) / 2;
  }

  function designPoint(event) {
    var rect = canvas.getBoundingClientRect();
    var x = ((event.clientX - rect.left) / Math.max(1, rect.width)) * cssW;
    var y = ((event.clientY - rect.top) / Math.max(1, rect.height)) * cssH;
    return {
      x: (x - view.ox) / view.s,
      y: (y - view.oy) / view.s
    };
  }

  function loop(now) {
    var dt = (now - lastFrame) / 1000;
    lastFrame = now;
    if (dt < 0) dt = 0;
    if (dt > 0.05) dt = 0.05;
    if (state !== 'pause') {
      visualTime += dt;
      if (!reduceMotion()) updateFlakes(dt);
    }
    if (state === 'play') updatePlay(dt);
    else if (state === 'slip') updateSlip(dt);
    if (state !== 'pause' && shake > 0) shake = Math.max(0, shake - dt * 24);
    refreshPump();
    renderHud();
    render();
    requestAnimationFrame(loop);
  }

  function portraitWanted() {
    return portraitQuery.matches || window.innerHeight > window.innerWidth + 20;
  }

  function syncPortrait() {
    var show = portraitWanted() && !portraitDismissed;
    var wasShowing = !portraitEl.hidden;
    portraitEl.hidden = !show;
    if (show && !wasShowing && (state === 'play' || state === 'slip')) openPause();
  }

  function fromButton(event) {
    var el = event.target;
    return !!(el && el.closest && el.closest('button'));
  }

  function bindStep(button, dir) {
    button.addEventListener('pointerdown', function (event) {
      if (event.button !== 0) return;
      event.preventDefault();
      changeLane(dir);
      button.dataset.skipClick = '1';
    });
    button.addEventListener('click', function () {
      if (button.dataset.skipClick === '1') {
        button.dataset.skipClick = '';
        return;
      }
      changeLane(dir);
    });
    button.addEventListener('contextmenu', function (event) { event.preventDefault(); });
  }

  bindStep(trackUpBtn, -1);
  bindStep(trackDownBtn, 1);

  pumpBtn.addEventListener('pointerdown', function (event) {
    if (event.button !== 0) return;
    event.preventDefault();
    pumpHeld = true;
    pumpId = event.pointerId;
    doPump();
    if (pumpBtn.setPointerCapture) pumpBtn.setPointerCapture(event.pointerId);
  });

  function endPump(event) {
    if (event.pointerId !== pumpId) return;
    pumpHeld = false;
    pumpId = 0;
  }

  pumpBtn.addEventListener('pointerup', endPump);
  pumpBtn.addEventListener('pointercancel', endPump);
  pumpBtn.addEventListener('contextmenu', function (event) { event.preventDefault(); });

  canvas.addEventListener('pointerdown', function (event) {
    var p;
    if (event.button !== 0) return;
    if (!playing()) return;
    p = designPoint(event);
    if (p.x > VIEW_W * 0.52) return;
    event.preventDefault();
    dragging = true;
    dragId = event.pointerId;
    dragY = p.y;
    dragAccum = 0;
    if (canvas.setPointerCapture) canvas.setPointerCapture(event.pointerId);
  });

  window.addEventListener('pointermove', function (event) {
    var p;
    if (!dragging || event.pointerId !== dragId) return;
    p = designPoint(event);
    if (!playing()) {
      dragY = p.y;
      dragAccum = 0;
      return;
    }
    dragAccum += p.y - dragY;
    dragY = p.y;
    while (dragAccum >= 42) {
      dragAccum -= 42;
      changeLane(1);
    }
    while (dragAccum <= -42) {
      dragAccum += 42;
      changeLane(-1);
    }
  });

  function endDrag(event) {
    if (!dragging || event.pointerId !== dragId) return;
    dragging = false;
    dragId = 0;
    dragAccum = 0;
  }

  window.addEventListener('pointerup', function (event) {
    endPump(event);
    endDrag(event);
  });
  window.addEventListener('pointercancel', function (event) {
    endPump(event);
    endDrag(event);
  });
  canvas.addEventListener('contextmenu', function (event) { event.preventDefault(); });

  window.addEventListener('keydown', function (event) {
    var key = event.key;
    if (key === 'Escape') {
      event.preventDefault();
      if (state === 'play' || state === 'slip') openPause();
      else if (state === 'pause') closePause();
      return;
    }
    if (key === 'ArrowUp' || key === 'ArrowDown' || key === 'w' || key === 'W' || key === 's' || key === 'S') {
      if (playing()) {
        event.preventDefault();
        if (!event.repeat) changeLane(key === 'ArrowUp' || key === 'w' || key === 'W' ? -1 : 1);
      }
      return;
    }
    if (event.code === 'Space' || key === ' ') {
      if (fromButton(event)) return;
      event.preventDefault();
      spaceHeld = true;
      doPump();
    }
  });

  window.addEventListener('keyup', function (event) {
    if (event.code === 'Space' || event.key === ' ') spaceHeld = false;
  });

  window.addEventListener('blur', function () {
    pumpHeld = false;
    spaceHeld = false;
    dragging = false;
    dragAccum = 0;
    pumpId = 0;
  });

  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) return;
    pumpHeld = false;
    spaceHeld = false;
    dragging = false;
    openPause();
  });
  window.addEventListener('pagehide', function () {
    pumpHeld = false;
    spaceHeld = false;
    dragging = false;
    openPause();
  });

  document.addEventListener('touchmove', function (event) {
    var el = event.target;
    if (el && el.closest && el.closest('.sheet')) return;
    if (event.cancelable) event.preventDefault();
  }, { passive: false });
  document.addEventListener('gesturestart', function (event) {
    event.preventDefault();
  });

  document.getElementById('start').addEventListener('click', beginRun);
  document.getElementById('resume').addEventListener('click', closePause);
  document.getElementById('restart').addEventListener('click', restartLine);
  document.getElementById('retry').addEventListener('click', beginRun);
  document.getElementById('retry-lose').addEventListener('click', beginRun);
  pauseBtn.addEventListener('click', function () {
    if (state === 'play' || state === 'slip') openPause();
    else if (state === 'pause') closePause();
  });
  document.getElementById('dismiss-portrait').addEventListener('click', function () {
    portraitDismissed = true;
    syncPortrait();
  });

  if (portraitQuery.addEventListener) portraitQuery.addEventListener('change', syncPortrait);
  else if (portraitQuery.addListener) portraitQuery.addListener(syncPortrait);
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

  refreshTrackButtons();
  renderHud();
  resize();
  syncPortrait();
  lastFrame = performance.now();
  requestAnimationFrame(loop);
})();
