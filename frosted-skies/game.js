'use strict';
const canvas = document.querySelector('canvas');
const g = canvas.getContext('2d');
const W = 480, H = 760;
const MAX_HULL = 3 + (window.TrentMissionBonus || 0);
const params = new URLSearchParams(location.search);
const stage = params.get('stage');
const scouts = stage === 'the-scout-screen';
const workshop = stage === 'workshop-approach';
const intercept = scouts || workshop;
const targetKind = scouts ? 'drone' : 'hauler';
const targetName = scouts ? 'Recon drone' : 'Cargo hauler';
const targetSeconds = 19;
const bossDelay = 14;
const ui = Object.fromEntries(['score','hull','phase','pause','sheet','title','brief','controls','action','stack','weapon'].map(id => [id, document.getElementById(id)]));
const clamp = (n, a, b) => Math.max(a, Math.min(n, b));
const colors = { red: '#e34751', gold: '#ffce71', ice: '#81f4ff', blue: '#4b899d', dark: '#203349', mint: '#b9ffe4' };
const CRAFT = {
  drone:  { hp: 4, speed: 92, size: 54, reload: 1.75, score: 180, hx: 23, hy: 16, touch: 26 },
  skiff:  { hp: 2, speed: 168, size: 38, reload: 0.88, score: 160, hx: 16, hy: 13, touch: 18 },
  hauler: { hp: 8, speed: 50, size: 76, reload: 2.05, score: 340, hx: 34, hy: 22, touch: 34 },
  wisp:   { hp: 2, speed: 146, size: 32, reload: 0.64, score: 150, hx: 14, hy: 14, touch: 17 },
  boss:   { hp: 70, speed: 74, size: 125, reload: 0.78, score: 2500, hx: 48, hy: 34, touch: 32 },
  flagship: { hp: 1400, speed: 60, size: 196, reload: 1.12, score: 5000, hx: 78, hy: 49, touch: 51 }
};
const WEAPONS = {
  flame: { label: 'FLAME', mark: 'F', color: '#ff7a3c', rate: 0.18 },
  missile: { label: 'MISSILE', mark: 'M', color: colors.gold, rate: 0.48 },
  laser: { label: 'LASER', mark: 'L', color: '#e7fdff', rate: 0.11 },
  homing: { label: 'HOMING', mark: 'H', color: '#ff868c', rate: 0.68 }
};
// A full clear now yields eleven pickups, down from twenty-three.
const KILLS_PER_DROP = 9;
const PODS = ['flame', 'missile', 'laser', 'homing'];
const FLAME_REACH = 0.6 * H;
const FLAME_HALF = 46;
function loadArt(name) {
  const image = new Image();
  image.src = './art/' + name + '.webp';
  return image;
}
const art = Object.fromEntries(['valley', 'sleigh', 'drone', 'boss', 'skiff', 'hauler', 'wisp']
  .map(name => [name, loadArt(name === 'valley' && scouts ? 'scout-valley' : name === 'valley' && workshop ? 'workshop-roofs' : name)]));
const weaponPod = loadArt('painted-pod');
const finalBossArt = intercept ? loadArt(scouts ? 'scout-command-aircraft' : 'workshop-siege-bomber') : null;
let valleyTile = null;
function backgroundTile() {
  if (valleyTile || !ready(art.valley)) return valleyTile;
  const tile = document.createElement('canvas');
  tile.width = W;
  tile.height = Math.ceil(W * art.valley.naturalHeight / art.valley.naturalWidth) + 100;
  const context = tile.getContext('2d');
  context.drawImage(art.valley, 0, 0, W, tile.height);
  context.globalCompositeOperation = 'destination-in';
  const edge = context.createLinearGradient(0, 0, 0, 100);
  edge.addColorStop(0, 'transparent');
  edge.addColorStop(1, '#fff');
  context.fillStyle = edge;
  context.fillRect(0, 0, W, tile.height);
  valleyTile = tile;
  return tile;
}
function resizeCanvas() {
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = W * ratio;
  canvas.height = H * ratio;
  g.setTransform(ratio, 0, 0, ratio, 0, 0);
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const ready = image => !!image && image.complete && image.naturalWidth > 0;
function ship(kind, x, y, width, bank) {
  const sprite = art[kind];
  if (!ready(sprite)) return;
  const height = width * sprite.naturalHeight / sprite.naturalWidth;
  g.save();
  g.translate(x, y);
  g.rotate(bank);
  g.scale(1 - Math.abs(bank) * .22, 1);
  g.drawImage(sprite, -width / 2, -height / 2, width, height);
  g.restore();
}
function craftSprite(kind, x, y, width, bank) {
  if (kind === 'flagship' && ready(finalBossArt)) {
    g.save();
    g.translate(x, y);
    g.rotate(bank);
    g.drawImage(finalBossArt, -width / 2, -width * .34, width, width * .68);
    g.restore();
    return;
  }
  ship(kind === 'flagship' ? 'boss' : kind, x, y, width, bank);
  if (kind === 'flagship') {
    g.fillStyle = '#ffc681';
    for (const side of [-1, 1]) {
      g.beginPath();
      g.ellipse(x + side * width * .33, y + width * .12, 7, 10, 0, 0, Math.PI * 2);
      g.fill();
    }
  }
}
const largeCraft = kind => kind === 'boss' || kind === 'flagship';
const keys = new Set();
let state = 'intro', player, enemies, shots, bolts, sparks, parcels, time, score, wave, bossSpawned, flagshipAt, aim, drag, wraps, recoil, shake, kills;
let nextWave, nextTarget, bossAt, bossesCleared, aimReleased;
let finalSpawned, clearAt;
let regularSpawnCount, eliteWarningUntil;
const stageTitle = scouts ? 'The Scout Screen' : 'Workshop Approach';
const stageBrief = (scouts ? 'Intercept marked recon drones.' : 'Dodge sideways patrols and intercept marked cargo haulers.') +
  ' Marked aircraft have ' + (scouts ? 'fifteen' : 'ten') + ' times normal hull and escape if you take too long.' +
  ' Destroy one to draw out the commander 14 seconds later. Keep flying through the next patrols, then defeat the final ' +
  (scouts ? 'recon command aircraft.' : 'siege bomber.');
const stars = Array.from({ length: 95 }, (_, i) => ({ x: (i * 179.31) % W, y: (i * 117.69) % H, s: 1 + i % 3 }));
function reset() {
  nextWave = 1.35;
  nextTarget = 14;
  bossesCleared = false;
  finalSpawned = false;
  regularSpawnCount = 0;
  eliteWarningUntil = 0;
  clearAt = null;
  bossAt = intercept ? null : 51;
  aimReleased = false;
  player = { x: W / 2, y: 625, hull: MAX_HULL, bank: 0, shield: 0, stack: ['laser'], cool: [0] };
  enemies = []; shots = []; bolts = []; sparks = []; parcels = [];
  wraps = []; recoil = 0; shake = 0; time = 0; score = 0; wave = 0; bossSpawned = false; flagshipAt = null; aim = null; drag = null; kills = 0;
  ui.score.textContent = '000000';
  ui.hull.textContent = '◆'.repeat(MAX_HULL);
  ui.phase.textContent = scouts || workshop ? stageTitle : 'THE FROZEN VALLEY';
  paintStack();
}
if (intercept) {
  ui.title.textContent = stageTitle;
  ui.brief.textContent = stageBrief;
} else {
  ui.controls.textContent += ' Defeat the commander and then the final flagship to clear the level.';
}
ui.controls.textContent += ' Sideways patrols return lower after each pass. Elite aircraft drop a weapon for every quarter of hull lost.';
function paintStack() {
  ui.weapon.textContent = player.stack.map(name => WEAPONS[name].label).join(' + ');
  ui.stack.replaceChildren(...player.stack.slice(1).map(name => {
    const spec = WEAPONS[name];
    const slot = document.createElement('span');
    slot.textContent = spec.mark;
    slot.title = spec.label;
    slot.style.color = spec.color;
    return slot;
  }));
}
function overlay(next, title, brief, label) {
  state = next; drag = null; aim = null; keys.clear();
  ui.title.textContent = title;
  ui.brief.textContent = brief;
  ui.action.textContent = label;
  const restart = document.getElementById('restart-sequence');
  if (restart) restart.hidden = next !== 'paused' && next !== 'lost';
  ui.sheet.hidden = false;
}
ui.action.onclick = () => {
  if (state === 'cleared' && params.has('runId') && window.parent !== window) {
    finishFlight();
    return;
  }
  if (state !== 'paused') reset();
  state = 'playing';
  ui.sheet.hidden = true;
};
function pause() {
  if (state === 'playing') overlay('paused', 'HOLD POSITION', 'The CIA says this is an excellent time to check whether the fruitcake has stopped glowing.', 'Resume flight');
}
ui.pause.onclick = pause;
window.addEventListener('keydown', e => {
  const k = e.key.toLowerCase();
  if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd'].includes(k) && state === 'playing') {
    e.preventDefault();
    keys.add(k);
  }
  if (k === 'escape' && !e.repeat) {
    if (state === 'paused') ui.action.click();
    else pause();
  }
});
window.addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));
window.addEventListener('blur', () => { drag = null; aim = null; keys.clear(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
function pointer(e) {
  const r = canvas.getBoundingClientRect();
  return { x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * H / r.height };
}
function beginSteer(id, point) {
  if (state !== 'playing' || drag || window.TrentGameOrientation?.blocked()) return false;
  const p = pointer(point);
  drag = { id, dx: player.x - p.x, dy: player.y - p.y };
  aimReleased = false;
  return true;
}
function steer(id, point) {
  if (drag?.id !== id) return;
  const p = pointer(point);
  aim = { x: clamp(p.x + drag.dx, 25, W - 25), y: clamp(p.y + drag.dy, 315, H - 55) };
}
function endSteer(id, canceled) {
  if (drag?.id !== id) return;
  drag = null;
  if (canceled) aim = null;
  else aimReleased = true;
}
canvas.addEventListener('pointerdown', e => {
  if (e.pointerType === 'touch' || !beginSteer(e.pointerId, e)) return;
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove', e => {
  if (e.pointerType !== 'touch') steer(e.pointerId, e);
});
for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) {
  canvas.addEventListener(event, e => {
    if (e.pointerType !== 'touch') endSteer(e.pointerId, event !== 'pointerup');
  });
}
// Explicit touch handling keeps steering inside an iOS campaign iframe.
for (const event of ['touchstart', 'touchmove', 'touchend', 'touchcancel']) {
  canvas.addEventListener(event, e => {
    for (let index = 0; index < e.changedTouches.length; index++) {
      const touch = e.changedTouches[index];
      const id = 'touch-' + touch.identifier;
      if (event === 'touchstart') beginSteer(id, touch);
      else if (event === 'touchmove') steer(id, touch);
      else {
        if (event === 'touchend') steer(id, touch);
        endSteer(id, event === 'touchcancel');
      }
    }
    if (state === 'playing' && e.cancelable) e.preventDefault();
  }, { passive: false });
}
window.TrentOrientation.subscribe(() => {
  if (window.TrentGameOrientation?.blocked()) {
    drag = null;
    aim = null;
  }
});
function burst(x, y, color, n = 14) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, v = 35 + Math.random() * 160;
    sparks.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: .35 + Math.random() * .35, color });
  }
}
function stackShift(index) {
  if (index === 0) return 0;
  const side = index % 2 ? -1 : 1;
  return side * (28 + Math.floor((index - 1) / 2) * 24);
}
function inFlame(px, py, ox, oy) {
  const dy = oy - py;
  if (dy < 0 || dy > FLAME_REACH) return false;
  return Math.abs(px - ox) <= FLAME_HALF * (dy / FLAME_REACH);
}
function enemyInFlame(enemy, ox, oy) {
  const spec = CRAFT[enemy.kind];
  return [
    [enemy.x, enemy.y],
    [enemy.x - spec.hx, enemy.y],
    [enemy.x + spec.hx, enemy.y],
    [enemy.x, enemy.y - spec.hy],
    [enemy.x, enemy.y + spec.hy]
  ].some(([x, y]) => inFlame(x, y, ox, oy));
}
function flameOrigin(index) {
  return { x: player.x + stackShift(index), y: player.y - 28 };
}
function spawn() {
  const next = wave++;
  const count = workshop ? 6 : scouts ? 8 + next % 3 : 7 + Math.min(8, Math.floor(next * 1.05));
  const pool = ['drone', 'skiff'];
  if (next >= 1) pool.push('hauler');
  if (next >= 3) pool.push('wisp');
  const cols = Math.min(6, count);
  const span = (W - 80) / (cols - 1);
  for (let i = 0; i < count; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = 40 + col * span;
    const kind = pool[(i + next) % pool.length];
    const spec = CRAFT[kind];
    regularSpawnCount++;
    if (regularSpawnCount % 5 === 0) {
      const direction = (i + next) % 2 ? 1 : -1;
      enemies.push({
        kind, hp: spec.hp,
        x: direction > 0 ? -68 - i * 35 : W + 68 + i * 35,
        y: H * (.1 + Math.random() * .2), direction, age: 0, fire: .45 + i * .2, passes: 0
      });
    } else enemies.push({
      x, y: -52 - row * 58 - (col % 3) * 14,
      base: x, age: 0,
      fire: spec.reload * (0.4 + (i % 4) * 0.18),
      hp: spec.hp, kind, mode: (next + i) % 3, side: (i + next) % 2 ? 1 : -1
    });
  }
}
function spawnTarget() {
  const x = [112, W - 112, W / 2][Math.floor(nextTarget / 38) % 3];
  const hp = CRAFT[targetKind].hp * 5 * (scouts ? 3 : 2);
  enemies.push({ kind: targetKind, x, y: -50, base: x, side: x > W / 2 ? -1 : 1,
    age: 0, fire: 1.4, hp, maxHp: hp, objective: true });
  ui.phase.textContent = targetName.toUpperCase() + ' IN RANGE';
}
function spawnBoss(kind) {
  if (kind === 'flagship') {
    finalSpawned = true;
    bolts = [];
    nextWave = Infinity;
    eliteWarningUntil = time + 2;
  }
  const hp = kind === 'flagship' && intercept ? CRAFT.flagship.hp / 2 : CRAFT[kind].hp;
  enemies.push({ kind, x: W / 2, y: -110, age: 0, fire: 2.5, hp, maxHp: hp, mode: 0, weaponDrops: 0 });
  ui.phase.textContent = kind === 'flagship' ? (scouts ? 'FINAL RECON COMMAND AIRCRAFT' : workshop ? 'FINAL WORKSHOP SIEGE BOMBER' : 'FINAL FLAGSHIP') :
    scouts ? 'SCOUT COMMANDER' : workshop ? 'WORKSHOP COMMANDER' : 'CONVOY SIGNAL JAMMER';
}
function shoot(enemy) {
  const aim = Math.atan2(player.y - enemy.y, player.x - enemy.x);
  const bolt = (ang, speed, ox = 0, oy = 10) => {
    bolts.push({ x: enemy.x + ox, y: enemy.y + oy, vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed });
  };
  enemy.fire = CRAFT[enemy.kind].reload;
  if (enemy.kind === 'boss') {
    if (workshop && enemy.mode++ % 2 === 0) {
      for (const port of [-38, 0, 38]) bolt(Math.PI / 2, 235, port);
    } else {
      for (const offset of (scouts ? [-.28, 0, .28] : [-.46, -.23, 0, .23, .46])) bolt(aim + offset, 195);
    }
  } else if (enemy.kind === 'flagship') {
    const pattern = enemy.mode++ % 3;
    if (scouts) {
      for (const offset of (pattern === 0 ? [-.6, -.3, 0, .3, .6] : [-.2, 0, .2])) bolt(aim + offset, pattern === 0 ? 185 : 270);
      if (pattern === 2) for (const port of [-65, 65]) bolt(Math.PI / 2, 310, port);
      return;
    }
    if (workshop && pattern === 1) {
      for (const port of [-78, -52, -26, 0, 26, 52, 78]) bolt(Math.PI / 2, 260, port, 26);
      return;
    }
    if (pattern === 0) {
      for (const offset of [-.62, -.41, -.20, 0, .20, .41, .62]) bolt(aim + offset, 206);
    } else if (pattern === 1) {
      for (const port of [-59, -31, 31, 59]) bolt(Math.PI / 2, 305, port, 26);
    } else {
      for (const port of [-64, 64]) {
        const angle = Math.atan2(player.y - enemy.y, player.x - enemy.x - port);
        for (const offset of [-.16, 0, .16]) bolt(angle + offset, 258, port, 14);
      }
    }
  } else if (enemy.kind === 'skiff') {
    const px = Math.cos(aim + Math.PI / 2) * 8;
    const py = Math.sin(aim + Math.PI / 2) * 8;
    bolt(aim, 248, px, 8 + py);
    bolt(aim, 248, -px, 8 - py);
  } else if (enemy.kind === 'hauler') {
    for (const offset of [-.7, 0, .7]) bolt(aim + offset, 158);
  } else if (enemy.kind === 'wisp') {
    bolt(Math.PI / 2, 268, 0, 12);
  } else {
    bolt(aim, 205);
  }
}
function fly(enemy, dt) {
  const spec = CRAFT[enemy.kind];
  enemy.age += dt;
  if (enemy.direction) {
    enemy.x += enemy.direction * 152 * dt;
    if (enemy.direction > 0 ? enemy.x > W + 65 : enemy.x < -65) {
      enemy.passes++;
      enemy.direction *= -1;
      enemy.x = enemy.direction > 0 ? -65 : W + 65;
      enemy.y += H * .1;
      if (enemy.y > H * .9) enemy.y = H * .1;
    }
    return;
  }
  if (enemy.objective) {
    enemy.x = clamp(enemy.base + Math.sin(enemy.age * 1.4) * 86 * enemy.side, 37, W - 37);
    if (enemy.age < targetSeconds - 2) enemy.y = Math.min(225, enemy.y + 75 * dt);
    else enemy.y -= 168 * dt;
    if (enemy.age >= targetSeconds) {
      enemy.escaped = true;
      ui.phase.textContent = targetName.toUpperCase() + ' ESCAPED · KEEP FLYING';
    }
    return;
  }
  if (largeCraft(enemy.kind)) {
    const final = enemy.kind === 'flagship';
    enemy.y = Math.min(final ? 162 : 144, enemy.y + spec.speed * dt);
    enemy.x = 240 + Math.sin(enemy.age * (final ? .86 : 1.1)) * (final ? 87 : 113);
    return;
  }
  let speed = spec.speed, amp = 40, freq = 1.4;
  if (enemy.kind === 'drone') {
    speed = enemy.mode === 2 ? spec.speed * 1.28 : spec.speed;
    amp = enemy.mode === 1 ? 64 : 38;
    freq = enemy.mode === 0 ? 2 : 1.1;
  } else if (enemy.kind === 'skiff') {
    amp = 54; freq = 3.3;
  } else if (enemy.kind === 'hauler') {
    amp = 78; freq = 0.62;
  } else if (enemy.kind === 'wisp') {
    amp = 76; freq = 4.5;
  }
  enemy.y += speed * dt;
  enemy.x = clamp(enemy.base + Math.sin(enemy.age * freq) * enemy.side * amp, 22, W - 22);
}
function hit() {
  if (player.shield > 0) return;
  shake = .28;
  player.hull--;
  player.shield = 1.6;
  if (player.stack.length > 1) {
    player.stack = [player.stack[0]];
    player.cool = [player.cool[0] || 0];
    paintStack();
  }
  burst(player.x, player.y, colors.gold, 23);
  ui.hull.textContent = '◆'.repeat(player.hull) + '◇'.repeat(MAX_HULL - player.hull);
  if (!player.hull) {
    if (bossesCleared) {
      clearFlight('Santa’s last broadcast is recovered.');
    } else {
      const remaining = intercept && bossAt === null ? 'Destroy a marked target and the stage boss to advance.'
        : 'Defeat the remaining boss to advance.';
      overlay('lost', 'SLEIGH DOWN', remaining + ' Score: ' + score + '.', 'Retry level');
    }
  }
}
function grant(pod) {
  const kind = WEAPONS[pod.kind] ? pod.kind : 'flame';
  if (player.stack.length >= 5) {
    player.stack.splice(1, 1);
    player.cool.splice(1, 1);
  }
  player.stack.push(kind);
  player.cool.push(0);
  burst(pod.x, pod.y, WEAPONS[kind].color, 16);
  paintStack();
}
function fell(enemy) {
  const boss = largeCraft(enemy.kind);
  wraps.push({ x: enemy.x, y: enemy.y, age: 0, kind: enemy.kind });
  score += CRAFT[enemy.kind].score;
  burst(enemy.x, enemy.y, colors.gold, boss ? 60 : 22);
  if (!boss && ++kills % KILLS_PER_DROP === 0) parcels.push({ x: enemy.x, y: enemy.y, kind: PODS[((kills / KILLS_PER_DROP) - 1) % PODS.length] });
  if (enemy.objective) {
    bossAt = time + bossDelay;
    parcels.push({ x: enemy.x, y: enemy.y, kind: scouts ? 'laser' : 'homing' });
    ui.phase.textContent = targetName.toUpperCase() + ' DOWN · COMMANDER INBOUND';
  }
  if (enemy.kind === 'boss') {
    flagshipAt = time + 30;
    ui.phase.textContent = 'COMMANDER DOWN · PUSH THROUGH THE FINAL PATROLS';
  }
  if (enemy.kind === 'flagship') {
    bossesCleared = true;
    clearAt = time + 2;
    player.shield = 3;
    bolts = [];
    ui.phase.textContent = 'FINAL BOSS DOWN · AIRSPACE CLEAR';
  }
  ui.score.textContent = String(score).padStart(6, '0');
}
function clearFlight(result) {
  const campaign = params.has('runId') && window.parent !== window;
  overlay('cleared', 'LEVEL CLEARED', result + ' Final score: ' + score + '.', campaign ? 'Continue' : 'Fly again');
}
function finishFlight() {
  if (state !== 'cleared') return;
  state = 'won';
  ui.action.disabled = true;
  const skyDetail = { score, hull: player.hull };
  window.dispatchEvent(new CustomEvent('frosted-skies:complete', { detail: skyDetail }));
  if (window.parent !== window) {
    const skyRelay = { type: 'frosted-skies:complete', detail: skyDetail };
    const skyRun = params.get('runId');
    if (skyRun) skyRelay.runId = skyRun;
    window.parent.postMessage(skyRelay, (location.protocol === 'http:' || location.protocol === 'https:') ? location.origin : '*');
  }
}
function harm(enemy, dmg, x, y) {
  if (enemy.hp <= 0) return;
  enemy.hp -= dmg;
  if (enemy.kind === 'flagship') {
    const quartersLost = Math.min(4, Math.floor((enemy.maxHp - Math.max(0, enemy.hp)) / (enemy.maxHp / 4)));
    while (enemy.weaponDrops < quartersLost) {
      parcels.push({
        x: enemy.x + (enemy.weaponDrops % 2 ? 18 : -18),
        y: enemy.y + CRAFT.flagship.hy + 14,
        kind: PODS[enemy.weaponDrops % PODS.length]
      });
      enemy.weaponDrops++;
    }
  }
  enemy.impact = .12;
  burst(x, y, colors.ice, 4);
  if (enemy.hp <= 0) fell(enemy);
}
function segmentHit(shot, enemy, pad = 0) {
  const spec = CRAFT[enemy.kind];
  const dist = Math.hypot(shot.x - shot.px, shot.y - shot.py);
  const steps = Math.max(1, Math.ceil(dist / 8));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = shot.px + (shot.x - shot.px) * t;
    const y = shot.py + (shot.y - shot.py) * t;
    if (Math.abs(x - enemy.x) <= spec.hx + pad && Math.abs(y - enemy.y) <= spec.hy + pad) return { x, y };
  }
  return null;
}
function guideMissile(shot, dt) {
  let target = null;
  let best = Infinity;
  for (const enemy of enemies) {
    if (enemy.hp <= 0) continue;
    const d = Math.hypot(enemy.x - shot.x, enemy.y - shot.y);
    if (d < best) { best = d; target = enemy; }
  }
  const speed = shot.speed;
  const aimX = target ? target.x : shot.x;
  const aimY = target ? target.y : shot.y - 240;
  const ang = Math.atan2(aimY - shot.y, aimX - shot.x);
  const k = Math.min(1, dt * (shot.kind === 'homing' ? 18 : 12));
  shot.vx += (Math.cos(ang) * speed - shot.vx) * k;
  shot.vy += (Math.sin(ang) * speed - shot.vy) * k;
}
function scorch(index) {
  const origin = flameOrigin(index);
  for (const enemy of enemies) {
    if (enemy.hp <= 0 || !enemyInFlame(enemy, origin.x, origin.y)) continue;
    harm(enemy, 1, enemy.x, enemy.y);
    if (state !== 'playing') return;
  }
}
function fireSlot(index) {
  const kind = player.stack[index];
  const x = player.x + stackShift(index);
  if (kind === 'missile') {
    shots.push({ kind, x, y: player.y - 18, vx: 0, vy: -240, dmg: 1, speed: 440, life: 2.4 });
  } else if (kind === 'laser') {
    for (const offset of [-6, 6]) {
      shots.push({ kind, x: x + offset, y: player.y - (index === 0 ? 49 : 30), vx: 0, vy: -1280, dmg: 1, pierce: true, hit: [] });
    }
  } else if (kind === 'homing') {
    shots.push({ kind, x, y: player.y - 24, vx: 0, vy: -300, dmg: 3, speed: 520, life: 3.1 });
  }
  recoil = Math.max(recoil, kind === 'homing' ? .16 : .1);
}
function armWeapons(dt) {
  for (let index = 0; index < player.stack.length; index++) {
    player.cool[index] -= dt;
    if (player.cool[index] > 0) continue;
    player.cool[index] = WEAPONS[player.stack[index]].rate;
    if (player.stack[index] === 'flame') scorch(index);
    else fireSlot(index);
    if (state !== 'playing') return;
  }
}
function update(dt) {
  time += dt;
  if (clearAt !== null && time >= clearAt) {
    clearFlight('Final aircraft destroyed. Flight objectives complete.');
    return;
  }
  recoil = Math.max(0, recoil - dt);
  shake = Math.max(0, shake - dt);
  for (const w of wraps) w.age += dt;
  wraps = wraps.filter(w => w.age < .8);
  player.shield = Math.max(0, player.shield - dt);
  const down = (...names) => names.some(k => keys.has(k));
  const x0 = player.x;
  if (aim) {
    player.x += (aim.x - player.x) * Math.min(dt * 23, 1);
    player.y += (aim.y - player.y) * Math.min(dt * 23, 1);
    if (aimReleased && Math.hypot(aim.x - player.x, aim.y - player.y) < 1) aim = null;
  } else {
    player.x += ((down('d', 'arrowright') ? 1 : 0) - (down('a', 'arrowleft') ? 1 : 0)) * 350 * dt;
    player.y += ((down('s', 'arrowdown') ? 1 : 0) - (down('w', 'arrowup') ? 1 : 0)) * 300 * dt;
  }
  player.x = clamp(player.x, 25, W - 25);
  player.y = clamp(player.y, 315, H - 55);
  player.bank += (clamp((player.x - x0) * .12, -.65, .65) - player.bank) * Math.min(dt * 13, 1);
  armWeapons(dt);
  if (state !== 'playing') return;
  if (!finalSpawned && time >= nextWave) {
    spawn();
    nextWave = time + (bossesCleared ? 5.5 : bossSpawned ? 9 : workshop ? 6 : 5.15);
  }
  if (!finalSpawned && intercept && bossAt === null && time >= nextTarget) {
    spawnTarget();
    nextTarget += 38;
  }
  if (!bossSpawned && bossAt !== null && time >= bossAt) {
    bossSpawned = true;
    spawnBoss('boss');
  }
  if (flagshipAt !== null && time >= flagshipAt) {
    flagshipAt = null;
    spawnBoss('flagship');
  }
  for (const enemy of enemies) {
    if (enemy.hp <= 0) continue;
    enemy.impact = Math.max(0, (enemy.impact || 0) - dt);
    enemy.fire -= dt;
    fly(enemy, dt);
    if (!enemy.escaped && enemy.x >= 0 && enemy.x <= W && enemy.y > 15 && enemy.y < 440 && enemy.fire <= 0) shoot(enemy);
  }
  for (const shot of shots) {
    shot.px = shot.x;
    shot.py = shot.y;
    if (shot.kind === 'missile' || shot.kind === 'homing') {
      guideMissile(shot, dt);
      shot.life -= dt;
      if (shot.life <= 0) shot.dead = true;
    }
    shot.x += shot.vx * dt;
    shot.y += shot.vy * dt;
    if (shot.dead) continue;
    for (const enemy of enemies) {
      if (enemy.hp <= 0 || enemy.escaped) continue;
      const hitAt = segmentHit(shot, enemy, shot.kind === 'missile' || shot.kind === 'homing' ? 6 : 0);
      if (!hitAt) continue;
      if (shot.pierce) {
        if (shot.hit.includes(enemy)) continue;
        shot.hit.push(enemy);
        harm(enemy, shot.dmg, hitAt.x, hitAt.y);
        if (state !== 'playing') break;
        continue;
      }
      shot.dead = true;
      harm(enemy, shot.dmg, hitAt.x, hitAt.y);
      break;
    }
    if (state !== 'playing') break;
  }
  if (state !== 'playing') return;
  for (const b of bolts) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    if (Math.hypot(b.x - player.x, b.y - player.y) < 16) {
      b.y = 900;
      hit();
      if (state !== 'playing') return;
    }
  }
  for (const enemy of enemies) {
    if (enemy.hp > 0 && Math.hypot(enemy.x - player.x, enemy.y - player.y) < CRAFT[enemy.kind].touch) {
      hit();
      if (state !== 'playing') return;
    }
  }
  for (const pod of parcels) {
    pod.y += 108 * dt;
    if (Math.hypot(pod.x - player.x, pod.y - player.y) < 30) {
      pod.y = 900;
      grant(pod);
    }
  }
  enemies = enemies.filter(e => e.hp > 0 && !e.escaped && e.y < H + 40);
  shots = shots.filter(s => !s.dead && s.y > -80 && s.y < H + 60 && s.x > -50 && s.x < W + 50);
  bolts = bolts.filter(b => b.y > -30 && b.y < H + 20 && b.x > -30 && b.x < W + 30);
  parcels = parcels.filter(p => p.y < H + 25);
  for (const p of sparks) { p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; }
  sparks = sparks.filter(p => p.life > 0);
}
function polygon(color, points) {
  g.fillStyle = color;
  g.beginPath();
  points.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y));
  g.closePath();
  g.fill();
}
function drawPod(pod) {
  const spec = WEAPONS[pod.kind] || WEAPONS.flame;
  const look = spec.color;
  const mark = spec.mark;
  g.save();
  g.translate(pod.x, pod.y);
  if (ready(weaponPod)) {
    g.drawImage(weaponPod, -16, -21, 32, 42);
    g.font = '800 14px system-ui';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.strokeStyle = '#101520';
    g.lineWidth = 3;
    g.strokeText(mark, 0, 0);
    g.fillStyle = look;
    g.fillText(mark, 0, 0);
    g.restore();
    return;
  }
  g.fillStyle = '#f7fbff';
  g.beginPath();
  g.roundRect(-12, -16, 24, 32, 9);
  g.fill();
  g.fillStyle = look;
  g.beginPath();
  g.roundRect(-9, -13, 18, 26, 7);
  g.fill();
  g.fillStyle = '#102033';
  g.fillRect(-12, -2, 24, 4);
  g.font = '800 11px system-ui';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(mark, 0, -7);
  g.restore();
}
function render() {
  document.getElementById('elite-alert').hidden = state !== 'playing' || time >= eliteWarningUntil;
  const sky = g.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#11243d');
  sky.addColorStop(.55, '#28637d');
  sky.addColorStop(1, '#101f37');
  g.fillStyle = sky;
  g.fillRect(0, 0, W, H);
  const scroll = time * 115;
  const valley = art.valley;
  if (ready(valley)) {
    const height = W * valley.naturalHeight / valley.naturalWidth;
    const tile = backgroundTile();
    for (let offset = -2; offset <= 1; offset++) {
      g.save();
      g.translate(0, scroll % height + offset * height);
      g.drawImage(tile, 0, 0);
      g.restore();
    }
  }
  const fog = g.createLinearGradient(0, 0, W, H);
  fog.addColorStop(0, '#06132780');
  fog.addColorStop(.46, '#3faec91a');
  fog.addColorStop(1, '#060d20aa');
  g.fillStyle = fog;
  g.fillRect(0, 0, W, H);
  for (const st of stars) {
    if (reduceMotion.matches && st.s > 1) continue;
    const y = (st.y + scroll * (.6 + st.s * .32)) % H;
    const x = st.x + Math.sin(y * .012 + st.x) * 13;
    g.fillStyle = 'rgba(220,248,255,' + (.12 + st.s * .12) + ')';
    g.beginPath();
    g.ellipse(x, y, st.s * .56, st.s * 1.24, .3, 0, Math.PI * 2);
    g.fill();
  }
  g.save();
  if (shake > 0 && !reduceMotion.matches) g.translate(Math.sin(time * 115) * shake * 16, Math.cos(time * 120) * shake * 12);
  for (const enemy of enemies) {
    if (enemy.hp <= 0) continue;
    const spec = CRAFT[enemy.kind];
    const bank = Math.cos(enemy.age * (largeCraft(enemy.kind) ? 1.1 : 2)) * .13;
    craftSprite(enemy.kind, enemy.x, enemy.y, spec.size, bank);
    if (enemy.objective) {
      g.fillStyle = '#ffcf79';
      g.font = 'bold 12px system-ui';
      g.textAlign = 'center';
      g.fillText('TARGET · ' + Math.ceil(Math.max(0, targetSeconds - enemy.age)) + 's', enemy.x, enemy.y - spec.hy - 15);
    }
    if (enemy.impact > 0) {
      g.globalAlpha = enemy.impact * 4;
      g.strokeStyle = '#fff1b1';
      g.lineWidth = 2;
      g.beginPath();
      g.arc(enemy.x, enemy.y, 10 + (.12 - enemy.impact) * 140, 0, Math.PI * 2);
      g.stroke();
      g.globalAlpha = 1;
    }
    if (spec.hp > 1) {
      const bw = largeCraft(enemy.kind) ? spec.size * .8 : Math.max(28, spec.hx * 1.4);
      const by = enemy.y - (largeCraft(enemy.kind) ? spec.hy + 15 : spec.hy + 8);
      g.fillStyle = '#061629';
      g.fillRect(enemy.x - bw / 2, by, bw, 4);
      g.fillStyle = colors.gold;
      const maxHp = enemy.maxHp || spec.hp;
      g.fillRect(enemy.x - bw / 2, by, bw * clamp(enemy.hp, 0, maxHp) / maxHp, 4);
    }
  }
  for (const s of shots) {
    if (s.kind === 'missile' || s.kind === 'homing') {
      g.save();
      g.translate(s.x, s.y);
      g.rotate(Math.atan2(s.vy, s.vx) + Math.PI / 2);
      polygon(WEAPONS[s.kind].color, [[0, -12], [5, 7], [0, 3], [-5, 7]]);
      g.fillStyle = '#fff4c0';
      g.fillRect(-1.5, 3, 3, 6);
      g.restore();
    } else if (s.kind === 'laser') {
      g.strokeStyle = colors.ice;
      g.globalAlpha = .45;
      g.lineWidth = 7;
      g.beginPath();
      g.moveTo(s.px, s.py);
      g.lineTo(s.x, s.y);
      g.stroke();
      g.globalAlpha = 1;
      g.strokeStyle = '#f4ffff';
      g.lineWidth = 3;
      g.beginPath();
      g.moveTo(s.px, s.py);
      g.lineTo(s.x, s.y);
      g.stroke();

    }
  }
  for (const b of bolts) {
    g.fillStyle = '#ffad52';
    g.beginPath();
    g.arc(b.x, b.y, 5, 0, 7);
    g.fill();
    g.fillStyle = '#fff4c0';
    g.fillRect(b.x - 1, b.y - 2, 2, 4);
  }
  for (const pod of parcels) drawPod(pod);
  const { x, y, bank, shield } = player;
  player.stack.forEach((kind, index) => {
    if (kind !== 'flame') return;
    const origin = flameOrigin(index);
    g.save();
    g.globalCompositeOperation = 'lighter';
    for (let ember = 0; ember < 64; ember++) {
      const travel = (ember / 64 + (reduceMotion.matches ? 0 : time * 1.65)) % 1;
      const spread = Math.sin(ember * 12.9898);
      const curl = Math.sin(travel * 17 + ember * 2.4 + (reduceMotion.matches ? 0 : time * 12));
      const radius = (4 + (1 - travel) * 12) * (.65 + Math.abs(spread) * .35);
      const px = origin.x + spread * FLAME_HALF * travel * .78 + curl * 7 * travel;
      const py = origin.y - travel * FLAME_REACH;
      g.globalAlpha = (1 - travel) * .8;
      const fire = g.createRadialGradient(px, py, 0, px, py, radius);
      fire.addColorStop(0, travel < .35 ? '#ffffdc' : '#ffd057');
      fire.addColorStop(.35, '#ff9c20');
      fire.addColorStop(.72, '#ff3b0d');
      fire.addColorStop(1, '#ed250000');
      g.fillStyle = fire;
      g.beginPath();
      g.ellipse(px, py, radius, radius * 1.6, curl * .15, 0, Math.PI * 2);
      g.fill();
    }
    g.restore();
    g.globalAlpha = 1;
  });
  if (shield <= 0 || reduceMotion.matches || Math.floor(shield * 11) % 2 === 0) {
    for (const dx of [-16, 16]) {
      const flame = g.createLinearGradient(0, y + 38, 0, y + 72);
      flame.addColorStop(0, '#d5fdff');
      flame.addColorStop(.38, '#6ad7ff');
      flame.addColorStop(1, '#49abff00');
      polygon(flame, [[x + dx - 5, y + 39], [x + dx + 5, y + 39], [x + dx - bank * 15, y + 70 + Math.sin(time * 45) * 8]]);
    }
    ship('sleigh', x, y + recoil * 30, 62, bank * .52);
    if (shield > 0 && reduceMotion.matches) {
      g.strokeStyle = '#ffe3a6';
      g.lineWidth = 2;
      g.beginPath();
      g.ellipse(x, y, 33, 46, 0, 0, Math.PI * 2);
      g.stroke();
    }
    if (recoil > .045) player.stack.forEach((kind, index) => {
      if (kind === 'flame' || index === 0) return;
      const dx = stackShift(index);
      const flare = g.createRadialGradient(x + dx, y - 23, 0, x + dx, y - 23, 15);
      flare.addColorStop(0, '#fff');
      flare.addColorStop(.25, '#84ffff');
      flare.addColorStop(1, '#42e3ff00');
      g.fillStyle = flare;
      g.fillRect(x + dx - 15, y - 38, 30, 30);
    });
  }
  for (const w of wraps) {
    const t = w.age / .8;
    const spec = CRAFT[w.kind] || CRAFT.drone;
    if (t < .42) {
      const span = (spec.size * .48) * (1 - t);
      craftSprite(w.kind, w.x, w.y, span * 2, 0);
      g.strokeStyle = '#ffd788';
      g.lineWidth = 3;
      for (let i = 0; i < 3; i++) {
        g.beginPath();
        g.ellipse(w.x, w.y + (i - 1) * 7, span, 8 + i * 2, t * 2 + i * .35, 0, Math.PI * (.5 + t * 3.5));
        g.stroke();
      }
      continue;
    }
    const size = w.kind === 'boss' ? 49 : 23;
    g.save();
    g.translate(w.x, w.y + w.age * 39);
    g.rotate(t * .75);
    g.globalAlpha = 1 - t;
    g.fillStyle = '#cc294e';
    g.beginPath();
    g.roundRect(-size * .5, -size * .44, size, size * .88, 5);
    g.fill();
    g.strokeStyle = '#ffe193';
    g.lineWidth = size * .15;
    g.beginPath();
    g.moveTo(-size * .5, 0);
    g.lineTo(size * .5, 0);
    g.moveTo(0, -size * .44);
    g.lineTo(0, size * .44);
    g.stroke();
    g.lineWidth = 2;
    for (const side of [-1, 1]) {
      g.beginPath();
      g.ellipse(side * size * .16, -size * .14, size * .19, size * .085, side * .4, 0, Math.PI * 2);
      g.stroke();
    }
    g.restore();
  }
  for (const p of sparks) {
    g.globalAlpha = clamp(p.life * 2, 0, 1);
    if (p.ring) {
      g.strokeStyle = p.color;
      g.lineWidth = 3;
      g.beginPath();
      g.arc(p.x, p.y, p.ring * (1.2 - p.life), 0, Math.PI * 2);
      g.stroke();
    } else {
      g.fillStyle = p.color;
      g.fillRect(p.x, p.y, 3, 3);
    }
  }
  g.globalAlpha = 1;
  g.restore();
}
reset();
let last = 0;
function frame(now) {
  const dt = last ? Math.min((now - last) / 1000, .033) : 0;
  last = now;
  if (state === 'playing' && !window.TrentGameOrientation?.blocked()) update(dt);
  else if (state === 'won') { for (const w of wraps) w.age = Math.min(.8, w.age + dt); }
  render();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
