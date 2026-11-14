/* Chapter 7 — The Listening Wire.
   One-screen timing. A lamp sweeps the yard. Trent keys a short
   Morse pattern only while the light sits in the safe gap.
   Painted sprites live in art/. The beam is a canvas cone. */
'use strict';

(function () {
  var canvas = document.getElementById('yard');
  var ctx = canvas.getContext('2d');
  var patternEl = document.getElementById('pattern');
  var slipsEl = document.getElementById('slips');
  var pauseBtn = document.getElementById('pause');
  var sendBtn = document.getElementById('send');
  var hintEl = document.getElementById('hint');
  var startSheet = document.getElementById('start-sheet');
  var pauseSheet = document.getElementById('pause-sheet');
  var winSheet = document.getElementById('win-sheet');
  var winTimeEl = document.getElementById('win-time');
  var portraitEl = document.getElementById('portrait');
  var statusEl = document.getElementById('status');

  var VIEW_W = 844;
  var VIEW_H = 390;
  /* trent.webp: five equal frames. Idle 2, then raise, press, recover. */
  var TRENT = { w: 278, h: 676, ax: 105, ay: 666, n: 5 };
  var PATTERN = ['dot', 'dash', 'dot', 'dot'];
  var MARK = { dot: '·', dash: '—' };
  var SWEEP_X0 = 150;
  var SWEEP_X1 = 730;
  var SWEEP_WAY = 1.9;
  var SAFE_X0 = 378;
  var SAFE_X1 = 560;
  var DOT_MAX = 0.32;
  var DASH_MIN = 0.4;
  var DASH_MAX = 0.72;

  var sceneImg = new Image();
  var trentImg = new Image();
  var lampImg = new Image();
  sceneImg.src = 'art/scene.webp';
  trentImg.src = 'art/trent.webp';
  lampImg.src = 'art/lamp.webp';

  var state = 'title';
  var cssW = 844;
  var cssH = 390;
  var dpr = 1;
  var view = { s: 1, ox: 0, oy: 0 };
  var played = 0;
  var victorySent = false;
  var portraitDismissed = false;
  var visualTime = 0;
  var lastFrame = 0;
  var shake = 0;
  var index = 0;
  var slips = 0;
  var holding = false;
  var pressT = 0;
  var spoiled = false;
  var counted = false;
  var recover = 0;
  var sendId = 0;
  var flakes = [];
  var i;

  for (i = 0; i < 28; i++) {
    flakes.push({
      x: Math.random() * VIEW_W,
      y: Math.random() * VIEW_H,
      v: 12 + Math.random() * 18,
      r: 1 + Math.random() * 1.4
    });
  }

  var motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  var portraitQuery = window.matchMedia('(orientation: portrait)');

  function reduceMotion() {
    return motionQuery.matches;
  }

  function imageReady(img) {
    return !!(img && img.complete && img.naturalWidth > 0);
  }

  function say(text) {
    statusEl.textContent = text;
  }

  function spotX() {
    var u = (visualTime % (SWEEP_WAY * 2)) / SWEEP_WAY;
    if (u > 1) u = 2 - u;
    return SWEEP_X0 + u * (SWEEP_X1 - SWEEP_X0);
  }

  function gapSafe() {
    var x = spotX();
    return x >= SAFE_X0 && x <= SAFE_X1;
  }

  function symbolName() {
    return PATTERN[index] || 'dot';
  }

  function renderHud() {
    var html = '';
    var n;
    for (n = 0; n < PATTERN.length; n++) {
      if (n) html += ' ';
      if (n === index) html += '<span class="now">' + MARK[PATTERN[n]] + '</span>';
      else html += MARK[PATTERN[n]];
    }
    patternEl.innerHTML = html;
    slipsEl.textContent = slips + ' / 3';
  }

  function beginRun() {
    index = 0;
    slips = 0;
    played = 0;
    holding = false;
    pressT = 0;
    spoiled = false;
    counted = false;
    recover = 0;
    shake = 0;
    victorySent = false;
    state = 'play';
    startSheet.hidden = true;
    pauseSheet.hidden = true;
    winSheet.hidden = true;
    hintEl.hidden = false;
    sendBtn.classList.remove('held');
    sendBtn.setAttribute('aria-pressed', 'false');
    renderHud();
    say('The pattern is dot, dash, dot, dot.');
  }

  function openPause() {
    if (state !== 'play') return;
    state = 'pause';
    holding = false;
    sendBtn.classList.remove('held');
    sendBtn.setAttribute('aria-pressed', 'false');
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
    say('Gave up. The pattern was not sent.');
  }

  function win() {
    var seconds;
    if (state === 'win') return;
    seconds = Math.max(0, Math.round(played));
    state = 'win';
    holding = false;
    winTimeEl.textContent = 'Sent in ' + seconds + ' seconds.';
    winSheet.hidden = false;
    say('The yard heard it. ' + seconds + ' seconds.');
    if (!victorySent) {
      victorySent = true;
      window.dispatchEvent(new CustomEvent('listening-wire:complete', {
        detail: { seconds: seconds }
      }));
    }
  }

  function slip(reason) {
    slips += 1;
    counted = true;
    spoiled = true;
    if (!reduceMotion()) shake = 7;
    if (slips >= 3) {
      slips = 0;
      index = 0;
      say('Three slips. The pattern starts again.');
    } else {
      say(reason);
    }
    renderHud();
  }

  function releaseKey() {
    var kind;
    var ok;
    if (state !== 'play') {
      holding = false;
      sendBtn.classList.remove('held');
      sendBtn.setAttribute('aria-pressed', 'false');
      return;
    }
    holding = false;
    recover = 0.16;
    sendBtn.classList.remove('held');
    sendBtn.setAttribute('aria-pressed', 'false');
    if (counted || spoiled) {
      counted = false;
      spoiled = false;
      return;
    }
    if (pressT < 0.07) return;
    kind = symbolName();
    ok = false;
    if (kind === 'dot' && pressT <= DOT_MAX) ok = true;
    if (kind === 'dash' && pressT >= DASH_MIN && pressT <= DASH_MAX) ok = true;
    if (!ok) {
      slip(kind === 'dash' ? 'That hold was not a dash.' : 'That tap was not a dot.');
      return;
    }
    index += 1;
    renderHud();
    if (index >= PATTERN.length) win();
    else say(kind === 'dash' ? 'Dash.' : 'Dot.');
  }

  function update(dt) {
    var safe = gapSafe();
    if (holding) {
      pressT += dt;
      if (!safe) spoiled = true;
      if (spoiled && !counted) slip('The light left the gap.');
      if (symbolName() === 'dash' && pressT > DASH_MAX && !counted) {
        slip('Held past the dash.');
      }
    } else if (recover > 0) {
      recover -= dt;
    }
  }

  function trentFrame() {
    if (holding) {
      if (pressT < 0.08) return 2;
      return 3;
    }
    if (recover > 0) return 4;
    if (reduceMotion()) return 0;
    return Math.floor(visualTime * 1000 / 520) % 2;
  }

  function drawCover(img) {
    var scale;
    var dw;
    var dh;
    if (!imageReady(img)) return;
    scale = Math.max(VIEW_W / img.naturalWidth, VIEW_H / img.naturalHeight);
    dw = img.naturalWidth * scale;
    dh = img.naturalHeight * scale;
    ctx.drawImage(img, (VIEW_W - dw) / 2, (VIEW_H - dh) / 2, dw, dh);
  }

  function drawTrent() {
    var frame;
    var destH;
    var s;
    var footX = 196;
    var footY = 348;
    if (!imageReady(trentImg)) return;
    frame = trentFrame();
    destH = 268;
    s = destH / TRENT.h;
    ctx.drawImage(
      trentImg,
      frame * TRENT.w, 0, TRENT.w, TRENT.h,
      footX - TRENT.ax * s,
      footY - TRENT.ay * s,
      TRENT.w * s,
      destH
    );
  }

  function drawLamp(x) {
    var originX = 470;
    var originY = 86;
    var ang;
    var dw = 108;
    var dh;
    var px;
    var py;
    ctx.fillStyle = 'rgba(8, 16, 32, 0.28)';
    ctx.beginPath();
    ctx.ellipse((SAFE_X0 + SAFE_X1) / 2, 312, (SAFE_X1 - SAFE_X0) / 2, 28, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = gapSafe() ? 'rgba(255, 214, 140, 0.85)' : 'rgba(190, 210, 230, 0.35)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = 'rgba(255, 226, 160, 0.22)';
    ctx.beginPath();
    ctx.moveTo(originX, originY);
    ctx.lineTo(x - 54, 328);
    ctx.lineTo(x + 54, 328);
    ctx.closePath();
    ctx.fill();
    if (!imageReady(lampImg)) return;
    dh = dw * lampImg.naturalHeight / lampImg.naturalWidth;
    ang = Math.atan2(300 - originY, x - originX);
    px = dw * 0.48;
    py = dh * 0.78;
    ctx.save();
    ctx.translate(originX, originY);
    ctx.rotate(ang);
    ctx.drawImage(lampImg, -px, -py, dw, dh);
    ctx.restore();
  }

  function drawSnow() {
    var n;
    var f;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
    for (n = 0; n < flakes.length; n++) {
      f = flakes[n];
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function render() {
    var mag = reduceMotion() ? 0 : shake;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssW, cssH);
    ctx.setTransform(dpr * view.s, 0, 0, dpr * view.s, dpr * (view.ox + Math.sin(visualTime * 38) * mag), dpr * view.oy);
    drawCover(sceneImg);
    drawLamp(spotX());
    drawTrent();
    drawSnow();
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

  function loop(now) {
    var dt = (now - lastFrame) / 1000;
    lastFrame = now;
    if (dt < 0) dt = 0;
    if (dt > 0.05) dt = 0.05;
    if (state !== 'pause') visualTime += dt;
    if (state === 'play') {
      played += dt;
      update(dt);
      if (shake > 0) shake = Math.max(0, shake - dt * 16);
    }
    if (!reduceMotion() && state !== 'pause') {
      for (i = 0; i < flakes.length; i++) {
        flakes[i].y += flakes[i].v * dt;
        if (flakes[i].y > VIEW_H) {
          flakes[i].y = -4;
          flakes[i].x = Math.random() * VIEW_W;
        }
      }
    }
    renderHud();
    render();
    requestAnimationFrame(loop);
  }

  function portraitWanted() {
    return portraitQuery.matches || window.innerHeight > window.innerWidth + 20;
  }

  function syncPortrait() {
    var show = portraitWanted() && !portraitDismissed;
    var was = !portraitEl.hidden;
    portraitEl.hidden = !show;
    if (show && !was && state === 'play') openPause();
  }

  function pressSend(event) {
    if (event.button !== 0) return;
    event.preventDefault();
    if (state !== 'play') return;
    sendId = event.pointerId;
    sendBtn.classList.add('held');
    sendBtn.setAttribute('aria-pressed', 'true');
    hintEl.hidden = true;
    holding = true;
    pressT = 0;
    spoiled = !gapSafe();
    counted = false;
    if (spoiled) slip('The key went down in the open light.');
    if (sendBtn.setPointerCapture) sendBtn.setPointerCapture(event.pointerId);
  }

  function unpress(event) {
    if (event.pointerId !== sendId) return;
    if (holding || sendBtn.classList.contains('held')) releaseKey();
  }

  sendBtn.addEventListener('pointerdown', pressSend);
  sendBtn.addEventListener('pointerup', unpress);
  sendBtn.addEventListener('pointercancel', unpress);
  sendBtn.addEventListener('contextmenu', function (event) { event.preventDefault(); });

  window.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') {
      event.preventDefault();
      if (state === 'play') openPause();
      else if (state === 'pause') closePause();
      return;
    }
    if (event.key !== ' ' && event.key !== 'Enter') return;
    if (event.repeat || holding) return;
    if (state !== 'play') return;
    event.preventDefault();
    pressSend({ button: 0, pointerId: -1, preventDefault: function () {} });
  });

  window.addEventListener('keyup', function (event) {
    if (event.key !== ' ' && event.key !== 'Enter') return;
    if (sendId === -1) unpress({ pointerId: -1 });
  });

  window.addEventListener('blur', function () {
    if (holding) releaseKey();
  });

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) openPause();
  });
  window.addEventListener('pagehide', function () { openPause(); });

  document.getElementById('start').addEventListener('click', beginRun);
  document.getElementById('resume').addEventListener('click', closePause);
  document.getElementById('give-up').addEventListener('click', giveUp);
  document.getElementById('retry').addEventListener('click', beginRun);
  pauseBtn.addEventListener('click', function () {
    if (state === 'play') openPause();
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
  syncPortrait();
  renderHud();
  lastFrame = performance.now();
  requestAnimationFrame(loop);
})();
