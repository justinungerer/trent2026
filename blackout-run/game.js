'use strict';

(() => {
  const { levels, DISTANCE, WORLD_EDGE, WARNING_DISTANCE, GUN_SHOT_SPACING, FALL_SECONDS, POST_RADIUS, POST_APPROACH, clamp, center, createRun, retryCheckpoint, step } = BlackoutRun;
  const el = id => document.getElementById(id);
  const params = new URLSearchParams(location.search);
  const embedded = window.parent !== window && params.has('runId');
  const stage = levels.findIndex(level => level.id === params.get('stage'));
  const bonus = /^[1-3]$/.test(params.get('bonus') || '') ? Number(params.get('bonus')) : 0;

  function sendToCampaign(type) {
    const target = location.origin === 'null' ? '*' : location.origin;
    window.parent.postMessage({ type, runId: params.get('runId') }, target);
  }
  const canvas = el('slope');
  const thumb = el('start');
  const ctx = canvas.getContext('2d');
  const ground = document.createElement('canvas');
  const groundCtx = ground.getContext('2d');
  const skierLayer = document.createElement('canvas');
  const skierPaint = skierLayer.getContext('2d');
  const groundTiles = [];
  const art = {};
  const scenery = ['valley', 'forest', 'airstrip'];
  const surfaces = ['powder-trail', 'relay-trail', 'runway-ice'];
  const surfaceTint = ['#9fa6c30a', '#3c58551f', '#19334b20'];
  const skiPoses = ['ski-glide', 'ski-tuck', 'ski-carve', 'ski-plant'];
  const fallPoses = [
    { name: 'ski-stumble', until: 0.19, height: 0.96 },
    { name: 'ski-tumble', until: 0.42, height: 0.79 },
    { name: 'ski-slide', until: 0.70, height: 0.53 },
    { name: 'ski-rise', until: 1, height: 0.82 }
  ];
  const bounds = {
    pine: [4.4, 6.4], rock: [1.95, 0.95], sign: [2.55, 3.5],
    satchel: [1.33, 1.1], post: [3.4, 4.5], cabin: [6.1, 4.7], hangar: [9, 4.9],
    lantern: [0.8, 1.3], rifleman: [2.6, 4.1], stump: [2.35, 1.65], log: [2, 1.85], snowbank: [4.6, 1.15]
  };
  let selected = 0;
  let run = createRun(selected);
  let state = 'menu';
  let width, height, horizon, skiLine, focal;
  let paintTime = 0;
  let lastFrame = 0;
  let cameraX = 0;
  let lean = 0;
  let motionPhase = 0;
  let brakeBlend = 0;
  let drag = null;
  const key = { left: false, right: false, forward: false };
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const flakes = Array.from({ length: 62 }, (_, i) => ({
    x: (i * 0.61803398875) % 1,
    y: (i * 0.41421356237) % 1,
    size: 0.8 + (i % 7) * 0.21,
    speed: 0.027 + (i % 11) * 0.004
  }));
  const selection = levels.map((level, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = `${index + 1} · ${level.title}`;
    button.addEventListener('click', () => choose(index));
    el('levels').append(button);
    return button;
  });

  function clearInput() {
    drag = null;
    thumb.classList.remove('held');
    key.left = key.right = key.forward = false;
  }

  function show(next) {
    state = next;
    clearInput();
    el('start-sheet').hidden = state !== 'menu';
    el('thumb-rail').hidden = state !== 'menu' && state !== 'run';
    thumb.setAttribute('aria-label', state === 'menu' ? 'Place thumb here to start skiing' : 'Steer Trent');
    el('thumb-caption').textContent = state === 'menu' ? 'Place thumb here' : 'Drag to steer';
    el('paused').hidden = state !== 'paused';
    el('results').hidden = state !== 'results';
    el('hud').hidden = state !== 'run' && state !== 'paused';
    updateMissedWarning();
    if (next === 'paused') el('resume').focus({ preventScroll: true });
    if (next === 'results') el('next').focus({ preventScroll: true });
  }

  function choose(index) {
    selected = index;
    run = createRun(index, bonus);
    cameraX = run.x;
    lean = 0;
    motionPhase = 0;
    brakeBlend = 0;
    el('briefing').textContent = levels[index].briefing;
    if (embedded) el('mode-label').textContent = `Chapter 1 · Level ${index + 1} · ${levels[index].title}`;
    el('briefing-bonus').hidden = bonus === 0;
    if (bonus) el('briefing-bonus').textContent = `Quiz bonus · ${bonus} extra ${bonus === 1 ? 'fall' : 'falls'} before checkpoint retry.`;
    selection.forEach((button, i) => button.setAttribute('aria-pressed', String(index === i)));
    show('menu');
  }

  function start(index) {
    selected = index;
    run = createRun(index, bonus);
    run.speed = 0;
    cameraX = run.x;
    lean = 0;
    motionPhase = 0;
    brakeBlend = 0;
    show('run');
    updateHud();
  }

  function finish() {
    el('result-title').textContent = run.index === 2 ? 'Warning delivered' : run.index === 1 ? 'Dispatch confirmed' : 'Dispatch recovered';
    const seconds = Math.round(run.elapsed);
    const time = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
    el('result-details').textContent = `${time} on the trail · ${run.crashes} ${run.crashes === 1 ? 'fall' : 'falls'}`;
    el('next').textContent = run.index === 2 ? 'Playtest menu' : 'Next level';
    show('results');
    if (embedded) sendToCampaign('blackout-run:complete');
  }

  const actions = {
    start: () => { if (state === 'menu') start(selected); },
    pause: () => show('paused'),
    resume: () => show('run'),
    checkpoint: () => { retryCheckpoint(run); show('run'); },
    choose: () => choose(selected),
    'menu-back': () => choose(selected),
    'restart-sequence': () => sendToCampaign('trent:restart-minigame'),
    replay: () => start(selected),
    next: () => selected === 2 ? choose(selected) : start(selected + 1)
  };
  for (const [id, handler] of Object.entries(actions)) el(id).addEventListener('click', handler);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && state === 'run') show('paused');
  });

  function skierSize() {
    return Math.min(height * 0.21, width * 0.36);
  }

  function viewPosition() {
    if (drag) {
      const skisX = drag.skisX + (run.x - drag.worldX) * drag.pixelsPerUnit;
      return run.x - (skisX - width / 2) / focal;
    }
    return clamp(cameraX, run.x - width * 0.34 / focal, run.x + width * 0.34 / focal);
  }

  function thumbInset() {
    return thumb.offsetWidth / 2 + 5;
  }

  function grabThumb(event) {
    if ((state !== 'menu' && state !== 'run') || drag || !event.isPrimary || event.button !== 0) return;
    if (thumb.disabled) return;
    event.preventDefault();
    const inset = thumbInset();
    const x = event.clientX - canvas.getBoundingClientRect().left;
    const skisX = clamp(project(run.x, 0, viewPosition()).x, inset, width - inset);
    if (state === 'menu') {
      thumb.click();
      if (state !== 'run') return;
    }
    drag = {
      id: event.pointerId, pointerX: x, startX: x, skisX, worldX: run.x,
      pixelsPerUnit: Math.max(1, width - inset * 2) / (WORLD_EDGE * 2)
    };
    thumb.classList.add('held');
    run.target = run.x;
    thumb.setPointerCapture(event.pointerId);
  }

  thumb.addEventListener('pointerdown', grabThumb);
  thumb.addEventListener('pointermove', event => {
    if (event.pointerId !== drag?.id) return;
    const inset = thumbInset();
    drag.pointerX = clamp(event.clientX - canvas.getBoundingClientRect().left, inset, width - inset);
    run.target = clamp(drag.worldX + (drag.pointerX - drag.startX) / drag.pixelsPerUnit, -WORLD_EDGE, WORLD_EDGE);
  });
  for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    thumb.addEventListener(name, event => {
      if (event.pointerId !== drag?.id) return;
      cameraX = viewPosition();
      clearInput();
      run.target = run.x;
    });
  }
  const bindings = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'forward' };
  document.addEventListener('keydown', event => {
    if (state !== 'run' || !bindings[event.key]) return;
    event.preventDefault();
    key[bindings[event.key]] = true;
  });
  document.addEventListener('keyup', event => {
    if (bindings[event.key]) key[bindings[event.key]] = false;
  });

  function resize() {
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    const dpr = Math.min(devicePixelRatio, 2.5);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ground.width = Math.round(width);
    ground.height = Math.round(height);
    const spriteBounds = Math.ceil(skierSize() * 2.7);
    skierLayer.width = skierLayer.height = spriteBounds;
    horizon = height * 0.345;
    const railBottom = parseFloat(getComputedStyle(el('thumb-rail')).bottom) || 3;
    skiLine = Math.min(height * 0.895, height - railBottom - 51);
    focal = Math.min(width * 0.043, height * 0.062);
  }
  new ResizeObserver(resize).observe(canvas);
  resize();

  function project(x, distance, view) {
    const depth = 1 / (1 + distance / 61);
    return {
      x: width / 2 + (x - view) * focal * depth,
      y: horizon + (skiLine - horizon) * depth,
      scale: focal * depth
    };
  }

  function drawBackdrop(view) {
    const image = art[scenery[run.index]];
    ctx.fillStyle = '#223b58';
    ctx.fillRect(0, 0, width, height);
    if (!image) return;
    const aspectWidth = Math.max(width + 25, height * image.width / image.height);
    ctx.drawImage(image, (width - aspectWidth) / 2 - view * 1.1, 0, aspectWidth, height);
  }

  function drawGround(view) {
    const tile = groundTiles[run.index];
    if (tile) {
      groundCtx.clearRect(0, 0, width, height);
      const sourceHeight = tile.height / 3;
      const period = sourceHeight * 2;
      const phase = (period - run.z * 1.7 % period) % period;
      const span = tile.width * 0.78;
      const sourceLeft = (tile.width - span) * (0.5 + clamp(view / 70, -0.48, 0.48));
      groundCtx.drawImage(tile, sourceLeft, phase, span, sourceHeight * 0.72, 0, horizon, width, height - horizon);
      groundCtx.fillStyle = surfaceTint[run.index];
      groundCtx.fillRect(0, horizon, width, height - horizon);
      const blend = groundCtx.createLinearGradient(0, horizon + height * 0.045, 0, horizon + height * 0.16);
      blend.addColorStop(0, 'transparent');
      blend.addColorStop(1, 'white');
      groundCtx.globalCompositeOperation = 'destination-in';
      groundCtx.fillStyle = blend;
      groundCtx.fillRect(0, 0, width, height);
      groundCtx.globalCompositeOperation = 'source-over';
      ctx.drawImage(ground, 0, 0);
    }

  }

  function drawRunway(view) {
    // Partly frosted paint gives the ice a runway centerline and a sense of motion.
    const spacing = 102;
    const first = Math.ceil((run.z - 28) / spacing) * spacing;
    ctx.fillStyle = '#e5efffa0';
    for (let mark = first; mark < run.z + 500; mark += spacing) {
      const near = mark - run.z;
      const far = near + 27;
      const beginX = center(run.index, mark);
      const endX = center(run.index, mark + 27);
      const corners = [project(beginX - 0.28, near, view), project(beginX + 0.28, near, view),
        project(endX + 0.28, far, view), project(endX - 0.28, far, view)];
      ctx.beginPath();
      corners.forEach(({ x, y }, i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
      ctx.closePath();
      ctx.fill();
    }
  }

  function drawPostApproach(view) {
    for (const post of run.course.markers) {
      if (post.type !== 'post' || run.collected.has(post.id)) continue;
      const distance = post.z - run.z;
      if (distance < -POST_APPROACH || distance > 260) continue;
      const near = Math.max(-13, distance - POST_APPROACH);
      const far = distance + POST_APPROACH;
      const corners = [project(post.x - POST_RADIUS, near, view), project(post.x + POST_RADIUS, near, view),
        project(post.x + POST_RADIUS, far, view), project(post.x - POST_RADIUS, far, view)];
      ctx.save();
      ctx.fillStyle = '#f8ba4829';
      ctx.strokeStyle = '#ffd46cdb';
      ctx.lineWidth = 2;
      ctx.beginPath();
      corners.forEach(({ x, y }, i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawObject(object, view, edgePadding = 0) {
    const distance = object.z - run.z;
    const hangar = object.type === 'hangar';
    if (distance < -18 || (!hangar && distance > 395) || (object.id !== undefined && run.collected.has(object.id))) return;
    const point = project(object.x, hangar ? Math.min(distance, 610) : distance, view);
    if (edgePadding) point.x = clamp(point.x, edgePadding, width - edgePadding);
    const dim = bounds[object.type];
    const image = art[object.art || object.type];
    if (!image || !dim) return;
    const scale = point.scale * (object.scale ?? 1);
    const landmark = hangar || object.type === 'post' || object.objective;
    const structureScale = landmark ? Math.max(scale, width * (hangar ? 0.105 : 0.075) / dim[0]) : scale;
    const boxW = dim[0] * structureScale, boxH = dim[1] * structureScale;
    const ratio = object.type === 'log'
      ? 2 * object.radius * point.scale / image.width
      : Math.min(boxW / image.width, boxH / image.height);
    const w = image.width * ratio, h = image.height * ratio;
    const marker = object.type === 'satchel' || object.type === 'post';
    const heading = marker || object.type === 'sign' || object.type === 'cabin' || object.type === 'hangar';
    const bob = object.type === 'satchel' && !reducedMotion.matches ? Math.sin(paintTime * 4) * scale * 0.13 : 0;
    ctx.save();
    if (object.type === 'lantern' && object.darkAt <= run.z) ctx.filter = 'brightness(0.30) saturate(0.55)';
    if (marker) {
      ctx.shadowColor = '#ffb849';
      ctx.shadowBlur = scale * 0.4;
    }
    ctx.translate(point.x, point.y);
    if (object.flip) ctx.scale(-1, 1);
    ctx.drawImage(image, -w / 2, -h - bob, w, h);
    ctx.restore();
    if (heading && distance >= (object.type === 'post' ? -12 : 18) && distance < (marker ? 290 : 245)) {
      const caption = object.label ? `${object.direction < 0 ? '← ' : ''}${object.label}${object.direction > 0 ? ' →' : ''}`
        : marker ? (object.type === 'post' ? `Signal post ${object.id + 1}` : 'Dispatch pouch') : run.level.destination;
      ctx.save();
      const beacon = object.type === 'post' || object.objective;
      const fontSize = beacon ? 14 : 12;
      ctx.font = `800 ${fontSize}px system-ui`;
      ctx.textAlign = 'center';
      const padding = 8;
      const half = ctx.measureText(caption).width / 2 + padding;
      const labelX = clamp(point.x, half + 6, width - half - 6);
      const labelY = point.y - h - 10;
      ctx.fillStyle = beacon ? '#f8c665' : '#142b40e8';
      ctx.fillRect(labelX - half, labelY - fontSize - 4, half * 2, fontSize + 9);
      ctx.fillStyle = beacon ? '#1c2634' : '#ffe4ab';
      ctx.fillText(caption, labelX, labelY);
      ctx.restore();
    }
  }

  function drawAirRaid(attack, view) {
    const distance = attack.z - run.z;
    const impact = project(attack.x, distance, view);
    const progress = clamp(1 - distance / WARNING_DISTANCE, 0, 1);
    const planeX = width * (-0.24 + progress * 1.48);
    const x = attack.side < 0 ? planeX : width - planeX;
    const y = horizon * 0.69;
    const planeWidth = width * 0.32;
    const plane = art.bomber;
    if (plane) {
      const planeHeight = planeWidth * plane.height / plane.width;
      ctx.save();
      ctx.translate(x, y);
      if (attack.side > 0) ctx.scale(-1, 1);
      ctx.drawImage(plane, -planeWidth / 2, -planeHeight / 2, planeWidth, planeHeight);
      ctx.restore();
    }
    if (progress > 0.42 && art.bomb) {
      const drop = (progress - 0.42) / 0.58;
      const releaseX = width * (-0.24 + 0.42 * 1.48);
      const origin = attack.side < 0 ? releaseX : width - releaseX;
      const size = 10 + drop * 19;
      const dropX = origin + (impact.x - origin) * drop;
      const dropY = y + (impact.y - y) * drop ** 1.6;
      ctx.drawImage(art.bomb, dropX - size / 2, dropY - size * 1.5, size, size * 1.5);
    }
  }

  function drawAttack(view) {
    const attack = run.attack;
    if (attack) {
      const distance = attack.z - run.z;
      const target = project(attack.x, Math.max(0, distance), view);
      const bomb = attack.kind === 'bomb';
      const radius = target.scale * (bomb ? 2.55 : 1.25);
      ctx.save();
      ctx.fillStyle = bomb ? '#f6504655' : '#f4ae493e';
      ctx.strokeStyle = bomb ? '#ff9e83' : '#ffe19a';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.ellipse(target.x, target.y, radius, Math.max(4, radius * 0.28), 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
      if (bomb) drawAirRaid(attack, view);
      else {
        const shooterDistance = Math.max(14, distance - 18);
        const padding = width * 0.105;
        drawObject({ type: 'rifleman', x: attack.shooterX, z: run.z + shooterDistance, flip: attack.side > 0 }, view, padding);
        const muzzle = project(attack.shooterX, shooterDistance, view);
        muzzle.x = clamp(muzzle.x, padding, width - padding) - attack.side * muzzle.scale * 0.53;
        muzzle.y -= muzzle.scale * 1.9;
        const age = run.elapsed - attack.startedAt;
        const cadence = 0.26;
        const roundsFired = Math.floor(age / cadence);
        for (let round = Math.max(0, roundsFired - 1); round <= roundsFired; round++) {
          const sinceShot = age - round * cadence;
          const progress = sinceShot / 0.34;
          if (progress >= 1) continue;
          const landing = Math.max(0, distance + (round % 3) * GUN_SHOT_SPACING);
          const hit = project(attack.x, landing, view);
          const point = t => [muzzle.x + (hit.x - muzzle.x) * t, muzzle.y + (hit.y - muzzle.y) * t];
          if (sinceShot < 0.07) {
            ctx.fillStyle = '#ffe4a2';
            ctx.beginPath();
            ctx.arc(muzzle.x, muzzle.y, Math.max(2, 7 * (1 - sinceShot / 0.07)), 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.beginPath();
          ctx.moveTo(...point(Math.max(0, progress - 0.30)));
          ctx.lineTo(...point(progress));
          ctx.strokeStyle = '#f69939';
          ctx.lineWidth = 5;
          ctx.stroke();
          ctx.strokeStyle = '#fff1aa';
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      }
    }
    const blast = run.lastBlast;
    if (!blast || blast.expires <= run.elapsed || !art.blast) return;
    const point = project(blast.x, Math.max(-25, blast.z - run.z), view);
    const fraction = clamp((blast.expires - run.elapsed) / 0.65, 0, 1);
    const size = point.scale * (4.4 + (1 - fraction) * 2);
    ctx.save();
    ctx.globalAlpha = fraction;
    ctx.drawImage(art.blast, point.x - size / 2, point.y - size * 0.84, size, size);
    ctx.restore();
  }

  function drawSkier(view) {
    const fallProgress = (run.elapsed - run.lastCrash) / FALL_SECONDS;
    const fall = fallProgress < 1 ? fallPoses.find(pose => fallProgress < pose.until) : null;
    const point = project(run.x, 0, view);
    const size = skierSize();
    const lowMotion = reducedMotion.matches;

    skierPaint.setTransform(1, 0, 0, 1, 0, 0);
    skierPaint.clearRect(0, 0, skierLayer.width, skierLayer.height);
    skierPaint.translate(skierLayer.width / 2, skierLayer.height / 2);
    skierPaint.globalCompositeOperation = 'lighter';
    function pose(name, opacity, heightScale = 1, anchor = 0.5, mirror = false) {
      const image = art[name];
      if (!image || opacity < 0.005) return;
      const h = size * heightScale;
      const w = h * image.width / image.height;
      skierPaint.save();
      skierPaint.globalAlpha = opacity;
      if (mirror) skierPaint.scale(-1, 1);
      skierPaint.drawImage(image, -w * anchor, -h, w, h);
      skierPaint.restore();
    }

    const stroke = (1 - Math.cos(motionPhase * Math.PI * 2)) / 2;
    const bob = fall || lowMotion ? 0 : (stroke - 0.5) * 3;
    if (fall) {
      pose(fall.name, 1, fall.height);
    } else {
      const turn = clamp((Math.abs(lean) - 1.5) / 17, 0, 1);
      const riding = 1 - brakeBlend;
      const tuck = lowMotion ? 0 : stroke * 0.32;
      const plant = lowMotion ? 0 : stroke * 0.48;
      if (!lowMotion) skierPaint.rotate(lean * 0.0038);
      pose('ski-glide', riding * (1 - turn) * (1 - tuck));
      pose('ski-tuck', riding * (1 - turn) * tuck, 0.84);
      pose('ski-carve', riding * turn * (1 - plant), 0.94, 0.36, lean < 0);
      pose('ski-plant', riding * turn * plant, 0.94, 0.34, lean < 0);
      pose('ski-brake', brakeBlend);
    }
    ctx.drawImage(skierLayer, point.x - skierLayer.width / 2, point.y + bob - skierLayer.height / 2);
  }

  function drawSnowfall() {
    const still = reducedMotion.matches;
    const time = still ? 0 : paintTime;
    ctx.save();
    ctx.fillStyle = '#f4fbff';
    for (const flake of flakes) {
      const y = ((flake.y + time * flake.speed) % 1) * height;
      const x = ((flake.x + time * flake.speed * 0.57) % 1) * width;
      ctx.globalAlpha = 0.29 + flake.size * 0.17;
      ctx.beginPath();
      ctx.ellipse(x, y, flake.size * 0.67, flake.size * (still ? 0.8 : 1.23), -0.42, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function draw() {
    const view = viewPosition();
    drawBackdrop(view);
    drawGround(view);
    if (run.index === 2) drawRunway(view);
    if (run.index === 1) drawPostApproach(view);
    const objects = run.course.objects;
    for (const object of objects) if (object.z >= run.z) drawObject(object, view);
    drawAttack(view);
    drawSkier(view);
    for (const object of objects) if (object.z < run.z) drawObject(object, view);
    drawSnowfall();
    const inset = thumbInset();
    const x = clamp(project(run.x, 0, view).x, inset, width - inset);
    thumb.style.left = `${x}px`;
  }

  function updateMissedWarning() {
    const warning = el('missed-warning');
    const missed = state === 'run' && run.pendingReturn?.marker;
    if (missed) {
      const message = missed.type === 'post' ? 'SIGNAL POST MISSED' : 'DISPATCH MISSED';
      if (warning.textContent !== message) warning.textContent = message;
    }
    warning.hidden = !missed;
  }

  function updateHud() {
    updateMissedWarning();
    el('level-name').textContent = `Level ${run.index + 1} · ${run.level.title}`;
    const progress = Math.floor(Math.min(run.z / DISTANCE, 1) * 100);
    el('run-status').textContent = run.level.objective ? `${run.level.objective} ${run.collected.size}/2` : 'Deliver the warning';
    el('progress').value = progress;
    el('progress').max = 100;
    const marker = run.course.markers.find(item => !run.collected.has(item.id));
    let hint = '';
    const fork = marker && run.level.forks.find(item => marker.z > item.start && marker.z < item.end);
    if (fork && run.z >= fork.start - 190 && run.z <= fork.start + 170) {
      hint = fork.side < 0 ? '← Take the left fork before the trees' : 'Take the right fork before the trees →';
    } else if (marker && marker.z - run.z < 265) {
      const direction = marker.x - run.x;
      const arrow = Math.abs(direction) < 1.8 ? '↑' : direction < 0 ? '←' : '→';
      hint = marker.z < run.z ? 'Return trail ahead'
        : `${arrow} ${marker.type === 'post' ? 'Ski through the gold signal-post zone' : 'Dispatch pouch ahead'}`;
    } else if (run.braking && run.speed === 0 && !drag) hint = 'Place your thumb on the slider to ski';
    else if (run.index === 2 && progress > 25 && progress < 95) {
      hint = 'Follow the trail lanterns';
    }
    if (run.attack) {
      hint = run.attack.kind === 'bomb' ? 'Bomber overhead. Leave the marked area.'
        : run.attack.locked ? 'The aim is fixed. Ski past the marked lane.'
          : 'Gunfire ahead. Steer clear or lift to wait.';
    }
    const hintElement = el('route-hint');
    hintElement.classList.toggle('danger', Boolean(run.attack));
    if (hintElement.textContent !== hint) hintElement.textContent = hint;
    const notice = run.elapsed < run.noticeUntil ? run.notice : '';
    if (el('notice').textContent !== notice) el('notice').textContent = notice;
  }

  let waitingForPortrait = false;
  function syncOrientation() {
    const blocked = window.TrentOrientation.blocked(false);
    if (blocked !== waitingForPortrait) clearInput();
    waitingForPortrait = blocked;
    el('rotate').hidden = !blocked || window.TrentOrientation.embedded;
  }
  window.TrentOrientation.subscribe(syncOrientation);
  syncOrientation();

  function tick(now) {
    const dt = lastFrame ? Math.min(0.065, (now - lastFrame) / 1000) : 0;
    lastFrame = now;
    paintTime += dt;
    if (state === 'run' && !waitingForPortrait && dt > 0) {
      const previousZ = run.z;
      const heldSkisX = drag ? project(run.x, 0, viewPosition()).x : null;
      const steering = Number(key.right) - Number(key.left);
      const brake = !drag && !steering && !key.forward;
      step(run, dt, { brake, steer: steering });
      if (drag && run.z < previousZ) {
        drag.worldX = run.x;
        drag.startX = drag.pointerX;
        drag.skisX = heldSkisX;
      }
      lean += (run.lateralVelocity - lean) * (1 - Math.exp(-dt * 7));
      brakeBlend += (Number(run.braking) - brakeBlend) * (1 - Math.exp(-dt * 8));
      motionPhase = (motionPhase + dt * (0.85 + run.speed / 85)) % 1;
      const desiredView = run.x * 0.70 + center(run.index, run.z) * 0.30;
      cameraX = run.z < previousZ ? desiredView : cameraX + (desiredView - cameraX) * (1 - Math.exp(-dt * 5));
      updateHud();
      if (run.finished) finish();
    }
    draw();
    requestAnimationFrame(tick);
  }

  if (embedded) {
    el('levels').hidden = true;
    el('choose').hidden = true;
    el('restart-sequence').hidden = false;
    el('next').hidden = true;
    el('replay').hidden = true;
    el('menu-back').hidden = true;
  }
  choose(stage < 0 ? 0 : stage);
  const sources = Object.fromEntries([...scenery, ...surfaces, 'ski-brake', ...skiPoses, 'stump-alt', 'log-alt', ...fallPoses.map(pose => pose.name), ...Object.keys(bounds)]
    .map(name => [name, `art/${name}.webp`]));
  Object.assign(sources, {
    rifleman: '../listening-wire/art/guard-rifleman.webp',
    bomber: 'art/bomber-side.webp',
    bomb: '../chimney-road/art/painted-bomb.webp',
    blast: '../frosted-skies/art/painted-missile-explosion.webp'
  });
  el('start').disabled = true;
  Promise.all(Object.entries(sources).map(([name, source]) => {
    const image = new Image();
    image.src = source;
    return image.decode().then(() => { art[name] = image; });
  })).then(() => {
    for (const surface of surfaces) {
      const image = art[surface];
      const tile = document.createElement('canvas');
      tile.width = image.width;
      tile.height = image.height * 3;
      const layer = tile.getContext('2d');
      layer.drawImage(image, 0, 0);
      layer.drawImage(image, 0, 2 * image.height);
      layer.translate(0, 2 * image.height);
      layer.scale(1, -1);
      layer.drawImage(image, 0, 0);
      groundTiles.push(tile);
    }
    el('start').disabled = false;
  }).catch(() => {
    el('briefing').textContent = 'The painted course could not load. Reload to try again.';
  });
  requestAnimationFrame(tick);
})();
