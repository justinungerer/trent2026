/* Chapter 8 — The Holding Camp.
   Escort. Santa walks the cabin shadow to the gate.
   Stay near him. The open snow belongs to the searchlights.
   Painted sprites live in art/. Beams are canvas cones. */
'use strict';

(function () {
  var canvas = document.getElementById('yard');
  var ctx = canvas.getContext('2d');
  var gateEl = document.getElementById('gate');
  var slipsEl = document.getElementById('slips');
  var pauseBtn = document.getElementById('pause');
  var hintEl = document.getElementById('hint');
  var startSheet = document.getElementById('start-sheet');
  var pauseSheet = document.getElementById('pause-sheet');
  var winSheet = document.getElementById('win-sheet');
  var winTimeEl = document.getElementById('win-time');
  var portraitEl = document.getElementById('portrait');
  var statusEl = document.getElementById('status');

  var VIEW_W = 844;
  var VIEW_H = 390;
  /* Walk strips. Four equal frames, feet on one baseline. */
  var TRENT = { w: 412, h: 628, ax: 168, ay: 618, n: 4 };
  var SANTA = { w: 348, h: 420, ax: 201, ay: 409, n: 4 };
  var SEGMENTS = [
    { dur: 3.1, x0: 78, x1: 280, depth: 0.3 },
    { dur: 1.35, x0: 280, x1: 280, depth: 0.3 },
    { dur: 3.5, x0: 280, x1: 540, depth: 0.32 },
    { dur: 1.25, x0: 540, x1: 540, depth: 0.32 },
    { dur: 3.8, x0: 540, x1: 800, depth: 0.4 }
  ];
  var FOLLOW = 128;
  var LIGHT_DEPTH = 0.58;

  var sceneImg = new Image();
  var trentImg = new Image();
  var santaImg = new Image();
  sceneImg.src = 'art/scene.webp';
  trentImg.src = 'art/trent.webp';
  santaImg.src = 'art/santa.webp';

  var state = 'title';
  var cssW = 844;
  var cssH = 390;
  var dpr = 1;
  var view = { s: 1, ox: 0, oy: 0 };
  var played = 0;
  var march = 0;
  var victorySent = false;
  var rotateHold = false;
  var visualTime = 0;
  var lastFrame = 0;
  var shake = 0;
  var slips = 0;
  var behindT = 0;
  var lightT = 0;
  var cool = 0;
  var trent = { x: 78, depth: 0.3, face: 1 };
  var walkT = 0;
  var held = { up: false, down: false, left: false, right: false };
  var pointers = {};
  var flakes = [];
  var n;

  for (n = 0; n < 26; n++) {
    flakes.push({
      x: Math.random() * VIEW_W,
      y: Math.random() * VIEW_H,
      v: 10 + Math.random() * 16,
      r: 1 + Math.random() * 1.3
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

  function clamp(v, a, b) {
    if (v < a) return a;
    if (v > b) return b;
    return v;
  }

  function project(x, depth) {
    return {
      x: x,
      y: 214 + depth * 155,
      s: 0.82 + depth * 0.28
    };
  }

  function santaAt(elapsed) {
    var t = elapsed;
    var i;
    var seg;
    var u;
    for (i = 0; i < SEGMENTS.length; i++) {
      seg = SEGMENTS[i];
      if (t <= seg.dur) {
        u = seg.dur ? t / seg.dur : 1;
        return {
          x: seg.x0 + (seg.x1 - seg.x0) * u,
          depth: seg.depth,
          moving: seg.x0 !== seg.x1,
          done: false
        };
      }
      t -= seg.dur;
    }
    return { x: 800, depth: 0.4, moving: false, done: true };
  }

  function lights(time) {
    return [
      { x: 250 + (0.5 + 0.5 * Math.sin(time * 0.72)) * 220, depth: 0.74, r: 64 },
      { x: 430 + Math.sin(time * 0.95 + 1.4) * 250, depth: 0.9, r: 72 }
    ];
  }

  function apart(a, b) {
    return Math.hypot(a.x - b.x, (a.depth - b.depth) * 190);
  }

  function inLight(body, time) {
    var spots = lights(time);
    var i;
    var spot;
    var d;
    if (body.depth < LIGHT_DEPTH) return false;
    for (i = 0; i < spots.length; i++) {
      spot = spots[i];
      d = Math.hypot(body.x - spot.x, (body.depth - spot.depth) * 190);
      if (d < spot.r) return true;
    }
    return false;
  }

  function renderHud() {
    var santa = santaAt(march);
    if (state === 'win') gateEl.textContent = 'Open';
    else if (santa.done) gateEl.textContent = 'The gate';
    else if (santa.moving) gateEl.textContent = 'Keep up';
    else gateEl.textContent = 'He is waiting';
    slipsEl.textContent = slips + ' / 3';
    slipsEl.className = slips > 0 ? 'warn' : '';
  }

  function resetBodies() {
    march = 0;
    trent.x = 78;
    trent.depth = 0.3;
    trent.face = 1;
    behindT = 0;
    lightT = 0;
    cool = 0.4;
  }

  function beginRun() {
    resetBodies();
    slips = 0;
    played = 0;
    shake = 0;
    victorySent = false;
    state = 'play';
    startSheet.hidden = true;
    pauseSheet.hidden = true;
    winSheet.hidden = true;
    hintEl.hidden = false;
    renderHud();
    say('Stay in the shadow with Santa.');
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

  function win() {
    var seconds;
    if (state === 'win') return;
    seconds = Math.max(0, Math.round(played));
    state = 'win';
    winTimeEl.textContent = 'Out in ' + seconds + ' seconds.';
    winSheet.hidden = false;
    say('Through the gate. ' + seconds + ' seconds.');
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

  function slip(reason) {
    cool = 1.15;
    behindT = 0;
    lightT = 0;
    slips += 1;
    if (!reduceMotion()) shake = 7;
    if (slips >= 3) {
      slips = 0;
      resetBodies();
      say('Three slips. The walk starts again.');
    } else {
      say(reason);
    }
  }

  function stick() {
    var x = 0;
    var y = 0;
    if (held.left) x -= 1;
    if (held.right) x += 1;
    if (held.up) y -= 1;
    if (held.down) y += 1;
    return { x: x, y: y };
  }

  function update(dt) {
    var dir = stick();
    var santa;
    var dist;
    var moving;
    if (cool > 0) cool -= dt;
    moving = dir.x !== 0 || dir.y !== 0;
    if (dir.x < 0) trent.face = -1;
    if (dir.x > 0) trent.face = 1;
    trent.x = clamp(trent.x + dir.x * 165 * dt, 36, 820);
    trent.depth = clamp(trent.depth + dir.y * 0.55 * dt, 0.16, 0.96);
    if (moving) walkT += dt;
    march += dt;
    santa = santaAt(march);
    dist = apart(trent, santa);
    if (cool <= 0 && dist > FOLLOW) {
      behindT += dt;
      if (behindT > 0.55) slip('Too far from Santa.');
    } else {
      behindT = 0;
    }
    if (cool <= 0 && inLight(trent, visualTime)) {
      lightT += dt;
      if (lightT > 0.18) slip('The searchlight found Trent.');
    } else {
      lightT = 0;
    }
    if (santa.done && dist <= 100 && trent.x > 720) win();
  }

  function frameOf(moving, time) {
    if (!moving) return 0;
    if (reduceMotion()) return 1;
    return Math.floor(time * 1000 / 150) % 4;
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

  function drawActor(img, spec, index, body, face, height) {
    var p;
    var destH;
    var s;
    var frame = index;
    if (!imageReady(img)) return;
    p = project(body.x, body.depth);
    destH = height * p.s;
    s = destH / spec.h;
    ctx.save();
    ctx.translate(p.x, p.y);
    if (face < 0) ctx.scale(-1, 1);
    ctx.drawImage(
      img,
      frame * spec.w, 0, spec.w, spec.h,
      -spec.ax * s,
      -spec.ay * s,
      spec.w * s,
      destH
    );
    ctx.restore();
  }

  function drawBeams() {
    var spots = lights(visualTime);
    var i;
    var spot;
    var p;
    var origin;
    for (i = 0; i < spots.length; i++) {
      spot = spots[i];
      p = project(spot.x, spot.depth);
      origin = i === 0 ? { x: 560, y: 96 } : { x: 250, y: 78 };
      ctx.fillStyle = 'rgba(255, 214, 140, 0.16)';
      ctx.beginPath();
      ctx.moveTo(origin.x, origin.y);
      ctx.lineTo(p.x - spot.r, p.y);
      ctx.lineTo(p.x + spot.r, p.y);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(255, 226, 160, 0.28)';
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, spot.r, 16 + spot.depth * 8, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawSnow() {
    var f;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.72)';
    for (n = 0; n < flakes.length; n++) {
      f = flakes[n];
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function render() {
    var santa = santaAt(march);
    var mag = reduceMotion() ? 0 : shake;
    var order;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssW, cssH);
    ctx.setTransform(
      dpr * view.s, 0, 0, dpr * view.s,
      dpr * (view.ox + Math.sin(visualTime * 36) * mag),
      dpr * view.oy
    );
    drawCover(sceneImg);
    drawBeams();
    order = [
      { kind: 'santa', depth: santa.depth },
      { kind: 'trent', depth: trent.depth }
    ];
    order.sort(function (a, b) { return a.depth - b.depth; });
    for (n = 0; n < order.length; n++) {
      if (order[n].kind === 'santa') {
        drawActor(
          santaImg, SANTA,
          frameOf(santa.moving, march),
          santa, 1, 196
        );
      } else {
        drawActor(
          trentImg, TRENT,
          frameOf(stick().x !== 0 || stick().y !== 0, walkT),
          trent, trent.face, 214
        );
      }
    }
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

  function drift(dt) {
    var f;
    if (reduceMotion() || state === 'pause') return;
    for (n = 0; n < flakes.length; n++) {
      f = flakes[n];
      f.y += f.v * dt;
      if (f.y > VIEW_H) {
        f.y = -4;
        f.x = Math.random() * VIEW_W;
      }
    }
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
    drift(dt);
    renderHud();
    render();
    requestAnimationFrame(loop);
  }

  function portraitWanted() {
    return portraitQuery.matches || window.innerHeight > window.innerWidth + 20;
  }

  function syncPortrait() {
    var show = portraitWanted();
    portraitEl.hidden = !show;
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
    button.addEventListener('contextmenu', function (event) { event.preventDefault(); });
  }

  bindHold(document.getElementById('up'), 'up');
  bindHold(document.getElementById('down'), 'down');
  bindHold(document.getElementById('left'), 'left');
  bindHold(document.getElementById('right'), 'right');

  window.addEventListener('keydown', function (event) {
    var map = { arrowup: 'up', arrowdown: 'down', arrowleft: 'left', arrowright: 'right' };
    var key;
    if (event.key === 'Escape') {
      event.preventDefault();
      if (state === 'play') openPause();
      else if (state === 'pause') closePause();
      return;
    }
    key = map[event.key.toLowerCase()];
    if (!key) return;
    event.preventDefault();
    held[key] = true;
    hintEl.hidden = true;
  });

  window.addEventListener('keyup', function (event) {
    var map = { arrowup: 'up', arrowdown: 'down', arrowleft: 'left', arrowright: 'right' };
    var key = map[event.key.toLowerCase()];
    if (key) held[key] = false;
  });

  window.addEventListener('blur', function () {
    held.up = false;
    held.down = false;
    held.left = false;
    held.right = false;
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
  lastFrame = performance.now();
  requestAnimationFrame(loop);
})();
