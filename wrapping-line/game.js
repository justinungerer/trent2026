/* Chapter 9 — The Wrapping Line.
   Presents ride in at different heights. A left-thumb stick moves the mark
   up and down to meet them. The point total wins the line at 30. There is
   no streak to keep.
   A shuffled bag of 12 is 4 plain (+1), 3 ribbon (+3), 2 gilt (+5),
   2 torn (-1), and 1 crushed (-3). A random meet is worth
   (4 + 9 + 10 - 2 - 3) / 12 = 1.5 points.
   The clock is 27 seconds. Spawn x is 920, the mark is 456, and speed is
   232 px/s, so a present reaches the mark in 2.00 seconds. The first spawn
   waits 0.40 seconds and the rest arrive every 0.80 seconds, so present k
   is judged at 2.40 + 0.80k. k = 0..30 are judged by 26.40 seconds. k = 31
   would be 27.20 seconds, after the clock. That is 31 presents.
   0.65 * 1.5 * 31 = 30.225, so meeting about 65% of them reaches 30 as the
   clock ends. A present that passes the mark scores nothing. Time running
   out restarts the round. Across the 844px view the belt holds about
   844 / 232 / 0.80 = 4.6 presents.
   Torn and crushed presents also spend one life. Lives come from
   ?lives=10|9|8|7, or 7 when that value is missing. At 0 lives the run ends.
   Painted sprites live in art/. */
'use strict';

(function () {
  var canvas = document.getElementById('shop');
  var ctx = canvas.getContext('2d');
  var runEl = document.getElementById('run');
  var timeEl = document.getElementById('time');
  var livesEl = document.getElementById('lives');
  var lastEl = document.getElementById('last');
  var pauseBtn = document.getElementById('pause');
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
  var NEED = 30;
  var ROUND_SECONDS = 27;
  var TARGET = 456;
  var MEET = 26;
  var SPEED = 232;
  var INTERVAL = 0.8;
  var FIRST_SPAWN = 0.4;
  var LANES = [150, 206, 262, 318];
  var MARK_MIN = 150;
  var MARK_MAX = 318;
  var MARK_SPEED = 460;
  var STICK_TRAVEL = 46;
  var PRESENT_TYPES = [
    { id: 'plain', name: 'Plain', points: 1, weight: 4, src: 'art/present-plain.webp' },
    { id: 'ribbon', name: 'Ribbon', points: 3, weight: 3, src: 'art/present-ribbon.webp' },
    { id: 'gilt', name: 'Gilt', points: 5, weight: 2, src: 'art/present-gilt.webp' },
    { id: 'torn', name: 'Torn', points: -1, weight: 2, src: 'art/present-torn.webp' },
    { id: 'crushed', name: 'Crushed', points: -3, weight: 1, src: 'art/present-crushed.webp' }
  ];

  var sceneImg = new Image();
  var trentImg = new Image();
  sceneImg.src = 'art/scene.webp';
  trentImg.src = 'art/trent.webp';
  var goodBoxImg = new Image();
  var damagedBoxImg = new Image();
  goodBoxImg.src = 'art/box-good.webp';
  damagedBoxImg.src = 'art/box-damaged.webp';
  var typeIndex;
  for (typeIndex = 0; typeIndex < PRESENT_TYPES.length; typeIndex++) {
    PRESENT_TYPES[typeIndex].img = new Image();
    PRESENT_TYPES[typeIndex].img.src = PRESENT_TYPES[typeIndex].src;
  }

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
  var score = 0;
  var timeLeft = ROUND_SECONDS;
  var lives = readLives();
  var spawnIn = FIRST_SPAWN;
  var spawned = 0;
  var parcels = [];
  var bag = [];
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
    var shown = Math.ceil(timeLeft);
    if (shown < 0) shown = 0;
    if (shown > ROUND_SECONDS) shown = ROUND_SECONDS;
    runEl.textContent = score + ' / ' + NEED;
    timeEl.textContent = String(shown);
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

  function nextType() {
    var i;
    var n;
    var swap;
    var held;
    if (!bag.length) {
      for (i = 0; i < PRESENT_TYPES.length; i++) {
        for (n = 0; n < PRESENT_TYPES[i].weight; n++) bag.push(PRESENT_TYPES[i]);
      }
      for (i = bag.length - 1; i > 0; i--) {
        swap = Math.floor(Math.random() * (i + 1));
        held = bag[i];
        bag[i] = bag[swap];
        bag[swap] = held;
      }
    }
    return bag.pop();
  }

  function resetBelt(keepLives) {
    score = 0;
    timeLeft = ROUND_SECONDS;
    played = 0;
    spawnIn = FIRST_SPAWN;
    spawned = 0;
    parcels = [];
    bag = [];
    bowT = 0;
    shake = 0;
    markY = 262;
    lastWord = 'Wait';
    lastKind = '';
    if (!keepLives) lives = readLives();
  }

  function beginRun() {
    resetBelt(false);
    victorySent = false;
    state = 'play';
    startSheet.hidden = true;
    pauseSheet.hidden = true;
    winSheet.hidden = true;
    outSheet.hidden = true;
    hintEl.hidden = false;
    renderHud();
    say('Move the mark. Reach 30 points before time runs out.');
  }

  function restartRound() {
    if (state !== 'play') return;
    resetBelt(true);
    lastWord = 'Time';
    lastKind = 'bad';
    if (!reduceMotion()) shake = 6;
    say('Time. The round starts over.');
    renderHud();
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
    say('30 points. ' + seconds + ' seconds.');
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

  function meetPresent(parcel) {
    var points;
    if (state !== 'play') return;
    parcel.hit = true;
    points = parcel.type.points;
    score += points;
    lastWord = (points > 0 ? '+' : '') + points;
    lastKind = points > 0 ? 'good' : 'bad';
    if (points > 0) {
      bowT = 0.36;
      say(parcel.type.name + ' present. ' + score + (score === 1 ? ' point.' : ' points.'));
      renderHud();
      if (score >= NEED) win();
      return;
    }
    parcel.explodedAt = visualTime;
    if (!reduceMotion()) shake = 6;
    lives -= 1;
    if (lives < 0) lives = 0;
    renderHud();
    if (lives <= 0) {
      endRun();
      return;
    }
    say(parcel.type.name + ' present. ' + points + ' points. ' + lives + (lives === 1 ? ' life left.' : ' lives left.'));
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
    timeLeft -= dt;
    spawnIn -= dt;
    if (spawnIn <= 0) {
      parcels.push({
        x: 920,
        y: LANES[(spawned * 3) % LANES.length],
        judged: false,
        hit: false,
        type: nextType()
      });
      spawned += 1;
      spawnIn += INTERVAL;
    }
    for (i = parcels.length - 1; i >= 0; i--) {
      if (state !== 'play') break;
      parcel = parcels[i];
      parcel.x -= SPEED * dt;
      if (!parcel.judged && parcel.x <= TARGET) {
        parcel.judged = true;
        aligned = Math.abs(parcel.y - markY) <= MEET;
        if (aligned) meetPresent(parcel);
      }
      if (parcel.x < -90) parcels.splice(i, 1);
    }
    if (state === 'play' && timeLeft <= 0) restartRound();
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

  function drawBox(parcel) {
    var damaged = parcel.type.points < 0;
    var accent = damaged ? '#9a3538' : ({ plain: '#eee1bf', ribbon: '#44886f', gilt: '#e7b745' })[parcel.type.id];
    ctx.save();
    ctx.translate(parcel.x, parcel.y);
    if (damaged) ctx.rotate(parcel.type.id === 'crushed' ? -.17 : .12);
    var art = damaged ? damagedBoxImg : goodBoxImg;
    if (imageReady(art)) {
      var h = 88 * art.naturalHeight / art.naturalWidth;
      ctx.drawImage(art, -44, -h * .5, 88, h);
      if (!damaged) {
        ctx.fillStyle = accent;
        ctx.fillRect(-13, 0, 26, 15);
        ctx.fillStyle = '#21332c';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = '700 12px system-ui';
        ctx.fillText(String(parcel.type.points), 0, 8);
      }
      ctx.restore();
      return;
    }
    ctx.fillStyle = damaged ? '#80614d' : '#c99458';
    roundBox(-39, -25, 78, 56);
    ctx.fillStyle = damaged ? '#ae7b60' : '#e2ad6d';
    ctx.fillRect(-37, -22, 74, 15);
    ctx.fillStyle = accent;
    ctx.fillRect(-7, -24, 14, 54);
    ctx.fillStyle = '#fff2d7';
    ctx.fillRect(14, 1, 16, 9);
    if (damaged) {
      ctx.lineWidth = 5;
      ctx.strokeStyle = '#3d231d';
      ctx.beginPath();
      ctx.moveTo(-28,-21);
      ctx.lineTo(-14,-4);
      ctx.lineTo(-23,7);
      ctx.lineTo(-6,29);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawBoxBurst(parcel) {
    var phase = (visualTime - parcel.explodedAt) / .46;
    if (phase >= 1) return;
    var count = reduceMotion() ? 5 : 15;
    ctx.save();
    ctx.globalAlpha = 1 - phase;
    ctx.fillStyle = '#ffc45d';
    for (var index = 0; index < count; index++) {
      var angle = index * Math.PI * 2 / count;
      var radius = 8 + phase * (35 + (index % 4) * 9);
      ctx.beginPath();
      ctx.arc(TARGET + Math.cos(angle) * radius, parcel.y + Math.sin(angle) * radius, 3 + index % 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function paintFallback(parcel, size) {
    var x = parcel.x;
    var y = parcel.y;
    var w = size;
    var h = size * 0.78;
    var id = parcel.type.id;
    ctx.save();
    ctx.translate(x, y);
    if (id === 'crushed') {
      ctx.scale(1.12, 0.72);
      ctx.fillStyle = '#b43338';
      roundBox(-w / 2, -h / 2, w, h);
      ctx.fillStyle = '#e7d3a4';
      ctx.beginPath();
      ctx.moveTo(-8, -h * 0.2);
      ctx.lineTo(10, 4);
      ctx.lineTo(-2, h * 0.28);
      ctx.lineTo(-16, 2);
      ctx.fill();
    } else if (id === 'torn') {
      ctx.fillStyle = '#c4a574';
      roundBox(-w / 2, -h / 2, w, h);
      ctx.fillStyle = '#efe2c4';
      ctx.beginPath();
      ctx.moveTo(w * 0.08, -h * 0.2);
      ctx.lineTo(w * 0.42, -h * 0.05);
      ctx.lineTo(w * 0.22, h * 0.34);
      ctx.lineTo(-4, h * 0.08);
      ctx.fill();
    } else if (id === 'gilt') {
      ctx.fillStyle = '#e2b84a';
      roundBox(-w / 2, -h / 2, w, h);
      ctx.strokeStyle = '#f3e2a8';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(0, -h / 2);
      ctx.lineTo(0, h / 2);
      ctx.moveTo(-w / 2, 0);
      ctx.lineTo(w / 2, 0);
      ctx.stroke();
      ctx.fillStyle = '#c5363a';
      ctx.beginPath();
      ctx.ellipse(-12, -h * 0.42, 14, 8, -0.4, 0, Math.PI * 2);
      ctx.ellipse(12, -h * 0.42, 14, 8, 0.4, 0, Math.PI * 2);
      ctx.fill();
    } else if (id === 'ribbon') {
      ctx.fillStyle = '#a32632';
      roundBox(-w / 2, -h / 2, w, h);
      ctx.strokeStyle = '#2f8a45';
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(0, -h / 2);
      ctx.lineTo(0, h / 2);
      ctx.moveTo(-w / 2, -2);
      ctx.lineTo(w / 2, -2);
      ctx.stroke();
    } else {
      ctx.fillStyle = '#c9a36a';
      roundBox(-w / 2, -h / 2, w, h);
      ctx.strokeStyle = '#8a6230';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, -h / 2);
      ctx.lineTo(0, h / 2);
      ctx.moveTo(-w / 2, 0);
      ctx.lineTo(w / 2, 0);
      ctx.stroke();
      ctx.fillStyle = '#c5363a';
      ctx.beginPath();
      ctx.arc(0, -4, 6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function roundBox(x, y, w, h) {
    var r = 8;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
    ctx.fill();
  }

  function drawParcels() {
    var i;
    var parcel;
    var size = 84;
    var dh = 78;
    var img;
    for (i = 0; i < parcels.length; i++) {
      parcel = parcels[i];
      if (parcel.explodedAt !== undefined) {
        drawBoxBurst(parcel);
        continue;
      }
      if (!parcel.hit) {
        drawBox(parcel);
        continue;
      }
      img = parcel.type.img;
      if (imageReady(img)) {
        dh = size * img.naturalHeight / img.naturalWidth;
        ctx.drawImage(img, parcel.x - size / 2, parcel.y - dh / 2, size, dh);
      } else {
        paintFallback(parcel, size);
        dh = size * 0.78;
      }
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
