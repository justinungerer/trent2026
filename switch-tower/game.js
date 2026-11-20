/* Chapter 5 — The Switch Tower.
   Side view of a small snowy yard. Three or five levers set the route.
   Five trains come, one after another, at 1.5x the original speed.
   The board shows that train's pattern.
   A wrong pattern explodes the train and costs a try. Three losses restart the puzzle.
   The final level has sabotage from train one; the middle level starts after two departures.
   The stage train count must depart correctly to send switch-tower:complete once.
   Scene, board, levers, train, and Trent are painted pictures in art/.
   Painted animation atlases show the moving train and railway saboteur. */
'use strict';

(function () {
  var canvas = document.getElementById('yard');
  var ctx = canvas.getContext('2d');
  var missesEl = document.getElementById('misses');
  var pauseBtn = document.getElementById('pause');
  var leverBtns = Array.from(document.querySelectorAll('#levers button'));
  var startSheet = document.getElementById('start-sheet');
  var pauseSheet = document.getElementById('pause-sheet');
  var loseSheet = document.getElementById('lose-sheet');
  var winSheet = document.getElementById('win-sheet');
  var winTimeEl = document.getElementById('win-time');
  var portraitEl = document.getElementById('portrait');
  var statusEl = document.getElementById('status');
  var arrivalEl = document.getElementById('arrival-timer');

  if (!canvas || !ctx) return;

  var VIEW_W = 1280;
  var VIEW_H = 720;
  var stage = new URLSearchParams(location.search).get('stage');
  var inspection = stage === 'clear-the-points';
  var rescue = stage === 'send-the-rescue-train';

  /* 0 is left, 1 is right. One route pattern per successful departure.
     The painted board is covered and redrawn so the current pattern shows. */
  var TRAIN_COUNT = inspection ? 2 : rescue ? 7 : 5;
  var SPEED_MULT = 1.5;
  var FLIP_INTERVAL = 2.5 / 1.2;
  var FLIP_RATE_VARIATION = rescue ? 0.35 : 0.2;
  var RECOVERY_TIME = rescue ? 0 : 0.9;
  var SABOTEUR_AFTER = rescue ? 0 : 2;
  var PATTERNS = [
    [0, 1, 0, 1, 0],
    [1, 0, 1, 0, 1],
    [0, 0, 1, 1, 0],
    [1, 1, 0, 0, 1],
    [0, 1, 1, 0, 1]
  ];
  if (inspection || rescue) {
    document.getElementById('tower-standard-instructions').hidden = true;
    document.getElementById('tower-stage-title').textContent = inspection ? 'Clear the Points' : 'Send the Rescue Train';
    document.getElementById('tower-goal').textContent = inspection
      ? 'Use three switches to match the board before each inspection train reaches the junction. Clear both incoming trains.'
      : 'Guide seven rescue trains through the junction. Match all five switches to each train’s board. The Nazi opponent starts changing switches during the first train’s approach.';
    document.getElementById('tower-win-title').textContent = inspection ? 'Both lines cleared' : 'All seven rescue trains are away';
    PATTERNS = inspection ? [[0, 1, 1, 0, 0], [1, 0, 0, 1, 0]]
      : [[0, 1, 0, 0, 1], [1, 0, 1, 0, 0], [0, 0, 1, 1, 0],
         [1, 1, 0, 0, 1], [0, 1, 1, 0, 1], [1, 0, 0, 1, 0], [1, 1, 0, 1, 0]];
  }
  var LEVER_X = inspection ? [300, 640, 980] : [210, 435, 640, 845, 1050];
  if (inspection) PATTERNS = PATTERNS.map(function (pattern) { return pattern.slice(0, 3); });
  leverBtns.forEach(function (button, index) { button.hidden = index >= LEVER_X.length; });
  document.getElementById('levers').style.gridTemplateColumns = 'repeat(' + LEVER_X.length + ', 1fr)';
  var GROUND_Y = 628;

  /* Near rail under the wheels. Sampled from scene.webp. */
  var RAIL = [
    [0, 520],
    [250, 506],
    [530, 464],
    [800, 448],
    [950, 442],
    [1200, 430],
    [1500, 416]
  ];

  var TRAIN_W = 340;
  var SWITCH_X = 520;
  var APPROACH_SPEED = 58 * SPEED_MULT;
  var DEPART_SPEED = 260 * SPEED_MULT;
  var TRAIN_START = -380;

  /* trent.webp: six equal frames. Idle, idle, then four pull frames.
     Anchor is the sole point. */
  var TRENT = { w: 360, h: 527, anchorX: 80, anchorY: 518, frames: 6 };
  var TRENT_H = 158;
  var IDLE_MS = 450;
  var PULL_MS = 480;

  /* lever.webp: left, then right. Anchor is the base on the snow. */
  var LEVER = { w: 340, h: 663, anchorX: 150, anchorY: 653 };
  var LEVER_H = 148;

  /* train.webp faces right. Anchor is the middle of the wheel bottoms. */
  var TRAIN = { w: 405, h: 251, anchorX: 202, anchorY: 242 };

  /* board.webp is the painted destination board, icons already in the wood. */
  var BOARD = { w: 960, h: 424, x: 430, y: 16, dw: 420 };

  var sceneImg = new Image();
  var boardImg = new Image();
  var leverImg = new Image();
  var trainImg = new Image();
  var trentImg = new Image();
  var signalImg = new Image();
  var paintedSoldier = new Image();
  var paintedTrain = new Image();
  paintedSoldier.src = 'art/painted-saboteur-atlas.webp';
  paintedTrain.src = 'art/painted-train-atlas.webp';
  if (inspection || rescue) signalImg.src = 'art/painted-signal.webp';
  sceneImg.src = inspection ? 'art/inspection-yard.webp' : 'art/scene.webp';
  boardImg.src = 'art/board.webp';
  leverImg.src = 'art/lever.webp';
  trainImg.src = 'art/train.webp';
  trentImg.src = 'art/trent.webp';

  var state = 'title';
  var pausedState = 'approach';
  var levers = LEVER_X.map(function () { return 1; });
  var activeLever = 0;
  var patternIndex = 0;
  var departures = 0;
  var misses = 0;
  var missLimit = 3 + (window.TrentMissionBonus || 0);
  var doomed = false;
  var blastT = 0;
  var blastParts = [];
  var trainX = -80;
  var switchGrace = 0;
  var trentX = LEVER_X[0] - 74;
  var pullT = 1;
  var shake = 0;
  var visualTime = 0;
  var flakes = buildFlakes();
  var cssW = 1280;
  var cssH = 720;
  var dpr = 1;
  var view = { s: 1, ox: 0, oy: 0 };
  var runStart = 0;
  var pauseAccum = 0;
  var pauseBegan = 0;
  var victorySent = false;
  var rotateHold = false;
  var lastFrame = 0;
  var flipTimer = 0;
  var soldierX = 1180;
  var soldierTarget = 1180;
  var soldierFace = -1;
  var soldierFlipT = 1;

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
    for (i = 0; i < 36; i++) {
      list.push({
        x: ((i * 73) % 1000) / 1000,
        y: ((i * 41) % 1000) / 1000,
        r: 1.2 + (i % 4) * 0.7,
        s: 0.04 + (i % 5) * 0.018,
        a: 0.28 + (i % 4) * 0.12
      });
    }
    return list;
  }

  function updateFlakes(dt) {
    var i;
    var f;
    for (i = 0; i < flakes.length; i++) {
      f = flakes[i];
      f.y += f.s * dt;
      f.x += dt * 0.01;
      if (f.y > 1) f.y -= 1;
      if (f.x > 1) f.x -= 1;
    }
  }

  // Match the backdrop's vertical fit while keeping animated figures unstretched.
  function sceneY(y) {
    return y * cssH / (VIEW_H * view.s);
  }

  function railY(x) {
    var i;
    var a;
    var b;
    var t;
    if (x <= RAIL[0][0]) return sceneY(RAIL[0][1]);
    for (i = 1; i < RAIL.length; i++) {
      if (x <= RAIL[i][0]) {
        a = RAIL[i - 1];
        b = RAIL[i];
        t = (x - a[0]) / (b[0] - a[0]);
        return sceneY(a[1] + (b[1] - a[1]) * t);
      }
    }
    return sceneY(RAIL[RAIL.length - 1][1]);
  }

  function currentPattern() {
    return PATTERNS[patternIndex];
  }

  function matches() {
    var pattern = currentPattern();
    return levers.every(function (lever, index) { return lever === pattern[index]; });
  }

  function canThrow() {
    return state === 'approach';
  }

  function playingMotion() {
    return state === 'approach' || state === 'blast' || state === 'depart';
  }

  function say(text) {
    if (statusEl) statusEl.textContent = text;
  }

  function renderHud() {
    var line = departures + ' / ' + TRAIN_COUNT + ' · ' + misses;
    if (missesEl.textContent !== line) missesEl.textContent = line;
    arrivalEl.textContent = state === 'depart' ? 'Passing' : state === 'win' ? 'Clear'
      : Math.max(0, (SWITCH_X - TRAIN_W - trainX) / APPROACH_SPEED).toFixed(1) + 's';
  }

  function refreshLevers() {
    var i;
    var btn;
    var right;
    var name;
    for (i = 0; i < LEVER_X.length; i++) {
      btn = leverBtns[i];
      right = levers[i] === 1;
      btn.classList.toggle('is-left', !right);
      btn.setAttribute('aria-pressed', right ? 'true' : 'false');
      name = right ? 'Right' : 'Left';
      btn.querySelector('span').textContent = name;
      btn.setAttribute('aria-label', 'Lever ' + (i + 1) + ', thrown ' + name.toLowerCase());
    }
  }

  function resetPuzzle() {
    patternIndex = 0;
    levers = LEVER_X.map(function () { return Math.random() < 0.5 ? 0 : 1; });
    if (matches()) {
      var index = Math.floor(Math.random() * levers.length);
      levers[index] = 1 - levers[index];
    }
    activeLever = 0;
    departures = 0;
    misses = 0;
    doomed = false;
    blastT = 0;
    blastParts = [];
    trainX = TRAIN_START;
    switchGrace = 0;
    trentX = LEVER_X[0] - 74;
    pullT = 1;
    shake = 0;
    flipTimer = 0;
    soldierX = 1180;
    soldierTarget = 1180;
    soldierFace = -1;
    soldierFlipT = 1;
    refreshLevers();
  }

  function armNextTrain() {
    levers = LEVER_X.map(function () { return 1; });
    trainX = TRAIN_START;
    switchGrace = 0;
    blastT = 0;
    blastParts = [];
    flipTimer = 0;
    if (departures >= SABOTEUR_AFTER && soldierTarget > 1100) {
      soldierTarget = LEVER_X[LEVER_X.length - 1] + 52;
      soldierFace = -1;
    }
    refreshLevers();
    state = 'approach';
  }

  function beginRun() {
    resetPuzzle();
    victorySent = false;
    pauseAccum = 0;
    runStart = performance.now();
    lastFrame = runStart;
    state = 'approach';
    startSheet.hidden = true;
    pauseSheet.hidden = true;
    loseSheet.hidden = true;
    winSheet.hidden = true;
    renderHud();
    say(inspection || rescue ? document.getElementById('tower-goal').textContent
      : 'Match the board. The first train is rolling in.');
    if (document.activeElement && document.activeElement.blur && document.activeElement !== document.body) {
      document.activeElement.blur();
    }
  }

  function openPause() {
    if (!playingMotion()) return;
    pausedState = state;
    pauseBegan = performance.now();
    state = 'pause';
    pauseSheet.hidden = false;
    say('Paused.');
  }

  function closePause() {
    if (state !== 'pause') return;
    pauseAccum += performance.now() - pauseBegan;
    state = pausedState || 'approach';
    pauseSheet.hidden = true;
    lastFrame = performance.now();
    if (state === 'depart') say('The route is open.');
    else if (state === 'blast') say('The train is lost.');
    else say('The train is rolling.');
  }

  function elapsedSeconds() {
    return Math.max(0, Math.round((performance.now() - runStart - pauseAccum) / 1000));
  }

  function win() {
    var seconds;
    if (state === 'win' || state === 'lose') return;
    seconds = elapsedSeconds();
    state = 'win';
    var result = inspection ? 'Both routes cleared in ' : rescue ? 'Seven rescue trains sent in ' : 'Five trains away in ';
    winTimeEl.textContent = result + seconds + (seconds === 1 ? ' second.' : ' seconds.');
    winSheet.hidden = false;
    say(winTimeEl.textContent);
    if (!victorySent) {
      victorySent = true;
      window.dispatchEvent(new CustomEvent('switch-tower:complete', {
        detail: { seconds: seconds }
      }));
      if (window.parent !== window) {
        var relay = { type: 'switch-tower:complete', detail: { seconds: seconds } };
        try {
          var relayRun = new URLSearchParams(location.search).get('runId');
          if (relayRun) relay.runId = relayRun;
        } catch (ignoreRelay) {}
        window.parent.postMessage(relay, (location.protocol === 'http:' || location.protocol === 'https:') ? location.origin : '*');
      }
    }
  }

  /* Three lost trains restart the puzzle. No victory event. */
  function failPuzzle() {
    if (state === 'win' || state === 'lose') return;
    state = 'lose';
    loseSheet.hidden = false;
    say('Three trains lost. The puzzle starts over.');
  }

  function boomAt(x, y) {
    var i;
    var angle;
    var speed;
    var count = reduceMotion() ? 8 : 18;
    blastParts = [];
    blastT = 0;
    for (i = 0; i < count; i++) {
      angle = (i / count) * Math.PI * 2;
      speed = 50 + (i % 5) * 22;
      blastParts.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed * 0.75 - 30,
        r: 5 + (i % 3) * 3,
        life: 1
      });
    }
  }

  function throwLever(index) {
    if (!canThrow()) return;
    if (index < 0 || index >= levers.length) return;
    levers[index] = levers[index] === 1 ? 0 : 1;
    activeLever = index;
    pullT = 0;
    trentX = reduceMotion() ? (LEVER_X[index] - 74) : trentX;
    refreshLevers();
    say('Lever ' + (index + 1) + (levers[index] === 1 ? ' right.' : ' left.'));
  }

  function updateBlast(dt) {
    var i;
    var puff;
    blastT += dt;
    for (i = 0; i < blastParts.length; i++) {
      puff = blastParts[i];
      puff.x += puff.vx * dt;
      puff.y += puff.vy * dt;
      puff.vy += 90 * dt;
      puff.life -= dt * (reduceMotion() ? 2.4 : 1.15);
    }
  }

  function nextFlipInterval() {
    var rateMultiplier = 1 + (2 * Math.random() - 1) * FLIP_RATE_VARIATION;
    return FLIP_INTERVAL / rateMultiplier;
  }

  /* Level 3 sabotages from the first approach; level 2 starts after two departures.
     The lever changes on that clock. The figure only shows who did it. */
  function updateSoldier(dt) {
    var index;
    var mark;
    if (inspection || departures < SABOTEUR_AFTER) return;
    if (state === 'approach' && trainX + TRAIN_W < SWITCH_X) {
      if (flipTimer <= 0) flipTimer = nextFlipInterval();
      flipTimer -= dt;
      if (flipTimer <= 0) {
        flipTimer += nextFlipInterval();
        index = Math.floor(Math.random() * LEVER_X.length);
        levers[index] = levers[index] === 1 ? 0 : 1;
        soldierTarget = LEVER_X[index] + 52;
        soldierFace = -1;
        soldierFlipT = 0;
        switchGrace = Math.max(switchGrace, RECOVERY_TIME);
        mark = soldierTarget - soldierX;
        if (mark > 160) soldierX = soldierTarget - 160;
        else if (mark < -160) soldierX = soldierTarget + 160;
        refreshLevers();
        say('A soldier threw lever ' + (index + 1) + '.');
      }
    }
    if (reduceMotion()) {
      soldierX = soldierTarget;
      soldierFlipT = 1;
    } else {
      soldierX += (soldierTarget - soldierX) * Math.min(1, dt * 8);
      if (soldierFlipT < 1) soldierFlipT = Math.min(1, soldierFlipT + dt / 0.4);
    }
  }

  function updateTrain(dt) {
    var front;
    var mid;
    if (state === 'approach') {
      switchGrace = Math.max(0, switchGrace - dt);
      trainX = Math.min(SWITCH_X - TRAIN_W, trainX + APPROACH_SPEED * dt);
      front = trainX + TRAIN_W;
      if (front >= SWITCH_X) {
        if (matches()) {
          state = 'depart';
          say('The route is open.');
        } else if (switchGrace > 0) {
          say('Train holding. Restore the route.');
        } else {
          misses += 1;
          doomed = misses >= missLimit;
          state = 'blast';
          mid = trainX + TRAIN_W * 0.5;
          if (!reduceMotion()) shake = 10;
          boomAt(mid, railY(mid) - 46);
          renderHud();
          say('The train is lost. Miss ' + misses + ' of ' + missLimit + '.');
        }
      }
    } else if (state === 'blast') {
      updateBlast(dt);
      if (blastT >= (reduceMotion() ? 0.35 : 0.9)) {
        if (doomed) failPuzzle();
        else {
          armNextTrain();
          say('Same pattern. The next train is rolling in.');
        }
      }
    } else if (state === 'depart') {
      trainX += DEPART_SPEED * dt;
      if (trainX > VIEW_W + 30) {
        departures += 1;
        renderHud();
        if (departures >= TRAIN_COUNT) win();
        else {
          patternIndex += 1;
          armNextTrain();
          if (departures >= SABOTEUR_AFTER) {
            say('Train ' + departures + ' is away. A soldier is throwing levers. Set pattern ' + (patternIndex + 1) + '.');
          } else {
            say('Train ' + departures + ' is away. Set pattern ' + (patternIndex + 1) + '.');
          }
        }
      }
    }
  }

  function updateObjective(dt) {
    updateTrain(dt);
  }

  function updateTrent(dt) {
    var target = LEVER_X[activeLever] - 74;
    if (reduceMotion()) trentX = target;
    else trentX += (target - trentX) * Math.min(1, dt * 8);
    if (pullT < 1) pullT = Math.min(1, pullT + dt / (PULL_MS / 1000));
  }

  function trentFrame() {
    var frame;
    if (pullT < 1) {
      frame = Math.floor(pullT * 4);
      if (frame > 3) frame = 3;
      return 2 + frame;
    }
    return Math.floor(visualTime / (IDLE_MS / 1000)) % 2;
  }

  function drawImageFrame(img, sx, sy, sw, sh, dx, dy, dw, dh) {
    if (!imageReady(img)) return;
    ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
  }

  function drawScene() {
    if (!imageReady(sceneImg)) {
      ctx.fillStyle = '#16385a';
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      return;
    }
    ctx.drawImage(sceneImg, 0, 0, VIEW_W, sceneY(VIEW_H));
  }

  function drawBoard() {
    var dh;
    if (!imageReady(boardImg)) return;
    dh = BOARD.dw * (BOARD.h / BOARD.w);
    ctx.drawImage(boardImg, BOARD.x, BOARD.y, BOARD.dw, dh);
    ctx.fillStyle = '#02255b';
    ctx.fillRect(BOARD.x + 65 * BOARD.dw / BOARD.w, BOARD.y + 95 * BOARD.dw / BOARD.w,
      830 * BOARD.dw / BOARD.w, 250 * BOARD.dw / BOARD.w);
    drawPattern(BOARD.dw / BOARD.w);
  }

  function drawPattern(scale) {
    var pattern = currentPattern();
    var i;
    var x;
    var y;
    var pw;
    var ph;
    var lh;
    var ls;
    var frame;
    for (i = 0; i < LEVER_X.length; i++) {
      x = BOARD.x + (75 + i * 810 / LEVER_X.length) * scale;
      y = BOARD.y + 102 * scale;
      pw = 810 / LEVER_X.length * scale;
      ph = 243 * scale;
      ctx.save();
      ctx.beginPath();
      ctx.rect(x, y, pw, ph);
      ctx.clip();
      ctx.fillStyle = '#02255b';
      ctx.fillRect(x, y, pw, ph);
      lh = ph * 0.86;
      ls = lh / LEVER.h;
      frame = pattern[i] === 1 ? 1 : 0;
      drawImageFrame(
        leverImg,
        frame * LEVER.w, 0, LEVER.w, LEVER.h,
        x + pw * 0.5 - LEVER.anchorX * ls,
        y + ph * 0.9 - LEVER.anchorY * ls,
        LEVER.w * ls,
        lh
      );
      ctx.restore();
    }
  }

  function drawTrainSprite() {
    var mid;
    var depth;
    var dw;
    var dh;
    var y;
    if (state === 'blast') return;
    if (!imageReady(trainImg) && !imageReady(paintedTrain)) return;
    mid = trainX + TRAIN_W * 0.5;
    depth = clamp(1.05 - mid / 2400, 0.92, 1.06);
    dw = TRAIN_W * depth;
    dh = TRAIN.h * (dw / TRAIN.w);
    y = railY(mid);
    if (imageReady(paintedTrain)) {
      var frame = reduceMotion() || !playingMotion() ? 0 : Math.floor(visualTime * 8) % 4;
      var sw = paintedTrain.naturalWidth / 2;
      var sh = paintedTrain.naturalHeight / 2;
      dh = dw * sh / sw;
      ctx.drawImage(paintedTrain, frame % 2 * sw, Math.floor(frame / 2) * sh, sw, sh,
        mid - dw / 2, y - dh * .88, dw, dh);
      return;
    }
    ctx.fillStyle = 'rgba(20, 32, 48, 0.28)';
    ctx.beginPath();
    ctx.ellipse(mid, y + 6, dw * 0.32, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.drawImage(
      trainImg,
      mid - TRAIN.anchorX * (dw / TRAIN.w),
      y - TRAIN.anchorY * (dh / TRAIN.h),
      dw,
      dh
    );
  }

  function drawLever(index) {
    var scale = LEVER_H / LEVER.h;
    var x = LEVER_X[index];
    var frame = levers[index] === 1 ? 1 : 0;
    ctx.fillStyle = 'rgba(20, 32, 48, 0.25)';
    ctx.beginPath();
    ctx.ellipse(x, GROUND_Y + 4, 28, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    drawImageFrame(
      leverImg,
      frame * LEVER.w, 0, LEVER.w, LEVER.h,
      x - LEVER.anchorX * scale,
      GROUND_Y - LEVER.anchorY * scale,
      LEVER.w * scale,
      LEVER_H
    );
  }

  function drawTrent() {
    var frame = trentFrame();
    var scale = TRENT_H / TRENT.h;
    var footY = GROUND_Y - 2;
    ctx.fillStyle = 'rgba(20, 32, 48, 0.25)';
    ctx.beginPath();
    ctx.ellipse(trentX, footY + 2, 22, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    drawImageFrame(
      trentImg,
      frame * TRENT.w, 0, TRENT.w, TRENT.h,
      trentX - TRENT.anchorX * scale,
      footY - TRENT.anchorY * scale,
      TRENT.w * scale,
      TRENT_H
    );
  }

  function drawBlast() {
    var i;
    var puff;
    var alpha;
    if (state !== 'blast') return;
    for (i = 0; i < blastParts.length; i++) {
      puff = blastParts[i];
      if (puff.life <= 0) continue;
      alpha = puff.life;
      if (i % 3 === 0) ctx.fillStyle = 'rgba(255, 246, 224, ' + alpha + ')';
      else if (i % 3 === 1) ctx.fillStyle = 'rgba(232, 120, 42, ' + alpha + ')';
      else ctx.fillStyle = 'rgba(72, 40, 28, ' + (alpha * 0.75) + ')';
      ctx.beginPath();
      ctx.arc(puff.x, puff.y, puff.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /* Plain field-gray cartoon soldier. No badge, armband, eagle, or rune. */
  function drawSoldier() {
    var walking;
    var stride;
    var bob;
    var swing;
    if (inspection || state === 'title') return;
    walking = Math.abs(soldierTarget - soldierX) > 8 && !reduceMotion();
    stride = walking ? Math.sin(visualTime * 11) : 0;
    bob = walking ? Math.abs(stride) * 2 : 0;
    swing = Math.sin(Math.PI * clamp(soldierFlipT, 0, 1));
    if (imageReady(paintedSoldier)) {
      var frame = soldierFlipT < 1 ? 3 : walking ? [0, 1, 0, 2][Math.floor(visualTime * 9) % 4] : 0;
      var sw = paintedSoldier.naturalWidth / 2;
      var sh = paintedSoldier.naturalHeight / 2;
      var height = 208;
      var width = height * sw / sh;
      ctx.save();
      ctx.translate(soldierX, GROUND_Y - bob);
      if (soldierFace > 0) ctx.scale(-1, 1);
      ctx.drawImage(paintedSoldier, frame % 2 * sw, Math.floor(frame / 2) * sh, sw, sh,
        -width / 2, -height * .938, width, height);
      ctx.restore();
      return;
    }

    ctx.fillStyle = 'rgba(20, 32, 48, 0.28)';
    ctx.beginPath();
    ctx.ellipse(soldierX, GROUND_Y + 4, 30, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.translate(soldierX, GROUND_Y - bob);
    ctx.scale(soldierFace * 1.35, 1.35);

    ctx.strokeStyle = '#2c332c';
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-4, -46);
    ctx.lineTo(-4 - stride * 10, -8);
    ctx.moveTo(4, -46);
    ctx.lineTo(4 + stride * 10, -8);
    ctx.stroke();

    ctx.fillStyle = '#241c18';
    ctx.beginPath();
    ctx.ellipse(-4 - stride * 10, -5, 8, 4, 0, 0, Math.PI * 2);
    ctx.ellipse(4 + stride * 10, -5, 8, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#4a5644';
    ctx.beginPath();
    ctx.moveTo(-16, -104);
    ctx.quadraticCurveTo(-20, -70, -18, -42);
    ctx.lineTo(16, -42);
    ctx.quadraticCurveTo(18, -70, 14, -104);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#1c241c';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = '#3c4838';
    ctx.fillRect(-3, -100, 6, 58);
    ctx.fillStyle = '#2a3128';
    ctx.beginPath();
    ctx.arc(0, -88, 2.2, 0, Math.PI * 2);
    ctx.arc(0, -74, 2.2, 0, Math.PI * 2);
    ctx.arc(0, -60, 2.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.translate(10, -92);
    ctx.rotate(-1.15 * swing + 0.35);
    ctx.fillStyle = '#4a5644';
    ctx.fillRect(-4, -4, 8, 34);
    ctx.fillStyle = '#e2b394';
    ctx.beginPath();
    ctx.arc(0, 32, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.strokeStyle = '#4a5644';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(-8, -90);
    ctx.lineTo(-16, -62);
    ctx.stroke();

    ctx.fillStyle = '#e2b394';
    ctx.beginPath();
    ctx.arc(2, -120, 15, 0, Math.PI * 2);
    ctx.arc(-8, -120, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1c1814';
    ctx.beginPath();
    ctx.arc(7, -122, 1.7, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#1c1814';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(2, -128);
    ctx.lineTo(12, -126);
    ctx.moveTo(4, -112);
    ctx.quadraticCurveTo(8, -109, 12, -112);
    ctx.stroke();

    ctx.fillStyle = '#3d463c';
    ctx.beginPath();
    ctx.ellipse(1, -132, 16, 11, 0, Math.PI, 0, true);
    ctx.fill();
    ctx.strokeStyle = '#1c241c';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.fillStyle = '#323a32';
    ctx.beginPath();
    ctx.ellipse(1, -126, 17, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2c332c';
    ctx.beginPath();
    ctx.ellipse(14, -124, 7, 3.2, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(210, 216, 200, 0.28)';
    ctx.beginPath();
    ctx.ellipse(-2, -136, 6, 3, -0.4, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  function drawSnow() {
    var i;
    var f;
    var count = reduceMotion() ? 14 : flakes.length;
    for (i = 0; i < count; i++) {
      f = flakes[i];
      ctx.fillStyle = 'rgba(255, 255, 255, ' + f.a + ')';
      ctx.beginPath();
      ctx.arc(f.x * VIEW_W, f.y * VIEW_H, f.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawWorld() {
    var i;
    drawScene();
    drawBoard();
    if (imageReady(signalImg)) {
      ctx.drawImage(signalImg, 862, sceneY(412) - 111, 64, 111);
      ctx.fillStyle = matches() ? '#9df8ad' : '#ff9b84';
      ctx.beginPath();
      ctx.arc(matches() ? 906 : 883, sceneY(412) - 65, 6, 0, Math.PI * 2);
      ctx.fill();
    }
    drawTrainSprite();
    drawBlast();
    for (i = 0; i < LEVER_X.length; i++) drawLever(i);
    drawTrent();
    drawSoldier();
    drawSnow();
  }

  function drawVignette() {
    var v = ctx.createRadialGradient(cssW * 0.5, cssH * 0.42, cssW * 0.2, cssW * 0.5, cssH * 0.5, cssW * 0.75);
    v.addColorStop(0, 'rgba(0, 0, 0, 0)');
    v.addColorStop(1, 'rgba(8, 18, 32, 0.22)');
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
    ctx.fillStyle = '#102c40';
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
    // Cover the phone width without stretching the painted figures. The backdrop
    // and its rail coordinates fit the screen height separately.
    s = Math.max(cssW / VIEW_W, cssH / VIEW_H);
    if (s < 0.01) s = 0.01;
    view.s = s;
    view.ox = (cssW - VIEW_W * s) / 2;
    view.oy = 0;
    // Keep the painted switches and their shadows above the touch controls.
    var controls = document.getElementById('levers').getBoundingClientRect();
    GROUND_Y = Math.min(628, (controls.top - rect.top - 12) / s);
    leverBtns.forEach(function (button, index) {
      if (index < LEVER_X.length) button.style.left = (view.ox + LEVER_X[index] * s) + 'px';
    });
  }

  function loop(now) {
    var dt = (now - lastFrame) / 1000;
    lastFrame = now;
    if (dt < 0) dt = 0;
    if (dt > 0.05) dt = 0.05;
    if (state !== 'pause') {
      visualTime += dt;
      if (!reduceMotion()) updateFlakes(dt);
      updateTrent(dt);
    }
    if (playingMotion()) updateObjective(dt);
    if (state !== 'pause') updateSoldier(dt);
    if (state !== 'pause' && shake > 0) shake = Math.max(0, shake - dt * 26);
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
    if (show && playingMotion()) {
      rotateHold = true;
      openPause();
    } else if (!show && rotateHold && state === 'pause') {
      rotateHold = false;
      closePause();
    }
  }

  function bindLever(button, index) {
    button.addEventListener('pointerdown', function (event) {
      if (event.button !== 0) return;
      event.preventDefault();
      throwLever(index);
      button.dataset.skipClick = '1';
    });
    button.addEventListener('click', function () {
      if (button.dataset.skipClick === '1') {
        button.dataset.skipClick = '';
        return;
      }
      throwLever(index);
    });
    button.addEventListener('contextmenu', function (event) { event.preventDefault(); });
  }

  leverBtns.forEach(bindLever);

  window.addEventListener('keydown', function (event) {
    var key = event.key;
    if (key === 'Escape') {
      event.preventDefault();
      if (playingMotion()) openPause();
      else if (state === 'pause') closePause();
      return;
    }
    if (/^[1-5]$/.test(key)) {
      if (canThrow()) {
        event.preventDefault();
        if (!event.repeat) throwLever(Number(key) - 1);
      }
    }
  });

  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) return;
    openPause();
  });
  window.addEventListener('pagehide', function () {
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
  document.getElementById('restart').addEventListener('click', beginRun);
  document.getElementById('retry').addEventListener('click', beginRun);
  document.getElementById('retry-lose').addEventListener('click', beginRun);
  pauseBtn.addEventListener('click', function () {
    if (playingMotion()) openPause();
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

  refreshLevers();
  renderHud();
  resize();
  syncPortrait();
  lastFrame = performance.now();
  requestAnimationFrame(loop);
})();
