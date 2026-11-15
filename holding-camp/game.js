/* Chapter 8 — The Holding Camp.
   Side-view fight. Santa punches the night wardens, then walks to the gate.
   Painted frames live in art/. No blood. */
'use strict';

(function () {
  var canvas = document.getElementById('yard');
  var ctx = canvas.getContext('2d');
  var gateEl = document.getElementById('gate');
  var pipsEl = document.getElementById('pips');
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
  var GROUND = 312;
  var SANTA_H = 214;
  var WARDEN_H = 196;
  var BLOCK = 74;
  var SANTA_REACH = 112;
  var WARDEN_REACH = 86;
  var GATE_X = 752;
  /* Equal frames. Anchor is the sole on the shared baseline. */
  var SANTA = { w: 477, h: 515, ax: 210, ay: 509, lookRight: true };
  var WARDEN = { w: 395, h: 469, ax: 162, ay: 463, lookRight: false };
  var PUNCH_MS = 180;
  var HIT_MS = 280;

  var yardImg = new Image();
  var santaImg = new Image();
  var wardenImg = new Image();
  yardImg.src = 'art/yard.webp';
  santaImg.src = 'art/santa.webp';
  wardenImg.src = 'art/warden.webp';

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
  var held = { left: false, right: false };
  var pointers = {};
  var santa;
  var wardens;
  var flakes = [];
  var n;

  for (n = 0; n < 22; n++) {
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

  function sfx(kind) {
    if (window.TrentSfx) window.TrentSfx.play(kind);
  }

  function clamp(v, a, b) {
    if (v < a) return a;
    if (v > b) return b;
    return v;
  }

  function freshSanta() {
    return {
      x: 88,
      face: 1,
      hp: 4,
      punch: 0,
      cool: 0,
      stun: 0,
      down: 0,
      iframe: 0,
      buffer: 0,
      punched: false
    };
  }

  function freshWardens() {
    return [
      { x: 270, hp: 3, mode: 'idle', t: 0, punched: false },
      { x: 478, hp: 3, mode: 'idle', t: 0, punched: false },
      { x: 668, hp: 3, mode: 'idle', t: 0, punched: false }
    ];
  }

  function standing() {
    var i;
    var list = [];
    for (i = 0; i < wardens.length; i++) {
      if (wardens[i].hp > 0) list.push(wardens[i]);
    }
    return list;
  }

  function blocker() {
    var list = standing();
    var i;
    var best = null;
    for (i = 0; i < list.length; i++) {
      if (!best || list[i].x < best.x) best = list[i];
    }
    return best;
  }

  function pipsText() {
    var text = '';
    var i;
    var hp = santa.hp;
    if (santa.down > 0) hp = 0;
    for (i = 0; i < hp; i++) text += '♥';
    for (; i < 4; i++) text += '♡';
    return text;
  }

  function renderHud() {
    var left = standing().length;
    if (state === 'win') gateEl.textContent = 'Open';
    else if (left === 0) gateEl.textContent = 'Walk through';
    else if (left === 1) gateEl.textContent = 'One warden';
    else gateEl.textContent = left + ' wardens';
    pipsEl.textContent = pipsText();
  }

  function beginRun() {
    santa = freshSanta();
    wardens = freshWardens();
    played = 0;
    shake = 0;
    victorySent = false;
    state = 'play';
    startSheet.hidden = true;
    pauseSheet.hidden = true;
    winSheet.hidden = true;
    hintEl.hidden = false;
    renderHud();
    say('Three wardens stand between Santa and the gate.');
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
    sfx('right');
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

  function aimFace() {
    var foe = blocker();
    if (held.left && !held.right) return -1;
    if (held.right && !held.left) return 1;
    if (foe) return foe.x < santa.x ? -1 : 1;
    return santa.face;
  }

  function startPunch() {
    santa.punch = PUNCH_MS / 1000;
    santa.cool = 0.46;
    santa.punched = false;
    santa.buffer = 0;
    santa.face = aimFace();
  }

  function requestPunch() {
    if (state !== 'play') return;
    if (santa.down > 0 || santa.stun > 0 || santa.punch > 0 || santa.cool > 0) {
      santa.buffer = 0.14;
      return;
    }
    startPunch();
  }

  function hurtWarden(w) {
    w.hp -= 1;
    w.x = clamp(w.x + 16, 120, 790);
    if (w.hp <= 0) {
      w.mode = 'down';
      w.t = 0;
      say('A warden sits in the snow.');
    } else {
      w.mode = 'flinch';
      w.t = 0.34;
      say('The mitten lands.');
    }
    if (!reduceMotion()) shake = 5;
    sfx('action');
  }

  function hurtSanta(from) {
    if (santa.iframe > 0 || santa.down > 0) return;
    santa.hp -= 1;
    santa.iframe = 0.72;
    santa.punch = 0;
    santa.x = clamp(santa.x - 28, 56, 800);
    if (!reduceMotion()) shake = 7;
    sfx('wrong');
    if (santa.hp <= 0) {
      santa.down = 1.2;
      santa.stun = 0;
      santa.from = from;
      say('Santa sits down dizzy.');
    } else {
      santa.stun = HIT_MS / 1000;
      say('Santa staggers.');
    }
  }

  function recoverSanta() {
    var foe = santa.from && santa.from.hp > 0 ? santa.from : blocker();
    santa.hp = 4;
    santa.down = 0;
    santa.stun = 0;
    santa.punch = 0;
    santa.iframe = 0.4;
    if (foe) {
      foe.hp = 3;
      foe.mode = 'idle';
      foe.t = 0;
      santa.x = clamp(foe.x - 168, 56, 800);
      santa.face = 1;
    }
    say('Santa is up. That warden is ready again.');
  }

  function trySantaHit() {
    var i;
    var w;
    var dist;
    var best = null;
    var bestDist = SANTA_REACH;
    for (i = 0; i < wardens.length; i++) {
      w = wardens[i];
      if (w.hp <= 0) continue;
      dist = (w.x - santa.x) * santa.face;
      if (dist > 28 && dist < bestDist) {
        best = w;
        bestDist = dist;
      }
    }
    if (best) hurtWarden(best);
  }

  function tryWardenHit(w) {
    var dist = (w.x - santa.x);
    if (dist > 22 && dist < WARDEN_REACH) hurtSanta(w);
  }

  function updateWardens(dt) {
    var active = blocker();
    var i;
    var w;
    var prev;
    var dist;
    for (i = 0; i < wardens.length; i++) {
      w = wardens[i];
      if (w.hp <= 0) {
        w.mode = 'down';
        continue;
      }
      if (w.mode === 'flinch') {
        w.t -= dt;
        if (w.t <= 0) w.mode = 'idle';
        continue;
      }
      if (w !== active || santa.down > 0) {
        if (w.mode !== 'punch') w.mode = 'idle';
      }
      if (w.mode === 'idle' && w === active) {
        dist = w.x - santa.x;
        if (dist > 24 && dist < 108) {
          w.mode = 'wind';
          w.t = 0.48;
        }
      } else if (w.mode === 'wind') {
        w.t -= dt;
        if (w.t <= 0) {
          w.mode = 'punch';
          w.t = 0.2;
          w.punched = false;
        }
      } else if (w.mode === 'punch') {
        prev = w.t;
        w.t -= dt;
        if (!w.punched && prev > 0.08 && w.t <= 0.08) {
          w.punched = true;
          tryWardenHit(w);
        }
        if (w.t <= 0) w.mode = 'idle';
      }
    }
  }

  function update(dt) {
    var dir = 0;
    var prev;
    var block;
    if (santa.iframe > 0) santa.iframe -= dt;
    if (santa.cool > 0) santa.cool -= dt;
    if (santa.buffer > 0) santa.buffer -= dt;
    if (santa.down > 0) {
      santa.down -= dt;
      if (santa.down <= 0) recoverSanta();
      return;
    }
    if (santa.stun > 0) santa.stun -= dt;
    if (santa.punch > 0) {
      prev = santa.punch;
      santa.punch -= dt;
      if (!santa.punched && prev > 0.09 && santa.punch <= 0.09) {
        santa.punched = true;
        trySantaHit();
      }
      if (santa.punch < 0) santa.punch = 0;
    } else if (santa.stun <= 0 && santa.buffer > 0 && santa.cool <= 0) {
      startPunch();
    }
    if (santa.punch <= 0 && santa.stun <= 0) {
      if (held.left) dir -= 1;
      if (held.right) dir += 1;
      if (dir < 0) santa.face = -1;
      if (dir > 0) santa.face = 1;
      santa.x += dir * 220 * dt;
    }
    santa.x = clamp(santa.x, 56, 808);
    block = blocker();
    if (block && santa.x > block.x - BLOCK) santa.x = block.x - BLOCK;
    updateWardens(dt);
    block = blocker();
    if (block && santa.x > block.x - BLOCK) santa.x = block.x - BLOCK;
    if (!block && santa.x >= GATE_X) win();
  }

  function drawYard() {
    var scale;
    var dh;
    if (!imageReady(yardImg)) {
      ctx.fillStyle = '#16324c';
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      return;
    }
    scale = VIEW_W / yardImg.naturalWidth;
    dh = yardImg.naturalHeight * scale;
    ctx.drawImage(yardImg, 0, VIEW_H - dh, VIEW_W, dh);
  }

  function drawActor(img, spec, frame, x, lookRight, height, lean) {
    var s;
    var bob = 0;
    if (!imageReady(img)) return;
    s = height / spec.h;
    ctx.save();
    ctx.translate(x + (lean || 0), GROUND + bob);
    if (lookRight !== spec.lookRight) ctx.scale(-1, 1);
    ctx.drawImage(
      img,
      frame * spec.w, 0, spec.w, spec.h,
      -spec.ax * s,
      -spec.ay * s,
      spec.w * s,
      spec.h * s
    );
    ctx.restore();
  }

  function shadow(x, width) {
    ctx.fillStyle = 'rgba(20, 28, 48, 0.28)';
    ctx.beginPath();
    ctx.ellipse(x, GROUND + 4, width, 8, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  function santaFrame() {
    if (santa.down > 0) return 3;
    if (santa.stun > 0) return 2;
    if (santa.punch > 0) return 1;
    return 0;
  }

  function wardenFrame(w) {
    if (w.mode === 'down' || w.hp <= 0) return 2;
    if (w.mode === 'punch') return 1;
    return 0;
  }

  function drawSnow() {
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
    var i;
    var w;
    var lean;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssW, cssH);
    ctx.setTransform(
      dpr * view.s, 0, 0, dpr * view.s,
      dpr * (view.ox + Math.sin(visualTime * 36) * mag),
      dpr * view.oy
    );
    drawYard();
    for (i = 0; i < wardens.length; i++) {
      w = wardens[i];
      if (w.hp <= 0) {
        shadow(w.x, 36);
        drawActor(wardenImg, WARDEN, 2, w.x, false, WARDEN_H, 0);
      }
    }
    if (santa) {
      shadow(santa.x, 28);
      drawActor(santaImg, SANTA, santaFrame(), santa.x, santa.face > 0, SANTA_H, 0);
    }
    for (i = 0; i < wardens.length; i++) {
      w = wardens[i];
      if (w.hp <= 0) continue;
      lean = w.mode === 'flinch' ? 10 : 0;
      shadow(w.x, 26);
      drawActor(wardenImg, WARDEN, wardenFrame(w), w.x, santa.x > w.x, WARDEN_H, lean);
    }
    if (!reduceMotion()) drawSnow();
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
    if (!santa) {
      santa = freshSanta();
      wardens = freshWardens();
    }
    if (state !== 'pause') visualTime += dt;
    if (state === 'play') {
      played += dt;
      update(dt);
      if (shake > 0) shake = Math.max(0, shake - dt * 18);
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

  bindHold(document.getElementById('left'), 'left');
  bindHold(document.getElementById('right'), 'right');

  document.getElementById('punch').addEventListener('pointerdown', function (event) {
    if (event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.classList.add('held');
    hintEl.hidden = true;
    requestPunch();
  });
  document.getElementById('punch').addEventListener('pointerup', function (event) {
    event.currentTarget.classList.remove('held');
  });
  document.getElementById('punch').addEventListener('pointercancel', function (event) {
    event.currentTarget.classList.remove('held');
  });

  window.addEventListener('keydown', function (event) {
    var map = { arrowleft: 'left', arrowright: 'right' };
    var key;
    if (event.key === 'Escape') {
      event.preventDefault();
      if (state === 'play') openPause();
      else if (state === 'pause') closePause();
      return;
    }
    if (!event.repeat && (event.key === 'a' || event.key === 'A' || event.key === ' ' || event.key === 'j' || event.key === 'J')) {
      event.preventDefault();
      hintEl.hidden = true;
      requestPunch();
      return;
    }
    key = map[event.key.toLowerCase()];
    if (!key) return;
    event.preventDefault();
    held[key] = true;
    hintEl.hidden = true;
  });

  window.addEventListener('keyup', function (event) {
    var map = { arrowleft: 'left', arrowright: 'right' };
    var key = map[event.key.toLowerCase()];
    if (key) held[key] = false;
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

  santa = freshSanta();
  wardens = freshWardens();
  resize();
  syncPortrait();
  lastFrame = performance.now();
  requestAnimationFrame(loop);
})();
