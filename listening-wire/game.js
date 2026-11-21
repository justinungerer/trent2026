/* Chapter 7 — The Listening Wire.
   First-person maze in the enemy wire room. A small raycaster,
   painted walls, and cartoon soldiers who shoot back.
   No libraries. Sprites live in art/. */
'use strict';

(function () {
  var canvas = document.getElementById('yard');
  var ctx = canvas.getContext('2d');
  var healthEl = document.getElementById('health');
  var armorEl = document.getElementById('armor');
  var bulletsEl = document.getElementById('bullets');
  var hintEl = document.getElementById('hint');
  var toastEl = document.getElementById('toast');
  var loadoutEl = document.getElementById('loadout');
  var startSheet = document.getElementById('start-sheet');
  var pauseSheet = document.getElementById('pause-sheet');
  var winSheet = document.getElementById('win-sheet');
  var loseSheet = document.getElementById('lose-sheet');
  var winTimeEl = document.getElementById('win-time');
  var portraitEl = document.getElementById('portrait');
  var statusEl = document.getElementById('status');

  var BUF_W = 420;
  var BUF_H = 236;
  var FOV_PLANE = 0.72;
  var WALK_SPEED = 2.55;
  var ENEMY_SPEED_SCALE = 0.375;
  var discovered = new Set();
  var mapSheet = document.getElementById('map-sheet');
  var mapCanvas = document.getElementById('maze-map');
  var wallTiles = [];
  var floorTiles = [];
  var PATROL_STEPS = [[1, 0], [0, 1], [-1, 0], [0, -1]];
  var MAX_HEALTH = 5 + (window.TrentMissionBonus || 0);
  var MAX_ARMOR = 3;
  var stage = new URLSearchParams(location.search).get('stage');
  var listening = stage === 'the-listening-post';
  var gatehouse = stage === 'gatehouse-code';
  var maze = listening ? { width: 21, height: 17, seed: 2028, shortcuts: 4, baseGuards: 18 } :
    gatehouse ? { width: 33, height: 25, seed: 99, shortcuts: 16, baseGuards: 30 } :
      { width: 25, height: 19, seed: 1944, shortcuts: 6, baseGuards: 26 };
  var MAP_W = maze.width;
  var MAP_H = maze.height;
  var dispatchesNeeded = gatehouse ? 0 : listening ? 1 : 3;
  var dispatchesFound = 0;
  var hasCellKey = false;
  var rudolphFreed = false;
  var closedCellTex = null;
  var openCellTex = null;
  var armorImg = new Image();
  armorImg.src = 'art/painted-body-armor.webp';
  var dispatchImg = new Image();
  var cellKeyImg = new Image();
  var medkitImg = new Image();
  var rifleImg = new Image();
  medkitImg.src = 'art/painted-medkit.webp';
  rifleImg.src = 'art/painted-rifle.webp';
  if (gatehouse) {
    cellKeyImg.src = '../shelf-escape/art/props/depot-key.webp';
    loadTex('art/rudolph-cell-closed.webp', function (tex) { closedCellTex = tex; });
    loadTex('art/rudolph-cell-open.webp', function (tex) { openCellTex = tex; });
    document.getElementById('corridor-stage-title').textContent = 'Rudolph’s Cell';
    document.getElementById('corridor-stage-goal').textContent =
      'Find the cell key, then walk up to the barred cell to free Rudolph. Once he is free, reach the green exit.';
    document.getElementById('map-objectives').textContent = 'K = cell key · R = Rudolph’s cell · Green marker = complete';
    document.getElementById('wire-win-title').textContent = 'Rudolph is free';
  } else {
    dispatchImg.src = '../chapter-2/art/mail.webp';
    document.getElementById('corridor-stage-title').textContent = listening ? 'The Listening Post' : 'The Corridor';
    document.getElementById('corridor-stage-goal').textContent = listening
      ? 'Recover the coded dispatch in the listening wing, then reach the green exit.'
      : 'Recover all three coded dispatches, then reach the green exit.';
    document.getElementById('map-objectives').textContent = 'D = dispatch · Green marker = collected';
    document.getElementById('wire-win-title').textContent = 'Dispatches secured';
  }

  var KINDS = [
    { name: 'Soldier', move: 1.05, range: 6.4, wait: 1.55, shot: 4.6, hold: 2.5, h: 0.86, hp: 1, art: 'rifleman' },
    { name: 'Runner', move: 1.65, range: 4.8, wait: 1.05, shot: 5.5, hold: 1.15, h: 0.76, hp: 1, art: 'runner' },
    { name: 'Heavy guard', move: 0.55, range: 9.4, wait: 2.1, shot: 5.8, hold: 5.4, h: 0.96, hp: 2, art: 'heavy' }
  ];

  var MAP;
  var EXIT_X = 2.5;
  var EXIT_Y = 1.5;
  var LEVEL;

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
  var kindSprites = KINDS.map(function (kind) {
    var image = new Image();
    image.src = 'art/guard-' + kind.art + '.webp';
    return image;
  });
  var guardWalk = new Image();
  var guardFrames = [];
  guardWalk.onload = function () {
    var width = guardWalk.naturalWidth / 4;
    var height = guardWalk.naturalHeight / KINDS.length;
    guardFrames = KINDS.map(function (_, row) {
      return [0, 1, 2, 3].map(function (col) {
        var sprite = document.createElement('canvas');
        sprite.width = width;
        sprite.height = height;
        sprite.getContext('2d').drawImage(guardWalk, col * width, row * height, width, height, 0, 0, width, height);
        return sprite;
      });
    });
  };
  guardWalk.src = 'art/guard-walk-atlas.webp';
  var soldierFallback = makeSoldier();
  var burstImg = makeBurst();
  var kitImg = makeKit();
  var bulletImg = new Image();
  bulletImg.src = 'art/ammo-bullet.webp';
  var bulletFallback = makeBullet();
  var shotImg = makeShot();
  var alertImg = makeAlert();

  var textureTheme = listening ? 'listening' : gatehouse ? 'gatehouse' : 'bunker';
  for (var tile = 0; tile < 3; tile++) {
    (function (index) {
      loadTex('art/' + textureTheme + '-wall-' + index + '.webp', function (tex) { wallTiles[index] = tex; });
      loadTex('art/' + textureTheme + '-floor-' + index + '.webp', function (tex) { floorTiles[index] = tex; });
    })(tile);
  }
  loadTex('art/wall.webp', function (tex) { wallTex = tex; });
  loadTex('art/floor.webp', function (tex) { floorTex = tex; });
  loadTex('art/ceiling.webp', function (tex) { ceilTex = tex; });
  soldierImg.src = 'art/soldier.webp';

  var player = { x: 1.5, y: 1.5, dirX: 1, dirY: 0, planeX: 0, planeY: FOV_PLANE };
  var enemies = [];
  var pickups = [];
  var shots = [];
  var bursts = [];
  var health = MAX_HEALTH;
  var armor = 0;
  var ammo = readStartAmmo();
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
  var hurtT = 0;
  var toastT = 0;
  var dryNoted = false;
  var horizon = BUF_H * 0.46;

  var pad = { forward: false, back: false, left: false, right: false, fire: false };
  var key = { forward: false, back: false, left: false, right: false, fire: false };

  var motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

  function reduceMotion() {
    return motionQuery.matches;
  }

  /* Starting bullets use the lives query, the same quiz score wrapping-line reads.
     Missing or unreadable starts at 10. The value is capped at 10. */
  function livesQuery() {
    try {
      return new URLSearchParams(window.location.search).get('lives');
    } catch (ignoreLives) {
      return null;
    }
  }

  function readStartAmmo() {
    var raw = livesQuery();
    var n;
    if (raw == null) return 10;
    raw = String(raw).trim();
    if (!/^\d+$/.test(raw)) return 10;
    n = Number(raw);
    if (n > 10) return 10;
    return n;
  }

  function mulberry32(seed) {
    var a = seed | 0;
    return function () {
      a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  function buildMaze(seed) {
    var map = [];
    var y;
    var x;
    var row;
    var rng = mulberry32(seed);
    var seen = {};
    var stack;
    var dirs = [[2, 0], [-2, 0], [0, 2], [0, -2]];
    var cur;
    var options;
    var i;
    var nx;
    var ny;
    var pick;
    var tries;
    var made;
    var openH;
    var openV;
    for (y = 0; y < MAP_H; y++) {
      row = [];
      for (x = 0; x < MAP_W; x++) row.push(1);
      map.push(row);
    }
    for (y = 1; y < MAP_H; y += 2) {
      for (x = 1; x < MAP_W; x += 2) map[y][x] = 0;
    }
    stack = [{ x: 1, y: 1 }];
    seen['1,1'] = true;
    while (stack.length) {
      cur = stack[stack.length - 1];
      options = [];
      for (i = 0; i < 4; i++) {
        nx = cur.x + dirs[i][0];
        ny = cur.y + dirs[i][1];
        if (nx > 0 && ny > 0 && nx < MAP_W - 1 && ny < MAP_H - 1 && map[ny][nx] === 0 && !seen[nx + ',' + ny]) {
          options.push([nx, ny, dirs[i][0], dirs[i][1]]);
        }
      }
      if (!options.length) {
        stack.pop();
        continue;
      }
      pick = options[(rng() * options.length) | 0];
      map[cur.y + pick[3] / 2][cur.x + pick[2] / 2] = 0;
      seen[pick[0] + ',' + pick[1]] = true;
      stack.push({ x: pick[0], y: pick[1] });
    }
    tries = 0;
    made = 0;
    while (made < maze.shortcuts && tries < 500) {
      tries += 1;
      x = 1 + ((rng() * (MAP_W - 2)) | 0);
      y = 1 + ((rng() * (MAP_H - 2)) | 0);
      if (map[y][x] !== 1) continue;
      openH = map[y][x - 1] !== 1 && map[y][x + 1] !== 1;
      openV = map[y - 1][x] !== 1 && map[y + 1][x] !== 1;
      if (openH || openV) {
        map[y][x] = 0;
        made += 1;
      }
    }
    return map;
  }

  function buildDistances(map) {
    var dist = [];
    var y;
    var x;
    var q = [1, 1];
    var head = 0;
    for (y = 0; y < MAP_H; y++) {
      dist.push([]);
      for (x = 0; x < MAP_W; x++) dist[y].push(-1);
    }
    dist[1][1] = 0;
    while (head < q.length) {
      x = q[head++];
      y = q[head++];
      visitDist(map, dist, q, x + 1, y, dist[y][x] + 1);
      visitDist(map, dist, q, x - 1, y, dist[y][x] + 1);
      visitDist(map, dist, q, x, y + 1, dist[y][x] + 1);
      visitDist(map, dist, q, x, y - 1, dist[y][x] + 1);
    }
    return dist;
  }

  function visitDist(map, dist, q, x, y, d) {
    if (x < 0 || y < 0 || x >= MAP_W || y >= MAP_H) return;
    if (map[y][x] === 1 || dist[y][x] >= 0) return;
    dist[y][x] = d;
    q.push(x, y);
  }

  function separated(list, x, y, min) {
    var i;
    var dx;
    var dy;
    for (i = 0; i < list.length; i++) {
      dx = list[i].x - x;
      dy = list[i].y - y;
      if (dx * dx + dy * dy < min * min) return false;
    }
    return true;
  }

  function nearestFree(pool, target, chosen, already, sep) {
    var rad;
    var cand;
    for (rad = 0; rad < pool.length; rad++) {
      cand = poolAt(pool, target - rad, chosen, already, sep);
      if (cand) return cand;
      if (rad === 0) continue;
      cand = poolAt(pool, target + rad, chosen, already, sep);
      if (cand) return cand;
    }
    return null;
  }

  function poolAt(pool, index, chosen, already, sep) {
    var c;
    if (index < 0 || index >= pool.length) return null;
    c = pool[index];
    if (c.used) return null;
    if (!separated(chosen, c.x, c.y, sep)) return null;
    if (!separated(already, c.x, c.y, Math.max(1.4, sep * 0.45))) return null;
    return c;
  }

  function spreadTake(cells, pred, count, minSep, already) {
    var pool = [];
    var chosen = [];
    var sep = minSep;
    var pass;
    var i;
    var marks;
    var n;
    var target;
    var cand;
    for (i = 0; i < cells.length; i++) {
      if (pred(cells[i]) && !cells[i].used) pool.push(cells[i]);
    }
    if (!pool.length) return chosen;
    for (pass = 0; pass < 6 && chosen.length < count; pass++) {
      marks = [];
      for (n = 0; n < count - chosen.length; n++) {
        target = Math.round(((chosen.length + marks.length + 1) / (count + 1)) * (pool.length - 1));
        cand = nearestFree(pool, target, chosen.concat(marks), already, sep);
        if (!cand) break;
        marks.push(cand);
      }
      for (i = 0; i < marks.length; i++) {
        marks[i].used = true;
        chosen.push(marks[i]);
      }
      if (!marks.length) sep *= 0.62;
    }
    return chosen;
  }

  function makeLevel() {
    var map = buildMaze(maze.seed);
    var dist = buildDistances(map);
    var best = -1;
    var ex = 1;
    var ey = 1;
    var y;
    var x;
    var cells = [];
    var placed = [];
    var enemies = [];
    var pickups = [];
    var boxes;
    var kits;
    var cell = null;
    var i;
    var faceX = 1;
    var faceY = 0;
    for (y = 0; y < MAP_H; y++) {
      for (x = 0; x < MAP_W; x++) {
        if (map[y][x] === 1) continue;
        if ((x !== 1 || y !== 1) && dist[y][x] > best) {
          best = dist[y][x];
          ex = x;
          ey = y;
        }
      }
    }
    map[ey][ex] = 2;
    for (y = 0; y < MAP_H; y++) {
      for (x = 0; x < MAP_W; x++) {
        if (map[y][x] === 1) continue;
        if (x === ex && y === ey) continue;
        cells.push({ x: x + 0.5, y: y + 0.5, d: dist[y][x], used: false });
      }
    }
    cells.sort(function (a, b) { return a.d - b.d || a.x - b.x; });
    if (gatehouse) {
      cell = placeRudolphCell(map, cells, best, placed, pickups);
    } else {
      var dispatchCells = spreadTake(cells, function (cell) {
        return cell.d > best * 0.3 && cell.d < best * 0.85;
      }, dispatchesNeeded, 9, placed);
      dispatchCells.forEach(function (cell) {
        placed.push(cell);
        pickups.push({ x: cell.x, y: cell.y, kind: 'dispatch', bob: 0 });
      });
    }
    var startingAmmo = spreadTake(cells, function (c) { return c.d >= 4 && c.d <= 8; }, 2, 2, placed);
    startingAmmo.forEach(function (cell) {
      placed.push(cell);
      pickups.push({ x: cell.x, y: cell.y, kind: 'ammo', n: 4, bob: 0.4 });
    });
    enemies = spreadTake(cells, function (c) { return c.d >= 9; }, maze.baseGuards, 1.4, placed);
    enemies.sort(function (a, b) { return a.d - b.d; });
    for (i = 0; i < enemies.length; i++) placed.push(enemies[i]);
    boxes = spreadTake(cells, function (c) { return c.d >= 12; }, 12, 2.8, placed);
    for (i = 0; i < boxes.length; i++) {
      placed.push(boxes[i]);
      pickups.push({ x: boxes[i].x, y: boxes[i].y, kind: 'ammo', n: 2, bob: i * 0.8 });
    }
    kits = spreadTake(cells, function (c) { return c.d >= 10; }, 12, 4.5, placed);
    for (i = 0; i < kits.length; i++) {
      pickups.push({ x: kits[i].x, y: kits[i].y, kind: 'health', n: 1, bob: i * 0.6 });
    }
    enemies = enemies.concat(spreadTake(cells, function (c) { return c.d >= 9; }, enemies.length, 1.4, []));
    enemies.sort(function (a, b) { return a.d - b.d; });
    if (map[1][2] === 1 && map[2][1] !== 1) {
      faceX = 0;
      faceY = 1;
    }
    return {
      map: map,
      exitX: ex + 0.5,
      exitY: ey + 0.5,
      faceX: faceX,
      faceY: faceY,
      cell: cell,
      enemies: enemies.map(function (c, index) {
        return { x: c.x, y: c.y, kind: index % 3, bob: index * 0.73 };
      }),
      pickups: pickups
    };
  }

  function placeRudolphCell(map, cells, farthest, placed, pickups) {
    // Put the cell at a dead end and paint the wall opposite the approach.
    var candidates = cells.filter(function (cell) {
      return cell.d > farthest * 0.5 && openNeighbors(map, cell).length === 1;
    });
    var spot = candidates.reduce(function (closest, candidate) {
      return Math.abs(candidate.d - farthest * 0.7) < Math.abs(closest.d - farthest * 0.7) ? candidate : closest;
    });
    spot.used = true;
    placed.push(spot);
    var approach = openNeighbors(map, spot)[0];
    var key = spreadTake(cells, function (cell) {
      return cell.d >= farthest * 0.23 && cell.d <= farthest * 0.47;
    }, 1, 5, placed)[0];
    placed.push(key);
    pickups.push({ x: key.x, y: key.y, kind: 'key', bob: 0 });
    return {
      x: spot.x, y: spot.y,
      wallX: Math.floor(spot.x) - approach[0],
      wallY: Math.floor(spot.y) - approach[1]
    };
  }

  function openNeighbors(map, cell) {
    return PATROL_STEPS.filter(function (step) {
      return map[Math.floor(cell.y) + step[1]][Math.floor(cell.x) + step[0]] !== 1;
    });
  }

  function tileVariant(x, y) {
    return ((x * 17 + y * 31) % 3 + 3) % 3;
  }

  function discoverTile() {
    var x = Math.floor(player.x), y = Math.floor(player.y);
    if (discovered.size === 0) {
      if (x === 1 && y === 1) return;
      revealTile(1, 1);
    }
    revealTile(x, y);
  }

  function revealTile(x, y) {
    discovered.add(x + ',' + y);
    PATROL_STEPS.forEach(function (step) {
      var nx = x + step[0], ny = y + step[1];
      if (MAP[ny] && MAP[ny][nx] === 1) discovered.add(nx + ',' + ny);
    });
  }

  function paintMap() {
    var g = mapCanvas.getContext('2d');
    var size = 24;
    mapCanvas.width = MAP_W * size;
    mapCanvas.height = MAP_H * size;
    g.fillStyle = '#101820';
    g.fillRect(0, 0, mapCanvas.width, mapCanvas.height);
    discovered.forEach(function (key) {
      var xy = key.split(',').map(Number), x = xy[0], y = xy[1];
      g.fillStyle = MAP[y][x] === 1 ? '#a99c83' : '#e8d7b6';
      g.fillRect(x * size, y * size, size, size);
      if (MAP[y][x] === 1) return;
      PATROL_STEPS.forEach(function (step) {
        var nx = x + step[0], ny = y + step[1];
        var tile = MAP[ny] && MAP[ny][nx];
        if ((tile !== 0 && tile !== 2) || discovered.has(nx + ',' + ny)) return;
        g.fillStyle = '#66c884';
        g.fillRect(nx * size, ny * size, size, size);
      });
      if (MAP[y][x] === 2) {
        g.fillStyle = '#368f54';
        g.fillRect(x * size + 4, y * size + 4, size - 8, size - 8);
      }
    });
    var activeObjectives = pickups.filter(function (p) { return p.kind === 'dispatch' || p.kind === 'key'; });
    LEVEL.pickups.forEach(function (p) {
      if (p.kind !== 'dispatch' && p.kind !== 'key') return;
      var collected = !activeObjectives.some(function (other) { return other.x === p.x && other.y === p.y; });
      drawObjectiveMarker(g, size, p, p.kind === 'key' ? 'K' : 'D', p.kind === 'key' ? '#ffdc75' : '#d9acff', collected);
    });
    if (LEVEL.cell) drawObjectiveMarker(g, size, LEVEL.cell, 'R', '#81e9ff', rudolphFreed);
    g.save();
    g.translate((Math.floor(player.x) + 0.5) * size, (Math.floor(player.y) + 0.5) * size);
    g.rotate(Math.atan2(player.dirY, player.dirX));
    g.fillStyle = '#e63131';
    g.beginPath(); g.moveTo(10, 0); g.lineTo(-7, -7); g.lineTo(-7, 7); g.closePath(); g.fill();
    g.restore();
  }

  function drawObjectiveMarker(g, size, point, label, color, complete) {
    var x = Math.floor(point.x) * size;
    var y = Math.floor(point.y) * size;
    g.fillStyle = complete ? '#bde9bb' : color;
    g.fillRect(x + 1, y + 1, size - 2, size - 2);
    g.fillStyle = '#17212a';
    g.font = 'bold 18px system-ui';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(label, x + size / 2, y + size / 2);
  }

  function openMap() {
    if (state !== 'play') return;
    releasePad();
    state = 'map';
    paintMap();
    mapSheet.hidden = false;
    document.getElementById('close-map').focus();
  }

  function closeMap() {
    if (state !== 'map' || portraitWanted()) return;
    mapSheet.hidden = true;
    state = 'play';
    lastFrame = performance.now();
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

  function makeBurst() {
    var c = document.createElement('canvas');
    var g = c.getContext('2d');
    var rad;
    c.width = 64;
    c.height = 64;
    rad = g.createRadialGradient(32, 32, 2, 32, 32, 30);
    rad.addColorStop(0, 'rgba(255, 250, 236, 0.98)');
    rad.addColorStop(0.45, 'rgba(244, 214, 140, 0.7)');
    rad.addColorStop(1, 'rgba(244, 214, 140, 0)');
    g.fillStyle = rad;
    g.beginPath();
    g.arc(32, 32, 30, 0, Math.PI * 2);
    g.fill();
    return c;
  }

  function makeKit() {
    var c = document.createElement('canvas');
    var g = c.getContext('2d');
    c.width = 64;
    c.height = 64;
    g.fillStyle = '#dfe8d4';
    round(g, 10, 10, 44, 44, 10);
    g.fillStyle = '#2f6a45';
    g.fillRect(28, 16, 8, 32);
    g.fillRect(16, 28, 32, 8);
    return c;
  }

  function makeBullet() {
    var c = document.createElement('canvas');
    var g = c.getContext('2d');
    c.width = 64;
    c.height = 64;
    g.translate(32, 32);
    g.rotate(0.62);
    g.fillStyle = '#e2b85a';
    round(g, -9, -10, 18, 34, 3);
    g.fillStyle = '#ad6847';
    g.beginPath();
    g.moveTo(-8, -10);
    g.quadraticCurveTo(-8, -21, 0, -27);
    g.quadraticCurveTo(8, -21, 8, -10);
    g.fill();
    g.fillStyle = '#fff1bb';
    g.fillRect(-5, -8, 3, 25);
    return c;
  }

  function makeShot() {
    var c = document.createElement('canvas');
    var g = c.getContext('2d');
    c.width = 48;
    c.height = 48;
    var glow = g.createRadialGradient(24, 24, 5, 24, 24, 24);
    glow.addColorStop(0, '#fff9d4');
    glow.addColorStop(0.36, '#ffc85a');
    glow.addColorStop(0.64, 'rgba(249, 104, 40, 0.88)');
    glow.addColorStop(1, 'rgba(249, 104, 40, 0)');
    g.fillStyle = glow;
    g.fillRect(0, 0, 48, 48);
    g.fillStyle = '#fffceb';
    g.beginPath();
    g.ellipse(24, 24, 7, 5, 0, 0, Math.PI * 2);
    g.fill();
    return c;
  }

  function makeAlert() {
    var c = document.createElement('canvas');
    c.width = 32;
    c.height = 32;
    var g = c.getContext('2d');
    g.fillStyle = '#29180f';
    g.beginPath();
    g.arc(16, 16, 15, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#ffda81';
    g.fillRect(14, 6, 4, 13);
    g.fillRect(14, 22, 4, 4);
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

  function facingPlayer(e, dx, dy, distance) {
    return distance < 0.01 || (e.dirX * dx + e.dirY * dy) >= distance * 0.35;
  }

  function enemyImage(e) {
    var frames = guardFrames[e.kind];
    if (frames) {
      var dx = player.x - e.x;
      var dy = player.y - e.y;
      var back = e.dirX * dx + e.dirY * dy < 0;
      if (back || e.moving) {
        var stride = e.moving ? Math.floor(e.walked * 4) % 2 : 0;
        return frames[(back ? 2 : 0) + stride];
      }
    }
    var image = kindSprites[e.kind];
    return image.complete && image.naturalWidth > 0 ? image : soldierSprite();
  }

  function doorReady() {
    return doorImg.complete && doorImg.naturalWidth > 0;
  }

  function freshEnemies() {
    var list = [];
    var i;
    var src;
    for (i = 0; i < LEVEL.enemies.length; i++) {
      src = LEVEL.enemies[i];
      list.push({
        x: src.x,
        y: src.y,
        kind: src.kind,
        alive: true,
        hp: KINDS[src.kind].hp,
        bob: src.bob,
        cool: 0,
        aim: 0,
        dirX: 0,
        dirY: 0,
        walked: src.bob,
        moving: false,
        stun: 0,
        patrolTarget: null,
        patrolPrevious: null,
        patrolRandom: mulberry32(i + 1)
      });
    }
    return list;
  }

  function freshPickups() {
    var list = [];
    var i;
    var p;
    for (i = 0; i < LEVEL.pickups.length; i++) {
      p = LEVEL.pickups[i];
      list.push({ x: p.x, y: p.y, kind: p.kind, n: p.n, bob: p.bob });
    }
    return list;
  }

  function aim(dirX, dirY) {
    player.dirX = dirX;
    player.dirY = dirY;
    player.planeX = -dirY * FOV_PLANE;
    player.planeY = dirX * FOV_PLANE;
  }

  function resetPlayer() {
    player.x = 1.5;
    player.y = 1.5;
    aim(LEVEL.faceX, LEVEL.faceY);
  }

  function bulletWord(n) {
    return n === 1 ? 'bullet' : 'bullets';
  }

  function paintIntro() {
    var n = readStartAmmo();
    var raw = livesQuery();
    var line = MAX_HEALTH + ' life points, and ' + n + ' ' + bulletWord(n);
    if (raw != null && /^\d+$/.test(String(raw).trim())) line += ' from the questions';
    loadoutEl.textContent = line + '.';
  }

  function beginRun() {
    dispatchesFound = 0;
    hasCellKey = false;
    rudolphFreed = false;
    discovered.clear();
    mapSheet.hidden = true;
    resetPlayer();
    enemies = freshEnemies();
    pickups = freshPickups();
    shots = [];
    bursts = [];
    health = MAX_HEALTH;
    armor = 0;
    ammo = readStartAmmo();
    played = 0;
    cool = 0;
    flash = 0;
    kick = 0;
    shake = 0;
    walk = 0;
    moving = 0;
    hurtT = 0;
    toastT = 0;
    dryNoted = false;
    victorySent = false;
    state = 'play';
    startSheet.hidden = true;
    pauseSheet.hidden = true;
    winSheet.hidden = true;
    loseSheet.hidden = true;
    hintEl.hidden = false;
    toastEl.hidden = true;
    renderHud();
    say('Wire room. Health ' + health + '. Bullets ' + ammo + '.');
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
    say('Left the wire room.');
  }

  function releasePad() {
    pad.forward = pad.back = pad.left = pad.right = pad.fire = false;
    var nodes = document.querySelectorAll('.controls button');
    var i;
    for (i = 0; i < nodes.length; i++) nodes[i].classList.remove('held');
  }

  function win() {
    var seconds;
    if (state === 'win' || state === 'lose') return;
    seconds = Math.max(0, Math.round(played));
    state = 'win';
    releasePad();
    winTimeEl.textContent = 'Through in ' + seconds + ' seconds.';
    winSheet.hidden = false;
    say((gatehouse ? 'Rudolph is free. ' : 'Dispatches secured. ') + seconds + ' seconds.');
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

  function lose() {
    if (state === 'lose' || state === 'win') return;
    state = 'lose';
    health = 0;
    releasePad();
    loseSheet.hidden = false;
    say('Health is gone. The listening post is still ahead.');
  }

  function renderHud() {
    healthEl.textContent = String(health);
    armorEl.textContent = armor + ' / ' + MAX_ARMOR;
    bulletsEl.textContent = String(ammo);
  }

  function showToast(text) {
    toastEl.textContent = text;
    toastEl.hidden = false;
    toastT = 1.6;
    say(text);
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
    if (!solid(player.x + dx, player.y, 0.16)) player.x += dx;
    if (!solid(player.x, player.y + dy, 0.16)) player.y += dy;
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
    var steps = (dist / 0.12) | 0;
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
    for (step = 0; step < 5; step++) {
      if (!solid(player.x + ox * 0.12, player.y, 0.16)) player.x += ox * 0.12;
      if (!solid(player.x, player.y + oy * 0.12, 0.16)) player.y += oy * 0.12;
    }
    if (!reduceMotion()) shake = 6;
    say('A soldier shoved you back.');
  }

  function hurt() {
    if (state !== 'play' || hurtT > 0) return;
    var absorbed = armor > 0;
    if (absorbed) armor -= 1;
    else health = Math.max(0, health - 1);
    hurtT = 0.7;
    if (!reduceMotion()) shake = 8;
    if (health <= 0) {
      lose();
      return;
    }
    showToast(absorbed ? 'Armor absorbed the hit. Armor ' + armor + ' / ' + MAX_ARMOR + '.' : 'Hit. Health ' + health + '.');
  }

  function launchShot(e, kind) {
    var dx = player.x - e.x;
    var dy = player.y - e.y;
    var dist = Math.hypot(dx, dy) || 1;
    shots.push({
      x: e.x + (dx / dist) * 0.38,
      y: e.y + (dy / dist) * 0.38,
      vx: (dx / dist) * kind.shot,
      vy: (dy / dist) * kind.shot,
      life: 2.2
    });
  }

  function trackGuardMovement(e, x, y) {
    var dx = e.x - x;
    var dy = e.y - y;
    var length = Math.hypot(dx, dy);
    e.moving = length > 0.0001;
    if (e.moving) {
      e.dirX = dx / length;
      e.dirY = dy / length;
      e.walked += length;
    }
  }

  function patrol(e, dt) {
    var remaining = WALK_SPEED * ENEMY_SPEED_SCALE * dt;
    if (!e.patrolTarget) {
      e.patrolTarget = { x: Math.floor(e.x) + 0.5, y: Math.floor(e.y) + 0.5 };
    }
    while (remaining > 0) {
      var target = e.patrolTarget;
      var dx = target.x - e.x;
      var dy = target.y - e.y;
      var distance = Math.hypot(dx, dy);
      if (distance > remaining) {
        e.x += dx / distance * remaining;
        e.y += dy / distance * remaining;
        return;
      }
      e.x = target.x;
      e.y = target.y;
      remaining -= distance;
      var exits = PATROL_STEPS.map(function (step) {
        return { x: e.x + step[0], y: e.y + step[1] };
      }).filter(function (next) {
        return !cellSolid(next.x, next.y) && (next.x !== EXIT_X || next.y !== EXIT_Y);
      });
      var previous = e.patrolPrevious;
      var forward = exits.filter(function (next) {
        return !previous || next.x !== previous.x || next.y !== previous.y;
      });
      if (forward.length) exits = forward;
      if (!exits.length) return;
      e.patrolPrevious = target;
      e.patrolTarget = exits[Math.floor(e.patrolRandom() * exits.length)];
    }
  }

  function updateEnemies(dt) {
    for (var i = 0; i < enemies.length; i++) {
      var e = enemies[i];
      if (!e.alive) continue;
      var kind = KINDS[e.kind];
      var x = e.x;
      var y = e.y;
      var dx = player.x - x;
      var dy = player.y - y;
      var dist = Math.hypot(dx, dy);
      e.moving = false;
      e.stun = Math.max(0, e.stun - dt);
      e.cool = Math.max(0, e.cool - dt);

      if (dist < 0.46 && ammo > 0 && e.stun <= 0) {
        bump(dx, dy);
        e.stun = 1.05;
      }
      if (e.stun > 0 || dist >= kind.range + 1.5 || !facingPlayer(e, dx, dy, dist) || !sees(x, y)) {
        e.aim = 0;
        if (e.stun <= 0) {
          patrol(e, dt);
          trackGuardMovement(e, x, y);
        }
        continue;
      }

      e.patrolTarget = null;
      e.patrolPrevious = null;
      e.aim += dt;
      if (dist > 0.01) {
        e.dirX = dx / dist;
        e.dirY = dy / dist;
      }
      if (e.aim > 0.12) {
        var approach = dist > kind.hold + 0.25 ? 1 : e.kind === 2 && dist < kind.hold - 0.7 ? -1 : 0;
        var step = kind.move * ENEMY_SPEED_SCALE * dt * approach;
        var mx = e.dirX * step;
        var my = e.dirY * step;
        if (step && !solid(e.x + mx, e.y, 0.2)) e.x += mx;
        if (step && !solid(e.x, e.y + my, 0.2)) e.y += my;
        trackGuardMovement(e, x, y);
      }

      // Movement sets the visible heading. A guard must face Trent when firing.
      if (!facingPlayer(e, player.x - e.x, player.y - e.y, Math.hypot(player.x - e.x, player.y - e.y))) {
        e.aim = 0;
        continue;
      }
      if (e.cool <= 0 && e.aim >= 2 && dist <= kind.range && sees(e.x, e.y)) {
        e.cool = kind.wait;
        if (dist < 0.62) hurt();
        else launchShot(e, kind);
        if (state !== 'play') return;
      }
    }
  }

  function updateShots(dt) {
    var i;
    var s;
    var parts;
    var p;
    for (i = shots.length - 1; i >= 0; i--) {
      s = shots[i];
      if (!s) continue;
      s.life -= dt;
      if (s.life <= 0) {
        shots.splice(i, 1);
        continue;
      }
      parts = 4;
      for (p = 0; p < parts; p++) {
        s.x += s.vx * dt / parts;
        s.y += s.vy * dt / parts;
        if (cellSolid(s.x, s.y) || Math.hypot(s.x - player.x, s.y - player.y) < 0.28) {
          var hitPlayer = Math.hypot(s.x - player.x, s.y - player.y) < 0.28;
          shots.splice(i, 1);
          if (hitPlayer) hurt();
          break;
        }
      }
      if (state !== 'play') return;
    }
  }

  function hitEnemy(enemy) {
    enemy.hp -= 1;
    if (enemy.hp <= 0) {
      dropEnemy(enemy);
      return;
    }
    enemy.stun = 0.28;
    bursts.push({ x: enemy.x, y: enemy.y, life: 0.16 });
  }

  function dropEnemy(e) {
    if (!e.alive) return;
    e.alive = false;
    bursts.push({ x: e.x, y: e.y, life: 0.16 });
    pickups.push({ x: e.x, y: e.y, kind: 'ammo', n: 1, bob: e.bob || 0 });
  }

  function removeDead() {
    var i;
    for (i = enemies.length - 1; i >= 0; i--) {
      if (!enemies[i].alive) enemies.splice(i, 1);
    }
  }

  function collectPickups() {
    var i;
    var p;
    for (i = pickups.length - 1; i >= 0; i--) {
      p = pickups[i];
      if (Math.hypot(p.x - player.x, p.y - player.y) > 0.46) continue;
      if (p.kind === 'dispatch') {
        pickups.splice(i, 1);
        dispatchesFound++;
        showToast('Dispatches: ' + dispatchesFound + '/' + dispatchesNeeded + '.');
        continue;
      }
      if (p.kind === 'key') {
        pickups.splice(i, 1);
        hasCellKey = true;
        showToast('Cell key found. Follow the map marker to Rudolph.');
        continue;
      }
      if (p.kind === 'health') {
        if (health < MAX_HEALTH) {
          health += 1;
          showToast('Health ' + health + '.');
        } else {
          if (armor >= MAX_ARMOR) continue;
          armor += 1;
          showToast('Body armor ' + armor + ' / ' + MAX_ARMOR + '.');
        }
        pickups.splice(i, 1);
        continue;
      }
      ammo += p.n;
      pickups.splice(i, 1);
      dryNoted = false;
      showToast(p.n === 1 ? 'One bullet.' : p.n + ' bullets.');
    }
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
    while (guard++ < 80) {
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
    var aimAngle;
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
    if (ammo <= 0) {
      if (!dryNoted) {
        dryNoted = true;
        showToast('No bullets left.');
      }
      return;
    }
    dryNoted = false;
    ammo -= 1;
    cool = 0.4;
    flash = 0.08;
    kick = 1;
    aimAngle = Math.atan2(player.dirY, player.dirX);
    wall = rayWall(aimAngle);
    best = null;
    bestD = wall;
    for (n = 0; n < enemies.length; n++) {
      e = enemies[n];
      if (!e.alive) continue;
      dx = e.x - player.x;
      dy = e.y - player.y;
      along = dx * Math.cos(aimAngle) + dy * Math.sin(aimAngle);
      if (along < 0.3 || along >= bestD) continue;
      perp = Math.abs(dx * Math.sin(aimAngle) - dy * Math.cos(aimAngle));
      if (perp < 0.32) {
        best = e;
        bestD = along;
      }
    }
    if (best) hitEnemy(best);
    hintEl.hidden = true;
  }

  function checkRudolphCell() {
    var cell = LEVEL.cell;
    if (!cell || rudolphFreed) return;
    if (Math.hypot(player.x - cell.x, player.y - cell.y) > 0.46) return;
    if (!hasCellKey) {
      if (toastT <= 0) showToast('Rudolph’s cell is locked. Find the key marked on the map.');
      return;
    }
    rudolphFreed = true;
    showToast('Rudolph is free! Head to the green exit.');
  }

  function atExit() {
    var ex = player.x | 0;
    var ey = player.y | 0;
    if (ey >= 0 && ex >= 0 && ey < MAP_H && ex < MAP_W && MAP[ey][ex] === 2) return true;
    return Math.hypot(player.x - EXIT_X, player.y - EXIT_Y) < 0.7;
  }

  function update(dt) {
    var speed = WALK_SPEED * dt;
    var turned = false;
    var walked = false;
    var i;
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
    discoverTile();
    moving = walked ? 1 : 0;
    if (walked && !reduceMotion()) walk += dt * 9;
    if (turned || walked) hintEl.hidden = true;
    if (!want('fire')) dryNoted = false;
    if (cool > 0) cool -= dt;
    if (want('fire')) tryShoot();
    if (flash > 0) flash -= dt;
    if (kick > 0) kick = Math.max(0, kick - dt * 5);
    if (shake > 0) shake = Math.max(0, shake - dt * 18);
    if (hurtT > 0) hurtT = Math.max(0, hurtT - dt);
    if (toastT > 0) {
      toastT -= dt;
      if (toastT <= 0) toastEl.hidden = true;
    }
    removeDead();
    if (state !== 'play') return;
    collectPickups();
    checkRudolphCell();
    updateEnemies(dt);
    if (state !== 'play') return;
    updateShots(dt);
    for (i = bursts.length - 1; i >= 0; i--) {
      bursts[i].life -= dt;
      if (bursts[i].life <= 0) bursts.splice(i, 1);
    }
    if (state === 'play' && atExit()) {
      if (gatehouse ? rudolphFreed : dispatchesFound === dispatchesNeeded) win();
      else if (toastT <= 0) {
        showToast(gatehouse ? 'Exit locked. Free Rudolph first.' :
          'Exit locked. Dispatches: ' + dispatchesFound + '/' + dispatchesNeeded + '.');
      }
    }
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
        sample(ceiling ? ceilTex : (floorTiles[tileVariant(Math.floor(fx), Math.floor(fy))] || floorTex), cx, cy, ceiling ? 0.92 : 1, fog, di);
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
      while (guard++ < 80) {
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
      var wall = wallTiles[tileVariant(mapX, mapY)] || wallTex;
      var cell = LEVEL.cell;
      if (cell && mapX === cell.wallX && mapY === cell.wallY &&
        mapX - (side === 0 ? stepXi : 0) === Math.floor(cell.x) &&
        mapY - (side === 1 ? stepYi : 0) === Math.floor(cell.y)) {
        wall = (rudolphFreed ? openCellTex : closedCellTex) || wall;
      }
      for (y = drawStart; y <= drawEnd; y++) {
        v = texPos;
        if (v < 0) v = 0;
        if (v > 0.999) v = 0.999;
        texPos += texStep;
        sample(wall, wallX, v, shade, fog, (y * BUF_W + x) * 4);
      }
    }
    bctx.putImageData(frame, 0, 0);
  }

  function drawBillboard(image, wx, wy, heightScale, widthMul, alpha, lift) {
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
    top = floorY - spriteH - (lift || 0) * BUF_H / ty;
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
    var p;
    var bob = reduceMotion() ? 0 : 1;
    for (i = 0; i < enemies.length; i++) {
      e = enemies[i];
      if (!e.alive) continue;
      list.push({
        img: enemyImage(e),
        x: e.x,
        y: e.y,
        h: KINDS[e.kind].h,
        w: 1,
        a: 1,
        d: (e.x - player.x) * (e.x - player.x) + (e.y - player.y) * (e.y - player.y)
      });
      if (e.aim > 0) {
        list.push({
          img: alertImg, x: e.x, y: e.y, h: 0.14, w: 1, a: 1,
          lift: KINDS[e.kind].h + 0.04, d: list[list.length - 1].d
        });
      }
    }
    for (i = 0; i < pickups.length; i++) {
      p = pickups[i];
      list.push({
        img: p.kind === 'dispatch' ? dispatchImg :
          p.kind === 'key' ? cellKeyImg :
          p.kind === 'health' ? (health === MAX_HEALTH && armorImg.naturalWidth ? armorImg : medkitImg.naturalWidth ? medkitImg : kitImg) :
            (bulletImg.naturalWidth ? bulletImg : bulletFallback),
        x: p.x,
        y: p.y + (bob ? Math.sin(played * 2 + p.bob) * 0.04 : 0),
        h: 0.34,
        w: 1,
        a: 1,
        d: (p.x - player.x) * (p.x - player.x) + (p.y - player.y) * (p.y - player.y)
      });
    }
    for (i = 0; i < shots.length; i++) {
      list.push({
        img: shotImg,
        x: shots[i].x,
        y: shots[i].y,
        h: 0.31,
        lift: 0.39,
        w: 1,
        a: 1,
        d: (shots[i].x - player.x) * (shots[i].x - player.x) + (shots[i].y - player.y) * (shots[i].y - player.y)
      });
    }
    for (i = 0; i < bursts.length; i++) {
      list.push({
        img: burstImg,
        x: bursts[i].x,
        y: bursts[i].y,
        h: 0.55,
        w: 1,
        a: Math.max(0, bursts[i].life / 0.16),
        d: (bursts[i].x - player.x) * (bursts[i].x - player.x) + (bursts[i].y - player.y) * (bursts[i].y - player.y)
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
    list.sort(function (a, b) { return b.d - a.d; });
    for (i = 0; i < list.length; i++) {
      drawBillboard(list[i].img, list[i].x, list[i].y, list[i].h, list[i].w, list[i].a, list[i].lift);
    }
  }

  function drawGun() {
    var bob = reduceMotion() ? 0 : Math.sin(walk) * 7 * moving;
    var lift = kick * 26;
    if (rifleImg.naturalWidth) {
      var height = cssH * 0.39;
      var width = height * rifleImg.naturalWidth / rifleImg.naturalHeight;
      var top = cssH - height + bob + lift;
      var center = cssW * 0.56;
      ctx.drawImage(rifleImg, center - width / 2, top, width, height);
      if (flash > 0) {
        ctx.fillStyle = 'rgba(255, 214, 120, 0.9)';
        ctx.beginPath();
        ctx.arc(center - width * .015, top + 4, 10 + flash * 40, 0, Math.PI * 2);
        ctx.fill();
      }
      return;
    }
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
    ctx.fillRect(108, -22, 108, 12);
    ctx.fillStyle = '#8d7344';
    ctx.fillRect(96, -16, 22, 16);
    if (flash > 0) {
      ctx.fillStyle = 'rgba(255, 214, 120, 0.9)';
      ctx.beginPath();
      ctx.arc(214, -16, 16 + flash * 40, 0, Math.PI * 2);
      ctx.fill();
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
    if (hurtT > 0) {
      ctx.fillStyle = 'rgba(255, 244, 214, ' + Math.min(0.42, hurtT * 0.7) + ')';
      ctx.fillRect(0, 0, cssW, cssH);
    }
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
      else if (state === 'map') closeMap();
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

  document.getElementById('map').addEventListener('click', openMap);
  document.getElementById('close-map').addEventListener('click', closeMap);
  document.getElementById('start').addEventListener('click', beginRun);
  document.getElementById('resume').addEventListener('click', closePause);
  document.getElementById('give-up').addEventListener('click', giveUp);
  document.getElementById('retry').addEventListener('click', beginRun);
  document.getElementById('again').addEventListener('click', beginRun);
  document.getElementById('pause').addEventListener('click', function () {
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

  LEVEL = makeLevel();
  MAP = LEVEL.map;
  EXIT_X = LEVEL.exitX;
  EXIT_Y = LEVEL.exitY;
  enemies = freshEnemies();
  pickups = freshPickups();
  paintIntro();
  resize();
  syncPortrait();
  renderHud();
  lastFrame = performance.now();
  requestAnimationFrame(loop);
})();
