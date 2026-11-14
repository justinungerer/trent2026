/* Chapter 5 — The Switch Tower.
   Side view of a small snowy yard. Three levers set the route.
   The destination board shows the pattern with pictures: left, right, left.
   A wrong pattern sends the train back. Three misses restart the puzzle.
   The right pattern lets the train leave.
   Scene, board, levers, train, and Trent are painted pictures in art/. */
'use strict';

(function () {
  var canvas = document.getElementById('yard');
  var ctx = canvas.getContext('2d');
  var missesEl = document.getElementById('misses');
  var pauseBtn = document.getElementById('pause');
  var leverBtns = [
    document.getElementById('lever-0'),
    document.getElementById('lever-1'),
    document.getElementById('lever-2')
  ];
  var startSheet = document.getElementById('start-sheet');
  var pauseSheet = document.getElementById('pause-sheet');
  var loseSheet = document.getElementById('lose-sheet');
  var winSheet = document.getElementById('win-sheet');
  var winTimeEl = document.getElementById('win-time');
  var portraitEl = document.getElementById('portrait');
  var statusEl = document.getElementById('status');

  if (!canvas || !ctx) return;

  var VIEW_W = 1280;
  var VIEW_H = 720;

  /* Board icons, left to right, are lever frames 0, 1, 0. */
  var CORRECT = [0, 1, 0];
  var LEVER_X = [300, 640, 980];
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
  var APPROACH_SPEED = 58;
  var RETREAT_SPEED = 230;
  var DEPART_SPEED = 260;
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
  sceneImg.src = 'art/scene.webp';
  boardImg.src = 'art/board.webp';
  leverImg.src = 'art/lever.webp';
  trainImg.src = 'art/train.webp';
  trentImg.src = 'art/trent.webp';

  var state = 'title';
  var pausedState = 'approach';
  var levers = [1, 1, 1];
  var activeLever = 0;
  var misses = 0;
  var doomed = false;
  var trainX = -80;
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
  var portraitDismissed = false;
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

  function railY(x) {
    var i;
    var a;
    var b;
    var t;
    if (x <= RAIL[0][0]) return RAIL[0][1];
    for (i = 1; i < RAIL.length; i++) {
      if (x <= RAIL[i][0]) {
        a = RAIL[i - 1];
        b = RAIL[i];
        t = (x - a[0]) / (b[0] - a[0]);
        return a[1] + (b[1] - a[1]) * t;
      }
    }
    return RAIL[RAIL.length - 1][1];
  }

  function matches() {
    return levers[0] === CORRECT[0] && levers[1] === CORRECT[1] && levers[2] === CORRECT[2];
  }

  function canThrow() {
    return state === 'approach' || (state === 'retreat' && !doomed);
  }

  function playingMotion() {
    return state === 'approach' || state === 'retreat' || state === 'depart';
  }

  function say(text) {
    if (statusEl) statusEl.textContent = text;
  }

  function renderHud() {
    var line = misses + ' / 3';
    if (missesEl.textContent !== line) missesEl.textContent = line;
  }

  function refreshLevers() {
    var i;
    var btn;
    var right;
    var name;
    for (i = 0; i < 3; i++) {
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
    levers = [1, 1, 1];
    activeLever = 0;
    misses = 0;
    doomed = false;
    trainX = TRAIN_START;
    trentX = LEVER_X[0] - 74;
    pullT = 1;
    shake = 0;
    refreshLevers();
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
    say('The train is rolling in.');
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
    say('The train is rolling.');
  }

  function elapsedSeconds() {
    return Math.max(0, Math.round((performance.now() - runStart - pauseAccum) / 1000));
  }

  function win() {
    var seconds;
    if (state === 'win' || state === 'lose') return;
    seconds = elapsedSeconds();
    state = 'win';
    winTimeEl.textContent = 'Away in ' + seconds + (seconds === 1 ? ' second.' : ' seconds.');
    winSheet.hidden = false;
    say('The train is away. ' + seconds + ' seconds.');
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

  /* Three wrong routes restart the puzzle. No victory event. */
  function failPuzzle() {
    if (state === 'win' || state === 'lose') return;
    state = 'lose';
    loseSheet.hidden = false;
    say('Three wrong routes. The puzzle starts over.');
  }

  function throwLever(index) {
    if (!canThrow()) return;
    if (index < 0 || index > 2) return;
    levers[index] = levers[index] === 1 ? 0 : 1;
    activeLever = index;
    pullT = 0;
    trentX = reduceMotion() ? (LEVER_X[index] - 74) : trentX;
    refreshLevers();
    say('Lever ' + (index + 1) + (levers[index] === 1 ? ' right.' : ' left.'));
  }

  function updateTrain(dt) {
    var front;
    if (state === 'approach') {
      trainX += APPROACH_SPEED * dt;
      front = trainX + TRAIN_W;
      if (front >= SWITCH_X) {
        if (matches()) {
          state = 'depart';
          say('The route is open.');
        } else {
          misses += 1;
          doomed = misses >= 3;
          state = 'retreat';
          if (!reduceMotion()) shake = 8;
          renderHud();
          say('Sent back. Miss ' + misses + ' of 3.');
        }
      }
    } else if (state === 'retreat') {
      trainX -= RETREAT_SPEED * dt;
      if (trainX <= TRAIN_START) {
        trainX = TRAIN_START;
        if (doomed) failPuzzle();
        else state = 'approach';
      }
    } else if (state === 'depart') {
      trainX += DEPART_SPEED * dt;
      if (trainX > VIEW_W + 30) win();
    }
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
    ctx.drawImage(sceneImg, 0, 0, VIEW_W, VIEW_H);
  }

  function drawBoard() {
    var dh;
    if (!imageReady(boardImg)) return;
    dh = BOARD.dw * (BOARD.h / BOARD.w);
    ctx.drawImage(boardImg, BOARD.x, BOARD.y, BOARD.dw, dh);
  }

  function drawTrainSprite() {
    var mid;
    var depth;
    var dw;
    var dh;
    var y;
    if (!imageReady(trainImg)) return;
    mid = trainX + TRAIN_W * 0.5;
    depth = clamp(1.05 - mid / 2400, 0.92, 1.06);
    dw = TRAIN_W * depth;
    dh = TRAIN.h * (dw / TRAIN.w);
    y = railY(mid);
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
    drawTrainSprite();
    for (i = 0; i < 3; i++) drawLever(i);
    drawTrent();
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
    s = Math.min(cssW / VIEW_W, cssH / VIEW_H);
    if (s < 0.01) s = 0.01;
    view.s = s;
    view.ox = (cssW - VIEW_W * s) / 2;
    view.oy = (cssH - VIEW_H * s) / 2;
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
    if (playingMotion()) updateTrain(dt);
    if (state !== 'pause' && shake > 0) shake = Math.max(0, shake - dt * 26);
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
    if (show && !wasShowing && playingMotion()) openPause();
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

  bindLever(leverBtns[0], 0);
  bindLever(leverBtns[1], 1);
  bindLever(leverBtns[2], 2);

  window.addEventListener('keydown', function (event) {
    var key = event.key;
    if (key === 'Escape') {
      event.preventDefault();
      if (playingMotion()) openPause();
      else if (state === 'pause') closePause();
      return;
    }
    if (key === '1' || key === '2' || key === '3') {
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

  refreshLevers();
  renderHud();
  resize();
  syncPortrait();
  lastFrame = performance.now();
  requestAnimationFrame(loop);
})();
