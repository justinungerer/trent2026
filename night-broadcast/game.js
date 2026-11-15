/* Chapter 1 — The Night Broadcast.
   Five stations drift on the dial. Each signal marker moves at
   MARKER_SPEED (4× the old 0.04 chase) and reverses on its own.
   Stay inside a station's strong zone for STRONG_HOLD seconds and
   a red band appears on that station. It stays hidden until then.
   Hold Lock and keep the needle inside the red band until LOCK_TIME
   fills. Lock works on every station. Only the field report
   (id "santa") wins. The correct station is fixed, not rolled.
   A lock on any other station shows "wrong station".
   Painted sprites live in art/. The needle, meter, markers, and
   bands are canvas overlays. No network. */
'use strict';

(function () {
  var canvas = document.getElementById('radio');
  var ctx = canvas.getContext('2d');
  var hearingEl = document.getElementById('hearing');
  var signalEl = document.getElementById('signal');
  var lockEl = document.getElementById('lock');
  var timerLabel = document.getElementById('timer-label');
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
  var variant = new URLSearchParams(location.search).get('stage');
  var calibration = variant === 'find-the-carrier';
  var confirmDispatch = variant === 'confirm-the-dispatch';
  var targets = calibration ? ['weather', 'music'] : confirmDispatch ? ['birch', 'lantern'] : ['santa'];
  var targetIndex = 0;

  var VIEW_W = 844;
  var VIEW_H = 390;
  var START_FREQ = 0.05;
  /* Seconds of continuous strong signal before the red band is drawn. */
  var STRONG_HOLD = 1;
  /* Seconds inside the red band while Lock is held. Slips unwind at DECAY. */
  var LOCK_TIME = 3;
  var DECAY = 1;
  /* Frequency units per second. The old chase drift was 0.04. */
  var MARKER_SPEED = 0.16;
  var STATION_SPEED_SCALE = 0.75;
  var TURN_LO = 1.7;
  var TURN_HI = 3.5;
  var EDGE_LO = 0.1;
  var EDGE_HI = 0.9;
  var STRONG_HALF = 0.08;
  var RED_HALF = (0.045 + (window.TrentMissionBonus || 0) * 0.009) * 1.3;
  var DRAG = 0.0008;
  var KEY_STEP = 0.008;
  var KEY_RATE = 0.26;
  var NOTE_MS = 2400;

  var RADIO = { x: 352, y: 18, w: 468 };
  var DIAL_U = { x: 0.5162, y: 0.5622, r: 0.1478 };
  var METER_U = { x: 0.8173, y: 0.4392, r: 0.0824 };
  var KNOB_U = { x: 0.8152, y: 0.7389, r: 0.0612 };
  var TRENT = { w: 235, h: 513, anchorX: 80, anchorY: 497, idleMs: 480, tuneMs: 160 };
  var sceneImg = new Image();
  var radioImg = new Image();
  var trentImg = new Image();
  var spoolImg = new Image();
  if (calibration || confirmDispatch) spoolImg.src = 'art/painted-spool.webp';
  sceneImg.src = calibration ? 'art/carrier-tent.webp' :
    confirmDispatch ? 'art/relay-shelter.webp' : 'art/scene.webp';
  radioImg.src = 'art/radio.webp';
  trentImg.src = 'art/trent.webp';

  /* correct is only the field report. Chosen by id, every run. */
  var stations = [
    { id: 'canteen', name: 'Canteen', line: 'Canteen. Laughter and tin cups.', home: 0.16, homeDir: 1, speedScale: 1, correct: false },
    { id: 'weather', name: 'Weather', line: 'Weather. Snow overnight, roads quiet.', home: 0.34, homeDir: -1, speedScale: 0.9, correct: false },
    { id: 'music', name: 'Music box', line: 'A music box, thin and far.', home: 0.5, homeDir: 1, speedScale: 1.15, correct: false },
    { id: 'chapel', name: 'Chapel', line: 'Chapel. A hymn under the wind.', home: 0.66, homeDir: -1, speedScale: 0.95, correct: false },
    { id: 'santa', name: 'Field report', line: 'Field voice: Santa has been captured.', home: 0.84, homeDir: 1, speedScale: 1.08, correct: true }
  ];
  if (confirmDispatch) {
    stations.splice(2, 1,
      { id: 'birch', name: 'Birch', line: 'Birch. Ready to authenticate.', home: 0.47, homeDir: 1, speedScale: 0.85 },
      { id: 'lantern', name: 'Lantern', line: 'Lantern. Dispatch acknowledged.', home: 0.6, homeDir: -1, speedScale: 1.0 });
  }
  if (calibration || confirmDispatch) {
    document.getElementById('radio-stage-title').textContent = calibration ? 'Find the Carrier' : 'Confirm the Dispatch';
    var instructions = document.getElementById('radio-stage-instructions');
    instructions.textContent = calibration
      ? 'Tune Weather and Music box in order. Hold each strong signal until it registers.'
      : 'Tune the call sign shown on the dispatch readout and lock it. A second call sign appears after the first lock.';
    document.getElementById('standard-lock-instructions').hidden = calibration;
    document.getElementById('field-report-instructions').hidden = true;
    document.getElementById('radio-win-title').textContent = calibration ? 'Carrier calibrated' : 'Dispatch confirmed';
    document.getElementById('radio-win-copy').textContent = calibration
      ? 'Both calibration signals came through.' : 'Both Allied calls acknowledged the dispatch.';
    lockBtn.hidden = calibration;
  }

  var state = 'title';
  var freq = START_FREQ;
  var strongT = 0;
  var lockT = 0;
  var chargeId = null;
  var bandId = null;
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

  function stationById(id) {
    var i;
    for (i = 0; i < stations.length; i++) {
      if (stations[i].id === id) return stations[i];
    }
    return null;
  }

  function insideHalf(station, f, half) {
    return !!station && Math.abs(f - station.center) <= half;
  }

  function strongestInside() {
    var i;
    var s;
    var d;
    var best = null;
    var bestD = 1;
    for (i = 0; i < stations.length; i++) {
      s = stations[i];
      d = Math.abs(freq - s.center);
      if (d <= s.half && d < bestD) {
        bestD = d;
        best = s;
      }
    }
    return best;
  }

  function heardStation() {
    var band = stationById(bandId);
    if (insideHalf(band, freq, band ? band.half : 0)) return band;
    return strongestInside();
  }

  function inStrongNow() {
    return !!strongestInside();
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

  function signalWord(s, inside) {
    if (inside) return 'Strong';
    if (s < 0.08) return 'Quiet';
    if (s < 0.4) return 'Faint';
    return 'Rising';
  }

  function say(text) {
    statusEl.textContent = text;
  }

  function hintText() {
    if (calibration || confirmDispatch) {
      return 'Target ' + (targetIndex + 1) + '/' + targets.length + ' · ' +
        stationById(targets[targetIndex]).name + (bandId ? ' · Hold Lock' : '');
    }
    if (bandId) return 'Hold Lock inside the red band';
    return 'Hold a strong signal for ' + STRONG_HOLD + ' second';
  }

  function renderHud() {
    var station = heardStation();
    var line = station ? station.line : 'Static. Snow on the aerial.';
    if (confirmDispatch && targetIndex === 0 && station && station.id === 'lantern') {
      line = 'An unidentified signal.';
    }
    var showingNote = performance.now() < statusUntil;
    var heard = showingNote ? statusNote : line;
    var sig = signalAt(freq);
    var inside = inStrongNow();
    var word = signalWord(sig, inside);
    var label = bandId ? 'Lock' : 'Hold';
    var lockLine = bandId
      ? Math.min(LOCK_TIME, lockT).toFixed(1) + ' / ' + LOCK_TIME + 's'
      : Math.min(STRONG_HOLD, strongT).toFixed(1) + ' / ' + STRONG_HOLD + 's';
    var redInside = insideHalf(stationById(bandId), freq, RED_HALF);
    var hint = hintText();
    if (hearingEl.textContent !== heard) hearingEl.textContent = heard;
    hearingEl.classList.toggle('miss', showingNote && statusNote === 'wrong station');
    if (showingNote) {
      if (statusEl.textContent !== statusNote) say(statusNote);
    } else if (line !== lastLine) {
      lastLine = line;
      if (state === 'play') say(line);
    }
    if (signalEl.textContent !== word) signalEl.textContent = word;
    if (timerLabel.textContent !== label) timerLabel.textContent = label;
    if (lockEl.textContent !== lockLine) lockEl.textContent = lockLine;
    if (hintEl.textContent !== hint) hintEl.textContent = hint;
    hintEl.hidden = state !== 'play';
    signalEl.classList.toggle('hot', inside);
    lockEl.classList.toggle('live', !!bandId && redInside && state === 'play');
    lockBtn.classList.toggle('ready', !!bandId && state === 'play');
    lockBtn.classList.toggle('held', lockHeld);
    lockBtn.setAttribute('aria-pressed', lockHeld ? 'true' : 'false');
  }

  function nextTurn() {
    return TURN_LO + Math.random() * (TURN_HI - TURN_LO);
  }

  function resetHunt() {
    var i;
    var station;
    freq = START_FREQ;
    targetIndex = 0;
    strongT = 0;
    lockT = 0;
    chargeId = null;
    bandId = null;
    statusUntil = 0;
    statusNote = '';
    for (i = 0; i < stations.length; i++) {
      station = stations[i];
      station.center = station.home;
      station.dir = station.homeDir;
      station.half = calibration ? STRONG_HALF * 1.35 : STRONG_HALF;
      station.redHalf = RED_HALF;
      station.speed = MARKER_SPEED * station.speedScale * (calibration ? 0.5 : 1);
      station.turnIn = nextTurn();
    }
  }

  function announce(text) {
    statusNote = text;
    statusUntil = performance.now() + NOTE_MS;
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
    say((calibration ? 'Carrier calibrated.' : confirmDispatch ? 'Dispatch confirmed.' :
      'Field report locked. Santa has been taken.') + ' ' + seconds + ' seconds.');
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

  function updateStations(dt) {
    var i;
    var station;
    for (i = 0; i < stations.length; i++) {
      station = stations[i];
      station.turnIn -= dt;
      if (station.turnIn <= 0) {
        station.dir = -station.dir;
        station.turnIn = nextTurn();
      }
      station.center += station.dir * station.speed * dt;
      station.center = clamp(station.center, EDGE_LO, EDGE_HI);
    }
  }

  function clearBand() {
    bandId = null;
    chargeId = null;
    strongT = 0;
    lockT = 0;
  }

  function confirmStation(id) {
    if (id !== targets[targetIndex]) {
      clearBand();
      announce('wrong station');
      return;
    }
    if (targetIndex + 1 === targets.length) {
      win();
      return;
    }
    targetIndex++;
    lockHeld = false;
    clearBand();
    announce('Signal confirmed.');
  }

  function updateTuning(dt) {
    var dir;
    var charged;
    var next;
    var band;
    var onBand;
    var inRed;
    if (Math.abs(pendingDx) >= 1.6) {
      freq += pendingDx * DRAG;
      pendingDx = 0;
    }
    dir = tuneDirection();
    if (dir) freq += dir * KEY_RATE * dt;
    freq = clamp(freq, 0, 1);
    updateStations(dt * STATION_SPEED_SCALE);
    if (!bandId) {
      charged = stationById(chargeId);
      if (insideHalf(charged, freq, charged ? charged.half : 0)) {
        strongT += dt;
      } else {
        next = strongestInside();
        if (next) {
          chargeId = next.id;
          strongT = dt;
        } else {
          chargeId = null;
          strongT = 0;
        }
      }
      if (strongT >= STRONG_HOLD) {
        if (calibration) {
          confirmStation(chargeId);
          return;
        }
        strongT = STRONG_HOLD;
        bandId = chargeId;
        lockT = 0;
      }
      return;
    }
    band = stationById(bandId);
    onBand = insideHalf(band, freq, band ? band.half : 0);
    inRed = insideHalf(band, freq, band ? band.redHalf : 0);
    if (!onBand) {
      clearBand();
      return;
    }
    if (lockHeld && inRed) {
      lockT += dt;
      if (lockT >= LOCK_TIME) {
        lockT = LOCK_TIME;
        confirmStation(band.id);
      }
    } else {
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

  function drawWedge(center, half, innerScale, outerScale, fill) {
    var dial = radioPoint(DIAL_U);
    var a0 = dialAngle(center - half);
    var a1 = dialAngle(center + half);
    var outer = dial.r * outerScale;
    var inner = dial.r * innerScale;
    ctx.beginPath();
    ctx.arc(dial.x, dial.y, outer, a0, a1);
    ctx.arc(dial.x, dial.y, inner, a1, a0, true);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
  }

  function drawBandArc(center, half, radiusScale, color, width) {
    var dial = radioPoint(DIAL_U);
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = 'butt';
    ctx.arc(dial.x, dial.y, dial.r * radiusScale, dialAngle(center - half), dialAngle(center + half));
    ctx.stroke();
  }

  function drawStations() {
    var i;
    var station;
    var dial = radioPoint(DIAL_U);
    var a;
    var x;
    var y;
    var revealed;
    for (i = 0; i < stations.length; i++) {
      station = stations[i];
      revealed = station.id === bandId;
      drawBandArc(station.center, station.half, 0.72, 'rgba(196, 122, 32, 0.95)', 8);
      if (revealed) drawWedge(station.center, station.redHalf, 0.4, 0.96, 'rgba(214, 32, 36, 0.94)');
      a = dialAngle(station.center);
      x = dial.x + Math.cos(a) * dial.r * 0.72;
      y = dial.y + Math.sin(a) * dial.r * 0.72;
      ctx.beginPath();
      ctx.arc(x, y, revealed ? 8 : 6.5, 0, Math.PI * 2);
      ctx.fillStyle = revealed ? '#fff6f5' : '#24180f';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = revealed ? '#8e1214' : '#f3d48a';
      ctx.stroke();
    }
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
    var frac = bandId ? Math.min(lockT, LOCK_TIME) / LOCK_TIME : Math.min(strongT, STRONG_HOLD) / STRONG_HOLD;
    if (frac > 0) {
      ctx.beginPath();
      ctx.arc(knob.x, knob.y, ring, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2);
      ctx.strokeStyle = bandId ? '#ff5a52' : '#fff1c9';
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
    if (imageReady(spoolImg)) ctx.drawImage(spoolImg, calibration ? 295 : 112, 241, 80, 83);
    drawStations();
    drawNeedle();
    drawMeter();
    drawKnobCue();
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
      if (state === 'play') freq = clamp(freq + sign * KEY_STEP, 0, 1);
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
    if (state === 'play') {
      freq = clamp(freq + (event.key === 'ArrowLeft' ? -KEY_STEP : KEY_STEP), 0, 1);
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

  resetHunt();
  resize();
  syncPortrait();
  lastFrame = performance.now();
  requestAnimationFrame(loop);
})();
