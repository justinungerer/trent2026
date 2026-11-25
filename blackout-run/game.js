'use strict';

(() => {
  const { levels, DISTANCE, WORLD_EDGE, WARNING_DISTANCE, GUN_SHOT_SPACING, FALL_SECONDS, clamp, center, trails, treeLine, createRun, retryCheckpoint, step } = BlackoutRun;
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
  const ctx = canvas.getContext('2d');
  const ground = document.createElement('canvas');
  const groundCtx = ground.getContext('2d');
  const skierLayer = document.createElement('canvas');
  const skierPaint = skierLayer.getContext('2d');
  let snowTile;
  const art = {};
  const scenery = ['valley', 'forest', 'airstrip'];
  const skiPoses = ['ski-glide', 'ski-tuck', 'ski-carve', 'ski-plant'];
  const fallPoses = [
    { name: 'ski-stumble', until: 0.19, height: 0.96 },
    { name: 'ski-tumble', until: 0.42, height: 0.79 },
    { name: 'ski-slide', until: 0.70, height: 0.53 },
    { name: 'ski-rise', until: 1, height: 0.82 }
  ];
  const bounds = {
    pine: [4.4, 6.4], rock: [1.95, 0.95], sign: [1.55, 2.35],
    satchel: [1.33, 1.1], post: [1.85, 2.55], cabin: [6.1, 4.7], hangar: [9, 4.9],
    lantern: [0.8, 1.3], rifleman: [2.6, 4.1], stump: [2.35, 1.65], log: [2, 1.85]
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
    key.left = key.right = key.forward = false;
  }

  function show(next) {
    state = next;
    clearInput();
    el('start-sheet').hidden = state !== 'menu';
    el('paused').hidden = state !== 'paused';
    el('results').hidden = state !== 'results';
    el('hud').hidden = state !== 'run' && state !== 'paused';
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
    start: () => start(selected),
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

  function grabSlope(event) {
    if (state !== 'run' || drag || !event.isPrimary || event.button !== 0) return;
    drag = { id: event.pointerId, x: event.clientX, target: run.x };
    run.target = run.x;
    canvas.setPointerCapture(event.pointerId);
  }

  el('start-sheet').addEventListener('pointerdown', event => {
    if (event.target.closest('#levels') || !event.isPrimary || event.button !== 0 || el('start').disabled) return;
    event.preventDefault();
    el('start').click();
    grabSlope(event);
  });
  canvas.addEventListener('pointerdown', grabSlope);
  canvas.addEventListener('pointermove', event => {
    if (event.pointerId !== drag?.id) return;
    run.target = clamp(drag.target + (event.clientX - drag.x) / width * WORLD_EDGE * 1.84, -WORLD_EDGE, WORLD_EDGE);
  });
  for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    canvas.addEventListener(name, event => {
      if (event.pointerId !== drag?.id) return;
      drag = null;
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
    const spriteBounds = Math.ceil(Math.min(height * 0.21, width * 0.36) * 2.7);
    skierLayer.width = skierLayer.height = spriteBounds;
    horizon = height * 0.345;
    skiLine = height * 0.895;
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

  function drawSnow(view) {
    const far = 440;
    if (snowTile) {
      groundCtx.clearRect(0, 0, width, height);
      const halfTile = snowTile.height / 2;
      const cycle = (run.z * 2) % snowTile.height;
      const phase = cycle < halfTile ? cycle : snowTile.height - cycle;
      const sourceLeft = (snowTile.width - 460) * (0.5 + clamp(view / 40, -0.48, 0.48));
      groundCtx.drawImage(snowTile, sourceLeft, phase, 460, 450, 0, horizon, width, height - horizon);
      groundCtx.fillStyle = '#26466675';
      groundCtx.fillRect(0, horizon, width, height - horizon);
      const blend = groundCtx.createLinearGradient(0, horizon + height * 0.045, 0, horizon + height * 0.23);
      blend.addColorStop(0, 'transparent');
      blend.addColorStop(1, 'white');
      groundCtx.globalCompositeOperation = 'destination-in';
      groundCtx.fillStyle = blend;
      groundCtx.fillRect(0, 0, width, height);
      groundCtx.globalCompositeOperation = 'source-over';
      ctx.drawImage(ground, 0, 0);
    }

    // Darken the snow beyond the actual forest boundary so the playable area reads at speed.
    ctx.fillStyle = '#0c223851';
    for (const side of ['left', 'right']) {
      const edgeX = side === 'left' ? 0 : width;
      ctx.beginPath();
      ctx.moveTo(edgeX, project(0, far, view).y);
      for (let distance = far; distance >= -36; distance -= 4) {
        const edge = treeLine(run.index, run.z + distance);
        const point = project(edge[side], distance, view);
        ctx.lineTo(point.x, point.y);
      }
      ctx.lineTo(edgeX, project(0, -36, view).y);
      ctx.closePath();
      ctx.fill();
    }

    for (let index = 0; index < 2; index++) {
      let left = [], right = [];
      ctx.beginPath();
      function closeStrip() {
        if (left.length > 1) {
          [...left, ...right.reverse()].forEach(({ x, y }, i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
          ctx.closePath();
        }
        left = [];
        right = [];
      }
      for (let distance = far; distance >= -24; distance -= 4) {
        const lane = trails(run.index, run.z + distance)[index];
        if (!lane) {
          if (left.length) closeStrip();
          continue;
        }
        left.push(project(lane.x - lane.width, distance, view));
        right.push(project(lane.x + lane.width, distance, view));
      }
      closeStrip();
      ctx.fillStyle = index ? '#d2e8fa2e' : '#e9f5ff38';
      ctx.fill();
      ctx.strokeStyle = '#e2f1ff35';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }

  function drawObject(object, view, edgePadding = 0) {
    const distance = object.z - run.z;
    if (distance < -18 || distance > 395 || (object.id !== undefined && run.collected.has(object.id))) return;
    const point = project(object.x, distance, view);
    if (edgePadding) point.x = clamp(point.x, edgePadding, width - edgePadding);
    const dim = bounds[object.type];
    const image = art[object.art || object.type];
    if (!image || !dim) return;
    const scale = point.scale * (object.scale ?? 1);
    const boxW = dim[0] * scale, boxH = dim[1] * scale;
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
    if (heading && distance >= 18 && distance < (marker ? 275 : 175)) {
      const caption = object.label ? `${object.direction < 0 ? '← ' : ''}${object.label}${object.direction > 0 ? ' →' : ''}`
        : marker ? (object.type === 'post' ? 'Signal post' : 'Dispatch pouch') : run.level.destination;
      ctx.save();
      ctx.font = '700 12px system-ui';
      ctx.textAlign = 'center';
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#10223b';
      ctx.fillStyle = '#ffe4ab';
      const labelX = clamp(point.x, 65, width - 65);
      ctx.strokeText(caption, labelX, point.y - h - 8);
      ctx.fillText(caption, labelX, point.y - h - 8);
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
        for (let shot = 0; shot < 3; shot++) {
          const approach = distance + shot * GUN_SHOT_SPACING;
          if (approach < 0 || approach > 66) continue;
          const progress = 1 - approach / 66;
          const hit = project(attack.x, approach, view);
          const point = t => [muzzle.x + (hit.x - muzzle.x) * t, muzzle.y + (hit.y - muzzle.y) * t];
          if (progress < 0.23) {
            ctx.fillStyle = '#ffe4a2';
            ctx.beginPath();
            ctx.arc(muzzle.x, muzzle.y, 7 * (1 - progress), 0, Math.PI * 2);
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
    const size = Math.min(height * 0.21, width * 0.36);
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

  function draw() {
    const view = clamp(cameraX, run.x - width * 0.34 / focal, run.x + width * 0.34 / focal);
    drawBackdrop(view);
    drawSnow(view);
    const objects = run.course.objects;
    for (const object of objects) if (object.z >= run.z) drawObject(object, view);
    drawAttack(view);
    drawSkier(view);
    for (const object of objects) if (object.z < run.z) drawObject(object, view);
  }

  function updateHud() {
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
        : `${arrow} ${marker.type === 'post' ? 'Lift your finger at the signal post' : 'Dispatch pouch ahead'}`;
    } else if (run.braking && run.speed === 0 && !drag) hint = 'Touch the snow to ski';
    else if (run.index === 2 && progress > 25 && progress < 95) {
      hint = 'Follow the trail lanterns';
    }
    if (run.attack) {
      hint = run.attack.kind === 'bomb' ? 'Bomber overhead. Leave the marked area.' : 'Gunfire ahead. Steer clear or lift to wait.';
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
      const steering = Number(key.right) - Number(key.left);
      const brake = !drag && !steering && !key.forward;
      step(run, dt, { brake, steer: steering });
      lean += (run.lateralVelocity - lean) * (1 - Math.exp(-dt * 7));
      brakeBlend += (Number(brake) - brakeBlend) * (1 - Math.exp(-dt * 8));
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
  const sources = Object.fromEntries([...scenery, 'snow', 'ski-brake', ...skiPoses, 'stump-alt', 'log-alt', ...fallPoses.map(pose => pose.name), ...Object.keys(bounds)]
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
    const snow = art.snow;
    snowTile = document.createElement('canvas');
    snowTile.width = snow.width;
    snowTile.height = snow.height * 2;
    const tileContext = snowTile.getContext('2d');
    tileContext.drawImage(snow, 0, 0);
    tileContext.translate(0, snowTile.height);
    tileContext.scale(1, -1);
    tileContext.drawImage(snow, 0, 0);
    el('start').disabled = false;
  }).catch(() => {
    el('briefing').textContent = 'The painted course could not load. Reload to try again.';
  });
  requestAnimationFrame(tick);
})();
