/* Chapter 7 — The Listening Wire.
   First-person corridor. A small raycaster, painted walls,
   cartoon soldiers, and a green door at the far end.
   No libraries. Sprites live in art/. */
'use strict';

(function () {
  var canvas = document.getElementById('yard');
  var ctx = canvas.getContext('2d');
  var gunEl = document.getElementById('gun');
  var leftEl = document.getElementById('left');
  var pauseBtn = document.getElementById('pause');
  var hintEl = document.getElementById('hint');
  var toastEl = document.getElementById('toast');
  var startSheet = document.getElementById('start-sheet');
  var pauseSheet = document.getElementById('pause-sheet');
  var winSheet = document.getElementById('win-sheet');
  var winTimeEl = document.getElementById('win-time');
  var portraitEl = document.getElementById('portrait');
  var statusEl = document.getElementById('status');

  var MAP_W = 26;
  var MAP_H = 13;
  var BUF_W = 420;
  var BUF_H = 236;
  var FOV_PLANE = 0.72;
  var EXIT_X = 24.2;
  var EXIT_Y = 11.5;

  var MAP = buildMap();
  var DIST = buildDist();
  var exitDist = DIST[11][24];
  var fastAt = Math.max(12, Math.round(exitDist * 0.22));
  var spreadAt = Math.max(fastAt + 8, Math.round(exitDist * 0.52));

  var buf = document.createElement('canvas');
  buf.width = BUF_W;
  buf.height = BUF_H;
  var bctx = buf.getContext('2d', { willReadFrequently: true });
  var frame = bctx.createImageData(BUF_W, BUF_H);
  var pix = frame.data;
  var zbuf = new Float32Array(BUF_W);

  var wallTex = null;
  var floorTex = null;
  var ceilTex = null;
  var doorImg = new Image();
  var soldierImg = new Image();
  doorImg.src = 'art/door.webp';
  soldierImg.src = 'art/soldier.webp';
  var dustImg = makeDust();
  var soldierFallback = makeSoldier();

  loadTex('art/wall.webp', function (tex) { wallTex = tex; });
  loadTex('art/floor.webp', function (tex) { floorTex = tex; });
  loadTex('art/ceiling.webp', function (tex) { ceilTex = tex; });

  var SPOTS = [
    { x: 9.5, y: 1.5 },
    { x: 19.5, y: 1.5 },
    { x: 23.5, y: 4.2 },
    { x: 8.5, y: 4.5 },
    { x: 1.5, y: 8.2 },
    { x: 14.5, y: 8.5 },
    { x: 22.6, y: 10.5 }
  ];

  var player = { x: 1.6, y: 1.5, dirX: 1, dirY: 0, planeX: 0, planeY: FOV_PLANE };
  var enemies = [];
  var puffs = [];
  var state = 'title';
  var played = 0;
  var victorySent = false;
  var rotateHold = false;
  var cssW = 844;
  var cssH = 390;
  var dpr = 1;
  var lastFrame = 0;
  var cool = 0;
  var flash = 0;
  var kick = 0;
  var shake = 0;
  var walk = 0;
  var moving = 0;
  var progress = 0;
  var toldFast = false;
  var toldSpread = false;
  var toastT = 0;
  var gunName = 'Steady';
  var horizon = BUF_H * 0.46;

  var pad = { forward: false, back: false, left: false, right: false, fire: false };
  var key = { forward: false, back: false, left: false, right: false, fire: false };

  var motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

  function reduceMotion() {
    return motionQuery.matches;
  }

  function buildMap() {
    var y;
    var x;
    var row;
    var map = [];
    for (y = 0; y < MAP_H; y++) {
      row = [];
      for (x = 0; x < MAP_W; x++) row.push(1);
      map.push(row);
    }
    function carve(x0, y0, x1, y1) {
      var cy;
      var cx;
      for (cy = y0; cy <= y1; cy++) {
        for (cx = x0; cx <= x1; cx++) map[cy][cx] = 0;
      }
    }
    carve(1, 1, 23, 2);
    carve(23, 1, 24, 5);
    carve(2, 4, 24, 5);
    carve(1, 4, 2, 9);
    carve(1, 8, 23, 9);
    carve(23, 8, 24, 11);
    carve(1, 10, 24, 11);
    map[11][24] = 2;
    return map;
  }

  function buildDist() {
    var dist = [];
    var y;
    var x;
    var q = [];
    var head = 0;
    for (y = 0; y < MAP_H; y++) {
      dist.push([]);
      for (x = 0; x < MAP_W; x++) dist[y].push(-1);
    }
    dist[1][1] = 0;
    q.push(1, 1);
    while (head < q.length) {
      x = q[head++];
      y = q[head++];
      visit(x + 1, y, dist[y][x] + 1, dist, q);
      visit(x - 1, y, dist[y][x] + 1, dist, q);
      visit(x, y + 1, dist[y][x] + 1, dist, q);
      visit(x, y - 1, dist[y][x] + 1, dist, q);
    }
    return dist;
  }

  function visit(x, y, d, dist, q) {
    if (x < 0 || y < 0 || x >= MAP_W || y >= MAP_H) return;
    if (MAP[y][x] === 1 || dist[y][x] >= 0) return;
    dist[y][x] = d;
    q.push(x, y);
  }

  function loadTex(src, done) {
    var img = new Image();
    img.onload = function () {
      var c = document.createElement('canvas');
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      var g = c.getContext('2d', { willReadFrequently: true });
      g.drawImage(img, 0, 0);
      done({
        data: g.getImageData(0, 0, c.width, c.height).data,
        w: c.width,
        h: c.height
      });
    };
    img.src = src;
  }

  function makeDust() {
    var c = document.createElement('canvas');
    var g = c.getContext('2d');
    var rad;
    c.width = 64;
    c.height = 64;
    rad = g.createRadialGradient(32, 32, 2, 32, 34, 30);
    rad.addColorStop(0, 'rgba(244, 226, 186, 0.95)');
    rad.addColorStop(0.55, 'rgba(196, 164, 112, 0.45)');
    rad.addColorStop(1, 'rgba(196, 164, 112, 0)');
    g.fillStyle = rad;
    g.beginPath();
    g.arc(32, 34, 30, 0, Math.PI * 2);
    g.fill();
    return c;
  }

  function makeSoldier() {
    var c = document.createElement('canvas');
    var g = c.getContext('2d');
    c.width = 180;
    c.height = 320;
    g.translate(90, 0);
    g.fillStyle = '#6d5840';
    round(g, -28, 248, 26, 58, 8);
    round(g, 4, 248, 26, 58, 8);
    g.fillStyle = '#5d6b3a';
    round(g, -46, 118, 92, 140, 28);
    g.fillStyle = '#6d7b46';
    round(g, -34, 150, 28, 70, 12);
    round(g, 8, 150, 28, 70, 12);
    g.fillStyle = '#f0c2a0';
    g.beginPath();
    g.arc(0, 78, 32, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#8d7344';
    g.beginPath();
    g.ellipse(0, 58, 40, 28, 0, Math.PI, 0);
    g.fill();
    g.fillStyle = '#c47a4a';
    g.beginPath();
    g.arc(0, 84, 6, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#3a2a18';
    g.fillRect(-36, 168, 78, 10);
    return c;
  }

  function round(g, x, y, w, h, r) {
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
    g.fill();
  }

  function say(text) {
    statusEl.textContent = text;
  }

  function soldierSprite() {
    if (soldierImg.complete && soldierImg.naturalWidth > 0) return soldierImg;
    return soldierFallback;
  }

  function doorReady() {
    return doorImg.complete && doorImg.naturalWidth > 0;
  }

  function spawnEnemies() {
    var i;
    enemies = [];
    for (i = 0; i < SPOTS.length; i++) {
      enemies.push({
        x: SPOTS[i].x,
        y: SPOTS[i].y,
        alive: true,
        stun: 0,
        sink: 0,
        bob: Math.random() * 6
      });
    }
  }

  function resetPlayer() {
    player.x = 1.6;
    player.y = 1.5;
    player.dirX = 1;
    player.dirY = 0;
    player.planeX = 0;
    player.planeY = FOV_PLANE;
  }

  function beginRun() {
    resetPlayer();
    spawnEnemies();
    puffs = [];
    played = 0;
    cool = 0;
    flash = 0;
    kick = 0;
    shake = 0;
    walk = 0;
    moving = 0;
    progress = 0;
    toldFast = false;
    toldSpread = false;
    toastT = 0;
    victorySent = false;
    gunName = 'Steady';
    state = 'play';
    startSheet.hidden = true;
    pauseSheet.hidden = true;
    winSheet.hidden = true;
    hintEl.hidden = false;
    toastEl.hidden = true;
    renderHud();
    say('The corridor is open. The green door is at the far end.');
  }

  function openPause() {
    if (state !== 'play') return;
    state = 'pause';
    pauseSheet.hidden = false;
    releasePad();
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
    releasePad();
    say('Gave up before the green door.');
  }

  function releasePad() {
    pad.forward = pad.back = pad.left = pad.right = pad.fire = false;
    var nodes = document.querySelectorAll('.controls button');
    var i;
    for (i = 0; i < nodes.length; i++) nodes[i].classList.remove('held');
  }

  function win() {
    var seconds;
    if (state === 'win') return;
    seconds = Math.max(0, Math.round(played));
    state = 'win';
    releasePad();
    winTimeEl.textContent = 'Out in ' + seconds + ' seconds.';
    winSheet.hidden = false;
    say('The green door. ' + seconds + ' seconds.');
    if (!victorySent) {
      victorySent = true;
      window.dispatchEvent(new CustomEvent('listening-wire:complete', {
        detail: { seconds: seconds }
      }));
      if (window.parent !== window) {
        var relay = { type: 'listening-wire:complete', detail: { seconds: seconds } };
        try {
          var relayRun = new URLSearchParams(location.search).get('runId');
          if (relayRun) relay.runId = relayRun;
        } catch (ignoreRelay) {}
        window.parent.postMessage(relay, (location.protocol === 'http:' || location.protocol === 'https:') ? location.origin : '*');
      }
    }
  }

  function renderHud() {
    var n = 0;
    var i;
    for (i = 0; i < enemies.length; i++) if (enemies[i].alive) n += 1;
    gunEl.textContent = gunName;
    leftEl.textContent = String(n);
  }

  function showToast(text) {
    toastEl.textContent = text;
    toastEl.hidden = false;
    toastT = 2.2;
    say(text);
  }

  function gunLevel() {
    if (progress >= spreadAt) return 2;
    if (progress >= fastAt) return 1;
    return 0;
  }

  function noteProgress() {
    var mx = player.x | 0;
    var my = player.y | 0;
    var d;
    if (my < 0 || mx < 0 || my >= MAP_H || mx >= MAP_W) return;
    d = DIST[my][mx];
    if (d > progress) progress = d;
    if (!toldFast && progress >= fastAt) {
      toldFast = true;
      gunName = 'Quick';
      showToast('Quicker shot');
    }
    if (!toldSpread && progress >= spreadAt) {
      toldSpread = true;
      gunName = 'Spread';
      showToast('Spread shot');
    }
  }

  function solid(x, y, radius) {
    var r = radius;
    return cellSolid(x - r, y - r) || cellSolid(x + r, y - r) || cellSolid(x - r, y + r) || cellSolid(x + r, y + r);
  }

  function cellSolid(x, y) {
    var mx = x | 0;
    var my = y | 0;
    if (mx < 0 || my < 0 || mx >= MAP_W || my >= MAP_H) return true;
    return MAP[my][mx] === 1;
  }

  function tryMove(dx, dy) {
    if (!solid(player.x + dx, player.y, 0.18)) player.x += dx;
    if (!solid(player.x, player.y + dy, 0.18)) player.y += dy;
  }

  function turn(a) {
    var c = Math.cos(a);
    var s = Math.sin(a);
    var dx = player.dirX;
    var dy = player.dirY;
    var px = player.planeX;
    var py = player.planeY;
    player.dirX = dx * c - dy * s;
    player.dirY = dx * s + dy * c;
    player.planeX = px * c - py * s;
    player.planeY = px * s + py * c;
  }

  function sees(ex, ey) {
    var dx = player.x - ex;
    var dy = player.y - ey;
    var dist = Math.hypot(dx, dy);
    var steps = (dist / 0.15) | 0;
    var i;
    if (dist < 0.2) return true;
    for (i = 1; i < steps; i++) {
      if (cellSolid(ex + dx * (i / steps), ey + dy * (i / steps))) return false;
    }
    return true;
  }

  function bump(dx, dy) {
    var len = Math.hypot(dx, dy) || 1;
    var ox = -dx / len;
    var oy = -dy / len;
    var step;
    for (step = 0; step < 6; step++) {
      if (!solid(player.x + ox * 0.16, player.y, 0.18)) player.x += ox * 0.16;
      if (!solid(player.x, player.y + oy * 0.16, 0.18)) player.y += oy * 0.16;
    }
    if (!reduceMotion()) shake = 7;
    say('A soldier bumped you back.');
  }

  function updateEnemies(dt) {
    var i;
    var e;
    var dx;
    var dy;
    var dist;
    var step;
    var mx;
    var my;
    for (i = 0; i < enemies.length; i++) {
      e = enemies[i];
      if (!e.alive) {
        e.sink += dt * 1.7;
        continue;
      }
      if (e.stun > 0) {
        e.stun -= dt;
        continue;
      }
      dx = player.x - e.x;
      dy = player.y - e.y;
      dist = Math.hypot(dx, dy);
      if (dist < 0.48) {
        bump(dx, dy);
        e.stun = 1.3;
        continue;
      }
      if (dist > 6.4 || !sees(e.x, e.y)) continue;
      step = 0.9 * dt;
      mx = dx / dist * step;
      my = dy / dist * step;
      if (!solid(e.x + mx, e.y, 0.26)) e.x += mx;
      if (!solid(e.x, e.y + my, 0.26)) e.y += my;
    }
    for (i = 0; i < enemies.length; i++) {
      e = enemies[i];
      if (!e.alive) continue;
      var j;
      for (j = i + 1; j < enemies.length; j++) {
        var o = enemies[j];
        var sx;
        var sy;
        var sd;
        if (!o.alive) continue;
        sx = o.x - e.x;
        sy = o.y - e.y;
        sd = Math.hypot(sx, sy);
        if (sd > 0.01 && sd < 0.52) {
          sx /= sd;
          sy /= sd;
          e.x -= sx * 0.02;
          e.y -= sy * 0.02;
          o.x += sx * 0.02;
          o.y += sy * 0.02;
        }
      }
    }
  }

  function dropEnemy(e) {
    if (!e.alive) return;
    e.alive = false;
    e.sink = 0;
    puffs.push({ x: e.x, y: e.y, life: 0.55 });
    puffs.push({ x: e.x + 0.12, y: e.y - 0.05, life: 0.4 });
  }

  function rayWall(angle) {
    var rayDirX = Math.cos(angle);
    var rayDirY = Math.sin(angle);
    var mapX = player.x | 0;
    var mapY = player.y | 0;
    var deltaX = rayDirX === 0 ? 1e30 : Math.abs(1 / rayDirX);
    var deltaY = rayDirY === 0 ? 1e30 : Math.abs(1 / rayDirY);
    var stepX = rayDirX < 0 ? -1 : 1;
    var stepY = rayDirY < 0 ? -1 : 1;
    var sideX = rayDirX < 0 ? (player.x - mapX) * deltaX : (mapX + 1 - player.x) * deltaX;
    var sideY = rayDirY < 0 ? (player.y - mapY) * deltaY : (mapY + 1 - player.y) * deltaY;
    var side = 0;
    var guard = 0;
    var perp;
    while (guard++ < 48) {
      if (sideX < sideY) {
        sideX += deltaX;
        mapX += stepX;
        side = 0;
      } else {
        sideY += deltaY;
        mapY += stepY;
        side = 1;
      }
      if (mapX < 0 || mapY < 0 || mapX >= MAP_W || mapY >= MAP_H || MAP[mapY][mapX] === 1) break;
    }
    perp = side === 0 ? (sideX - deltaX) : (sideY - deltaY);
    return perp > 0 ? perp : 0.05;
  }

  function tryShoot() {
    var level;
    var angles;
    var i;
    var aim;
    var wall;
    var best;
    var bestD;
    var n;
    var e;
    var dx;
    var dy;
    var along;
    var perp;
    if (cool > 0 || state !== 'play') return;
    level = gunLevel();
    cool = level >= 1 ? 0.26 : 0.56;
    flash = 0.09;
    kick = 1;
    angles = level >= 2 ? [-0.14, 0, 0.14] : [0];
    aim = Math.atan2(player.dirY, player.dirX);
    for (i = 0; i < angles.length; i++) {
      wall = rayWall(aim + angles[i]);
      best = null;
      bestD = wall;
      for (n = 0; n < enemies.length; n++) {
        e = enemies[n];
        if (!e.alive) continue;
        dx = e.x - player.x;
        dy = e.y - player.y;
        along = dx * Math.cos(aim + angles[i]) + dy * Math.sin(aim + angles[i]);
        if (along < 0.35 || along >= bestD) continue;
        perp = Math.abs(dx * Math.sin(aim + angles[i]) - dy * Math.cos(aim + angles[i]));
        if (perp < 0.34) {
          best = e;
          bestD = along;
        }
      }
      if (best) dropEnemy(best);
    }
    hintEl.hidden = true;
  }

  function update(dt) {
    var speed = 2.55 * dt;
    var turned = false;
    var walked = false;
    if (want('left')) {
      turn(-2.35 * dt);
      turned = true;
    }
    if (want('right')) {
      turn(2.35 * dt);
      turned = true;
    }
    if (want('forward')) {
      tryMove(player.dirX * speed, player.dirY * speed);
      walked = true;
    }
    if (want('back')) {
      tryMove(-player.dirX * speed * 0.82, -player.dirY * speed * 0.82);
      walked = true;
    }
    moving = walked ? 1 : 0;
    if (walked && !reduceMotion()) walk += dt * 9;
    if (turned || walked) hintEl.hidden = true;
    if (cool > 0) cool -= dt;
    if (want('fire')) tryShoot();
    if (flash > 0) flash -= dt;
    if (kick > 0) kick = Math.max(0, kick - dt * 5);
    if (shake > 0) shake = Math.max(0, shake - dt * 18);
    if (toastT > 0) {
      toastT -= dt;
      if (toastT <= 0) toastEl.hidden = true;
    }
    updateEnemies(dt);
    var i;
    for (i = puffs.length - 1; i >= 0; i--) {
      puffs[i].life -= dt;
      if (puffs[i].life <= 0) puffs.splice(i, 1);
    }
    noteProgress();
    var ex = player.x | 0;
    var ey = player.y | 0;
    if (ey >= 0 && ex >= 0 && ey < MAP_H && ex < MAP_W && MAP[ey][ex] === 2) win();
    else if (Math.hypot(player.x - EXIT_X, player.y - EXIT_Y) < 0.85) win();
  }

  function sample(tex, u, v, shade, fog, di) {
    var tx;
    var ty;
    var ti;
    var r;
    var g;
    var b;
    if (!tex) {
      r = 150;
      g = 140;
      b = 120;
    } else {
      tx = (u * tex.w) | 0;
      ty = (v * tex.h) | 0;
      if (tx < 0) tx = 0;
      if (ty < 0) ty = 0;
      if (tx >= tex.w) tx = tex.w - 1;
      if (ty >= tex.h) ty = tex.h - 1;
      ti = (ty * tex.w + tx) * 4;
      r = tex.data[ti];
      g = tex.data[ti + 1];
      b = tex.data[ti + 2];
    }
    r = r * shade * (1 - fog) + 78 * fog;
    g = g * shade * (1 - fog) + 74 * fog;
    b = b * shade * (1 - fog) + 64 * fog;
    pix[di] = r < 0 ? 0 : r > 255 ? 255 : r;
    pix[di + 1] = g < 0 ? 0 : g > 255 ? 255 : g;
    pix[di + 2] = b < 0 ? 0 : b > 255 ? 255 : b;
    pix[di + 3] = 255;
  }

  function paintWorld() {
    var dirX = player.dirX;
    var dirY = player.dirY;
    var planeX = player.planeX;
    var planeY = player.planeY;
    var y;
    var x;
    var ceiling;
    var row;
    var fog;
    var stepX;
    var stepY;
    var fx;
    var fy;
    var cx;
    var cy;
    for (y = 0; y < BUF_H; y++) {
      ceiling = y < horizon;
      row = ceiling ? (horizon - y) : (y - horizon);
      if (row < 1) row = 1;
      row = (0.5 * BUF_H) / row;
      fog = row / (row + 16);
      if (fog > 0.42) fog = 0.42;
      stepX = row * (2 * planeX) / BUF_W;
      stepY = row * (2 * planeY) / BUF_W;
      fx = player.x + row * (dirX - planeX);
      fy = player.y + row * (dirY - planeY);
      for (x = 0; x < BUF_W; x += 2) {
        cx = fx - Math.floor(fx);
        cy = fy - Math.floor(fy);
        if (cx < 0) cx += 1;
        if (cy < 0) cy += 1;
        var di = (y * BUF_W + x) * 4;
        sample(ceiling ? ceilTex : floorTex, cx, cy, ceiling ? 0.92 : 1, fog, di);
        pix[di + 4] = pix[di];
        pix[di + 5] = pix[di + 1];
        pix[di + 6] = pix[di + 2];
        pix[di + 7] = 255;
        fx += stepX * 2;
        fy += stepY * 2;
      }
    }

    for (x = 0; x < BUF_W; x++) {
      var cameraX = 2 * x / BUF_W - 1;
      var rayDirX = dirX + planeX * cameraX;
      var rayDirY = dirY + planeY * cameraX;
      var mapX = player.x | 0;
      var mapY = player.y | 0;
      var deltaX = rayDirX === 0 ? 1e30 : Math.abs(1 / rayDirX);
      var deltaY = rayDirY === 0 ? 1e30 : Math.abs(1 / rayDirY);
      var stepXi = rayDirX < 0 ? -1 : 1;
      var stepYi = rayDirY < 0 ? -1 : 1;
      var sideX = rayDirX < 0 ? (player.x - mapX) * deltaX : (mapX + 1 - player.x) * deltaX;
      var sideY = rayDirY < 0 ? (player.y - mapY) * deltaY : (mapY + 1 - player.y) * deltaY;
      var side = 0;
      var guard = 0;
      var perp;
      var wallX;
      var lineH;
      var drawStart;
      var drawEnd;
      var shade;
      var texStep;
      var texPos;
      var v;
      while (guard++ < 48) {
        if (sideX < sideY) {
          sideX += deltaX;
          mapX += stepXi;
          side = 0;
        } else {
          sideY += deltaY;
          mapY += stepYi;
          side = 1;
        }
        if (mapX < 0 || mapY < 0 || mapX >= MAP_W || mapY >= MAP_H || MAP[mapY][mapX] === 1) break;
      }
      perp = side === 0 ? (sideX - deltaX) : (sideY - deltaY);
      if (perp < 0.05) perp = 0.05;
      zbuf[x] = perp;
      if (side === 0) wallX = player.y + perp * rayDirY;
      else wallX = player.x + perp * rayDirX;
      wallX -= Math.floor(wallX);
      if (side === 0 && rayDirX > 0) wallX = 1 - wallX;
      if (side === 1 && rayDirY < 0) wallX = 1 - wallX;
      lineH = (BUF_H / perp) | 0;
      drawStart = ((-lineH / 2) + horizon) | 0;
      drawEnd = ((lineH / 2) + horizon) | 0;
      if (drawStart < 0) drawStart = 0;
      if (drawEnd >= BUF_H) drawEnd = BUF_H - 1;
      shade = (side ? 0.86 : 1);
      fog = perp / (perp + 11);
      if (fog > 0.4) fog = 0.4;
      texStep = 1 / lineH;
      texPos = (drawStart - horizon + lineH / 2) * texStep;
      for (y = drawStart; y <= drawEnd; y++) {
        v = texPos;
        if (v < 0) v = 0;
        if (v > 0.999) v = 0.999;
        texPos += texStep;
        sample(wallTex, wallX, v, shade, fog, (y * BUF_W + x) * 4);
      }
    }
    bctx.putImageData(frame, 0, 0);
  }

  function drawBillboard(image, wx, wy, heightScale, widthMul, alpha) {
    var dx;
    var dy;
    var det;
    var tx;
    var ty;
    var screenX;
    var spriteH;
    var spriteW;
    var left;
    var top;
    var floorY;
    var col;
    var run;
    if (!image || !image.width || alpha <= 0.02) return;
    dx = wx - player.x;
    dy = wy - player.y;
    det = player.planeX * player.dirY - player.dirX * player.planeY;
    if (Math.abs(det) < 1e-6) return;
    tx = (player.dirY * dx - player.dirX * dy) / det;
    ty = (-player.planeY * dx + player.planeX * dy) / det;
    if (ty < 0.08) return;
    screenX = (BUF_W / 2) * (1 + tx / ty);
    spriteH = Math.abs(BUF_H / ty) * heightScale;
    spriteW = spriteH * (image.width / image.height) * widthMul;
    left = screenX - spriteW / 2;
    floorY = horizon + (0.5 * BUF_H) / ty;
    top = floorY - spriteH;
    bctx.save();
    bctx.globalAlpha = alpha;
    col = Math.max(0, left) | 0;
    var end = Math.min(BUF_W - 1, left + spriteW) | 0;
    while (col <= end) {
      while (col <= end && !(ty < zbuf[col] - 0.04)) col++;
      run = col;
      while (col <= end && ty < zbuf[col] - 0.04) col++;
      if (col > run) {
        bctx.drawImage(
          image,
          ((run - left) / spriteW) * image.width,
          0,
          Math.max(0.01, ((col - run) / spriteW) * image.width),
          image.height,
          run,
          top,
          col - run,
          spriteH
        );
      }
    }
    bctx.restore();
  }

  function drawSprites() {
    var list = [];
    var i;
    var e;
    var alpha;
    var scale;
    for (i = 0; i < enemies.length; i++) {
      e = enemies[i];
      if (!e.alive && e.sink >= 1) continue;
      alpha = e.alive ? 1 : 1 - e.sink;
      scale = e.alive ? 0.86 : 0.86 * (1 - e.sink * 0.45);
      list.push({
        img: soldierSprite(),
        x: e.x,
        y: e.y + (reduceMotion() ? 0 : Math.sin(walk + e.bob) * 0.012),
        h: scale,
        w: 1,
        a: alpha,
        d: (e.x - player.x) * (e.x - player.x) + (e.y - player.y) * (e.y - player.y)
      });
    }
    if (doorReady()) {
      list.push({
        img: doorImg,
        x: EXIT_X,
        y: EXIT_Y,
        h: 0.98,
        w: 0.58,
        a: 1,
        d: (EXIT_X - player.x) * (EXIT_X - player.x) + (EXIT_Y - player.y) * (EXIT_Y - player.y)
      });
    }
    for (i = 0; i < puffs.length; i++) {
      list.push({
        img: dustImg,
        x: puffs[i].x,
        y: puffs[i].y,
        h: 0.42 + (0.55 - puffs[i].life) * 0.3,
        w: 1,
        a: Math.max(0, puffs[i].life / 0.55),
        d: (puffs[i].x - player.x) * (puffs[i].x - player.x) + (puffs[i].y - player.y) * (puffs[i].y - player.y)
      });
    }
    list.sort(function (a, b) { return b.d - a.d; });
    for (i = 0; i < list.length; i++) {
      drawBillboard(list[i].img, list[i].x, list[i].y, list[i].h, list[i].w, list[i].a);
    }
  }

  function drawGun() {
    var bob = reduceMotion() ? 0 : Math.sin(walk) * 7 * moving;
    var lift = kick * 26;
    var level = gunLevel();
    var spread = level >= 2;
    ctx.save();
    ctx.translate(cssW * 0.58, cssH * 0.98 + bob + lift);
    ctx.rotate(-0.42 - kick * 0.08);
    ctx.fillStyle = '#d7b394';
    ctx.beginPath();
    ctx.ellipse(18, 8, 26, 18, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#6b3e22';
    ctx.beginPath();
    ctx.moveTo(-8, 4);
    ctx.quadraticCurveTo(70, -6, 118, -18);
    ctx.lineTo(118, 2);
    ctx.quadraticCurveTo(70, 16, -4, 22);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#3c4650';
    ctx.fillRect(108, -22, spread ? 92 : 108, 12);
    if (spread) ctx.fillRect(108, -8, 92, 10);
    ctx.fillStyle = level >= 1 ? '#e2b85a' : '#8d7344';
    ctx.fillRect(96, -16, 22, 16);
    if (flash > 0) {
      ctx.fillStyle = 'rgba(255, 214, 120, 0.9)';
      ctx.beginPath();
      ctx.arc(spread ? 196 : 214, -16, 16 + flash * 40, 0, Math.PI * 2);
      ctx.fill();
      if (spread) {
        ctx.beginPath();
        ctx.arc(196, -4, 12, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  function drawCrosshair() {
    var x = cssW * 0.5;
    var y = cssH * 0.46;
    ctx.strokeStyle = 'rgba(247, 236, 214, 0.85)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - 10, y);
    ctx.lineTo(x - 4, y);
    ctx.moveTo(x + 4, y);
    ctx.lineTo(x + 10, y);
    ctx.moveTo(x, y - 10);
    ctx.lineTo(x, y - 4);
    ctx.moveTo(x, y + 4);
    ctx.lineTo(x, y + 10);
    ctx.stroke();
  }

  function render() {
    var mag = reduceMotion() ? 0 : shake;
    paintWorld();
    drawSprites();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#141810';
    ctx.fillRect(0, 0, cssW, cssH);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(buf, mag * Math.sin(played * 40) * 0.4, mag * 0.3, cssW, cssH);
    var vg = ctx.createRadialGradient(cssW * 0.5, cssH * 0.46, cssH * 0.2, cssW * 0.5, cssH * 0.46, cssH * 0.72);
    vg.addColorStop(0, 'rgba(0, 0, 0, 0)');
    vg.addColorStop(1, 'rgba(12, 14, 10, 0.22)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, cssW, cssH);
    drawCrosshair();
    drawGun();
  }

  function resize() {
    var rect = canvas.getBoundingClientRect();
    cssW = Math.max(1, rect.width);
    cssH = Math.max(1, rect.height);
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
  }

  function want(name) {
    return !!(pad[name] || key[name]);
  }

  function loop(now) {
    var dt = (now - lastFrame) / 1000;
    lastFrame = now;
    if (dt < 0) dt = 0;
    if (dt > 0.05) dt = 0.05;
    if (state === 'play') {
      played += dt;
      update(dt);
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

  function bindHold(id, name) {
    var btn = document.getElementById(id);
    btn.addEventListener('pointerdown', function (event) {
      if (event.button !== 0) return;
      event.preventDefault();
      pad[name] = true;
      btn.classList.add('held');
      if (btn.setPointerCapture) btn.setPointerCapture(event.pointerId);
    });
    function up(event) {
      if (event.pointerId != null && btn.hasPointerCapture && btn.hasPointerCapture(event.pointerId)) {
        btn.releasePointerCapture(event.pointerId);
      }
      pad[name] = false;
      btn.classList.remove('held');
    }
    btn.addEventListener('pointerup', up);
    btn.addEventListener('pointercancel', up);
    btn.addEventListener('contextmenu', function (event) { event.preventDefault(); });
  }

  bindHold('forward', 'forward');
  bindHold('back', 'back');
  bindHold('turn-left', 'left');
  bindHold('turn-right', 'right');
  bindHold('fire', 'fire');

  window.addEventListener('keydown', function (event) {
    var moveKey = true;
    if (event.key === 'Escape') {
      event.preventDefault();
      if (state === 'play') openPause();
      else if (state === 'pause') closePause();
      return;
    }
    if (event.key === 'ArrowUp' || event.key === 'w' || event.key === 'W') key.forward = true;
    else if (event.key === 'ArrowDown' || event.key === 's' || event.key === 'S') key.back = true;
    else if (event.key === 'ArrowLeft' || event.key === 'a' || event.key === 'A') key.left = true;
    else if (event.key === 'ArrowRight' || event.key === 'd' || event.key === 'D') key.right = true;
    else if (event.key === ' ' || event.key === 'Enter') key.fire = true;
    else moveKey = false;
    if (moveKey) event.preventDefault();
  });

  window.addEventListener('keyup', function (event) {
    if (event.key === 'ArrowUp' || event.key === 'w' || event.key === 'W') key.forward = false;
    else if (event.key === 'ArrowDown' || event.key === 's' || event.key === 'S') key.back = false;
    else if (event.key === 'ArrowLeft' || event.key === 'a' || event.key === 'A') key.left = false;
    else if (event.key === 'ArrowRight' || event.key === 'd' || event.key === 'D') key.right = false;
    else if (event.key === ' ' || event.key === 'Enter') key.fire = false;
  });

  window.addEventListener('blur', releasePad);
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

  spawnEnemies();
  resize();
  syncPortrait();
  renderHud();
  lastFrame = performance.now();
  requestAnimationFrame(loop);
})();
