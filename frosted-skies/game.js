'use strict';
const canvas = document.querySelector('canvas');
const g = canvas.getContext('2d');
const W = 480, H = 760;
const ui = Object.fromEntries(['score','hull','phase','pause','sheet','title','brief','controls','action'].map(id => [id, document.getElementById(id)]));
const clamp = (n, a, b) => Math.max(a, Math.min(n, b));
const colors = { red: '#e34751', gold: '#ffce71', ice: '#81f4ff', blue: '#4b899d', dark: '#203349', mint: '#b9ffe4' };
const CRAFT = {
  drone:  { hp: 2, speed: 92, size: 54, reload: 2.05, score: 180, hx: 23, hy: 16, touch: 26 },
  skiff:  { hp: 1, speed: 168, size: 38, reload: 1.02, score: 160, hx: 16, hy: 13, touch: 18 },
  hauler: { hp: 5, speed: 50, size: 76, reload: 2.45, score: 340, hx: 34, hy: 22, touch: 34 },
  wisp:   { hp: 1, speed: 146, size: 32, reload: 0.64, score: 150, hx: 14, hy: 14, touch: 17 },
  boss:   { hp: 55, speed: 74, size: 125, reload: 0.78, score: 2500, hx: 48, hy: 34, touch: 32 }
};
const PODS = ['wide', 'rapid', 'shield'];
function loadArt(name) {
  const image = new Image();
  image.src = './art/' + name + '.webp';
  return image;
}
const art = Object.fromEntries(['valley', 'sleigh', 'drone', 'boss'].map(name => [name, loadArt(name)]));
function resizeCanvas() {
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = W * ratio;
  canvas.height = H * ratio;
  g.setTransform(ratio, 0, 0, ratio, 0, 0);
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const ready = image => image.complete && image.naturalWidth > 0;
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
function drawSkiff(w) {
  const h = w * 1.28;
  polygon(colors.ice, [[0, -h * .52], [w * .46, h * .08], [w * .16, h * .5], [-w * .16, h * .5], [-w * .46, h * .08]]);
  polygon(colors.gold, [[w * .12, -h * .02], [w * .62, h * .16], [w * .18, h * .22]]);
  polygon(colors.gold, [[-w * .12, -h * .02], [-w * .62, h * .16], [-w * .18, h * .22]]);
  polygon('#f4fdff', [[0, -h * .28], [w * .1, h * .02], [0, h * .12], [-w * .1, h * .02]]);
}
function drawHauler(w) {
  const h = w * .58;
  g.fillStyle = colors.blue;
  g.beginPath();
  g.roundRect(-w / 2, -h * .42, w, h * .86, 8);
  g.fill();
  g.fillStyle = colors.dark;
  g.fillRect(-w * .28, -h * .16, w * .56, h * .28);
  g.fillStyle = colors.gold;
  g.fillRect(-w * .42, -h * .02, w * .84, 5);
  g.fillStyle = colors.red;
  g.fillRect(-w * .34, -h * .5, w * .2, h * .28);
  g.fillRect(w * .12, -h * .5, w * .2, h * .28);
  g.fillStyle = '#d7f6ff';
  g.fillRect(-w * .08, -h * .46, w * .16, h * .2);
}
function drawWisp(w) {
  const glow = g.createRadialGradient(0, 0, 0, 0, 0, w * .85);
  glow.addColorStop(0, '#fff6c8cc');
  glow.addColorStop(1, '#ffce7100');
  g.fillStyle = glow;
  g.beginPath();
  g.arc(0, 0, w * .85, 0, Math.PI * 2);
  g.fill();
  polygon(colors.gold, [[0, -w * .62], [w * .34, 0], [0, w * .72], [-w * .34, 0]]);
  polygon('#fff8dc', [[0, -w * .28], [w * .14, 0], [0, w * .3], [-w * .14, 0]]);
  g.fillStyle = colors.ice;
  g.fillRect(-w * .08, w * .2, w * .16, w * .28);
}
function craftSprite(kind, x, y, width, bank) {
  if (kind === 'drone' || kind === 'boss') {
    ship(kind, x, y, width, bank);
    return;
  }
  g.save();
  g.translate(x, y);
  g.rotate(bank || 0);
  if (kind === 'skiff') drawSkiff(width);
  else if (kind === 'hauler') drawHauler(width);
  else drawWisp(width);
  g.restore();
}
const keys = new Set();
let state = 'intro', player, enemies, shots, bolts, sparks, parcels, time, score, wave, shotAt, bossSpawned, aim, drag, wraps, recoil, shake, kills;
const stars = Array.from({ length: 95 }, (_, i) => ({ x: (i * 179.31) % W, y: (i * 117.69) % H, s: 1 + i % 3 }));
function reset() {
  player = { x: W / 2, y: 625, hull: 3, bank: 0, shield: 0, guard: 0, wide: false, rapid: false };
  enemies = []; shots = []; bolts = []; sparks = []; parcels = [];
  wraps = []; recoil = 0; shake = 0; time = 0; score = 0; wave = 0; shotAt = 0; bossSpawned = false; aim = null; drag = null; kills = 0;
  ui.score.textContent = '000000';
  ui.hull.textContent = '◆◆◆';
  ui.phase.textContent = 'THE FROZEN VALLEY';
}
function overlay(next, title, brief, label) {
  state = next; drag = null; aim = null; keys.clear();
  ui.title.textContent = title;
  ui.brief.textContent = brief;
  ui.action.textContent = label;
  ui.sheet.hidden = false;
}
ui.action.onclick = () => {
  if (state !== 'paused') reset();
  state = 'playing';
  ui.sheet.hidden = true;
  canvas.focus();
};
function pause() {
  if (state === 'playing') overlay('paused', 'HOLD POSITION', 'Quinn says this is an excellent time to check whether the fruitcake has stopped glowing.', 'Resume flight');
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
window.addEventListener('blur', pause);
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
function pointer(e) {
  const r = canvas.getBoundingClientRect();
  return { x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * H / r.height };
}
canvas.addEventListener('pointerdown', e => {
  if (state !== 'playing' || drag) return;
  const p = pointer(e);
  drag = { id: e.pointerId, dx: player.x - p.x, dy: player.y - p.y };
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove', e => {
  if (drag?.id !== e.pointerId) return;
  const p = pointer(e);
  aim = { x: p.x + drag.dx, y: p.y + drag.dy };
});
for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) {
  canvas.addEventListener(event, e => { if (drag?.id === e.pointerId) { drag = null; aim = null; } });
}
function burst(x, y, color, n = 14) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, v = 35 + Math.random() * 160;
    sparks.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: .35 + Math.random() * .35, color });
  }
}
function cannonLanes() {
  return player.wide ? [-30, -12, 12, 30] : [-16, 16];
}
function spawn() {
  const next = wave++;
  const count = 5 + Math.floor(next * 0.8);
  const pool = ['drone'];
  if (next >= 1) pool.push('skiff');
  if (next >= 2) pool.push('hauler');
  if (next >= 4) pool.push('wisp');
  const cols = Math.min(6, count);
  const span = (W - 80) / (cols - 1);
  for (let i = 0; i < count; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = 40 + col * span;
    const kind = pool[(i + next) % pool.length];
    const spec = CRAFT[kind];
    enemies.push({
      x, y: -52 - row * 58 - (col % 3) * 14,
      base: x, age: 0,
      fire: spec.reload * (0.4 + (i % 4) * 0.18),
      hp: spec.hp, kind, mode: (next + i) % 3, side: (i + next) % 2 ? 1 : -1
    });
  }
}
function shoot(enemy) {
  const aim = Math.atan2(player.y - enemy.y, player.x - enemy.x);
  const bolt = (ang, speed, ox = 0, oy = 10) => {
    bolts.push({ x: enemy.x + ox, y: enemy.y + oy, vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed });
  };
  enemy.fire = CRAFT[enemy.kind].reload;
  if (enemy.kind === 'boss') {
    for (const offset of [-.46, -.23, 0, .23, .46]) bolt(aim + offset, 195);
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
  if (enemy.kind === 'boss') {
    enemy.y = Math.min(144, enemy.y + spec.speed * dt);
    enemy.x = 240 + Math.sin(enemy.age * 1.1) * 113;
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
  if (player.guard > 0 || player.shield > 0) return;
  shake = .28;
  player.hull--;
  player.shield = 1.6;
  player.wide = false;
  player.rapid = false;
  burst(player.x, player.y, colors.gold, 23);
  ui.hull.textContent = '◆'.repeat(player.hull) + '◇'.repeat(3 - player.hull);
  if (!player.hull) overlay('lost', 'SLEIGH DOWN', 'The fruitcake survived. Quinn would prefer that you do likewise. Score: ' + score + '.', 'Retry the intercept');
}
function grant(pod) {
  if (pod.kind === 'wide') player.wide = true;
  else if (pod.kind === 'rapid') { player.rapid = true; shotAt = time; }
  else player.guard = Math.max(player.guard, 4.5);
  burst(pod.x, pod.y, pod.kind === 'wide' ? colors.gold : pod.kind === 'rapid' ? colors.ice : colors.mint, 16);
}
function update(dt) {
  time += dt;
  recoil = Math.max(0, recoil - dt);
  shake = Math.max(0, shake - dt);
  for (const w of wraps) w.age += dt;
  wraps = wraps.filter(w => w.age < .8);
  player.shield = Math.max(0, player.shield - dt);
  player.guard = Math.max(0, player.guard - dt);
  const down = (...names) => names.some(k => keys.has(k));
  const x0 = player.x;
  if (aim) {
    player.x += (aim.x - player.x) * Math.min(dt * 23, 1);
    player.y += (aim.y - player.y) * Math.min(dt * 23, 1);
  } else {
    player.x += ((down('d', 'arrowright') ? 1 : 0) - (down('a', 'arrowleft') ? 1 : 0)) * 350 * dt;
    player.y += ((down('s', 'arrowdown') ? 1 : 0) - (down('w', 'arrowup') ? 1 : 0)) * 300 * dt;
  }
  player.x = clamp(player.x, 25, W - 25);
  player.y = clamp(player.y, 315, H - 55);
  player.bank += (clamp((player.x - x0) * .12, -.65, .65) - player.bank) * Math.min(dt * 13, 1);
  if (time >= shotAt) {
    shotAt = time + (player.rapid ? 0.092 : 0.132);
    recoil = .10;
    const vy = player.rapid ? 860 : 710;
    for (const lane of cannonLanes()) shots.push({ x: player.x + lane, y: player.y - 17, vy });
  }
  if (wave < 9 && time >= 1.35 + wave * 5.15) spawn();
  if (time > 51 && !bossSpawned) {
    bossSpawned = true;
    enemies.push({ kind: 'boss', x: 240, y: -100, base: 240, age: 0, fire: 1.2, hp: CRAFT.boss.hp, mode: 0, side: 1 });
    ui.phase.textContent = 'CONVOY FLAGSHIP / DESTROY THE SIGNAL JAMMER';
  }
  for (const enemy of enemies) {
    enemy.impact = Math.max(0, (enemy.impact || 0) - dt);
    enemy.fire -= dt;
    fly(enemy, dt);
    if (enemy.y > 15 && enemy.y < 440 && enemy.fire <= 0) shoot(enemy);
  }
  for (const shot of shots) {
    shot.y -= shot.vy * dt;
    for (const enemy of enemies) {
      const spec = CRAFT[enemy.kind];
      if (enemy.hp <= 0 || Math.abs(shot.x - enemy.x) > spec.hx || Math.abs(shot.y - enemy.y) > spec.hy) continue;
      shot.y = -100;
      enemy.hp--;
      enemy.impact = .12;
      burst(shot.x, enemy.y, colors.ice, 3);
      if (!enemy.hp) {
        const boss = enemy.kind === 'boss';
        wraps.push({ x: enemy.x, y: enemy.y, age: 0, kind: enemy.kind });
        score += spec.score;
        burst(enemy.x, enemy.y, colors.gold, boss ? 60 : 22);
        if (!boss && ++kills % 3 === 0) parcels.push({ x: enemy.x, y: enemy.y, kind: PODS[((kills / 3) - 1) % 3] });
        if (boss) {
          overlay('won', 'SIGNAL RECOVERED', 'Santa’s last broadcast: “I am being kidnapped. Please bring my slippers.” Trent has a heading. Score: ' + score + '.', 'Fly again');
          const skyDetail = { score, hull: player.hull };
          window.dispatchEvent(new CustomEvent('frosted-skies:complete', { detail: skyDetail }));
          if (window.parent !== window) {
            const skyRelay = { type: 'frosted-skies:complete', detail: skyDetail };
            try { const skyRun = new URLSearchParams(location.search).get('runId'); if (skyRun) skyRelay.runId = skyRun; } catch (ignore) {}
            window.parent.postMessage(skyRelay, (location.protocol === 'http:' || location.protocol === 'https:') ? location.origin : '*');
          }
        }
        ui.score.textContent = String(score).padStart(6, '0');
      }
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
  enemies = enemies.filter(e => e.hp > 0 && e.y < H + 40);
  shots = shots.filter(s => s.y > 0);
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
  const look = pod.kind === 'wide' ? colors.gold : pod.kind === 'rapid' ? colors.ice : colors.mint;
  const mark = pod.kind === 'wide' ? 'W' : pod.kind === 'rapid' ? 'F' : 'S';
  g.save();
  g.translate(pod.x, pod.y);
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
    const index = Math.floor(scroll / height);
    for (let offset = -2; offset <= 1; offset++) {
      g.save();
      g.translate(0, scroll % height + offset * height);
      if ((index - offset) % 2) { g.translate(0, height); g.scale(1, -1); }
      g.drawImage(valley, 0, 0, W, height + .5);
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
    const bank = Math.cos(enemy.age * (enemy.kind === 'boss' ? 1.1 : 2)) * .13;
    craftSprite(enemy.kind, enemy.x, enemy.y, spec.size, bank);
    if (enemy.impact > 0) {
      g.globalAlpha = enemy.impact * 4;
      g.strokeStyle = '#fff1b1';
      g.lineWidth = 2;
      g.beginPath();
      g.arc(enemy.x, enemy.y, 10 + (.12 - enemy.impact) * 140, 0, Math.PI * 2);
      g.stroke();
      g.globalAlpha = 1;
    }
    if (enemy.kind === 'boss') {
      g.fillStyle = '#061629';
      g.fillRect(enemy.x - 49, enemy.y - 45, 98, 5);
      g.fillStyle = colors.gold;
      g.fillRect(enemy.x - 49, enemy.y - 45, 98 * enemy.hp / CRAFT.boss.hp, 5);
    }
  }
  for (const s of shots) {
    g.fillStyle = '#3eaec7';
    g.fillRect(s.x - 3, s.y, 6, 15);
    g.fillStyle = '#c9ffff';
    g.fillRect(s.x - 1, s.y, 2, 11);
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
    if (recoil > .045) for (const dx of cannonLanes()) {
      const flare = g.createRadialGradient(x + dx, y - 23, 0, x + dx, y - 23, 15);
      flare.addColorStop(0, '#fff');
      flare.addColorStop(.25, '#84ffff');
      flare.addColorStop(1, '#42e3ff00');
      g.fillStyle = flare;
      g.fillRect(x + dx - 15, y - 38, 30, 30);
    }
  }
  if (player.guard > 0) {
    g.strokeStyle = reduceMotion.matches ? colors.mint : 'rgba(185,255,228,' + (0.45 + 0.4 * Math.sin(time * 7)) + ')';
    g.lineWidth = 3;
    g.beginPath();
    g.ellipse(x, y, 36, 48, 0, 0, Math.PI * 2);
    g.stroke();
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
    g.fillStyle = p.color;
    g.fillRect(p.x, p.y, 3, 3);
  }
  g.globalAlpha = 1;
  g.restore();
}
reset();
let last = 0;
function frame(now) {
  const dt = last ? Math.min((now - last) / 1000, .033) : 0;
  last = now;
  if (state === 'playing') update(dt);
  else if (state === 'won') { for (const w of wraps) w.age = Math.min(.8, w.age + dt); }
  render();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
