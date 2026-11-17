/* Chapter 3 - White Rail.
   Track ties, obstacles and the yard are projected from their fixed track positions.
   Pump to advance, then move left or right to change track lanes. */
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
  var loseTitleEl = document.getElementById('lose-title');
  var loseCopyEl = document.getElementById('lose-copy');
  var portraitEl = document.getElementById('portrait');
  var statusEl = document.getElementById('status');

  if (!canvas || !ctx) return;

  var VIEW_W = 844;
  var VIEW_H = 390;
  var VIEW_DEPTH = 94;
  var TRACK_SPACING = 146;
  var HORIZON_Y = 102;
  var CART_Y = 322;
  var stage = new URLSearchParams(location.search).get('stage');
  var siding = stage === 'siding-signals';
  var loadingSpur = stage === 'the-loading-spur';
  var BOMBER_COUNT = siding ? 16 : loadingSpur ? 36 : 26;
  var FINISH = 1200;
  /* Half the old 0.30, so the climb to the new top takes about twice the pumps. */
  var DECAY = 0.15;
  /* Letting go of the pump can stop the car before a break in the rail. */
  var COAST = 1.15;
  var MAX_SPEED = 27;
  var SPEED_FLOOR = 0.45;
  var PUMP_COOLDOWN = 0.34;
  var PUMP_RATE_MAX = 1 / PUMP_COOLDOWN;
  var START_SPEED = 4.6;
  var SWITCH_TIME = 0.2;
  var NOSE = 1.25;
  var TAIL = 0.5;

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
  if (siding || loadingSpur) {
    var stageTitle = siding ? 'Siding Signals' : 'The Loading Spur';
    document.getElementById('rail-stage-title').textContent = stageTitle;
  }
  var route = PATTERN;
  var sectors = siding ? 4 : loadingSpur ? 6 : 5;
  var sectorSize = (loadingSpur ? 1090 : 1150) / sectors;
  PATTERN = Array.from({ length: sectors }, function (_, sector) {
    return route.filter(function (_, index) { return index % 5 !== sector % 5; }).map(function (ob) {
      return { kind: ob.kind, lane: (ob.lane + sector) % 3,
        x: 24 + sector * sectorSize + ob.x / 454 * (sectorSize - 16), w: ob.w };
    });
  }).flat();
  var obstacleCount = Math.round(PATTERN.length * .9);
  PATTERN = PATTERN.filter(function (_, index, obstacles) {
    return Math.floor((index + 1) * obstacleCount / obstacles.length) >
      Math.floor(index * obstacleCount / obstacles.length);
  });
  sheds = siding ? [{ x: 305, w: 11, h: 7 }, { x: 600, w: 15, h: 8 }, { x: 885, w: 17, h: 7 }]
    : loadingSpur ? [{ x: 390, w: 24, h: 11 }, { x: 700, w: 25, h: 9 }, { x: 1160, w: 23, h: 10 }]
    : sheds.map(function (shed) { return { x: shed.x * 2.6, w: shed.w, h: shed.h }; });

  var flakes = buildFlakes();

  /* rails.webp is 1600×900. Sky is the painting above the rails.
     The rail band is the snowy bed. RAIL_ANCHOR is the rail center. */
  var SKY_SRC_H = 668;
  /* trent.webp: six equal frames, feet on one baseline.
     Order: high, down, forward, low, rising, high. */
  var TRENT = { w: 459, h: 512, anchorX: 168, anchorY: 495, frames: 6 };
  var HAND = { w: 774, h: 431, axleX: 386, axleY: 426, deckY: 214 };

  var obstacleArt = {};
  ['crate', 'arm', 'gap', 'lantern', 'hut', 'bomber'].forEach(function (name) {
    var image = new Image();
    image.src = 'art/painted-' + name + '.webp';
    obstacleArt[name] = image;
  });
  var railsImg = new Image();
  var handcarImg = new Image();
  var trentImg = new Image();
  railsImg.src = 'art/rails.webp';
  handcarImg.src = 'art/handcar.webp';
  trentImg.src = 'art/trent.webp';

  var state = 'title';
  var pausedState = 'play';
  var distance = 0;
  var flyovers = [];
  var nextFlyover = 0;
  var speed = 0;
  var slips = 0;
  var slipLimit = 3 + (window.TrentMissionBonus || 0);
  var fromLane = 1;
  var toLane = 1;
  var laneT = 1;
  var pumpCool = 0;
  var pumpRate = 0;
  var sincePump = 8;
  var pumpAnim = 1;
  var slipT = 0;
  var shake = 0;
  var safeLane = -1;
  var safeUntil = 0;
  var obstacles = makeObstacles();
  var bombs = [];
  var puffs = [];
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
  var rotateHold = false;
  var lastFrame = 0;
  var pumpHeld = false;
  var spaceHeld = false;
  var pumpId = 0;
  var dragging = false;
  var dragId = 0;
  var dragX = 0;
  var dragAccum = 0;

  var motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

  function reduceMotion() {
    return motionQuery.matches;
  }

  function clamp(v, a, b) {
    if (v < a) return a;
    if (v > b) return b;
    return v;
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

  // A shared camera projects every object from track distance into the same scene.
  function project(worldDistance, lane, lateral) {
    var ahead = worldDistance - distance;
    var scale = 22 / (22 + Math.max(-8, ahead));
    return {
      x: VIEW_W * 0.5 + ((lane - 1) * TRACK_SPACING + (lateral || 0)) * scale,
      y: HORIZON_Y + (CART_Y - HORIZON_Y) * scale,
      scale: scale
    };
  }

  function inView(worldDistance) {
    return worldDistance > distance - 8 && worldDistance <= distance + VIEW_DEPTH;
  }

  function visualLane() {
    var t = laneT >= 1 ? 1 : laneT * laneT * (3 - 2 * laneT);
    return clamp(fromLane + (toLane - fromLane) * t, 0, 2);
  }

  function occupiedLane() {
    if (fromLane === toLane || laneT >= 0.58) return toLane;
    return fromLane;
  }

  function playing() {
    return state === 'play' || (state === 'slip' && slips < slipLimit);
  }

  function say(text) {
    statusEl.textContent = text;
  }

  function renderHud() {
    var kmh = Math.round(Math.max(0, speed) * 3.6) + ' km/h';
    var left = Math.max(0, Math.ceil(FINISH - distance)) + ' m';
    var slipLine = slips + ' / ' + slipLimit;
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
    flyovers = [];
    nextFlyover = 0;
    speed = 0;
    slips = 0;
    fromLane = 1;
    toLane = 1;
    laneT = 1;
    pumpCool = 0;
    pumpRate = 0;
    sincePump = 8;
    pumpAnim = 1;
    slipT = 0;
    shake = 0;
    safeLane = -1;
    safeUntil = 0;
    obstacles = makeObstacles();
    bombs = [];
    puffs = [];
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
    bombs = [];
    dragging = false;
    winTimeEl.textContent = 'On the line for ' + seconds + (seconds === 1 ? ' second.' : ' seconds.');
    winSheet.hidden = false;
    say('The yard mouth. ' + seconds + ' seconds.');
    if (!victorySent) {
      victorySent = true;
      window.dispatchEvent(new CustomEvent('white-rail:complete', {
        detail: { seconds: seconds }
      }));
      if (window.parent !== window) {
        var relay = { type: 'white-rail:complete', detail: { seconds: seconds } };
        try {
          var relayRun = new URLSearchParams(location.search).get('runId');
          if (relayRun) relay.runId = relayRun;
        } catch (ignoreRelay) {}
        window.parent.postMessage(relay, (location.protocol === 'http:' || location.protocol === 'https:') ? location.origin : '*');
      }
    }
  }

  /* A failed run returns to the start. No victory event and no gore. */
  function showLose(title, copy, status) {
    if (state === 'win' || state === 'lose') return;
    resetWorld();
    speed = 0;
    state = 'lose';
    if (loseTitleEl) loseTitleEl.textContent = title;
    if (loseCopyEl) loseCopyEl.textContent = copy;
    loseSheet.hidden = false;
    say(status);
  }

  function failLine() {
    showLose(
      'Back at the start',
      'The handcar took ' + slipLimit + ' hits and is back at the start of the line.',
      slipLimit + ' hits. Back at the start of the line.'
    );
  }

  function doPump() {
    var gap;
    var instant;
    if (!playing()) return;
    if (pumpCool > 0) return;
    gap = sincePump;
    pumpCool = PUMP_COOLDOWN;
    pumpAnim = 0;
    hintDismissed = true;
    sincePump = 0;
    if (gap > 4) return;
    if (gap <= PUMP_COOLDOWN + 0.05) instant = PUMP_RATE_MAX;
    else instant = 1 / gap;
    pumpRate += (instant - pumpRate) * 0.7;
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
    var hits = ob.kind === 'gap' ? 2 : 1;
    slips = Math.min(slipLimit, slips + hits);
    speed *= 0.5;
    if (speed < SPEED_FLOOR) speed = SPEED_FLOOR;
    distance = Math.max(0, ob.x - 1.05);
    ob.cleared = true;
    safeLane = ob.lane;
    safeUntil = ob.x + ob.w + 0.45;
    slipT = 0;
    state = 'slip';
    if (slips >= slipLimit) speed = 0;
    if (!reduceMotion()) shake = 8;
    renderHud();
    say((hits === 2 ? 'Rail gap. Two hits. ' : 'One hit. ') + slips + ' of ' + slipLimit + '.');
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
    var slip = null;
    for (i = 0; i < obstacles.length; i++) {
      if (!hitTest(obstacles[i])) continue;
      if (obstacles[i].kind === 'gap') {
        beginSlip(obstacles[i]);
        return;
      }
      if (!slip) slip = obstacles[i];
    }
    if (slip) beginSlip(slip);
  }

  function integrate(dt) {
    var pumping = pumpHeld || spaceHeld;
    var effort;
    var target;
    var rate;
    sincePump += dt;
    if (sincePump > PUMP_COOLDOWN * 1.35) {
      pumpRate += (0 - pumpRate) * (1 - Math.exp(-2.2 * dt));
    }
    if (pumpCool > 0) pumpCool -= dt;
    if (pumping) doPump();
    effort = pumpRate / PUMP_RATE_MAX;
    if (effort < 0.04) effort = 0;
    if (effort > 1) effort = 1;
    if (effort === 0) target = 0;
    else target = SPEED_FLOOR + (MAX_SPEED - SPEED_FLOOR) * effort;
    rate = speed > target ? COAST : DECAY;
    speed += (target - speed) * (1 - Math.exp(-rate * dt));
    if (speed < 0.03 && target === 0) speed = 0;
    if (speed < 0) speed = 0;
    if (pumpAnim < 1) pumpAnim = Math.min(1, pumpAnim + dt / 0.32);
    if (laneT < 1) {
      laneT = Math.min(1, laneT + dt / SWITCH_TIME);
      if (laneT >= 1) fromLane = toLane;
    }
    distance += speed * dt;
    if (distance < 0) distance = 0;
  }

  function stretchBlocked(lane, x, w) {
    var i;
    var ob;
    for (i = 0; i < obstacles.length; i++) {
      ob = obstacles[i];
      if (ob.lane !== lane) continue;
      if (x < ob.x + ob.w + 0.8 && x + w > ob.x - 0.8) return true;
    }
    return false;
  }

  /* Nudge forward until the bombed lane is clear and some other lane is open. */
  function placeGapX(lane, x, w) {
    var tries;
    var other;
    var open;
    for (tries = 0; tries < 7; tries++) {
      if (x + w > FINISH - 4) return -1;
      if (!stretchBlocked(lane, x, w)) {
        open = false;
        for (other = 0; other < 3; other++) {
          if (other !== lane && !stretchBlocked(other, x, w)) open = true;
        }
        if (open) return x;
      }
      x += 4.5;
    }
    return -1;
  }

  function dropBomb(jet) {
    var lane = occupiedLane();
    var w = 4.2;
    var lead = Math.min(VIEW_DEPTH - 32, 23 + speed);
    var x = placeGapX(lane, distance + lead, w);
    bombs.push({ x: x < 0 ? Math.min(distance + lead, FINISH - w) : x, lane: lane,
      w: w, fromX: jet.x, fromY: jet.y, fall: 0, damagesTrack: x >= 0 });
  }

  function updateBombs(dt) {
    for (var i = bombs.length - 1; i >= 0; i--) {
      var bomb = bombs[i];
      bomb.fall += dt;
      if (bomb.fall < .92) continue;
      if (bomb.damagesTrack && !stretchBlocked(bomb.lane, bomb.x, bomb.w) &&
          [0, 1, 2].some(function (lane) { return lane !== bomb.lane && !stretchBlocked(lane, bomb.x, bomb.w); })) {
        obstacles.push({ kind: 'gap', lane: bomb.lane, x: bomb.x, w: bomb.w, cleared: false });
      }
      puffs.push({ x: bomb.x + bomb.w * .5, lane: bomb.lane, t: 0 });
      bombs.splice(i, 1);
      if (!reduceMotion()) shake = Math.max(shake, 4);
    }
    puffs.forEach(function (puff) { puff.t += dt; });
    puffs = puffs.filter(function (puff) { return puff.t <= .45; });
  }

  function updateFlyovers(dt) {
    while (nextFlyover < BOMBER_COUNT && distance >= 12 + nextFlyover * (FINISH - 114) / (BOMBER_COUNT - 1)) {
      flyovers.push({ x: VIEW_W + 55, y: 36 + (nextFlyover % 3) * 24, speed: 156 + (nextFlyover % 5) * 18 });
      nextFlyover += 1;
    }
    flyovers.forEach(function (jet) {
      jet.x -= jet.speed * dt;
      if (!jet.dropped && jet.x <= VIEW_W - 96) {
        jet.dropped = true;
        dropBomb(jet);
      }
    });
    flyovers = flyovers.filter(function (jet) { return jet.x > -75; });
  }

  function drawPlaneAt(px, py, size) {
    ctx.save();
    ctx.translate(px, py);
    ctx.scale(size || 1, size || 1);
    if (imageReady(obstacleArt.bomber)) {
      ctx.scale(-1, 1);
      ctx.drawImage(obstacleArt.bomber, -41, -24, 82, 48);
      ctx.restore();
      return;
    }
    ctx.fillStyle = '#2a3544';
    roundRect(-26, -5, 50, 10, 4);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-26, 0);
    ctx.lineTo(-40, 3);
    ctx.lineTo(-24, 4);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(12, -4);
    ctx.lineTo(26, -15);
    ctx.lineTo(18, -3);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#d5e4f0';
    ctx.fillRect(-16, -3, 7, 4);
    ctx.fillStyle = '#58677b';
    ctx.beginPath();
    ctx.moveTo(-5, 1);
    ctx.lineTo(21, 13);
    ctx.lineTo(11, 14);
    ctx.lineTo(-22, 5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawBombs() {
    bombs.forEach(function (bomb) {
      var target = project(bomb.x + bomb.w * .5, bomb.lane);
      var u = clamp(bomb.fall / .92, 0, 1);
      ctx.fillStyle = 'rgba(236, 112, 53, 0.55)';
      ctx.beginPath();
      ctx.ellipse(target.x, target.y, 34 * target.scale, 9 * target.scale, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#25211f';
      ctx.beginPath();
      ctx.ellipse(bomb.fromX + (target.x - bomb.fromX) * u, bomb.fromY + (target.y - bomb.fromY) * u * u, 4, 8, 0, 0, Math.PI * 2);
      ctx.fill();
    });
    puffs.forEach(function (puff) {
      if (!inView(puff.x)) return;
      var point = project(puff.x, puff.lane);
      var u = puff.t / 0.45;
      ctx.fillStyle = 'rgba(244,248,252,' + ((1 - u) * 0.75) + ')';
      ctx.beginPath();
      ctx.ellipse(point.x, point.y, (8 + u * 24) * point.scale, (5 + u * 8) * point.scale, 0, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  function updatePlay(dt) {
    integrate(dt);
    updateBombs(dt);
    if (state !== 'play') return;
    checkHits();
    if (state !== 'play') return;
    checkRailObjective();
  }

  function checkRailObjective() {
    if (distance >= FINISH) win();
  }

  function updateSlip(dt) {
    slipT += dt;
    if (slips >= slipLimit) {
      speed = 0;
      if (pumpAnim < 1) pumpAnim = Math.min(1, pumpAnim + dt / 0.32);
      if (slipT >= 0.42) failLine();
      return;
    }
    integrate(dt);
    updateBombs(dt);
    if (state !== 'slip') return;
    checkHits();
    if (state !== 'slip') return;
    checkRailObjective();
    if (state !== 'slip') return;
    if (slipT >= 0.42) state = 'play';
  }

  function updateFlakes(dt) {
    var i;
    var f;
    var wind = speed * 0.04;
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
    if (imageReady(railsImg)) {
      ctx.drawImage(railsImg, 0, 0, railsImg.naturalWidth, SKY_SRC_H, 0, 0, VIEW_W, 170);
    }
    var ground = ctx.createLinearGradient(0, HORIZON_Y, 0, VIEW_H);
    ground.addColorStop(0, 'rgba(172,197,218,0)');
    ground.addColorStop(0.34, '#a0bbce');
    ground.addColorStop(1, '#dae9f2');
    ctx.fillStyle = ground;
    ctx.fillRect(0, HORIZON_Y, VIEW_W, VIEW_H - HORIZON_Y);
  }

  function lineAcross(p, halfWidth, color, lineWidth) {
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.beginPath();
    ctx.moveTo(p.x - halfWidth * p.scale, p.y);
    ctx.lineTo(p.x + halfWidth * p.scale, p.y);
    ctx.stroke();
  }

  function trackStrip(lane, near, far) {
    if (far <= near) return;
    var a = project(near, lane);
    var b = project(far, lane);
    var half = 49;
    ctx.fillStyle = '#9cafbd';
    ctx.beginPath();
    ctx.moveTo(a.x - half * a.scale, a.y);
    ctx.lineTo(b.x - half * b.scale, b.y);
    ctx.lineTo(b.x + half * b.scale, b.y);
    ctx.lineTo(a.x + half * a.scale, a.y);
    ctx.closePath();
    ctx.fill();
    for (var tie = Math.ceil(near / 2.8) * 2.8; tie < far; tie += 2.8) {
      var p = project(tie, lane);
      lineAcross(p, 39, '#63564f', 6 * p.scale);
    }
    for (var side = -1; side <= 1; side += 2) {
      var offset = side * 28;
      ctx.fillStyle = lane === toLane ? '#dce2d9' : '#c2d2dc';
      ctx.beginPath();
      ctx.moveTo(a.x + (offset - 3.2) * a.scale, a.y);
      ctx.lineTo(b.x + (offset - 3.2) * b.scale, b.y);
      ctx.lineTo(b.x + (offset + 3.2) * b.scale, b.y);
      ctx.lineTo(a.x + (offset + 3.2) * a.scale, a.y);
      ctx.closePath();
      ctx.fill();
    }
  }

  function drawTracks() {
    var near = distance - 8;
    var far = Math.min(FINISH + 12, distance + VIEW_DEPTH);
    for (var lane = 0; lane < 3; lane++) {
      var cursor = near;
      var gaps = obstacles.filter(function (ob) {
        return ob.lane === lane && ob.kind === 'gap' && ob.x + ob.w > near && ob.x < far;
      }).sort(function (a, b) { return a.x - b.x; });
      gaps.forEach(function (gap) {
        trackStrip(lane, cursor, gap.x);
        var a = project(Math.max(near, gap.x), lane);
        var b = project(Math.min(far, gap.x + gap.w), lane);
        if (imageReady(obstacleArt.gap)) {
          var gapScale = Math.max(a.scale, b.scale);
          ctx.drawImage(obstacleArt.gap, Math.min(a.x, b.x) - 42 * gapScale, b.y,
            Math.abs(a.x - b.x) + 84 * gapScale, Math.max(3, a.y - b.y));
          cursor = Math.max(cursor, gap.x + gap.w);
          return;
        }
        ctx.fillStyle = '#1c2730';
        ctx.beginPath();
        ctx.moveTo(a.x - 42 * a.scale, a.y);
        ctx.lineTo(b.x - 42 * b.scale, b.y);
        ctx.lineTo(b.x + 42 * b.scale, b.y);
        ctx.lineTo(a.x + 42 * a.scale, a.y);
        ctx.fill();
        cursor = Math.max(cursor, gap.x + gap.w);
      });
      trackStrip(lane, cursor, far);
    }
  }

  function drawTrackObstacle(ob) {
    if (ob.kind === 'gap' || !inView(ob.x)) return;
    var p = project(ob.x + ob.w / 2, ob.lane);
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.scale(p.scale, p.scale);
    var sprite = obstacleArt[ob.kind];
    if (imageReady(sprite)) {
      var w = ob.kind === 'crate' ? 62 : 92;
      var h = w * sprite.naturalHeight / sprite.naturalWidth;
      ctx.drawImage(sprite, -w / 2, -h, w, h);
      ctx.restore();
      return;
    }
    if (ob.kind === 'crate') {
      var wood = ctx.createLinearGradient(0, -50, 0, 0);
      wood.addColorStop(0, '#d5a36d');
      wood.addColorStop(1, '#704425');
      ctx.fillStyle = wood;
      roundRect(-29, -50, 58, 50, 4);
      ctx.fill();
      ctx.strokeStyle = '#644025';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.fillStyle = '#eef6fc';
      ctx.fillRect(-26, -51, 52, 7);
    } else if (ob.kind === 'arm') {
      ctx.fillStyle = '#453934';
      ctx.fillRect(-43, -68, 7, 68);
      ctx.fillStyle = '#ead8bf';
      ctx.fillRect(-42, -56, 79, 11);
      ctx.fillStyle = '#a83e31';
      for (var stripe = -31; stripe < 32; stripe += 22) ctx.fillRect(stripe, -56, 8, 11);
      drawLantern(37, -50);
    }
    ctx.restore();
  }

  function drawTrackside() {
    sheds.forEach(function (shed, index) {
      if (!inView(shed.x)) return;
      var p = project(shed.x, index % 2 ? 2.8 : -.8);
      var w = 64 * p.scale;
      var h = shed.h * 7 * p.scale;
      if (imageReady(obstacleArt.hut)) {
        ctx.drawImage(obstacleArt.hut, p.x - w * .8, p.y - h, w * 1.6, h);
        return;
      }
      ctx.fillStyle = '#674833';
      ctx.fillRect(p.x - w / 2, p.y - h, w, h);
      ctx.fillStyle = '#e9f1f9';
      ctx.beginPath();
      ctx.moveTo(p.x - w * .65, p.y - h);
      ctx.lineTo(p.x, p.y - h - 19 * p.scale);
      ctx.lineTo(p.x + w * .65, p.y - h);
      ctx.fill();
      ctx.fillStyle = '#e8bf77';
      ctx.fillRect(p.x - w * .13, p.y - h * .6, w * .26, h * .26);
    });
    if (!inView(FINISH)) return;
    var gate = project(FINISH, 1);
    ctx.strokeStyle = '#755137';
    ctx.lineWidth = 12 * gate.scale;
    ctx.beginPath();
    ctx.moveTo(gate.x - 206 * gate.scale, gate.y);
    ctx.lineTo(gate.x - 206 * gate.scale, gate.y - 98 * gate.scale);
    ctx.lineTo(gate.x + 206 * gate.scale, gate.y - 98 * gate.scale);
    ctx.lineTo(gate.x + 206 * gate.scale, gate.y);
    ctx.stroke();
    drawLantern(gate.x, gate.y - 90 * gate.scale);
  }

  function drawLantern(x, y) {
    if (imageReady(obstacleArt.lantern)) {
      ctx.drawImage(obstacleArt.lantern, x - 9, y - 13, 18, 27);
      return;
    }
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
    var point = project(distance, v);
    var sc = .76;
    var kick = state === 'slip' ? Math.sin(clamp(slipT / 0.42, 0, 1) * Math.PI) : 0;
    var handW = 122;
    var hs;
    var footX;
    var footY;

    var bob = 0;
    if (!reduceMotion() && speed > 0.2) bob = Math.sin(distance * 4.6) * Math.min(1.5, speed * 0.08);
    ctx.save();
    ctx.translate(point.x, point.y + bob);
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

  function drawWorld() {
    drawSky();
    flyovers.forEach(function (jet) { drawPlaneAt(jet.x, jet.y, .68); });
    drawTracks();
    drawTrackside();
    var visible = obstacles.filter(function (ob) { return inView(ob.x); })
      .sort(function (a, b) { return b.x - a.x; });
    visible.forEach(function (ob) { if (ob.x >= distance) drawTrackObstacle(ob); });
    drawBombs();
    drawHandcar();
    visible.forEach(function (ob) { if (ob.x < distance) drawTrackObstacle(ob); });
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
    if (state === 'play' || state === 'slip') updateFlyovers(dt);
    if (state !== 'pause' && shake > 0) shake = Math.max(0, shake - dt * 24);
    refreshPump();
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
    if (show && (state === 'play' || state === 'slip')) {
      rotateHold = true;
      openPause();
    } else if (!show && rotateHold && state === 'pause') {
      rotateHold = false;
      closePause();
    }
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
    dragX = p.x;
    dragAccum = 0;
    if (canvas.setPointerCapture) canvas.setPointerCapture(event.pointerId);
  });

  window.addEventListener('pointermove', function (event) {
    var p;
    if (!dragging || event.pointerId !== dragId) return;
    p = designPoint(event);
    if (!playing()) {
      dragX = p.x;
      dragAccum = 0;
      return;
    }
    dragAccum += p.x - dragX;
    dragX = p.x;
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
    if (key === 'ArrowLeft' || key === 'ArrowRight' || key === 'ArrowUp' || key === 'ArrowDown' || key === 'w' || key === 'W' || key === 's' || key === 'S') {
      if (playing()) {
        event.preventDefault();
        if (!event.repeat) changeLane(key === 'ArrowLeft' || key === 'ArrowUp' || key === 'w' || key === 'W' ? -1 : 1);
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

  refreshTrackButtons();
  renderHud();
  resize();
  syncPortrait();
  lastFrame = performance.now();
  requestAnimationFrame(loop);
})();
