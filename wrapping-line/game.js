/* Chapter 9 — The Wrapping Line.
   Presents ride in at different heights. A left-thumb stick moves the mark
   up and down to meet them. Eight meets in a row clear the line.
   A green Grinch present takes one life. Lives come from ?lives=10|9|8|7,
   or 7 when that value is missing. Painted sprites live in art/. */
'use strict';

(function () {
  var canvas = document.getElementById('shop');
  var ctx = canvas.getContext('2d');
  var runEl = document.getElementById('run');
  var livesEl = document.getElementById('lives');
  var lastEl = document.getElementById('last');
  var pauseBtn = document.getElementById('pause');
  var bowBtn = document.getElementById('bow');
  var hintEl = document.getElementById('hint');
  var startSheet = document.getElementById('start-sheet');
  var pauseSheet = document.getElementById('pause-sheet');
  var winSheet = document.getElementById('win-sheet');
  var outSheet = document.getElementById('out-sheet');
  var winTimeEl = document.getElementById('win-time');
  var portraitEl = document.getElementById('portrait');
  var statusEl = document.getElementById('status');
  var stickEl = document.getElementById('stick');
  var knobEl = document.getElementById('stick-knob');

  var VIEW_W = 844;
  var VIEW_H = 390;
  /* trent.webp: idle 2, then three bow frames. */
  var TRENT = { w: 302, h: 676, ax: 127, ay: 666, n: 5 };
  var NEED = 8;
  var TARGET = 456;
  var MEET = 26;
  var SPEED = 236;
  var INTERVAL = 0.86;
  var LANES = [150, 206, 262, 318];
  var MARK_MIN = 150;
  var MARK_MAX = 318;
  var MARK_SPEED = 460;
  var STICK_TRAVEL = 46;

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
  var rotateHold = false;
  var visualTime = 0;
  var lastFrame = 0;
  var shake = 0;
  var streak = 0;
  var lives = readLives();
  var spawnIn = 0.35;
  var spawned = 0;
  var parcels = [];
  var bowT = 0;
  var markY = 262;
  var lastWord = 'Wait';
  var lastKind = '';
  var stickAxis = 0;
  var stickPointer = null;
  var holdUp = false;
  var holdDown = false;

  var motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* lives=10, 9, 8, or 7. Missing or any other value starts the run at 7. */
  function readLives() {
    var raw;
    try {
      raw = new URLSearchParams(window.location.search).get('lives');
    } catch (ignoreLives) {
      return 7;
    }
    if (raw == null) return 7;
    raw = String(raw).trim();
    if (raw === '10' || raw === '9' || raw === '8' || raw === '7') return Number(raw);
    return 7;
  }

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
    var heightNow = Math.round((markY - MARK_MIN) / (MARK_MAX - MARK_MIN) * 100);
    runEl.textContent = streak + ' / ' + NEED;
    livesEl.textContent = String(lives);
    lastEl.textContent = lastWord;
    lastEl.className = lastKind;
    if (heightNow < 0) heightNow = 0;
    if (heightNow > 100) heightNow = 100;
    stickEl.setAttribute('aria-valuenow', String(100 - heightNow));
  }

  function placeKnob(axis) {
    if (axis > 1) axis = 1;
    if (axis < -1) axis = -1;
    stickAxis = axis;
    knobEl.style.transform = 'translate(-50%, -50%) translateY(' + (axis * STICK_TRAVEL) + 'px)';
  }

  function beginRun() {
    streak = 0;
    lives = readLives();
    played = 0;
    spawnIn = 0.45;
    spawned = 0;
    parcels = [];
    bowT = 0;
    shake = 0;
    markY = 262;
    lastWord = 'Wait';
    lastKind = '';
    victorySent = false;
    state = 'play';
    startSheet.hidden = true;
    pauseSheet.hidden = true;
    winSheet.hidden = true;
    outSheet.hidden = true;
    hintEl.hidden = false;
    renderHud();
    say('Move the mark up or down to meet each present.');
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
    lives = readLives();
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
      if (window.parent !== window) {
        var relay = { type: 'wrapping-line:complete', detail: { seconds: seconds } };
        try {
          var relayRun = new URLSearchParams(location.search).get('runId');
          if (relayRun) relay.runId = relayRun;
        } catch (ignoreRelay) {}
        window.parent.postMessage(relay, (location.protocol === 'http:' || location.protocol === 'https:') ? location.origin : '*');
      }
    }
  }

  function endRun() {
    state = 'over';
    hintEl.hidden = true;
    outSheet.hidden = false;
    say('Out of lives. The line was not cleared.');
  }

  function miss(word) {
    if (state !== 'play') return;
    streak = 0;
    lastWord = word;
    lastKind = 'bad';
    if (!reduceMotion()) shake = 6;
    say(word + '. The run starts over.');
    renderHud();
  }

  function loseLife() {
    if (state !== 'play') return;
    lives -= 1;
    lastWord = 'Grinch';
    lastKind = 'bad';
    if (!reduceMotion()) shake = 6;
    if (lives < 0) lives = 0;
    renderHud();
    if (lives <= 0) {
      endRun();
      return;
    }
    say('Grinch present. ' + lives + (lives === 1 ? ' life left.' : ' lives left.'));
  }

  function grantBow(parcel) {
    if (state !== 'play') return;
    parcel.hit = true;
    bowT = 0.36;
    streak += 1;
    lastWord = 'Bow';
    lastKind = 'good';
    say('Bow ' + streak + '.');
    renderHud();
    if (streak >= NEED) win();
  }

  function update(dt) {
    var i;
    var parcel;
    var aligned;
    if (bowT > 0) bowT -= dt;
    if (state === 'win' || state === 'over') return;
    if (state === 'play') {
      markY += stickAxis * MARK_SPEED * dt;
      if (markY < MARK_MIN) markY = MARK_MIN;
      if (markY > MARK_MAX) markY = MARK_MAX;
      if (stickAxis !== 0) hintEl.hidden = true;
    }
    spawnIn -= dt;
    if (spawnIn <= 0) {
      parcels.push({
        x: 920,
        y: LANES[(spawned * 3) % LANES.length],
        judged: false,
        hit: false,
        grinch: spawned % 5 === 4
      });
      spawned += 1;
      spawnIn = INTERVAL;
    }
    for (i = parcels.length - 1; i >= 0; i--) {
      if (state !== 'play') break;
      parcel = parcels[i];
      parcel.x -= SPEED * dt;
      if (!parcel.judged && parcel.x <= TARGET) {
        parcel.judged = true;
        aligned = Math.abs(parcel.y - markY) <= MEET;
        if (parcel.grinch) {
          if (aligned) loseLife();
        } else if (aligned) {
          grantBow(parcel);
        } else {
          miss('Miss');
        }
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
    var dh = 74;
    for (i = 0; i < parcels.length; i++) {
      parcel = parcels[i];
      if (imageReady(parcelImg)) {
        dh = size * parcelImg.naturalHeight / parcelImg.naturalWidth;
        ctx.save();
        if (parcel.grinch) ctx.filter = 'hue-rotate(100deg) saturate(2.4) brightness(1.05)';
        ctx.drawImage(parcelImg, parcel.x - size / 2, parcel.y - dh / 2, size, dh);
        ctx.restore();
      }
      if (parcel.grinch) {
        ctx.strokeStyle = '#39d26a';
        ctx.lineWidth = 4;
        ctx.strokeRect(parcel.x - size / 2 - 4, parcel.y - dh / 2 - 4, size + 8, dh + 8);
        ctx.fillStyle = 'rgba(40, 170, 72, 0.95)';
        ctx.beginPath();
        ctx.arc(parcel.x, parcel.y, 14, 0, Math.PI * 2);
        ctx.fill();
      }
      if (parcel.hit) drawBow(parcel.x, parcel.y - dh * 0.28);
    }
  }

  function drawMark() {
    var pulse = reduceMotion() ? 1 : 1 + Math.sin(visualTime * 8) * 0.08;
    ctx.strokeStyle = 'rgba(255, 214, 140, 0.95)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(TARGET, markY - 46);
    ctx.lineTo(TARGET, markY + 46);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(TARGET, markY, 18 * pulse, 0, Math.PI * 2);
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
    drawParcels();
    drawMark();
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
    return window.TrentOrientation.blocked(true);
  }

  function syncPortrait() {
    var show = portraitWanted();
    portraitEl.hidden = !show || window.TrentOrientation.embedded;
    if (show && state === 'play') {
      rotateHold = true;
      openPause();
    } else if (!show && rotateHold && state === 'pause') {
      rotateHold = false;
      closePause();
    }
  }

  function axisFromPointer(event) {
    var rect = stickEl.getBoundingClientRect();
    var dy = event.clientY - (rect.top + rect.height / 2);
    var axis = dy / STICK_TRAVEL;
    if (axis > 1) axis = 1;
    if (axis < -1) axis = -1;
    if (Math.abs(axis) < 0.1) axis = 0;
    return axis;
  }

  function releaseStick(event) {
    if (stickPointer == null) return;
    if (event && event.pointerId !== stickPointer) return;
    stickPointer = null;
    if (holdUp && !holdDown) placeKnob(-1);
    else if (holdDown && !holdUp) placeKnob(1);
    else placeKnob(0);
  }

  bowBtn.addEventListener('pointerdown', function (event) {
    if (event.button !== 0) return;
    event.preventDefault();
    bowBtn.classList.add('held');
  });
  function releaseBow() {
    bowBtn.classList.remove('held');
  }
  bowBtn.addEventListener('pointerup', releaseBow);
  bowBtn.addEventListener('pointercancel', releaseBow);
  bowBtn.addEventListener('contextmenu', function (event) { event.preventDefault(); });

  stickEl.addEventListener('pointerdown', function (event) {
    if (event.button !== 0) return;
    event.preventDefault();
    stickPointer = event.pointerId;
    stickEl.setPointerCapture(event.pointerId);
    placeKnob(axisFromPointer(event));
  });
  stickEl.addEventListener('pointermove', function (event) {
    if (event.pointerId !== stickPointer) return;
    placeKnob(axisFromPointer(event));
  });
  stickEl.addEventListener('pointerup', releaseStick);
  stickEl.addEventListener('pointercancel', releaseStick);
  stickEl.addEventListener('contextmenu', function (event) { event.preventDefault(); });

  window.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') {
      event.preventDefault();
      if (state === 'play') openPause();
      else if (state === 'pause') closePause();
      return;
    }
    if (event.key === 'ArrowUp' || event.key === 'w' || event.key === 'W') {
      event.preventDefault();
      holdUp = true;
      if (stickPointer == null) placeKnob(holdDown ? 0 : -1);
      return;
    }
    if (event.key === 'ArrowDown' || event.key === 's' || event.key === 'S') {
      event.preventDefault();
      holdDown = true;
      if (stickPointer == null) placeKnob(holdUp ? 0 : 1);
    }
  });
  window.addEventListener('keyup', function (event) {
    if (event.key === 'ArrowUp' || event.key === 'w' || event.key === 'W') holdUp = false;
    if (event.key === 'ArrowDown' || event.key === 's' || event.key === 'S') holdDown = false;
    if (stickPointer != null) return;
    if (holdUp && !holdDown) placeKnob(-1);
    else if (holdDown && !holdUp) placeKnob(1);
    else placeKnob(0);
  });
  window.addEventListener('blur', function () {
    holdUp = false;
    holdDown = false;
    if (stickPointer == null) placeKnob(0);
  });

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) openPause();
  });
  window.addEventListener('pagehide', function () { openPause(); });

  document.getElementById('start').addEventListener('click', beginRun);
  document.getElementById('resume').addEventListener('click', closePause);
  document.getElementById('give-up').addEventListener('click', giveUp);
  document.getElementById('retry').addEventListener('click', beginRun);
  document.getElementById('out-retry').addEventListener('click', beginRun);
  pauseBtn.addEventListener('click', function () {
    if (state === 'play') openPause();
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
  syncPortrait();
  renderHud();
  lastFrame = performance.now();
  requestAnimationFrame(loop);
})();
