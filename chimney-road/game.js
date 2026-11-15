/* Chapter 10 — The Chimney Road.
   Old route: world 2860px wide, about 2598px of running,
   camera locked to one 390px-tall view.
   This route: world 8580px wide (3x), about 8820px along the main path.
   Platforms run from y=-80 to y=558, and the camera follows both ways.
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
  var WORLD_W = 8580;
  var WORLD_TOP = -620;
  var WORLD_BOTTOM = 1120;
  var TRENT = { w: 558, h: 578, ax: 210, ay: 568, n: 8 };
  /* Main path is a chain of roofs. role "end" is a dead end: the way on
     is back the way you came. A fall returns you to the last main roof. */
  var PLATFORMS = [
    { x: 0, y: 300, w: 500, name: 'The first roof', role: 'main' },
    { x: 630, y: 348, w: 380, name: 'The lower eave', role: 'main' },
    { x: 560, y: 198, w: 240, name: 'The cold chimney', role: 'end', cap: 'right' },
    { x: 1120, y: 290, w: 340, name: 'The snow step', role: 'main' },
    { x: 1580, y: 248, w: 420, name: 'The broken span', role: 'main' },
    { x: 1760, y: 408, w: 200, name: 'The alley roof', role: 'end', cap: 'right' },
    { x: 1780, y: 558, w: 160, name: 'The dark well', role: 'end', cap: 'right' },
    { x: 2120, y: 220, w: 620, name: 'The long roof', role: 'main' },
    { x: 2460, y: 70, w: 300, name: 'The high gutter', role: 'main' },
    { x: 2360, y: -80, w: 200, name: 'The capped stack', role: 'end', cap: 'right' },
    { x: 2880, y: 24, w: 380, name: 'The ridge', role: 'main' },
    { x: 3380, y: 190, w: 360, name: 'The drop roof', role: 'main' },
    { x: 3220, y: 340, w: 400, name: 'The cellar run', role: 'end', cap: 'left' },
    { x: 3340, y: 490, w: 220, name: 'The sealed hatch', role: 'end', cap: 'left' },
    { x: 3860, y: 190, w: 400, name: 'The lantern roof', role: 'main' },
    { x: 4380, y: 140, w: 680, name: 'The chimney row', role: 'main' },
    { x: 4460, y: -10, w: 300, name: 'The false stair', role: 'end', cap: 'right' },
    { x: 5180, y: 86, w: 320, name: 'The north eave', role: 'main' },
    { x: 5600, y: 10, w: 360, name: 'The high slate', role: 'main' },
    { x: 5480, y: 170, w: 320, name: 'The broken gutter', role: 'end', cap: 'left' },
    { x: 6080, y: 48, w: 700, name: 'The snowball roof', role: 'main' },
    { x: 6560, y: 228, w: 520, name: 'The low road', role: 'main' },
    { x: 7200, y: 176, w: 460, name: 'The narrow cap', role: 'main' },
    { x: 7220, y: 26, w: 120, name: 'The short stack', role: 'end', cap: 'right' },
    { x: 7780, y: 236, w: 260, name: 'The last eave', role: 'main' },
    { x: 8160, y: 260, w: 420, name: 'The sleigh roof', role: 'main', goal: true }
  ];
  var GOAL = PLATFORMS.length - 1;
  var ROOF_BLOCKS = PLATFORMS.map(function (roof, index) {
    if ((index % 4 === 0 && index !== 4) || index === GOAL) return null;
    var height = 26 + (index % 3) * 7;
    var width = Math.min(44, roof.w * .18);
    return { x: roof.x + roof.w * .58, y: roof.y - height, w: width, h: height, bottom: roof.y, roof: index };
  }).filter(Boolean);
  var SLEIGH_X = PLATFORMS[GOAL].x + 250;
  var GRAV = 1480;
  var JUMP = -630;
  var HOP = -420;
  var RUN = 260;
  var LONG = 7;
  var BALLS = 20;
  var ROW = 15;

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
  var rotateHold = false;
  var visualTime = 0;
  var lastFrame = 0;
  var shake = 0;
  var falls = 0;
  var cp = 0;
  var stood = 0;
  var body = { x: 96, y: 300, vx: 0, vy: 0, face: 1, ground: true, runT: 0 };
  var held = { left: false, right: false, climb: false };
  var jumpQueued = 0;
  var coyote = 0;
  var jumpBonus = (window.TrentMissionBonus || 0) * 0.04;
  var airJumps = 1;
  var airBuffer = 0;
  var hurt = 0;
  var camX = 0;
  var camY = 0;
  var camSnap = true;
  var cratePrev = 0;
  var onCrate = false;
  var flakes = [];
  var fi;

  for (fi = 0; fi < 42; fi++) {
    flakes.push({
      x: Math.random() * VIEW_W,
      y: Math.random() * VIEW_H,
      v: 16 + Math.random() * 22,
      r: 1 + Math.random() * 1.5,
      drift: Math.random() * 12 - 6
    });
  }

  var motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

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

  function spawnX(roof) {
    return roof.x + Math.min(96, Math.max(48, roof.w * 0.22));
  }

  function crateBox() {
    var roof = PLATFORMS[LONG];
    var w = 112;
    var h = 74;
    var left = 2320 + Math.sin(visualTime * 0.9) * 60;
    return { x: left, y: roof.y - h, w: w, h: h };
  }

  function snowball() {
    var roof = PLATFORMS[BALLS];
    var span = 120;
    var travel = visualTime * 68;
    var ping = travel % (span * 2);
    if (ping < 0) ping += span * 2;
    if (ping > span) ping = span * 2 - ping;
    var r = 22;
    return { x: 6360 + ping, y: roof.y - r, r: r, roofY: roof.y };
  }

  function icicleAt(x, roofY, phase) {
    var period = 2.9;
    var t = (visualTime + phase) % period;
    var len = 54;
    var tip = roofY - 124;
    var mode = 'hang';
    if (t < 1.15) mode = 'warn';
    else if (t < 1.42) {
      mode = 'fall';
      tip = (roofY - 124) + ((roofY - 8) - (roofY - 124)) * ((t - 1.15) / 0.27);
    } else if (t < 2.05) {
      mode = 'down';
      tip = roofY - 8;
    }
    return { x: x, hang: tip - len, tip: tip, roofY: roofY, mode: mode, shake: mode === 'warn' };
  }

  function lanternBob() {
    var angle = Math.sin(visualTime * Math.PI * 2 / 3.15) * 0.85;
    var len = 130;
    var pivotX = 3800;
    var pivotY = -20;
    return {
      px: pivotX,
      py: pivotY,
      x: pivotX + Math.sin(angle) * len,
      y: pivotY + Math.cos(angle) * len,
      r: 16
    };
  }

  function smokeList() {
    var y = PLATFORMS[ROW].y;
    return [
      puffAt(4810, y, 0),
      puffAt(4965, y, 1.9)
    ];
  }

  function puffAt(x, roofY, phase) {
    var period = 3.8;
    var t = (visualTime + phase) % period;
    if (t < 1.05) return { x: x, y: roofY, h: 0, danger: false, pot: true };
    if (t < 1.9) return { x: x, y: roofY, h: 36, danger: false, pot: true };
    var grow = t < 3.25 ? 158 : 158 * (1 - (t - 3.25) / 0.55);
    return { x: x, y: roofY, h: grow, danger: grow > 70, pot: true };
  }

  function renderHud() {
    roadEl.textContent = PLATFORMS[stood].name;
    fallsEl.textContent = falls + ' / 3';
    fallsEl.className = falls ? 'warn' : '';
  }

  function placeOn(index) {
    var roof = PLATFORMS[index];
    body.x = spawnX(roof);
    body.y = roof.y;
    body.vx = 0;
    body.vy = 0;
    body.ground = true;
    body.face = 1;
    airJumps = 1;
    airBuffer = 0;
    jumpQueued = 0;
    onCrate = false;
    hurt = 0.45;
    stood = index;
    camSnap = true;
    cratePrev = crateBox().x;
  }

  function beginRun() {
    falls = 0;
    played = 0;
    shake = 0;
    jumpQueued = 0;
    coyote = 0;
    airJumps = 1;
    airBuffer = 0;
    victorySent = false;
    placeOn(0);
    cp = 0;
    state = 'play';
    startSheet.hidden = true;
    pauseSheet.hidden = true;
    winSheet.hidden = true;
    hintEl.hidden = false;
    renderHud();
    say('The sleigh is at the end of the road.');
  }

  function openPause() {
    if (state !== 'play') return;
    state = 'pause';
    held.left = false;
    held.right = false;
    held.climb = false;
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
      if (window.parent !== window) {
        var relay = { type: 'chimney-road:complete', detail: { seconds: seconds } };
        try {
          var relayRun = new URLSearchParams(location.search).get('runId');
          if (relayRun) relay.runId = relayRun;
        } catch (ignoreRelay) {}
        window.parent.postMessage(relay, (location.protocol === 'http:' || location.protocol === 'https:') ? location.origin : '*');
      }
    }
  }

  function drop(reason) {
    falls += 1;
    if (!reduceMotion()) shake = 8;
    if (falls >= 3) {
      falls = 0;
      placeOn(0);
      cp = 0;
      say('Three falls. The road starts again.');
    } else {
      placeOn(cp);
      say(reason || 'Back on the roof.');
    }
    renderHud();
  }

  function hitsBob(bob) {
    var y;
    for (y = body.y - 96; y <= body.y - 10; y += 18) {
      if (Math.hypot(body.x - bob.x, y - bob.y) < bob.r + 12) return true;
    }
    return false;
  }

  function overlapsBody(x, y, w, h) {
    var top = body.y - 108;
    var bot = body.y - 4;
    if (bot < y || top > y + h) return false;
    if (body.x + 14 < x || body.x - 14 > x + w) return false;
    return true;
  }

  function requestJump() {
    if (state !== 'play') return;
    if (body.ground || coyote > 0) jumpQueued = 0.14 + jumpBonus;
    else airBuffer = 0.52;
  }

  function update(dt) {
    var dir = 0;
    var box;
    var n;
    var roof;
    var prevY;
    var best;
    var ball;
    var ice;
    var bob;
    var puff;
    var puffs;
    var si;
    if (held.left) dir -= 1;
    if (held.right) dir += 1;
    if (dir < 0) body.face = -1;
    if (dir > 0) body.face = 1;
    if (dir) body.vx += dir * 1600 * dt;
    else body.vx *= Math.max(0, 1 - 10 * dt);
    body.vx = clamp(body.vx, -RUN, RUN);
    if (jumpQueued > 0) jumpQueued -= dt;
    if (body.ground) {
      coyote = 0.11 + jumpBonus;
      airJumps = 1;
      airBuffer = 0;
    } else {
      coyote -= dt;
      if (airBuffer > 0) airBuffer -= dt;
    }
    if (jumpQueued > 0 && coyote > 0) {
      body.vy = JUMP;
      body.ground = false;
      coyote = 0;
      jumpQueued = 0;
      airBuffer = 0;
    } else if (!body.ground && airJumps > 0 && airBuffer > 0 && body.vy > -70) {
      body.vy = HOP;
      airJumps = 0;
      airBuffer = 0;
    }
    body.vy += GRAV * dt;
    if (body.vy > 820) body.vy = 820;
    box = crateBox();
    if (onCrate) body.x += box.x - cratePrev;
    cratePrev = box.x;
    var prevX = body.x;
    body.x += body.vx * dt;
    prevY = body.y;
    body.y += body.vy * dt;
    body.ground = false;
    onCrate = false;
    best = null;
    if (body.vy >= 0 && prevY <= box.y + 8 && body.y >= box.y && body.x >= box.x + 8 && body.x <= box.x + box.w - 8) {
      best = { top: box.y, id: -1 };
    }
    for (n = 0; n < PLATFORMS.length; n++) {
      roof = PLATFORMS[n];
      if (body.vy < 0) break;
      if (roof.cap) {
        var cap = capX(roof);
        var capTop = roof.y - 108;
        if (prevY <= capTop + 6 && body.y >= capTop && body.x >= cap - 4 && body.x <= cap + 46 &&
            (!best || capTop < best.top)) best = { top: capTop, id: n };
      }
      if (prevY > roof.y + 8) continue;
      if (body.y < roof.y) continue;
      if (body.x < roof.x + 10 || body.x > roof.x + roof.w - 10) continue;
      if (!best || roof.y < best.top) best = { top: roof.y, id: n };
    }
    for (var obstacleIndex = 0; obstacleIndex < ROOF_BLOCKS.length; obstacleIndex++) {
      var obstacle = ROOF_BLOCKS[obstacleIndex];
      if (body.x < obstacle.x - 11 || body.x > obstacle.x + obstacle.w + 11 || body.y - 30 > obstacle.bottom) continue;
      if (body.vy >= 0 && prevY <= obstacle.y + 5 && body.y >= obstacle.y &&
          body.x >= obstacle.x && body.x <= obstacle.x + obstacle.w && (!best || obstacle.y < best.top)) {
        best = { top: obstacle.y, id: obstacle.roof };
      } else if (prevY > obstacle.y && body.y > obstacle.y && body.y <= obstacle.bottom + 6) {
        if (prevX <= obstacle.x - 10) body.x = obstacle.x - 11;
        else if (prevX >= obstacle.x + obstacle.w + 10) body.x = obstacle.x + obstacle.w + 11;
      }
    }
    if (best) {
      body.y = best.top;
      body.vy = 0;
      body.ground = true;
      if (best.id < 0) onCrate = true;
      else {
        stood = best.id;
        if (PLATFORMS[best.id].role === 'main') cp = best.id;
      }
    }
    if (held.climb) {
      var chimney = PLATFORMS.find(function (roof) {
        return roof.cap && body.x >= capX(roof) - 23 && body.x <= capX(roof) + 65 &&
          body.y <= roof.y + 8 && body.y > roof.y - 108;
      });
      if (chimney) {
        body.y = Math.max(chimney.y - 108, body.y - 180 * dt);
        body.vy = 0;
      }
    }
    if (!onCrate && body.x > box.x - 16 && body.x < box.x + box.w + 16 && body.y > box.y + 18 && body.y - 48 < box.y + box.h) {
      if (body.x < box.x + box.w / 2) body.x = box.x - 18;
      else body.x = box.x + box.w + 18;
      body.vx = body.x < box.x ? Math.min(body.vx, 0) : Math.max(body.vx, 0);
    }
    if (Math.abs(body.vx) > 30 && body.ground) body.runT += dt;
    if (hurt > 0) hurt -= dt;
    else {
      ball = snowball();
      if (body.y > ball.roofY - 40 && body.y < ball.roofY + 24 && Math.abs(body.x - ball.x) < ball.r + 12) {
        drop('The snowball knocked you off.');
      } else {
        ice = icicleAt(3070, PLATFORMS[10].y, 0);
        if (ice.mode === 'fall' && overlapsBody(ice.x - 16, ice.hang, 32, ice.tip - ice.hang)) {
          drop('The icicle knocked you off.');
        } else {
          ice = icicleAt(7500, PLATFORMS[22].y, 1.3);
          if (ice.mode === 'fall' && overlapsBody(ice.x - 16, ice.hang, 32, ice.tip - ice.hang)) {
            drop('The icicle knocked you off.');
          } else {
            bob = lanternBob();
            if (hitsBob(bob)) drop('The lantern knocked you off.');
            else {
              puffs = smokeList();
              for (si = 0; si < puffs.length; si++) {
                puff = puffs[si];
                if (!puff.danger) continue;
                if (overlapsBody(puff.x - 34, puff.y - 18 - puff.h, 68, puff.h)) {
                  drop('The smoke knocked you off.');
                  break;
                }
              }
            }
          }
        }
      }
    }
    if (state === 'play' && (body.y > 1000 || body.x < -40 || body.x > WORLD_W + 40)) drop();
    if (body.ground && stood === GOAL && body.x > SLEIGH_X - 8 && body.x < SLEIGH_X + 130) win();
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

  function followCamera(dt) {
    var look = body.face * 56;
    var tx = clamp(body.x - 310 + look, 0, WORLD_W - VIEW_W);
    var ty = clamp(body.y - 230, WORLD_TOP, WORLD_BOTTOM - VIEW_H);
    var k;
    if (camSnap || reduceMotion()) {
      camX = tx;
      camY = ty;
      camSnap = false;
      return;
    }
    k = Math.min(1, dt * 5.5);
    camX += (tx - camX) * k;
    camY += (ty - camY) * k;
  }

  function drawSky() {
    var g = ctx.createLinearGradient(0, 0, 0, VIEW_H);
    g.addColorStop(0, '#07111c');
    g.addColorStop(0.55, '#16324e');
    g.addColorStop(1, '#0e1c2e');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }

  function drawPanorama() {
    var iw;
    var ih;
    var scale;
    var dw;
    var dh;
    var extra;
    var u;
    var v;
    var span;
    if (!imageReady(panoramaImg)) return;
    iw = panoramaImg.naturalWidth;
    ih = panoramaImg.naturalHeight;
    scale = Math.max(VIEW_W / iw, (VIEW_H * 1.85) / ih);
    dw = iw * scale;
    dh = ih * scale;
    extra = Math.max(0, dw - VIEW_W);
    u = camX / Math.max(1, WORLD_W - VIEW_W);
    span = Math.max(1, (WORLD_BOTTOM - WORLD_TOP) - VIEW_H);
    v = (camY - WORLD_TOP) / span;
    ctx.drawImage(panoramaImg, -u * extra * 0.35, -v * (dh - VIEW_H) * 0.9, dw, dh);
  }

  function drawRoofs() {
    var n;
    var roof;
    var dh;
    if (!imageReady(roofImg)) return;
    for (n = 0; n < PLATFORMS.length; n++) {
      roof = PLATFORMS[n];
      dh = roof.w * roofImg.naturalHeight / roofImg.naturalWidth;
      ctx.drawImage(roofImg, roof.x - camX, roof.y - camY, roof.w, dh);
    }
  }

  function capX(roof) {
    return roof.cap === 'left' ? roof.x + 16 : roof.x + roof.w - 58;
  }

  function drawCaps() {
    var n;
    var roof;
    var x;
    var y;
    for (n = 0; n < PLATFORMS.length; n++) {
      roof = PLATFORMS[n];
      if (roof.role !== 'end') continue;
      x = capX(roof) - camX;
      y = roof.y - camY;
      ctx.fillStyle = '#5c4034';
      ctx.fillRect(x, y - 84, 42, 84);
      ctx.fillStyle = '#b28c5c';
      for (var rung = 18; rung <= 72; rung += 18) ctx.fillRect(x + 7, y - rung, 28, 4);
      ctx.fillStyle = '#c5d0dc';
      ctx.fillRect(x - 6, y - 94, 54, 12);
      ctx.fillStyle = '#241c18';
      ctx.fillRect(x + 10, y - 108, 22, 16);
    }
  }

  function drawRoofBlocks() {
    ROOF_BLOCKS.forEach(function (obstacle) {
      var x = obstacle.x - camX;
      var y = obstacle.y - camY;
      if (x > VIEW_W + 50 || x + obstacle.w < -50) return;
      ctx.fillStyle = '#614838';
      ctx.fillRect(x, y, obstacle.w, obstacle.h);
      ctx.fillStyle = '#a37c58';
      ctx.fillRect(x + 4, y + 7, obstacle.w - 8, obstacle.h - 11);
      ctx.fillStyle = '#e3edf3';
      ctx.fillRect(x - 2, y - 3, obstacle.w + 4, 8);
    });
  }

  function drawCrate() {
    var box = crateBox();
    if (!imageReady(crateImg)) return;
    ctx.drawImage(crateImg, box.x - camX, box.y - camY, box.w, box.h);
  }

  function drawSnowball() {
    var ball = snowball();
    var x = ball.x - camX;
    var y = ball.y - camY;
    ctx.fillStyle = 'rgba(18, 28, 42, 0.35)';
    ctx.beginPath();
    ctx.ellipse(x, ball.roofY - camY + 2, ball.r * 0.85, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f4f7fb';
    ctx.beginPath();
    ctx.arc(x, y, ball.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#d5e2ef';
    ctx.beginPath();
    ctx.arc(x - 6, y - 6, ball.r * 0.45, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawIcicle(ice) {
    var x = ice.x - camX + (ice.shake && !reduceMotion() ? Math.sin(visualTime * 46) * 3 : 0);
    var hang = ice.hang - camY;
    var tip = ice.tip - camY;
    if (ice.mode === 'hang' || ice.mode === 'warn') {
      ctx.fillStyle = 'rgba(210, 224, 234, 0.45)';
      ctx.beginPath();
      ctx.ellipse(ice.x - camX, ice.roofY - camY + 2, 18, 4, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = ice.mode === 'warn' ? '#d7ecf6' : '#e7f3f8';
    ctx.beginPath();
    ctx.moveTo(x - 12, hang);
    ctx.lineTo(x + 12, hang);
    ctx.lineTo(x, tip);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(90, 120, 140, 0.7)';
    ctx.stroke();
  }

  function drawLantern() {
    var bob = lanternBob();
    ctx.strokeStyle = '#cbb48a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(bob.px - camX, bob.py - camY);
    ctx.lineTo(bob.x - camX, bob.y - camY);
    ctx.stroke();
    ctx.fillStyle = '#f0d7a8';
    ctx.beginPath();
    ctx.arc(bob.x - camX, bob.y - camY, bob.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#8a6230';
    ctx.fillRect(bob.x - camX - 7, bob.y - camY - 4, 14, 10);
  }

  function drawPuffs() {
    var list = smokeList();
    var i;
    var p;
    var x;
    var y;
    for (i = 0; i < list.length; i++) {
      p = list[i];
      x = p.x - camX;
      y = p.y - camY;
      ctx.fillStyle = '#6a5348';
      ctx.fillRect(x - 16, y - 28, 32, 28);
      ctx.fillStyle = '#d5dde6';
      ctx.fillRect(x - 20, y - 34, 40, 8);
      if (p.h < 8) continue;
      ctx.fillStyle = p.danger ? 'rgba(206, 214, 222, 0.72)' : 'rgba(206, 214, 222, 0.4)';
      ctx.beginPath();
      ctx.ellipse(x, y - 36 - p.h * 0.45, p.danger ? 30 : 14, Math.max(12, p.h * 0.45), 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawSleigh() {
    var w = 168;
    var h;
    var roof = PLATFORMS[GOAL];
    if (!imageReady(sleighImg)) return;
    h = w * sleighImg.naturalHeight / sleighImg.naturalWidth;
    ctx.drawImage(sleighImg, SLEIGH_X - camX, roof.y - camY - h + 10, w, h);
  }

  function drawTrent() {
    var frame;
    var destH = 132;
    var s;
    if (!imageReady(trentImg)) return;
    frame = trentFrame();
    s = destH / TRENT.h;
    ctx.save();
    ctx.translate(body.x - camX, body.y - camY);
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
    for (fi = 0; fi < flakes.length; fi++) {
      f = flakes[fi];
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function render(dt) {
    var mag = reduceMotion() ? 0 : shake;
    followCamera(dt || 0);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssW, cssH);
    ctx.setTransform(
      dpr * view.s, 0, 0, dpr * view.s,
      dpr * (view.ox + Math.sin(visualTime * 34) * mag),
      dpr * (view.oy + (reduceMotion() ? 0 : Math.cos(visualTime * 29) * mag * 0.4))
    );
    drawSky();
    drawPanorama();
    drawRoofs();
    drawCaps();
    drawRoofBlocks();
    drawCrate();
    drawSnowball();
    drawIcicle(icicleAt(3070, PLATFORMS[10].y, 0));
    drawIcicle(icicleAt(7500, PLATFORMS[22].y, 1.3));
    drawLantern();
    drawPuffs();
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
      for (fi = 0; fi < flakes.length; fi++) {
        f = flakes[fi];
        f.y += f.v * dt;
        f.x += f.drift * dt;
        if (f.y > VIEW_H + 6) {
          f.y = -6;
          f.x = Math.random() * VIEW_W;
        }
        if (f.x < -8) f.x = VIEW_W + 4;
        if (f.x > VIEW_W + 8) f.x = -4;
      }
    }
    renderHud();
    render(dt);
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
    held.climb = true;
    requestJump();
    hintEl.hidden = true;
    if (event.currentTarget.setPointerCapture) event.currentTarget.setPointerCapture(event.pointerId);
    event.currentTarget.classList.add('held');
  });
  document.getElementById('jump').addEventListener('pointerup', function (event) {
    held.climb = false;
    event.currentTarget.classList.remove('held');
  });
  document.getElementById('jump').addEventListener('pointercancel', function (event) {
    held.climb = false;
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
    else if (event.key === 'ArrowUp' || event.key === ' ') {
      held.climb = true;
      if (!event.repeat) requestJump();
    }
    else return;
    event.preventDefault();
    hintEl.hidden = true;
  });

  window.addEventListener('keyup', function (event) {
    if (event.key === 'ArrowLeft') held.left = false;
    if (event.key === 'ArrowRight') held.right = false;
    if (event.key === 'ArrowUp' || event.key === ' ') held.climb = false;
  });

  window.addEventListener('blur', function () {
    held.left = false;
    held.right = false;
    held.climb = false;
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
  cratePrev = crateBox().x;
  lastFrame = performance.now();
  requestAnimationFrame(loop);
})();
