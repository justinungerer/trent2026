/* Chapter 1 — The Night Broadcast.
   A few months after D-Day, near Christmas. Tune a field radio
   and hold the narrow station that says Santa has been captured.
   Original Canvas 2D art. No assets and no network.

   Dial numbers run from 20 to 80. The report sits on 70.
   A sweep finds it. Three still seconds inside that band lock
   the set. A second try, once the band is known, stays under
   two minutes. */
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
  var DRAG = 0.0004;
  var KEY_STEP = 0.0032;
  var KEY_RATE = 0.046;
  var DECAY = 1;

  var DIAL = { x: 430, y: 162, r: 74 };
  var KNOB = { x: 568, y: 252, r: 34 };
  var METER = { x: 624, y: 136, r: 36 };
  var CASE = { x: 248, y: 56, w: 468, h: 272, r: 26 };

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
      center: 0.8333,
      half: 0.0115,
      line: 'Field voice: Santa has been captured.'
    }
  ];

  var stars = buildStars();
  var flakes = buildFlakes();

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
  var portraitDismissed = false;
  var lastLine = '';

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
  var portraitQuery = window.matchMedia('(orientation: portrait)');

  function reduceMotion() {
    return motionQuery.matches;
  }

  function clamp(v, a, b) {
    if (v < a) return a;
    if (v > b) return b;
    return v;
  }

  function buildStars() {
    var list = [];
    var i;
    for (i = 0; i < 42; i++) {
      list.push({
        x: ((i * 97) % 1000) / 1000,
        y: ((i * 53) % 420) / 1000,
        r: 0.8 + (i % 3) * 0.45,
        a: 0.35 + (i % 5) * 0.1
      });
    }
    return list;
  }

  function buildFlakes() {
    var list = [];
    var i;
    for (i = 0; i < 46; i++) {
      list.push({
        x: ((i * 73) % 1000) / 1000,
        y: ((i * 41) % 1000) / 1000,
        r: 1.1 + (i % 4) * 0.55,
        s: 0.028 + (i % 5) * 0.012,
        a: 0.35 + (i % 4) * 0.12
      });
    }
    return list;
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

  function glowAmount() {
    if (reduceMotion()) return 1;
    return 0.9 + Math.sin(visualTime * 6.2) * 0.05 + Math.sin(visualTime * 13.1) * 0.035;
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
    var lockLine = Math.min(LOCK_TIME, lockT).toFixed(1) + ' / 3s';
    if (hearingEl.textContent !== line) hearingEl.textContent = line;
    if (line !== lastLine) {
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

  function beginRun() {
    freq = START_FREQ;
    lockT = 0;
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
    freq = START_FREQ;
    lockT = 0;
    lockHeld = false;
    tuneDown = false;
    tuneUp = false;
    dragging = false;
    pendingDx = 0;
    state = 'title';
    pauseSheet.hidden = true;
    startSheet.hidden = false;
    lastLine = '';
    say('Gave up. Nothing was locked.');
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
    say('Santa has been taken. ' + seconds + ' seconds.');
    if (!victorySent) {
      victorySent = true;
      window.dispatchEvent(new CustomEvent('night-broadcast:complete', {
        detail: { seconds: seconds }
      }));
    }
  }

  function updateTuning(dt) {
    var moved = false;
    var dir;
    var applied;
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
    if (inReport() && !moved) {
      lockT += dt;
      if (lockT >= LOCK_TIME) {
        lockT = LOCK_TIME;
        win();
      }
    } else if (!inReport()) {
      lockT = Math.max(0, lockT - DECAY * dt);
    }
  }

  function roundRect(x, y, w, h, r) {
    var rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }

  function drawBackdrop() {
    var g = ctx.createLinearGradient(0, 0, 0, cssH);
    var i;
    var flake;
    var y;
    g.addColorStop(0, '#071422');
    g.addColorStop(0.55, '#14304e');
    g.addColorStop(1, '#1a3c56');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, cssW, cssH);

    for (i = 0; i < stars.length; i++) {
      ctx.globalAlpha = stars[i].a;
      ctx.fillStyle = '#f4f7fb';
      ctx.beginPath();
      ctx.arc(stars[i].x * cssW, stars[i].y * cssH * 0.62, stars[i].r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    ctx.fillStyle = 'rgba(232, 238, 246, 0.92)';
    ctx.beginPath();
    ctx.arc(cssW * 0.62, cssH * 0.16, Math.max(18, cssH * 0.055), 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(20, 48, 78, 0.35)';
    ctx.beginPath();
    ctx.arc(cssW * 0.633, cssH * 0.145, Math.max(16, cssH * 0.048), 0, Math.PI * 2);
    ctx.fill();

    for (i = 0; i < flakes.length; i++) {
      flake = flakes[i];
      y = reduceMotion() ? flake.y : (flake.y + visualTime * flake.s) % 1;
      ctx.globalAlpha = flake.a;
      ctx.fillStyle = '#f7fbff';
      ctx.beginPath();
      ctx.arc(flake.x * cssW, y * cssH, flake.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawHills() {
    ctx.beginPath();
    ctx.moveTo(-180, 280);
    ctx.quadraticCurveTo(80, 210, 240, 250);
    ctx.quadraticCurveTo(420, 292, 620, 236);
    ctx.quadraticCurveTo(820, 188, 1060, 250);
    ctx.lineTo(1060, 340);
    ctx.lineTo(-180, 340);
    ctx.closePath();
    ctx.fillStyle = '#1a3348';
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(-180, 300);
    ctx.quadraticCurveTo(160, 250, 340, 286);
    ctx.quadraticCurveTo(560, 324, 780, 268);
    ctx.quadraticCurveTo(920, 246, 1100, 292);
    ctx.lineTo(1100, 360);
    ctx.lineTo(-180, 360);
    ctx.closePath();
    ctx.fillStyle = '#243e56';
    ctx.fill();
  }

  function drawTree(x, y, h) {
    var g;
    ctx.fillStyle = '#14202c';
    ctx.fillRect(x - 4, y + h * 0.72, 8, h * 0.28);
    g = ctx.createLinearGradient(x, y, x, y + h);
    g.addColorStop(0, '#1e4a46');
    g.addColorStop(1, '#102824');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + h * 0.38, y + h * 0.78);
    ctx.lineTo(x - h * 0.38, y + h * 0.78);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(236, 244, 250, 0.78)';
    ctx.beginPath();
    ctx.moveTo(x, y + 6);
    ctx.lineTo(x + h * 0.12, y + h * 0.22);
    ctx.lineTo(x - h * 0.1, y + h * 0.2);
    ctx.closePath();
    ctx.fill();
  }

  function drawTent() {
    var glow = ctx.createRadialGradient(118, 188, 4, 118, 196, 46);
    glow.addColorStop(0, 'rgba(255, 196, 110, 0.95)');
    glow.addColorStop(1, 'rgba(255, 160, 70, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(118, 196, 46, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#1c2c3e';
    ctx.beginPath();
    ctx.moveTo(78, 268);
    ctx.lineTo(132, 168);
    ctx.lineTo(196, 268);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#2a4158';
    ctx.beginPath();
    ctx.moveTo(132, 168);
    ctx.lineTo(196, 268);
    ctx.lineTo(168, 268);
    ctx.lineTo(132, 188);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#0e1824';
    ctx.beginPath();
    ctx.moveTo(118, 214);
    ctx.lineTo(146, 268);
    ctx.lineTo(108, 268);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#ffd7a2';
    ctx.fillRect(122, 232, 6, 22);
    ctx.beginPath();
    ctx.arc(125, 230, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#ffb15a';
    ctx.fill();
  }

  function drawGround() {
    var g = ctx.createLinearGradient(0, 280, 0, 520);
    g.addColorStop(0, '#f7fbff');
    g.addColorStop(0.35, '#e4eef6');
    g.addColorStop(1, '#c5d4e2');
    ctx.beginPath();
    ctx.moveTo(-220, 520);
    ctx.lineTo(-220, 318);
    ctx.quadraticCurveTo(80, 292, 220, 314);
    ctx.quadraticCurveTo(400, 336, 560, 304);
    ctx.quadraticCurveTo(740, 278, 980, 312);
    ctx.lineTo(1100, 520);
    ctx.closePath();
    ctx.fillStyle = g;
    ctx.fill();
  }

  function drawTrent() {
    ctx.fillStyle = '#6a4630';
    roundRect(96, 268, 108, 46, 8);
    ctx.fill();
    ctx.fillStyle = '#8a6244';
    roundRect(102, 272, 96, 10, 4);
    ctx.fill();

    ctx.fillStyle = '#241910';
    roundRect(112, 300, 22, 16, 4);
    ctx.fill();
    roundRect(164, 302, 24, 16, 4);
    ctx.fill();

    ctx.fillStyle = '#2a3c54';
    roundRect(118, 248, 28, 58, 8);
    ctx.fill();
    roundRect(158, 246, 30, 60, 8);
    ctx.fill();

    var coat = ctx.createLinearGradient(108, 180, 210, 270);
    coat.addColorStop(0, '#3d5674');
    coat.addColorStop(0.45, '#2a3e58');
    coat.addColorStop(1, '#1c2c40');
    ctx.fillStyle = coat;
    roundRect(112, 186, 96, 92, 28);
    ctx.fill();

    ctx.strokeStyle = 'rgba(232, 214, 180, 0.35)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(160, 196);
    ctx.quadraticCurveTo(154, 230, 162, 268);
    ctx.stroke();

    ctx.fillStyle = '#8f3d3a';
    roundRect(128, 196, 58, 14, 7);
    ctx.fill();
    ctx.fillStyle = '#f0d2c0';
    roundRect(176, 206, 18, 28, 8);
    ctx.fill();

    ctx.fillStyle = '#f0c2a0';
    ctx.beginPath();
    ctx.arc(158, 158, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(214, 112, 102, 0.35)';
    ctx.beginPath();
    ctx.arc(170, 164, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#2a2118';
    ctx.beginPath();
    ctx.arc(164, 156, 1.6, 0, Math.PI * 2);
    ctx.arc(172, 156, 1.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#8a5a48';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(169, 164, 5, 0.2, 1.1);
    ctx.stroke();

    ctx.fillStyle = '#24364c';
    ctx.beginPath();
    ctx.arc(156, 148, 20, Math.PI, 0);
    ctx.fill();
    ctx.fillRect(138, 146, 38, 8);
    ctx.beginPath();
    ctx.arc(136, 140, 7, 0, Math.PI * 2);
    ctx.fillStyle = '#8f3d3a';
    ctx.fill();

    ctx.fillStyle = '#c4d0dc';
    roundRect(186, 214, 16, 12, 4);
    ctx.fill();
  }

  function drawGlow() {
    var a = 0.28 * glowAmount();
    var g = ctx.createRadialGradient(DIAL.x, DIAL.y, 8, DIAL.x, DIAL.y + 10, 210);
    g.addColorStop(0, 'rgba(255, 210, 140, ' + a + ')');
    g.addColorStop(1, 'rgba(255, 180, 80, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(DIAL.x, DIAL.y, 210, 0, Math.PI * 2);
    ctx.fill();
  }

  function screw(x, y) {
    ctx.beginPath();
    ctx.arc(x, y, 4.5, 0, Math.PI * 2);
    ctx.fillStyle = '#5a4124';
    ctx.fill();
    ctx.strokeStyle = '#f0d7a4';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x - 2.4, y);
    ctx.lineTo(x + 2.4, y);
    ctx.stroke();
  }

  function drawCase() {
    var g = ctx.createLinearGradient(CASE.x, CASE.y, CASE.x + CASE.w, CASE.y + CASE.h);
    g.addColorStop(0, '#f3ddb0');
    g.addColorStop(0.42, '#d7a45a');
    g.addColorStop(1, '#8a5c2c');
    ctx.fillStyle = 'rgba(20, 16, 12, 0.35)';
    roundRect(CASE.x + 10, CASE.y + 16, CASE.w, CASE.h, CASE.r);
    ctx.fill();
    ctx.fillStyle = g;
    roundRect(CASE.x, CASE.y, CASE.w, CASE.h, CASE.r);
    ctx.fill();

    ctx.fillStyle = '#6e4e2c';
    roundRect(CASE.x + 28, CASE.y - 16, 108, 22, 8);
    ctx.fill();
    ctx.fillStyle = '#c4a15a';
    ctx.fillRect(CASE.x + 46, CASE.y - 8, 8, 14);
    ctx.fillRect(CASE.x + 110, CASE.y - 8, 8, 14);

    var face = ctx.createLinearGradient(CASE.x, CASE.y, CASE.x, CASE.y + CASE.h);
    face.addColorStop(0, '#5c4630');
    face.addColorStop(1, '#2e2418');
    ctx.fillStyle = face;
    roundRect(CASE.x + 16, CASE.y + 18, CASE.w - 32, CASE.h - 34, 18);
    ctx.fill();

    screw(CASE.x + 28, CASE.y + 28);
    screw(CASE.x + CASE.w - 28, CASE.y + 28);
    screw(CASE.x + 28, CASE.y + CASE.h - 28);
    screw(CASE.x + CASE.w - 28, CASE.y + CASE.h - 28);

    ctx.fillStyle = '#1a140e';
    roundRect(268, 124, 70, 118, 12);
    ctx.fill();
    ctx.strokeStyle = '#6e5840';
    ctx.lineWidth = 3;
    var row;
    for (row = 0; row < 6; row++) {
      ctx.beginPath();
      ctx.moveTo(280, 142 + row * 16);
      ctx.lineTo(326, 142 + row * 16);
      ctx.stroke();
    }
  }

  function drawDial() {
    var bezel = ctx.createLinearGradient(DIAL.x - DIAL.r, DIAL.y - DIAL.r, DIAL.x + DIAL.r, DIAL.y + DIAL.r);
    bezel.addColorStop(0, '#f6e4bc');
    bezel.addColorStop(0.5, '#c4924a');
    bezel.addColorStop(1, '#6e4c28');
    ctx.beginPath();
    ctx.arc(DIAL.x, DIAL.y, DIAL.r + 8, 0, Math.PI * 2);
    ctx.fillStyle = bezel;
    ctx.fill();

    var face = ctx.createRadialGradient(DIAL.x - 10, DIAL.y - 28, 8, DIAL.x, DIAL.y, DIAL.r);
    face.addColorStop(0, '#fff6df');
    face.addColorStop(0.6, '#f0d3a4');
    face.addColorStop(1, '#e2bc82');
    ctx.beginPath();
    ctx.arc(DIAL.x, DIAL.y, DIAL.r, 0, Math.PI * 2);
    ctx.fillStyle = face;
    ctx.fill();

    var n;
    var f;
    var a;
    var inner;
    var outer;
    for (n = 20; n <= 80; n += 2) {
      f = (n - 20) / 60;
      a = dialAngle(f);
      inner = n % 10 === 0 ? DIAL.r - 16 : DIAL.r - 9;
      outer = DIAL.r - 3;
      ctx.beginPath();
      ctx.moveTo(DIAL.x + Math.cos(a) * inner, DIAL.y + Math.sin(a) * inner);
      ctx.lineTo(DIAL.x + Math.cos(a) * outer, DIAL.y + Math.sin(a) * outer);
      ctx.strokeStyle = n % 10 === 0 ? '#3a2a18' : '#8a6a3e';
      ctx.lineWidth = n % 10 === 0 ? 2 : 1;
      ctx.stroke();
      if (n % 10 === 0) {
        ctx.fillStyle = '#3a2a18';
        ctx.font = '700 13px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(n), DIAL.x + Math.cos(a) * (DIAL.r - 30), DIAL.y + Math.sin(a) * (DIAL.r - 30));
      }
    }

    a = dialAngle(needleFreq());
    ctx.save();
    ctx.strokeStyle = 'rgba(70, 40, 20, 0.28)';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(DIAL.x + Math.cos(a) * 26 + 1, DIAL.y + Math.sin(a) * 26 + 1);
    ctx.lineTo(DIAL.x + Math.cos(a) * (DIAL.r - 12) + 1, DIAL.y + Math.sin(a) * (DIAL.r - 12) + 1);
    ctx.stroke();
    ctx.strokeStyle = '#6b3a22';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(DIAL.x + Math.cos(a) * 26, DIAL.y + Math.sin(a) * 26);
    ctx.lineTo(DIAL.x + Math.cos(a) * (DIAL.r - 12), DIAL.y + Math.sin(a) * (DIAL.r - 12));
    ctx.stroke();
    ctx.restore();

    ctx.beginPath();
    ctx.arc(DIAL.x, DIAL.y, 20, 0, Math.PI * 2);
    ctx.fillStyle = '#f6e6c4';
    ctx.fill();
    ctx.strokeStyle = '#8a6230';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#3a2a18';
    ctx.font = '800 12px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(dialNumber(freq).toFixed(1), DIAL.x, DIAL.y + 1);

    ctx.beginPath();
    ctx.arc(DIAL.x, DIAL.y, DIAL.r - 1, Math.PI * 1.15, Math.PI * 1.7);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.lineWidth = 4;
    ctx.stroke();

    var warm = signalAt(freq);
    if (warm > 0.05) {
      ctx.beginPath();
      ctx.arc(DIAL.x, DIAL.y, DIAL.r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 196, 110, ' + (warm * 0.16) + ')';
      ctx.fill();
    }
  }

  function drawMeter() {
    var strength = signalAt(needleFreq());
    var a;
    var g = ctx.createLinearGradient(METER.x - METER.r, METER.y, METER.x + METER.r, METER.y + 20);
    g.addColorStop(0, '#f6e6c4');
    g.addColorStop(1, '#d7b072');
    ctx.beginPath();
    ctx.arc(METER.x, METER.y, METER.r + 8, Math.PI, 0);
    ctx.lineTo(METER.x + METER.r + 8, METER.y + 16);
    ctx.lineTo(METER.x - METER.r - 8, METER.y + 16);
    ctx.closePath();
    ctx.fillStyle = g;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(METER.x, METER.y, METER.r, Math.PI, 0);
    ctx.fillStyle = '#2a2118';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(METER.x, METER.y, METER.r - 6, Math.PI, 0);
    ctx.strokeStyle = '#f0d7a4';
    ctx.lineWidth = 3;
    ctx.stroke();

    a = Math.PI + Math.PI * clamp(strength, 0, 1);
    ctx.strokeStyle = '#f4e2bc';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(METER.x, METER.y);
    ctx.lineTo(METER.x + Math.cos(a) * (METER.r - 12), METER.y + Math.sin(a) * (METER.r - 12));
    ctx.stroke();
    ctx.lineCap = 'butt';
    ctx.beginPath();
    ctx.arc(METER.x, METER.y, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = '#f4e2bc';
    ctx.fill();

    ctx.fillStyle = '#f6e6c4';
    ctx.font = '700 10px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('SIGNAL', METER.x, METER.y + 12);
  }

  function drawKnob() {
    var a = dialAngle(freq);
    var ring = KNOB.r + 16;
    var i;
    var t;
    var g = ctx.createLinearGradient(KNOB.x - KNOB.r, KNOB.y - KNOB.r, KNOB.x + KNOB.r, KNOB.y + KNOB.r);
    g.addColorStop(0, '#f8e7c4');
    g.addColorStop(0.5, '#d7a45a');
    g.addColorStop(1, '#7a5428');

    ctx.beginPath();
    ctx.arc(KNOB.x, KNOB.y, ring, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(90, 60, 28, 0.45)';
    ctx.lineWidth = 5;
    ctx.stroke();

    if (lockT > 0) {
      ctx.beginPath();
      ctx.arc(
        KNOB.x,
        KNOB.y,
        ring,
        -Math.PI / 2,
        -Math.PI / 2 + (Math.min(lockT, LOCK_TIME) / LOCK_TIME) * Math.PI * 2
      );
      ctx.strokeStyle = '#fff1c9';
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.stroke();
      ctx.lineCap = 'butt';
    }

    ctx.beginPath();
    ctx.arc(KNOB.x + 2, KNOB.y + 3, KNOB.r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(20, 14, 8, 0.35)';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(KNOB.x, KNOB.y, KNOB.r, 0, Math.PI * 2);
    ctx.fillStyle = g;
    ctx.fill();

    ctx.strokeStyle = '#6e4c28';
    ctx.lineWidth = 2;
    for (i = 0; i < 18; i++) {
      t = (i / 18) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(KNOB.x + Math.cos(t) * (KNOB.r - 7), KNOB.y + Math.sin(t) * (KNOB.r - 7));
      ctx.lineTo(KNOB.x + Math.cos(t) * (KNOB.r - 1), KNOB.y + Math.sin(t) * (KNOB.r - 1));
      ctx.stroke();
    }

    ctx.strokeStyle = '#fff6e4';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(KNOB.x + Math.cos(a) * 8, KNOB.y + Math.sin(a) * 8);
    ctx.lineTo(KNOB.x + Math.cos(a) * (KNOB.r - 8), KNOB.y + Math.sin(a) * (KNOB.r - 8));
    ctx.stroke();
    ctx.lineCap = 'butt';
  }

  function drawLamp() {
    var a = glowAmount();
    ctx.beginPath();
    ctx.arc(DIAL.x, CASE.y + 8, 10, 0, Math.PI * 2);
    ctx.fillStyle = '#6e4c28';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(DIAL.x, CASE.y + 8, 6, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 214, 150, ' + (0.75 + a * 0.25) + ')';
    ctx.fill();
  }

  function drawWorld() {
    drawHills();
    drawTree(800, 148, 146);
    drawTree(868, 176, 112);
    drawTent();
    drawGround();
    drawTrent();
    drawGlow();
    drawCase();
    drawDial();
    drawMeter();
    drawKnob();
    drawLamp();
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
    drawBackdrop();
    ctx.setTransform(dpr * view.s, 0, 0, dpr * view.s, dpr * view.ox, dpr * view.oy);
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

  function knobHitRadius() {
    return Math.max(KNOB.r + 22, 48 / view.s);
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
    return portraitQuery.matches || window.innerHeight > window.innerWidth + 20;
  }

  function syncPortrait() {
    var show = portraitWanted() && !portraitDismissed;
    var wasShowing = !portraitEl.hidden;
    portraitEl.hidden = !show;
    if (show && !wasShowing && state === 'play') openPause();
  }

  canvas.addEventListener('pointerdown', function (event) {
    var p;
    var dx;
    var dy;
    var hit;
    if (event.button !== 0) return;
    if (state !== 'play') return;
    p = designPoint(event);
    dx = p.x - KNOB.x;
    dy = p.y - KNOB.y;
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
