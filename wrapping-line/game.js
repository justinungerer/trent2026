/* Chapter 9 — The Wrapping Line.
   Thirty percent round times, with packages moving at half the previous speed.
   Wrap intact boxes, avoid damaged boxes, and fill the level objective.
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
  var wrapButton = document.getElementById('wrap-box');
  var upButton = document.getElementById('mark-up');
  var downButton = document.getElementById('mark-down');

  var VIEW_W = 844;
  var VIEW_H = 390;
  var stage = new URLSearchParams(location.search).get('stage');
  var sorting = stage === 'sort-the-first-crates';
  var loading = stage === 'load-the-sleigh';
  var manifests = sorting ? [[1, 1, 1]] : loading ? [[7, 4, 2], [3, 6, 5]] : [];
  var manifestIndex = 0;
  var packed = [0, 0, 0];
  /* trent.webp: idle 2, then three bow frames. */
  var TRENT = { w: 302, h: 676, ax: 127, ay: 666, n: 5 };
  var NEED = 30;
  var ROUND_SECONDS = (loading ? 300 : sorting ? 100 : 27) * 0.3;
  document.getElementById('round-limit').textContent = 'You have ' + ROUND_SECONDS + ' seconds per round.';
  var TARGET = 456;
  var MEET = 26;
  var SPEED = (232 / 0.3) * 0.5;
  var INTERVAL = 0.8 * 0.3;
  var FIRST_SPAWN = 0.4 * 0.3;
  var LANES = [150, 206, 262, 318];
  var MARK_MIN = 150;
  var MARK_MAX = 318;
  var MARK_SPEED = 460;
  var MARK_HALF_HEIGHT = 34.5;
  var PRESENT_TYPES = [
    { id: 'plain', name: 'Plain', points: 1, weight: 4, src: 'art/present-plain.webp' },
    { id: 'ribbon', name: 'Ribbon', points: 3, weight: 3, src: 'art/present-ribbon.webp' },
    { id: 'gilt', name: 'Gilt', points: 5, weight: 2, src: 'art/present-gilt.webp' },
    { id: 'torn', name: 'Torn', points: -1, weight: 2, src: 'art/present-torn.webp' },
    { id: 'crushed', name: 'Crushed', points: -3, weight: 1, src: 'art/present-crushed.webp' }
  ];
  if (manifests.length) {
    document.getElementById('wrap-stage-title').textContent = sorting ? 'Sort the First Crates' : 'Load the Sleigh';
    document.getElementById('wrap-goal').textContent = sorting
      ? 'Wrap one intact box of each class (1, 3, and 5). Use the cargo counts at the top.'
      : 'Fill the first manifest, then the second. Track the remaining boxes by their tags (1, 3, and 5).';
    document.getElementById('wrap-score-label').textContent = sorting ? 'Boxes left' : 'Cargo left';
    document.getElementById('wrap-win-title').textContent = sorting ? 'First crates sorted' : 'The sleigh is loaded';
  }

  var sceneImg = new Image();
  var trentImg = new Image();
  sceneImg.src = sorting ? 'art/freight-intake.webp' : loading ? 'art/loading-bay.webp' : 'art/scene.webp';
  var beltImg = new Image();
  beltImg.src = 'art/painted-belt.webp';
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
  var controls = [
    { button: upButton, direction: -1, keys: ['ArrowUp', 'w', 'W'], key: false, pointer: null },
    { button: downButton, direction: 1, keys: ['ArrowDown', 's', 'S'], key: false, pointer: null }
  ];

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
    var shown = Math.ceil(timeLeft);
    if (shown < 0) shown = 0;
    if (shown > Math.ceil(ROUND_SECONDS)) shown = Math.ceil(ROUND_SECONDS);
    runEl.textContent = manifests.length
      ? (loading ? (manifestIndex + 1) + '/2 · ' : '') +
        manifests[manifestIndex].map(function (need, index) {
          return PRESENT_TYPES[index].points + '×' + Math.max(0, need - packed[index]);
        }).join('  ')
      : score + ' / ' + NEED;
    timeEl.textContent = String(shown);
    livesEl.textContent = String(lives);
    lastEl.textContent = lastWord;
    lastEl.className = lastKind;
  }

  function moveMark(distance) {
    markY = Math.max(MARK_MIN, Math.min(MARK_MAX, markY + distance));
    hintEl.hidden = true;
  }

  function holding(control) {
    return control.key || control.pointer !== null;
  }

  function clearMovement() {
    controls.forEach(function (control) {
      control.key = false;
      if (control.pointer !== null && control.button.hasPointerCapture(control.pointer)) {
        control.button.releasePointerCapture(control.pointer);
      }
      control.pointer = null;
      control.button.classList.remove('held');
    });
  }

  function nextType() {
    var i;
    var n;
    var swap;
    var held;
    if (sorting && spawned < 4) return PRESENT_TYPES[[0, 1, 3, 2][spawned]];
    if (!bag.length) {
      for (i = 0; i < PRESENT_TYPES.length; i++) {
        var extra = loading && manifestIndex === 1 && (i === 1 || i === 3) ? 1 : 0;
        for (n = 0; n < PRESENT_TYPES[i].weight + extra; n++) bag.push(PRESENT_TYPES[i]);
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
    manifestIndex = 0;
    packed = [0, 0, 0];
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
    clearMovement();
    resetBelt(false);
    victorySent = false;
    state = 'play';
    startSheet.hidden = true;
    pauseSheet.hidden = true;
    winSheet.hidden = true;
    outSheet.hidden = true;
    hintEl.hidden = false;
    renderHud();
    say(manifests.length ? document.getElementById('wrap-goal').textContent :
      'Move the mark. Reach 30 points before time runs out.');
  }

  function restartRound() {
    if (state !== 'play') return;
    if (manifests.length) {
      endRun('Time expired', 'The cargo list was still incomplete when the belt stopped.');
      return;
    }
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
    clearMovement();
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
    clearMovement();
    winTimeEl.textContent = 'Wrapped in ' + seconds + ' seconds.';
    winSheet.hidden = false;
    say((loading ? 'Sleigh packed.' : sorting ? 'Crates sorted.' : '30 points.') + ' ' + seconds + ' seconds.');
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

  function endRun(title, copy) {
    state = 'over';
    clearMovement();
    hintEl.hidden = true;
    outSheet.querySelector('h1').textContent = title || 'Out of lives';
    outSheet.querySelector('p:not(.kicker)').textContent = copy || 'A damaged present took the last life. The line was not cleared.';
    outSheet.hidden = false;
    say((title || 'Out of lives') + '. The line was not cleared.');
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
      if (manifests.length) {
        var kind = PRESENT_TYPES.indexOf(parcel.type);
        var need = manifests[manifestIndex];
        if (packed[kind] < need[kind]) packed[kind]++;
        if (need.every(function (count, index) { return packed[index] === count; })) {
          renderHud();
          if (manifestIndex + 1 === manifests.length) {
            win();
            return;
          }
          manifestIndex++;
          packed = [0, 0, 0];
          bag = [];
          say('First cargo manifest filled. Second manifest ready.');
        }
        renderHud();
        return;
      }
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

  function tryWrap() {
    if (state !== 'play') return;
    var box = null;
    var closest = 47;
    for (var i = 0; i < parcels.length; i++) {
      var candidate = parcels[i];
      var gap = Math.abs(candidate.x - TARGET);
      if (!candidate.judged && gap < closest && Math.abs(candidate.y - markY) <= MEET) {
        box = candidate;
        closest = gap;
      }
    }
    if (!box) return;
    box.judged = true;
    meetPresent(box);
  }

  wrapButton.addEventListener('click', tryWrap);

  function update(dt) {
    var i;
    var parcel;
    if (bowT > 0) bowT -= dt;
    if (state === 'win' || state === 'over') return;
    if (state === 'play') {
      var direction = Number(holding(controls[1])) - Number(holding(controls[0]));
      if (direction) moveMark(direction * MARK_SPEED * dt);
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
    ctx.scale(0.75, 0.75);
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
    ctx.strokeStyle = 'rgba(255, 214, 140, 0.95)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(TARGET, markY - MARK_HALF_HEIGHT);
    ctx.lineTo(TARGET, markY + MARK_HALF_HEIGHT);
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
    if (imageReady(beltImg)) ctx.drawImage(beltImg, 439, 320, 363, 64);
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

  controls.forEach(function (control) {
    var button = control.button;
    button.addEventListener('pointerdown', function (event) {
      if (state !== 'play' || event.button !== 0 || control.pointer !== null) return;
      event.preventDefault();
      control.pointer = event.pointerId;
      button.setPointerCapture(event.pointerId);
      button.classList.add('held');
      if (!holding(controls[control.direction < 0 ? 1 : 0])) moveMark(control.direction * 8);
    });

    function release(event) {
      if (event.pointerId !== control.pointer) return;
      control.pointer = null;
      button.classList.toggle('held', holding(control));
    }

    button.addEventListener('pointerup', release);
    button.addEventListener('pointercancel', release);
    button.addEventListener('lostpointercapture', release);
    button.addEventListener('contextmenu', function (event) { event.preventDefault(); });
    button.addEventListener('click', function (event) {
      if (state === 'play' && event.detail === 0) moveMark(control.direction * 12);
    });
  });

  window.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') {
      event.preventDefault();
      if (state === 'play') openPause();
      else if (state === 'pause') closePause();
      return;
    }
    if (state !== 'play') return;
    if (event.code === 'Space' && event.target !== wrapButton && event.target !== upButton && event.target !== downButton) {
      event.preventDefault();
      if (!event.repeat) tryWrap();
      return;
    }
    var control = controls.find(function (arrow) { return arrow.keys.includes(event.key); });
    if (!control) return;
    event.preventDefault();
    control.key = true;
    control.button.classList.add('held');
  });
  window.addEventListener('keyup', function (event) {
    var control = controls.find(function (arrow) { return arrow.keys.includes(event.key); });
    if (!control) return;
    control.key = false;
    control.button.classList.toggle('held', holding(control));
  });
  window.addEventListener('blur', clearMovement);

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
