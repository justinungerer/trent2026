/* Chapter 9 — The Wrapping Line.
   Rhythm. Parcels ride a belt. Tap as each one meets the mark.
   Early or late breaks the run. Eight bows in a row win.
   Painted sprites live in art/. */
'use strict';

(function () {
  var canvas = document.getElementById('shop');
  var ctx = canvas.getContext('2d');
  var runEl = document.getElementById('run');
  var lastEl = document.getElementById('last');
  var pauseBtn = document.getElementById('pause');
  var bowBtn = document.getElementById('bow');
  var hintEl = document.getElementById('hint');
  var startSheet = document.getElementById('start-sheet');
  var pauseSheet = document.getElementById('pause-sheet');
  var winSheet = document.getElementById('win-sheet');
  var winTimeEl = document.getElementById('win-time');
  var portraitEl = document.getElementById('portrait');
  var statusEl = document.getElementById('status');

  var VIEW_W = 844;
  var VIEW_H = 390;
  /* trent.webp: idle 2, then three bow frames. */
  var TRENT = { w: 302, h: 676, ax: 127, ay: 666, n: 5 };
  var NEED = 8;
  var TARGET = 456;
  var HIT = 44;
  var SPEED = 236;
  var INTERVAL = 0.86;
  var BELT_Y = 232;

  var sceneImg = new Image();
  var trentImg = new Image();
  var parcelImg = new Image();
  sceneImg.src = 'art/scene.webp';
  trentImg.src = 'art/trent.webp';
  parcelImg.src = 'art/parcel.webp';

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
  var streak = 0;
  var spawnIn = 0.35;
  var parcels = [];
  var bowT = 0;
  var lastWord = 'Wait';
  var lastKind = '';

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

  function renderHud() {
    runEl.textContent = streak + ' / ' + NEED;
    lastEl.textContent = lastWord;
    lastEl.className = lastKind;
  }

  function beginRun() {
    streak = 0;
    played = 0;
    spawnIn = 0.45;
    parcels = [];
    bowT = 0;
    shake = 0;
    lastWord = 'Wait';
    lastKind = '';
    victorySent = false;
    state = 'play';
    startSheet.hidden = true;
    pauseSheet.hidden = true;
    winSheet.hidden = true;
    hintEl.hidden = false;
    renderHud();
    say('Tap as the parcel meets the mark.');
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
    say('Gave up. The run was not finished.');
  }

  function win() {
    var seconds;
    if (state === 'win') return;
    seconds = Math.max(0, Math.round(played));
    state = 'win';
    winTimeEl.textContent = 'Wrapped in ' + seconds + ' seconds.';
    winSheet.hidden = false;
    say('Eight bows. ' + seconds + ' seconds.');
    if (!victorySent) {
      victorySent = true;
      window.dispatchEvent(new CustomEvent('wrapping-line:complete', {
        detail: { seconds: seconds }
      }));
    }
  }

  function miss(word) {
    streak = 0;
    lastWord = word;
    lastKind = 'bad';
    if (!reduceMotion()) shake = 6;
    say(word + '. The run starts over.');
    renderHud();
  }

  function nearest() {
    var i;
    var best = null;
    var d;
    for (i = 0; i < parcels.length; i++) {
      if (parcels[i].judged) continue;
      d = Math.abs(parcels[i].x - TARGET);
      if (!best || d < best.d) best = { parcel: parcels[i], d: d };
    }
    return best;
  }

  function tap() {
    var found;
    var parcel;
    if (state !== 'play') return;
    hintEl.hidden = true;
    bowT = 0.36;
    found = nearest();
    if (!found || found.d > 130) {
      miss('Early');
      return;
    }
    parcel = found.parcel;
    parcel.judged = true;
    if (found.d <= HIT) {
      parcel.hit = true;
      streak += 1;
      lastWord = 'Bow';
      lastKind = 'good';
      say('Bow ' + streak + '.');
      renderHud();
      if (streak >= NEED) win();
      return;
    }
    miss(parcel.x > TARGET ? 'Early' : 'Late');
  }

  function update(dt) {
    var i;
    var parcel;
    if (bowT > 0) bowT -= dt;
    if (state === 'win') return;
    spawnIn -= dt;
    if (spawnIn <= 0) {
      parcels.push({ x: 920, judged: false, hit: false });
      spawnIn = INTERVAL;
    }
    for (i = parcels.length - 1; i >= 0; i--) {
      parcel = parcels[i];
      parcel.x -= SPEED * dt;
      if (!parcel.judged && parcel.x < TARGET - HIT) {
        parcel.judged = true;
        miss('Late');
      }
      if (parcel.x < -90) parcels.splice(i, 1);
    }
  }

  function trentFrame() {
    var step;
    if (bowT > 0) {
      step = Math.floor((0.36 - bowT) / 0.12);
      if (step < 0) step = 0;
      if (step > 2) step = 2;
      return 2 + step;
    }
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

  function drawBow(x, y) {
    ctx.strokeStyle = '#c5363a';
    ctx.fillStyle = '#d64545';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x - 10, y, 8, 0.4, Math.PI * 1.7);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x + 10, y, 8, Math.PI * 1.3, Math.PI * 2.7);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x, y, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawParcels() {
    var i;
    var parcel;
    var size = 78;
    var dh;
    if (!imageReady(parcelImg)) return;
    dh = size * parcelImg.naturalHeight / parcelImg.naturalWidth;
    for (i = 0; i < parcels.length; i++) {
      parcel = parcels[i];
      ctx.drawImage(parcelImg, parcel.x - size / 2, BELT_Y - dh / 2, size, dh);
      if (parcel.hit) drawBow(parcel.x, BELT_Y - dh * 0.28);
    }
  }

  function drawMark() {
    var pulse = reduceMotion() ? 1 : 1 + Math.sin(visualTime * 8) * 0.08;
    ctx.strokeStyle = 'rgba(255, 214, 140, 0.95)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(TARGET, BELT_Y - 52);
    ctx.lineTo(TARGET, BELT_Y + 52);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(TARGET, BELT_Y, 18 * pulse, 0, Math.PI * 2);
    ctx.stroke();
  }

  function drawTrent() {
    var frame;
    var destH = 268;
    var s;
    var footX = 214;
    var footY = 356;
    if (!imageReady(trentImg)) return;
    frame = trentFrame();
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

  function render() {
    var mag = reduceMotion() ? 0 : shake;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssW, cssH);
    ctx.setTransform(
      dpr * view.s, 0, 0, dpr * view.s,
      dpr * (view.ox + Math.sin(visualTime * 40) * mag),
      dpr * view.oy
    );
    drawCover(sceneImg);
    drawMark();
    drawParcels();
    drawTrent();
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
      if (shake > 0) shake = Math.max(0, shake - dt * 18);
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

  bowBtn.addEventListener('pointerdown', function (event) {
    if (event.button !== 0) return;
    event.preventDefault();
    bowBtn.classList.add('held');
    tap();
  });
  function releaseBow() {
    bowBtn.classList.remove('held');
  }
  bowBtn.addEventListener('pointerup', releaseBow);
  bowBtn.addEventListener('pointercancel', releaseBow);
  bowBtn.addEventListener('contextmenu', function (event) { event.preventDefault(); });
  canvas.addEventListener('pointerdown', function (event) {
    if (event.button !== 0 || state !== 'play') return;
    tap();
  });

  window.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') {
      event.preventDefault();
      if (state === 'play') openPause();
      else if (state === 'pause') closePause();
      return;
    }
    if (event.key !== ' ' && event.key !== 'Enter') return;
    if (event.repeat) return;
    event.preventDefault();
    tap();
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
