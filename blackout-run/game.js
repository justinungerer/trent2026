'use strict';

(() => {
  const { levels, DISTANCE, WORLD_EDGE, clamp, center, trails, createRun, retryCheckpoint, step } = BlackoutRun;
  const el = id => document.getElementById(id);
  const canvas = el('slope');
  const ctx = canvas.getContext('2d');
  const ground = document.createElement('canvas');
  const groundCtx = ground.getContext('2d');
  let snowTile;
  const art = {};
  const scenery = ['valley', 'forest', 'airstrip'];
  const bounds = {
    pine: [4.4, 6.4], rock: [1.95, 0.95], sign: [1.55, 2.35], bridge: [5.5, 2.35],
    satchel: [1.33, 1.1], post: [1.85, 2.55], cabin: [6.1, 4.7], hangar: [9, 4.9],
    lantern: [0.8, 1.3]
  };
  let selected = 0;
  let run = createRun(selected);
  let state = 'menu';
  let width, height, horizon, skiLine, focal;
  let paintTime = 0;
  let lastFrame = 0;
  let previousX = 0;
  let lean = 0;
  let drag = null;
  let brakePointer = null;
  const key = { left: false, right: false, brake: false };
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
    brakePointer = null;
    key.left = key.right = key.brake = false;
  }

  function show(next) {
    state = next;
    clearInput();
    for (const id of ['menu', 'paused', 'results']) el(id).hidden = id !== state;
    el('hud').hidden = state !== 'run' && state !== 'paused';
    el('brake').hidden = state !== 'run';
    el('brake').classList.remove('held');
    if (next === 'paused') el('resume').focus({ preventScroll: true });
    if (next === 'results') el('next').focus({ preventScroll: true });
  }

  function choose(index) {
    selected = index;
    run = createRun(index);
    lean = 0;
    el('briefing').textContent = levels[index].briefing;
    selection.forEach((button, i) => button.setAttribute('aria-pressed', String(index === i)));
    show('menu');
  }

  function start(index) {
    selected = index;
    run = createRun(index);
    lean = 0;
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
  }

  const actions = {
    start: () => start(selected),
    pause: () => show('paused'),
    resume: () => show('run'),
    checkpoint: () => { retryCheckpoint(run); show('run'); },
    choose: () => choose(selected),
    'menu-back': () => choose(selected),
    replay: () => start(selected),
    next: () => selected === 2 ? choose(selected) : start(selected + 1)
  };
  for (const [id, handler] of Object.entries(actions)) el(id).addEventListener('click', handler);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && state === 'run') show('paused');
  });

  canvas.addEventListener('pointerdown', event => {
    if (state !== 'run' || drag) return;
    drag = { id: event.pointerId, x: event.clientX, target: run.target };
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointermove', event => {
    if (event.pointerId !== drag?.id) return;
    run.target = clamp(drag.target + (event.clientX - drag.x) / width * 22, -WORLD_EDGE, WORLD_EDGE);
  });
  for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    canvas.addEventListener(name, event => {
      if (event.pointerId === drag?.id) drag = null;
    });
    el('brake').addEventListener(name, event => {
      if (event.pointerId === brakePointer) brakePointer = null;
    });
  }
  el('brake').addEventListener('pointerdown', event => {
    if (state !== 'run' || brakePointer !== null) return;
    brakePointer = event.pointerId;
    el('brake').setPointerCapture(event.pointerId);
  });
  const bindings = { ArrowLeft: 'left', ArrowRight: 'right', ArrowDown: 'brake' };
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
    horizon = height * 0.345;
    skiLine = height * 0.79;
    focal = Math.min(width * 0.069, height * 0.073);
  }
  new ResizeObserver(resize).observe(canvas);
  resize();

  function project(x, distance, view) {
    const depth = 1 / (1 + distance / 48);
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

    for (let index = 0; index < 2; index++) {
      const left = [], right = [];
      for (let distance = far; distance >= -24; distance -= 4) {
        const lane = trails(run.index, run.z + distance)[index];
        if (!lane) continue;
        left.push(project(lane.x - lane.width, distance, view));
        right.push(project(lane.x + lane.width, distance, view));
      }
      if (left.length < 2) continue;
      ctx.beginPath();
      [...left, ...right.reverse()].forEach(({ x, y }, i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
      ctx.closePath();
      ctx.fillStyle = index ? '#d2e8fa2e' : '#e9f5ff38';
      ctx.fill();
      ctx.strokeStyle = '#e2f1ff35';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }

  function drawObject(object, view) {
    const distance = object.z - run.z;
    if (distance < -18 || distance > 395 || (object.id !== undefined && run.collected.has(object.id))) return;
    const point = project(object.x, distance, view);
    const dim = bounds[object.type];
    const image = art[object.type];
    if (!image || !dim) return;
    const scale = point.scale * (object.scale ?? 1);
    const boxW = dim[0] * scale, boxH = dim[1] * scale;
    const ratio = Math.min(boxW / image.width, boxH / image.height);
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
    ctx.drawImage(image, point.x - w / 2, point.y - h - bob, w, h);
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

  function drawSkier(view) {
    const image = art[run.braking ? 'ski-brake' : Math.abs(lean) > 0.8 ? 'ski-turn' : 'ski-straight'];
    if (!image) return;
    const point = project(run.x, 0, view);
    const h = Math.min(height * 0.21, width * 0.36);
    const w = h * image.width / image.height;
    ctx.save();
    if (run.elapsed - run.lastCrash < 0.35) ctx.globalAlpha = 0.64;
    ctx.translate(point.x, point.y);
    if (!run.braking && lean < -0.8) ctx.scale(-1, 1);
    ctx.drawImage(image, -w / 2, -h, w, h);
    ctx.restore();
  }

  function draw() {
    const view = run.x * 0.72 + center(run.index, run.z) * 0.28;
    drawBackdrop(view);
    drawSnow(view);
    const objects = run.course.objects;
    for (const object of objects) if (object.z >= run.z) drawObject(object, view);
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
    if (marker && marker.z - run.z < 265) {
      const direction = marker.x - run.x;
      const arrow = Math.abs(direction) < 1.8 ? '↑' : direction < 0 ? '←' : '→';
      hint = marker.z < run.z ? 'Return trail ahead'
        : `${arrow} ${marker.type === 'post' ? 'Hold Brake at the signal post' : 'Dispatch pouch ahead'}`;
    } else if (run.index === 2 && progress > 25 && progress < 95) {
      hint = 'Follow the trail lanterns';
    }
    el('route-hint').textContent = hint;
    const notice = run.elapsed < run.noticeUntil ? run.notice : '';
    if (el('notice').textContent !== notice) el('notice').textContent = notice;
  }

  function tick(now) {
    const dt = lastFrame ? Math.min(0.065, (now - lastFrame) / 1000) : 0;
    lastFrame = now;
    paintTime += dt;
    if (state === 'run' && dt > 0) {
      previousX = run.x;
      const brake = brakePointer !== null || key.brake;
      el('brake').classList.toggle('held', brake);
      step(run, dt, { brake, steer: Number(key.right) - Number(key.left) });
      lean += (clamp((run.x - previousX) / dt, -12, 12) - lean) * Math.min(1, dt * 8);
      updateHud();
      if (run.finished) finish();
    }
    draw();
    requestAnimationFrame(tick);
  }

  choose(0);
  const sources = [...scenery, 'snow', 'ski-straight', 'ski-turn', 'ski-brake', ...Object.keys(bounds)];
  el('start').disabled = true;
  Promise.all(sources.map(name => {
    const image = new Image();
    image.src = `art/${name}.webp`;
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
