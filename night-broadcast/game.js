/* Chapter 1 — The Night Broadcast.
   A few months after D-Day, near Christmas. The field report
   drifts along the dial. Chase it, hold the needle steady in
   that band, and lock three knobs in order. Each lock is three
   steady seconds. After a lock the signal jumps and keeps drifting.
   Painted sprites live in art/. The needle, meter, and knob
   marks stay as small canvas overlays. No network.

   Dial numbers run from 20 to 80. Drag and the arrow keys move
   the dial at twice the original rate. */
'use strict';

(function () {
  var canvas = document.getElementById('radio');
  var ctx = canvas.getContext('2d');
  var hearingEl = document.getElementById('hearing');
  var signalEl = document.getElementById('signal');
  var lockEl = document.getElementById('lock');
  var pauseBtn = document.getElementById('pause');
  var lockBtn = document.getElementById('lock-btn');
  var tuneDownBtn = document.getElementById('tune-down');
  var tuneUpBtn = document.getElementById('tune-up');
  var hintEl = document.getElementById('hint');
  var startSheet = document.getElementById('start-sheet');
  var pauseSheet = document.getElementById('pause-sheet');
  var winSheet = document.getElementById('win-sheet');
  var winTimeEl = document.getElementById('win-time');
  var portraitEl = document.getElementById('portrait');
  var statusEl = document.getElementById('status');

  var VIEW_W = 844;
  var VIEW_H = 390;
  var START_FREQ = 0.05;
  var LOCK_TIME = 3;
  var KNOB_COUNT = 3;
  var DRAG = 0.0008;
  var KEY_STEP = 0.0064;
  var KEY_RATE = 0.092;
  var DECAY = 1;
  var DRIFT_LO = 0.12;
  var DRIFT_HI = 0.9;
  var DRIFT_CHASE = 0.04;
  var DRIFT_HOLD = 0.0022;
  var LOCK_SPOTS = [
    { x: 312, y: 132 },
    { x: 312, y: 206 },
    { x: 312, y: 280 }
  ];

  /* Fractions of radio.webp. The painted dial and meter are blank. */
  var RADIO = { x: 352, y: 18, w: 468 };
  var DIAL_U = { x: 0.5162, y: 0.5622, r: 0.1478 };
  var METER_U = { x: 0.8173, y: 0.4392, r: 0.0824 };
  var KNOB_U = { x: 0.8152, y: 0.7389, r: 0.0612 };
  /* trent.webp: six equal frames. Idle 2, tuning 4. Soles share one baseline. */
  var TRENT = { w: 235, h: 513, anchorX: 80, anchorY: 497, idleMs: 480, tuneMs: 160 };
  var sceneImg = new Image();
  var radioImg = new Image();
  var trentImg = new Image();
  sceneImg.src = 'art/scene.webp';
  radioImg.src = 'art/radio.webp';
  trentImg.src = 'art/trent.webp';

  var stations = [
    {
      id: 'canteen',
      name: 'Canteen',
      center: 0.2,
      half: 0.032,
      line: 'Canteen. Laughter and tin cups.'
    },
    {
      id: 'weather',
      name: 'Weather',
      center: 0.41,
      half: 0.026,
      line: 'Weather. Snow overnight, roads quiet.'
    },
    {
      id: 'music',
      name: 'Music box',
      center: 0.61,
      half: 0.022,
      line: 'A music box, thin and far.'
    },
    {
      id: 'santa',
      name: 'Field report',
      center: 0.58,
      half: 0.018,
      line: 'Field voice: Santa has been captured.'
    }
  ];

  var state = 'title';
  var freq = START_FREQ;
  var lockT = 0;
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
  var lastLine = '';
  var knobsLocked = 0;
  var targetFreq = 0.58;
  var driftDir = 1;
  var driftPhase = 0;
  var statusUntil = 0;
  var statusNote = '';

  var keys = new Set();
  var lockHeld = false;
  var lockPointer = 0;
  var tuneDown = false;
  var tuneUp = false;
  var tuneDownId = 0;
  var tuneUpId = 0;
  var dragging = false;
  var dragId = 0;
  var lastDragX = 0;
  var pendingDx = 0;
  var lastFrame = 0;

  var motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

  function reduceMotion() {
    return motionQuery.matches;
  }

  function clamp(v, a, b) {
    if (v < a) return a;
    if (v > b) return b;
    return v;
  }

  function dialNumber(f) {
    return 20 + f * 60;
  }

  function dialAngle(f) {
    var start = 150 * Math.PI / 180;
    var sweep = 240 * Math.PI / 180;
    return start + clamp(f, 0, 1) * sweep;
  }

  function peak(station, f) {
    var d = Math.abs(f - station.center);
    var shoulder = station.half * 2.35;
    var t;
    if (d >= shoulder) return 0;
    if (d <= station.half) return 0.82 + 0.18 * (1 - d / station.half);
    t = (d - station.half) / (shoulder - station.half);
    return 0.82 * (1 - t) * (1 - t);
  }

  function signalAt(f) {
    var i;
    var best = 0;
    var p;
    for (i = 0; i < stations.length; i++) {
      p = peak(stations[i], f);
      if (p > best) best = p;
    }
    return best;
  }

  function currentStation() {
    var i;
    var s;
    var d;
    var best = null;
    if (inReport()) return reportStation();
    for (i = 0; i < stations.length; i++) {
      s = stations[i];
      d = Math.abs(freq - s.center);
      if (d <= s.half && (!best || d < best.d)) best = { d: d, station: s };
    }
    return best ? best.station : null;
  }

  function reportStation() {
    var i;
    for (i = 0; i < stations.length; i++) {
      if (stations[i].id === 'santa') return stations[i];
    }
    return stations[stations.length - 1];
  }

  function inReport() {
    var report = reportStation();
    return Math.abs(freq - report.center) <= report.half;
  }

  function tuneDirection() {
    var d = 0;
    if (tuneDown || keys.has('arrowleft')) d -= 1;
    if (tuneUp || keys.has('arrowright')) d += 1;
    if (d < -1) d = -1;
    if (d > 1) d = 1;
    return d;
  }

  function needleFreq() {
    var s;
    var amount;
    if (reduceMotion()) return freq;
    s = signalAt(freq);
    if (s < 0.08 || s > 0.8) return freq;
    amount = Math.sin(visualTime * 21) * 0.0035 * (1 - s / 0.8);
    amount += Math.sin(visualTime * 34) * 0.0016 * (1 - s / 0.8);
    return clamp(freq + amount, 0, 1);
  }

  function signalWord(s) {
    if (s < 0.08) return 'Quiet';
    if (s < 0.4) return 'Faint';
    if (s < 0.75) return 'Rising';
    return 'Strong';
  }

  function say(text) {
    statusEl.textContent = text;
  }

  function renderHud() {
    var station = currentStation();
    var line = station ? station.line : 'Static. Snow on the aerial.';
    var sig = signalAt(freq);
    var word = signalWord(sig);
    var shownKnob = state === 'win' ? KNOB_COUNT : Math.min(KNOB_COUNT, knobsLocked + 1);
    var lockLine = shownKnob + ' · ' + Math.min(LOCK_TIME, lockT).toFixed(1) + ' / 3s';
    if (hearingEl.textContent !== line) hearingEl.textContent = line;
    if (performance.now() < statusUntil) {
      if (statusEl.textContent !== statusNote) say(statusNote);
    } else if (line !== lastLine) {
      lastLine = line;
      if (state === 'play') say(line);
    }
    if (signalEl.textContent !== word) signalEl.textContent = word;
    if (lockEl.textContent !== lockLine) lockEl.textContent = lockLine;
    signalEl.classList.toggle('hot', sig >= 0.75);
    lockEl.classList.toggle('live', inReport() && state === 'play');
    lockBtn.classList.toggle('ready', inReport() && state === 'play');
    lockBtn.classList.toggle('held', lockHeld);
    lockBtn.setAttribute('aria-pressed', lockHeld ? 'true' : 'false');
  }

  function resetHunt() {
    freq = START_FREQ;
    lockT = 0;
    knobsLocked = 0;
    targetFreq = 0.58;
    driftDir = 1;
    driftPhase = 0;
    statusUntil = 0;
    statusNote = '';
    reportStation().center = targetFreq;
  }

  function announce(text) {
    statusNote = text;
    statusUntil = performance.now() + 2200;
    say(text);
  }

  function beginRun() {
    resetHunt();
    victorySent = false;
    lockHeld = false;
    tuneDown = false;
    tuneUp = false;
    dragging = false;
    pendingDx = 0;
    keys.clear();
    pauseAccum = 0;
    runStart = performance.now();
    lastFrame = runStart;
    lastLine = '';
    state = 'play';
    startSheet.hidden = true;
    pauseSheet.hidden = true;
    winSheet.hidden = true;
    hintEl.hidden = false;
    renderHud();
  }

  function openPause() {
    if (state !== 'play') return;
    pauseBegan = performance.now();
    state = 'pause';
    pauseSheet.hidden = false;
    lockHeld = false;
    tuneDown = false;
    tuneUp = false;
    dragging = false;
    pendingDx = 0;
    keys.clear();
    lockBtn.classList.remove('held');
    lockBtn.setAttribute('aria-pressed', 'false');
  }

  function closePause() {
    if (state !== 'pause') return;
    pauseAccum += performance.now() - pauseBegan;
    state = 'play';
    pauseSheet.hidden = true;
    lastFrame = performance.now();
  }

  function giveUp() {
    if (state !== 'pause') return;
    resetHunt();
    lockHeld = false;
    tuneDown = false;
    tuneUp = false;
    dragging = false;
    pendingDx = 0;
    state = 'title';
    pauseSheet.hidden = true;
    startSheet.hidden = false;
    lastLine = '';
    announce('Gave up. Nothing was locked.');
  }

  function win() {
    var seconds;
    if (state === 'win') return;
    seconds = Math.max(0, Math.round((performance.now() - runStart - pauseAccum) / 1000));
    state = 'win';
    lockT = LOCK_TIME;
    lockHeld = false;
    tuneDown = false;
    tuneUp = false;
    dragging = false;
    pendingDx = 0;
    keys.clear();
    winTimeEl.textContent = 'Tuned in ' + seconds + ' seconds.';
    winSheet.hidden = false;
    say('All three knobs locked. Santa has been taken. ' + seconds + ' seconds.');
    if (!victorySent) {
      victorySent = true;
      window.dispatchEvent(new CustomEvent('night-broadcast:complete', {
        detail: { seconds: seconds }
      }));
      if (window.parent !== window) {
        var relay = { type: 'night-broadcast:complete', detail: { seconds: seconds } };
        try {
          var relayRun = new URLSearchParams(location.search).get('runId');
          if (relayRun) relay.runId = relayRun;
        } catch (ignoreRelay) {}
        window.parent.postMessage(relay, (location.protocol === 'http:' || location.protocol === 'https:') ? location.origin : '*');
      }
    }
  }

  function updateDrift(dt, holding) {
    var speed = holding ? DRIFT_HOLD : DRIFT_CHASE;
    var wobble = holding ? 1 : (0.86 + 0.14 * Math.sin(driftPhase * 1.7));
    driftPhase += dt;
    targetFreq += driftDir * speed * wobble * dt;
    if (targetFreq >= DRIFT_HI) {
      targetFreq = DRIFT_HI;
      driftDir = -1;
    } else if (targetFreq <= DRIFT_LO) {
      targetFreq = DRIFT_LO;
      driftDir = 1;
    }
    reportStation().center = targetFreq;
  }

  function jumpSignal() {
    var dir = freq < 0.5 ? 1 : -1;
    var jump;
    var next;
    if (Math.random() < 0.35) dir = -dir;
    jump = 0.3 + Math.random() * 0.2;
    next = freq + dir * jump;
    if (next < DRIFT_LO + 0.04 || next > DRIFT_HI - 0.04) {
      dir = -dir;
      next = freq + dir * jump;
    }
    targetFreq = clamp(next, DRIFT_LO, DRIFT_HI);
    if (Math.abs(targetFreq - freq) < 0.24) {
      targetFreq = clamp(freq + dir * 0.36, DRIFT_LO, DRIFT_HI);
    }
    driftDir = targetFreq >= freq ? 1 : -1;
    reportStation().center = targetFreq;
  }

  function advanceKnob() {
    knobsLocked += 1;
    lockT = 0;
    if (knobsLocked >= KNOB_COUNT) {
      win();
      return;
    }
    jumpSignal();
    announce('Knob ' + knobsLocked + ' locked. The signal moved.');
  }

  function updateTuning(dt) {
    var moved = false;
    var dir;
    var applied;
    var steady;
    var inside;
    /* Finger noise cancels. A real drag accumulates past the deadzone,
       so a resting thumb can still hold the needle steady. */
    if (!lockHeld) {
      if (Math.abs(pendingDx) >= 1.6) {
        applied = pendingDx;
        freq += applied * DRAG;
        pendingDx = 0;
        moved = true;
      }
      dir = tuneDirection();
      if (dir) {
        freq += dir * KEY_RATE * dt;
        moved = true;
      }
    } else {
      pendingDx = 0;
    }
    freq = clamp(freq, 0, 1);
    steady = !moved;
    inside = inReport();
    updateDrift(dt, steady && inside);
    inside = inReport();
    if (inside && steady) {
      lockT += dt;
      if (lockT >= LOCK_TIME) {
        lockT = LOCK_TIME;
        advanceKnob();
      }
    } else if (!inside) {
      lockT = Math.max(0, lockT - DECAY * dt);
    }
  }

  function imageReady(img) {
    return !!(img && img.complete && img.naturalWidth > 0);
  }

  function radioBox() {
    var w = RADIO.w;
    var h = w * (674 / 947);
    if (imageReady(radioImg)) h = w * radioImg.naturalHeight / radioImg.naturalWidth;
    return { x: RADIO.x, y: RADIO.y, w: w, h: h };
  }

  function radioPoint(u) {
    var box = radioBox();
    return {
      x: box.x + u.x * box.w,
      y: box.y + u.y * box.h,
      r: u.r * box.w
    };
  }

  function knobCenter() {
    return radioPoint(KNOB_U);
  }

  function dialMoving() {
    if (state !== 'play') return false;
    if (dragging) return true;
    return tuneDirection() !== 0;
  }

  function trentIndex() {
    var n;
    if (dialMoving()) {
      if (reduceMotion()) return 2;
      n = Math.floor(visualTime * 1000 / TRENT.tuneMs) % 4;
      return 2 + n;
    }
    if (reduceMotion()) return 0;
    return Math.floor(visualTime * 1000 / TRENT.idleMs) % 2;
  }

  function drawScene() {
    var iw;
    var ih;
    var scale;
    var dw;
    var dh;
    if (!imageReady(sceneImg)) return;
    iw = sceneImg.naturalWidth;
    ih = sceneImg.naturalHeight;
    scale = Math.max(cssW / iw, cssH / ih);
    dw = iw * scale;
    dh = ih * scale;
    ctx.drawImage(sceneImg, (cssW - dw) / 2, (cssH - dh) / 2, dw, dh);
  }

  function drawTrent() {
    var index;
    var destH;
    var s;
    var footX = 200;
    var footY = 356;
    if (!imageReady(trentImg)) return;
    index = trentIndex();
    destH = 248;
    s = destH / TRENT.h;
    ctx.drawImage(
      trentImg,
      index * TRENT.w, 0, TRENT.w, TRENT.h,
      footX - TRENT.anchorX * s,
      footY - TRENT.anchorY * s,
      TRENT.w * s,
      destH
    );
  }

  function drawRadio() {
    var box;
    if (!imageReady(radioImg)) return;
    box = radioBox();
    ctx.drawImage(radioImg, box.x, box.y, box.w, box.h);
  }

  function drawNeedle() {
    var dial = radioPoint(DIAL_U);
    var a = dialAngle(needleFreq());
    var warm = signalAt(freq);
    var hub = Math.max(12, dial.r * 0.28);
    if (warm > 0.05) {
      ctx.beginPath();
      ctx.arc(dial.x, dial.y, dial.r * 0.92, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 196, 110, ' + (warm * 0.18) + ')';
      ctx.fill();
    }
    ctx.strokeStyle = 'rgba(70, 40, 20, 0.28)';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(dial.x + Math.cos(a) * hub + 1, dial.y + Math.sin(a) * hub + 1);
    ctx.lineTo(dial.x + Math.cos(a) * (dial.r * 0.9) + 1, dial.y + Math.sin(a) * (dial.r * 0.9) + 1);
    ctx.stroke();
    ctx.strokeStyle = '#6b3a22';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(dial.x + Math.cos(a) * hub, dial.y + Math.sin(a) * hub);
    ctx.lineTo(dial.x + Math.cos(a) * (dial.r * 0.9), dial.y + Math.sin(a) * (dial.r * 0.9));
    ctx.stroke();
    ctx.lineCap = 'butt';
    ctx.beginPath();
    ctx.arc(dial.x, dial.y, hub * 0.72, 0, Math.PI * 2);
    ctx.fillStyle = '#f6e6c4';
    ctx.fill();
    ctx.strokeStyle = '#8a6230';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#3a2a18';
    ctx.font = '800 ' + Math.max(11, Math.round(dial.r * 0.18)) + 'px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(dialNumber(freq).toFixed(1), dial.x, dial.y + 1);
  }

  function drawMeter() {
    var meter = radioPoint(METER_U);
    var strength = signalAt(needleFreq());
    var a = Math.PI + Math.PI * clamp(strength, 0, 1);
    var len = meter.r * 0.92;
    ctx.strokeStyle = '#f6e2bc';
    ctx.lineWidth = Math.max(2, meter.r * 0.07);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(meter.x, meter.y);
    ctx.lineTo(meter.x + Math.cos(a) * len, meter.y + Math.sin(a) * len);
    ctx.stroke();
    ctx.lineCap = 'butt';
    ctx.beginPath();
    ctx.arc(meter.x, meter.y, Math.max(2.4, meter.r * 0.09), 0, Math.PI * 2);
    ctx.fillStyle = '#f6e2bc';
    ctx.fill();
  }

  function drawKnobCue() {
    var knob = knobCenter();
    var a = dialAngle(freq);
    var ring = knob.r + 8;
    if (lockT > 0) {
      ctx.beginPath();
      ctx.arc(
        knob.x,
        knob.y,
        ring,
        -Math.PI / 2,
        -Math.PI / 2 + (Math.min(lockT, LOCK_TIME) / LOCK_TIME) * Math.PI * 2
      );
      ctx.strokeStyle = '#fff1c9';
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.stroke();
      ctx.lineCap = 'butt';
    }
    ctx.strokeStyle = '#fff6e4';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(knob.x + Math.cos(a) * (knob.r * 0.2), knob.y + Math.sin(a) * (knob.r * 0.2));
    ctx.lineTo(knob.x + Math.cos(a) * (knob.r * 0.72), knob.y + Math.sin(a) * (knob.r * 0.72));
    ctx.stroke();
    ctx.lineCap = 'butt';
  }

  function drawLockKnobs() {
    var i;
    var spot;
    var r = 22;
    var locked;
    var active;
    for (i = 0; i < KNOB_COUNT; i++) {
      spot = LOCK_SPOTS[i];
      locked = i < knobsLocked;
      active = !locked && i === knobsLocked;
      ctx.beginPath();
      ctx.arc(spot.x + 2, spot.y + 3, r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(8, 12, 20, 0.35)';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(spot.x, spot.y, r, 0, Math.PI * 2);
      if (locked) ctx.fillStyle = '#e6c07a';
      else if (active) ctx.fillStyle = '#f3e2c0';
      else ctx.fillStyle = 'rgba(90, 70, 48, 0.78)';
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = locked || active ? '#fff1c9' : '#6b5340';
      ctx.stroke();
      if (locked) {
        ctx.beginPath();
        ctx.arc(spot.x, spot.y, r + 6, 0, Math.PI * 2);
        ctx.strokeStyle = '#fff1c9';
        ctx.lineWidth = 3;
        ctx.stroke();
      } else if (active && lockT > 0 && state !== 'title') {
        ctx.beginPath();
        ctx.arc(
          spot.x,
          spot.y,
          r + 6,
          -Math.PI / 2,
          -Math.PI / 2 + (Math.min(lockT, LOCK_TIME) / LOCK_TIME) * Math.PI * 2
        );
        ctx.strokeStyle = '#fff1c9';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.stroke();
        ctx.lineCap = 'butt';
      }
      ctx.strokeStyle = locked ? '#3a2a18' : '#fff6e4';
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(spot.x, spot.y - r * 0.42);
      ctx.lineTo(spot.x, spot.y - r * 0.78);
      ctx.stroke();
      ctx.lineCap = 'butt';
      ctx.fillStyle = locked || active ? '#3a2a18' : '#f7f4ec';
      ctx.font = '800 16px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(i + 1), spot.x, spot.y + 5);
    }
  }

  function drawVignette() {
    var v = ctx.createRadialGradient(cssW * 0.5, cssH * 0.45, cssW * 0.2, cssW * 0.5, cssH * 0.5, cssW * 0.72);
    v.addColorStop(0, 'rgba(0, 0, 0, 0)');
    v.addColorStop(1, 'rgba(4, 10, 20, 0.42)');
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, cssW, cssH);
  }

  function render() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssW, cssH);
    drawScene();
    ctx.setTransform(dpr * view.s, 0, 0, dpr * view.s, dpr * view.ox, dpr * view.oy);
    drawTrent();
    drawRadio();
    drawNeedle();
    drawMeter();
    drawKnobCue();
    drawLockKnobs();
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

  function knobHitRadius() {
    return Math.max(knobCenter().r + 22, 48 / view.s);
  }

  function loop(now) {
    var dt = (now - lastFrame) / 1000;
    lastFrame = now;
    if (dt < 0) dt = 0;
    if (dt > 0.05) dt = 0.05;
    if (!reduceMotion() && state !== 'pause') visualTime += dt;
    if (state === 'play') updateTuning(dt);
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

  canvas.addEventListener('pointerdown', function (event) {
    var p;
    var dx;
    var dy;
    var hit;
    var knob;
    if (event.button !== 0) return;
    if (state !== 'play') return;
    knob = knobCenter();
    p = designPoint(event);
    dx = p.x - knob.x;
    dy = p.y - knob.y;
    hit = knobHitRadius();
    if (dx * dx + dy * dy > hit * hit) return;
    event.preventDefault();
    dragging = true;
    dragId = event.pointerId;
    lastDragX = p.x;
    pendingDx = 0;
    hintEl.hidden = true;
    if (canvas.setPointerCapture) canvas.setPointerCapture(event.pointerId);
  });

  window.addEventListener('pointermove', function (event) {
    var p;
    if (!dragging || event.pointerId !== dragId) return;
    p = designPoint(event);
    pendingDx += p.x - lastDragX;
    lastDragX = p.x;
  });

  function endDrag(event) {
    if (!dragging || event.pointerId !== dragId) return;
    dragging = false;
    dragId = 0;
    pendingDx = 0;
  }

  window.addEventListener('pointerup', endDrag);
  window.addEventListener('pointercancel', endDrag);
  canvas.addEventListener('contextmenu', function (event) { event.preventDefault(); });

  function bindTune(button, sign) {
    button.addEventListener('pointerdown', function (event) {
      if (event.button !== 0) return;
      event.preventDefault();
      if (sign < 0) {
        tuneDown = true;
        tuneDownId = event.pointerId;
      } else {
        tuneUp = true;
        tuneUpId = event.pointerId;
      }
      if (state === 'play' && !lockHeld) {
        freq = clamp(freq + sign * KEY_STEP, 0, 1);
        hintEl.hidden = true;
      }
      if (button.setPointerCapture) button.setPointerCapture(event.pointerId);
    });
    function release(event) {
      if (sign < 0) {
        if (event.pointerId !== tuneDownId) return;
        tuneDown = false;
      } else {
        if (event.pointerId !== tuneUpId) return;
        tuneUp = false;
      }
    }
    button.addEventListener('pointerup', release);
    button.addEventListener('pointercancel', release);
    button.addEventListener('contextmenu', function (event) { event.preventDefault(); });
  }

  bindTune(tuneDownBtn, -1);
  bindTune(tuneUpBtn, 1);

  lockBtn.addEventListener('pointerdown', function (event) {
    if (event.button !== 0) return;
    event.preventDefault();
    lockHeld = true;
    lockPointer = event.pointerId;
    hintEl.hidden = true;
    if (lockBtn.setPointerCapture) lockBtn.setPointerCapture(event.pointerId);
  });
  function releaseLock(event) {
    if (event.pointerId !== lockPointer) return;
    lockHeld = false;
    lockPointer = 0;
  }
  lockBtn.addEventListener('pointerup', releaseLock);
  lockBtn.addEventListener('pointercancel', releaseLock);
  lockBtn.addEventListener('contextmenu', function (event) { event.preventDefault(); });

  window.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') {
      event.preventDefault();
      if (state === 'play') openPause();
      else if (state === 'pause') closePause();
      return;
    }
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    if (event.repeat) return;
    keys.add(event.key.toLowerCase());
    if (state === 'play' && !lockHeld) {
      freq = clamp(freq + (event.key === 'ArrowLeft' ? -KEY_STEP : KEY_STEP), 0, 1);
      hintEl.hidden = true;
    }
  });

  window.addEventListener('keyup', function (event) {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      keys.delete(event.key.toLowerCase());
    }
  });

  window.addEventListener('blur', function () {
    keys.clear();
    lockHeld = false;
    tuneDown = false;
    tuneUp = false;
    dragging = false;
    pendingDx = 0;
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
  lastFrame = performance.now();
  requestAnimationFrame(loop);
})();
