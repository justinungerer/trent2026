/* Chapter 10 — The Chimney Road.
   A short rooftop run. Jump the gaps, mind the sliding crate,
   and reach the sleigh. Three falls start the road again.
   Painted sprites live in art/. */
'use strict';

(function () {
  var canvas = document.getElementById('roofs');
  var ctx = canvas.getContext('2d');
  var roadEl = document.getElementById('road');
  var fallsEl = document.getElementById('falls');
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
  /* trent.webp: idle 2, run 4, jump up, jump down. */
  var TRENT = { w: 558, h: 578, ax: 210, ay: 568, n: 8 };
  var PLATFORMS = [
    { x: 0, y: 270, w: 600, name: 'The first roof' },
    { x: 750, y: 302, w: 480, name: 'The middle roof' },
    { x: 1390, y: 236, w: 680, name: 'The long roof' },
    { x: 2230, y: 278, w: 580, name: 'The sleigh roof' }
  ];
  var WORLD = 2860;
  var SLEIGH_X = 2560;
  var GRAV = 1480;
  var JUMP = -630;
  var RUN = 260;

  var panoramaImg = new Image();
  var roofImg = new Image();
  var trentImg = new Image();
  var sleighImg = new Image();
  var crateImg = new Image();
  panoramaImg.src = 'art/panorama.webp';
  roofImg.src = 'art/roof.webp';
  trentImg.src = 'art/trent.webp';
  sleighImg.src = 'art/sleigh.webp';
  crateImg.src = 'art/crate.webp';

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
  var falls = 0;
  var cp = 0;
  var body = { x: 90, y: 268, vx: 0, vy: 0, face: 1, ground: true, runT: 0 };
  var held = { left: false, right: false };
  var jumpQueued = 0;
  var coyote = 0;
  var cam = 0;
  var cratePrev = 1750;
  var onCrate = false;
  var flakes = [];
  var i;

  for (i = 0; i < 24; i++) {
    flakes.push({
      x: Math.random() * WORLD,
      y: Math.random() * VIEW_H,
      v: 14 + Math.random() * 20,
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

  function clamp(v, a, b) {
    if (v < a) return a;
    if (v > b) return b;
    return v;
  }

  function crateBox() {
    var w = 112;
    var h = 74;
    var x = 1750 + Math.sin(visualTime * 1.05) * 180;
    return { x: x, y: PLATFORMS[2].y - h, w: w, h: h };
  }

  function renderHud() {
    roadEl.textContent = PLATFORMS[cp].name;
    fallsEl.textContent = falls + ' / 3';
    fallsEl.className = falls ? 'warn' : '';
  }

  function placeOn(index) {
    var roof = PLATFORMS[index];
    body.x = roof.x + 56;
    body.y = roof.y;
    body.vx = 0;
    body.vy = 0;
    body.ground = true;
    body.face = 1;
    cp = index;
  }

  function beginRun() {
    falls = 0;
    played = 0;
    shake = 0;
    jumpQueued = 0;
    coyote = 0;
    victorySent = false;
    placeOn(0);
    state = 'play';
    startSheet.hidden = true;
    pauseSheet.hidden = true;
    winSheet.hidden = true;
    hintEl.hidden = false;
    renderHud();
    say('The sleigh is on the last roof.');
  }

  function openPause() {
    if (state !== 'play') return;
    state = 'pause';
    held.left = false;
    held.right = false;
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
    say('Gave up. The sleigh is still waiting.');
  }

  function win() {
    var seconds;
    if (state === 'win') return;
    seconds = Math.max(0, Math.round(played));
    state = 'win';
    winTimeEl.textContent = 'Across in ' + seconds + ' seconds.';
    winSheet.hidden = false;
    say('The sleigh is waiting. ' + seconds + ' seconds.');
    if (!victorySent) {
      victorySent = true;
      window.dispatchEvent(new CustomEvent('chimney-road:complete', {
        detail: { seconds: seconds }
      }));
    }
  }

  function drop() {
    falls += 1;
    if (!reduceMotion()) shake = 8;
    if (falls >= 3) {
      falls = 0;
      placeOn(0);
      say('Three falls. The road starts again.');
    } else {
      placeOn(cp);
      say('Back on the roof.');
    }
    renderHud();
  }

  function land(top, left, right, id, prevY) {
    if (body.vy < 0) return false;
    if (prevY > top + 10) return false;
    if (body.y < top) return false;
    if (body.x < left || body.x > right) return false;
    body.y = top;
    body.vy = 0;
    body.ground = true;
    if (id >= 0) cp = id;
    return true;
  }

  function update(dt) {
    var dir = 0;
    var box;
    var n;
    var roof;
    var grounded;
    var prevY;
    if (held.left) dir -= 1;
    if (held.right) dir += 1;
    if (dir < 0) body.face = -1;
    if (dir > 0) body.face = 1;
    if (dir) body.vx += dir * 1600 * dt;
    else body.vx *= Math.max(0, 1 - 10 * dt);
    body.vx = clamp(body.vx, -RUN, RUN);
    if (jumpQueued > 0) jumpQueued -= dt;
    if (body.ground) coyote = 0.1;
    else coyote -= dt;
    if (jumpQueued > 0 && coyote > 0) {
      body.vy = JUMP;
      body.ground = false;
      coyote = 0;
      jumpQueued = 0;
    }
    body.vy += GRAV * dt;
    if (body.vy > 820) body.vy = 820;
    box = crateBox();
    if (onCrate) body.x += box.x - cratePrev;
    cratePrev = box.x;
    body.x += body.vx * dt;
    prevY = body.y;
    body.y += body.vy * dt;
    body.ground = false;
    onCrate = false;
    grounded = land(box.y, box.x + 8, box.x + box.w - 8, -1, prevY);
    if (grounded) onCrate = true;
    if (!body.ground) {
      for (n = 0; n < PLATFORMS.length; n++) {
        roof = PLATFORMS[n];
        if (land(roof.y, roof.x + 10, roof.x + roof.w - 10, n, prevY)) break;
      }
    }
    if (!onCrate && body.x > box.x - 16 && body.x < box.x + box.w + 16 && body.y > box.y + 18 && body.y - 48 < box.y + box.h) {
      if (body.x < box.x + box.w / 2) body.x = box.x - 18;
      else body.x = box.x + box.w + 18;
      body.vx = body.x < box.x ? Math.min(body.vx, 0) : Math.max(body.vx, 0);
    }
    if (Math.abs(body.vx) > 30 && body.ground) body.runT += dt;
    if (body.y > 460) drop();
    if (body.ground && cp === 3 && body.x > SLEIGH_X && body.x < SLEIGH_X + 130) win();
  }

  function trentFrame() {
    if (!body.ground) return body.vy < 0 ? 6 : 7;
    if (Math.abs(body.vx) > 30) {
      if (reduceMotion()) return 2;
      return 2 + (Math.floor(body.runT * 1000 / 90) % 4);
    }
    if (reduceMotion()) return 0;
    return Math.floor(visualTime * 1000 / 520) % 2;
  }

  function drawPanorama() {
    var iw;
    var ih;
    var scale;
    var dw;
    var dh;
    var extra;
    var u;
    if (!imageReady(panoramaImg)) return;
    iw = panoramaImg.naturalWidth;
    ih = panoramaImg.naturalHeight;
    scale = Math.max(VIEW_W / iw, VIEW_H / ih);
    dw = iw * scale;
    dh = ih * scale;
    extra = Math.max(0, dw - VIEW_W);
    u = cam / Math.max(1, WORLD - VIEW_W);
    ctx.drawImage(panoramaImg, -u * extra * 0.35, (VIEW_H - dh) / 2, dw, dh);
  }

  function drawRoofs() {
    var n;
    var roof;
    var dh;
    if (!imageReady(roofImg)) return;
    for (n = 0; n < PLATFORMS.length; n++) {
      roof = PLATFORMS[n];
      dh = roof.w * roofImg.naturalHeight / roofImg.naturalWidth;
      ctx.drawImage(roofImg, roof.x - cam, roof.y, roof.w, dh);
    }
  }

  function drawCrate() {
    var box = crateBox();
    if (!imageReady(crateImg)) return;
    ctx.drawImage(crateImg, box.x - cam, box.y, box.w, box.h);
  }

  function drawSleigh() {
    var w = 168;
    var h;
    var roof = PLATFORMS[3];
    if (!imageReady(sleighImg)) return;
    h = w * sleighImg.naturalHeight / sleighImg.naturalWidth;
    ctx.drawImage(sleighImg, SLEIGH_X - cam, roof.y - h + 10, w, h);
  }

  function drawTrent() {
    var frame;
    var destH = 132;
    var s;
    if (!imageReady(trentImg)) return;
    frame = trentFrame();
    s = destH / TRENT.h;
    ctx.save();
    ctx.translate(body.x - cam, body.y);
    if (body.face < 0) ctx.scale(-1, 1);
    ctx.drawImage(
      trentImg,
      frame * TRENT.w, 0, TRENT.w, TRENT.h,
      -TRENT.ax * s,
      -TRENT.ay * s,
      TRENT.w * s,
      destH
    );
    ctx.restore();
  }

  function drawSnow() {
    var f;
    if (reduceMotion()) return;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    for (i = 0; i < flakes.length; i++) {
      f = flakes[i];
      ctx.beginPath();
      ctx.arc(f.x - cam * 0.4, f.y, f.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function render() {
    var mag = reduceMotion() ? 0 : shake;
    cam = clamp(body.x - 300, 0, WORLD - VIEW_W);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssW, cssH);
    ctx.setTransform(
      dpr * view.s, 0, 0, dpr * view.s,
      dpr * (view.ox + Math.sin(visualTime * 34) * mag),
      dpr * (view.oy + (reduceMotion() ? 0 : Math.cos(visualTime * 29) * mag * 0.4))
    );
    drawPanorama();
    drawRoofs();
    drawCrate();
    drawSleigh();
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
    var f;
    lastFrame = now;
    if (dt < 0) dt = 0;
    if (dt > 0.05) dt = 0.05;
    if (state !== 'pause') visualTime += dt;
    if (state === 'play') {
      played += dt;
      update(dt);
      if (shake > 0) shake = Math.max(0, shake - dt * 14);
    }
    if (!reduceMotion() && state !== 'pause') {
      for (i = 0; i < flakes.length; i++) {
        f = flakes[i];
        f.y += f.v * dt;
        if (f.y > VIEW_H) {
          f.y = -6;
          f.x = Math.random() * WORLD;
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

  function bindHold(button, key) {
    var pointer = 0;
    button.addEventListener('pointerdown', function (event) {
      if (event.button !== 0) return;
      event.preventDefault();
      held[key] = true;
      pointer = event.pointerId;
      button.classList.add('held');
      hintEl.hidden = true;
      if (button.setPointerCapture) button.setPointerCapture(event.pointerId);
    });
    function release(event) {
      if (event.pointerId !== pointer) return;
      held[key] = false;
      button.classList.remove('held');
    }
    button.addEventListener('pointerup', release);
    button.addEventListener('pointercancel', release);
    button.addEventListener('contextmenu', function (event) { event.preventDefault(); });
  }

  bindHold(document.getElementById('left'), 'left');
  bindHold(document.getElementById('right'), 'right');

  document.getElementById('jump').addEventListener('pointerdown', function (event) {
    if (event.button !== 0) return;
    event.preventDefault();
    if (state === 'play') jumpQueued = 0.14;
    hintEl.hidden = true;
    event.currentTarget.classList.add('held');
  });
  document.getElementById('jump').addEventListener('pointerup', function (event) {
    event.currentTarget.classList.remove('held');
  });
  document.getElementById('jump').addEventListener('pointercancel', function (event) {
    event.currentTarget.classList.remove('held');
  });

  window.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') {
      event.preventDefault();
      if (state === 'play') openPause();
      else if (state === 'pause') closePause();
      return;
    }
    if (event.key === 'ArrowLeft') held.left = true;
    else if (event.key === 'ArrowRight') held.right = true;
    else if ((event.key === 'ArrowUp' || event.key === ' ') && !event.repeat) {
      if (state === 'play') jumpQueued = 0.14;
    } else return;
    event.preventDefault();
    hintEl.hidden = true;
  });

  window.addEventListener('keyup', function (event) {
    if (event.key === 'ArrowLeft') held.left = false;
    if (event.key === 'ArrowRight') held.right = false;
  });

  window.addEventListener('blur', function () {
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
  lastFrame = performance.now();
  requestAnimationFrame(loop);
})();
