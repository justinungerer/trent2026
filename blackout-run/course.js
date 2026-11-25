'use strict';

(function (root, makeGame) {
  const game = makeGame();
  if (typeof module === 'object' && module.exports) module.exports = game;
  else root.BlackoutRun = game;
})(globalThis, function () {
  const SPEED_MULTIPLIER = 2.25;
  const distance = value => value * SPEED_MULTIPLIER;
  const DISTANCE = distance(4680);
  const CRUISE = distance(26);
  const BLACKOUT_POINTS = [1260, 2230, 3200].map(distance);
  const WARNING_DISTANCE = 315;
  const GUN_SHOT_SPACING = 36;
  const RIFLE_TRACK_SPEED = 1.1;
  const RIFLE_SWEEP = 7.5;
  const RIFLE_CLEARANCE = 3;
  const STOP_DECELERATION = 120;
  const TRAIL_SCALE = 1.5;
  const WIDTH_INCREASE = 1.5;
  const COURSE_WIDTH_SCALE = 1.25 * TRAIL_SCALE * WIDTH_INCREASE;
  const WORLD_EDGE = 45;
  const MAIN_WIDTH = 4.7 * COURSE_WIDTH_SCALE;
  const BRANCH_WIDTH = 2.8 * COURSE_WIDTH_SCALE;
  const FALL_SECONDS = 1.32;
  const MISSED_WARNING_SECONDS = 2;
  const OBSTACLE_HITS = { rock: 'You hit a boulder.', stump: 'You hit a tree stump.', log: 'You hit a fallen tree.' };
  const levels = [
    {
      id: 'the-broken-dispatch',
      title: 'The Broken Dispatch',
      briefing: 'Recover both dispatch pouches and bring them to the relay hut.',
      objective: 'Pouches', destination: 'Relay hut', marker: 'satchel', markers: [1050, 3190],
      checkpoints: [0, 650, 2220, 2740, 4170],
      attacks: { start: 520, end: 3880, guns: 8, bombers: 8 },
      obstacles: { rock: 66, stump: 16 },
      forks: [{ start: 690, end: 1450, side: -1 }, { start: 2750, end: 3620, side: 1 }]
    },
    {
      id: 'lights-across-the-valley',
      title: 'Lights Across the Valley',
      briefing: 'Ski past both Allied signal posts. Lift your finger near each operator to slow down.',
      objective: 'Confirmations', destination: 'Valley relay', marker: 'post', markers: [1410, 3480],
      checkpoints: [0, 810, 2240, 2930, 4140],
      attacks: { start: 480, end: 4450, guns: 11, bombers: 8 },
      obstacles: { rock: 65, stump: 11 },
      forks: [{ start: 900, end: 1820, side: 1 }, { start: 2940, end: 3950, side: -1 }]
    },
    {
      id: 'beat-the-blackout',
      title: 'Beat the Blackout',
      briefing: 'Carry the confirmed dispatch to the workshop airstrip. Follow the lanterns when the lights go out.',
      objective: '', destination: 'Workshop airstrip', marker: '', markers: [],
      checkpoints: [0, 1060, 2190, 3290, 4150],
      attacks: { start: 470, end: 4430, guns: 11, bombers: 11 },
      obstacles: { rock: 76, stump: 11 },
      forks: [{ start: 740, end: 1620, side: -1 }, { start: 1990, end: 2830, side: 1 }, { start: 3220, end: 4060, side: -1 }]
    }
  ].map(level => ({
    ...level,
    markers: level.markers.map(distance),
    checkpoints: level.checkpoints.map(distance),
    forks: level.forks.map(fork => ({ ...fork, start: distance(fork.start), end: distance(fork.end) })),
    attacks: { ...level.attacks, start: distance(level.attacks.start), end: distance(level.attacks.end) }
  }));

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  function center(levelIndex, z) {
    return COURSE_WIDTH_SCALE * (1.45 * Math.sin(z / distance(261) + levelIndex) + 0.9 * Math.sin(z / distance(109) + levelIndex * 2));
  }

  function forkOffset(fork, z) {
    const position = clamp((z - fork.start) / (fork.end - fork.start), 0, 1);
    return fork.side * 12.5 * TRAIL_SCALE * WIDTH_INCREASE * Math.sin(Math.PI * position) ** 1.5;
  }

  function trails(levelIndex, z) {
    const main = center(levelIndex, z);
    const fork = levels[levelIndex].forks.find(item => z > item.start && z < item.end);
    const path = [{ x: main, width: MAIN_WIDTH }];
    if (fork) path.push({ x: main + forkOffset(fork, z), width: BRANCH_WIDTH });
    return path;
  }

  function treeLine(index, z) {
    const path = trails(index, z);
    return {
      left: Math.min(...path.map(lane => lane.x - lane.width)),
      right: Math.max(...path.map(lane => lane.x + lane.width))
    };
  }

  function createCourse(index) {
    const level = levels[index];
    const markers = level.markers.map((z, id) => {
      const path = trails(index, z);
      return { type: level.marker, z, id, x: path[path.length - 1].x };
    });
    const { start, end, guns, bombers } = level.attacks;
    const attackCount = guns + bombers;
    const last = Math.min(end, DISTANCE - 275);
    const attacks = Array.from({ length: attackCount }, (_, id) => {
      const z = start + (last - start) * id / (attackCount - 1);
      const gun = Math.round((id + 1) * guns / attackCount) > Math.round(id * guns / attackCount);
      const side = (Math.floor(id / 2) + index) % 2 ? 1 : -1;
      return { kind: gun ? 'gun' : 'bomb', z, side, shooterX: center(index, z) + side * 4.5 * TRAIL_SCALE };
    });
    // Leave the whole trail clear while a skier passes a rifle burst.
    const rifles = attacks.filter(attack => attack.kind === 'gun');
    const rifleClearance = z => rifles.some(attack => z >= attack.z - 68 && z <= attack.z + 2 * GUN_SHOT_SPACING + 66);
    const trees = [];
    for (let start = 35; start < DISTANCE + 400; start += 32) {
      for (const side of [-1, 1]) {
        const z = start + (side > 0 ? 8 : 0);
        const edge = treeLine(index, z);
        trees.push({ type: 'pine', z, x: side < 0 ? edge.left : edge.right, scale: 0.8 + (z % 37) / 63 });
      }
    }
    for (const fork of level.forks) {
      for (let z = fork.start + 18; z < fork.end; z += 18) {
        const [main, branch] = trails(index, z);
        const gap = Math.abs(branch.x - main.x) - MAIN_WIDTH - BRANCH_WIDTH;
        if (gap < 3.75 * WIDTH_INCREASE || rifleClearance(z)) continue;
        const mainEdge = main.x + fork.side * MAIN_WIDTH;
        trees.push({ type: 'pine', z, x: mainEdge + fork.side * gap / 2, scale: 0.84 + (z % 31) / 100, divider: true });
      }
    }
    const obstacles = [];
    const finishClearance = DISTANCE - 270;
    function canPlaceObstacle(z) {
      return !rifleClearance(z) && !markers.some(marker => Math.abs(marker.z - z) < 90) &&
        !level.checkpoints.some(point => Math.abs(z - point) < 52) &&
        !obstacles.some(object => Math.abs(object.z - z) < 49);
    }
    function placeObstacle(type, z, id) {
      const path = trails(index, z);
      const lane = path[path.length === 2 && id % 3 === 0 ? 1 : 0];
      const side = id % 2 ? 1 : -1;
      const scale = 0.8 + (z % 11) / 22;
      const halfPath = lane.width / 2;
      const offset = type === 'log' ? halfPath : (1.35 + (z % 7) / 5) * TRAIL_SCALE;
      const radius = type === 'log' ? halfPath : (type === 'stump' ? 1.03 : 0.82) * scale;
      const art = type === 'rock' || id % 4 < 2 ? type : type + '-alt';
      obstacles.push({ type, art, z, x: lane.x + side * offset, scale, radius });
    }
    function placeObstacles(type, first, count) {
      const spacing = (finishClearance - first) / count;
      let placed = 0;
      for (let slot = 0; slot < count; slot++) {
        const ideal = Math.round(first + slot * spacing);
        const left = Math.max(first, ideal - spacing * 0.48);
        const right = Math.min(finishClearance, ideal + spacing * 0.48);
        for (let offset = 0; offset <= spacing * 0.48; offset += 4) {
          const candidates = offset === 0 ? [ideal] : [ideal + offset, ideal - offset];
          const z = candidates.find(point => point >= left && point <= right && canPlaceObstacle(point));
          if (z === undefined) continue;
          placeObstacle(type, z, placed++);
          break;
        }
      }
      // Refill slots lost to checkpoints and rifle lanes using space between the other obstacles.
      for (let z = first; z <= finishClearance && placed < count; z += 4) {
        if (canPlaceObstacle(z)) placeObstacle(type, z, placed++);
      }
    }
    placeObstacles('log', 300 + index * 13, 14);
    placeObstacles('stump', 188 + index * 8, level.obstacles.stump);
    placeObstacles('rock', 90 + index * 12, level.obstacles.rock);
    const signs = level.forks.map(fork => ({
      type: 'sign', z: fork.start - 22, x: center(index, fork.start) + fork.side * 4.4 * TRAIL_SCALE,
      label: index === 2 ? 'Shortcut' : 'Dispatch route', direction: fork.side
    }));
    if (index === 2) {
      for (let z = 95; z < DISTANCE; z += 65) {
        const path = trails(index, z);
        signs.push({ type: 'lantern', z, x: path[0].x + 3.8 * TRAIL_SCALE, darkAt: BLACKOUT_POINTS[Math.min(2, Math.floor(z / distance(1560)))] });
        signs.push({ type: 'lantern', z: z + 8, x: path[0].x - 3.8 * TRAIL_SCALE });
        if (path.length > 1 && Math.abs(path[1].x - path[0].x) > 4) {
          signs.push({ type: 'lantern', z: z + 3, x: path[1].x });
        }
      }
    }
    const finish = { type: index === 2 ? 'hangar' : 'cabin', z: DISTANCE + 27, x: center(index, DISTANCE) };
    return { markers, obstacles, attacks, trees, objects: trees.concat(obstacles, signs, markers, finish).sort((a, b) => b.z - a.z) };
  }

  function restore(run, z, x = center(run.index, z)) {
    run.z = z;
    run.x = x;
    run.target = run.x;
    run.lateralVelocity = 0;
    run.speed = CRUISE;
    run.grace = 3;
    run.lastCrash = -Infinity;
    run.recoverAtCheckpoint = false;
    run.attack = null;
    run.lastBlast = null;
    run.pendingReturn = null;
  }

  function createRun(index, bonus = 0) {
    const run = {
      index, level: levels[index], course: createCourse(index), checkpoint: 0, collected: new Set(),
      elapsed: 0, loops: 0, crashes: 0, damage: 0, fallLimit: 3 + bonus, finished: false,
      notice: '', noticeUntil: 0, braking: false
    };
    restore(run, 0);
    run.grace = 0;
    return run;
  }

  function announce(run, message, duration = 4) {
    run.notice = message;
    run.noticeUntil = run.elapsed + duration;
  }

  function retryCheckpoint(run) {
    restore(run, run.checkpoint);
    run.damage = 0;
    announce(run, 'Back at the checkpoint. Your dispatch is safe.');
  }

  function takeHit(run, message) {
    run.crashes++;
    run.damage++;
    run.recoverAtCheckpoint = run.damage >= run.fallLimit;
    run.target = run.x;
    run.speed = distance(10);
    run.grace = 2.5;
    run.lastCrash = run.elapsed;
    announce(run, message);
  }

  function step(run, dt, input) {
    if (run.finished) return;
    if (run.pendingReturn) {
      run.pendingReturn.remaining -= dt;
      if (run.pendingReturn.remaining > 0) return;
      const missed = run.pendingReturn.marker;
      run.loops++;
      const returnPoint = missed.z - distance(145);
      restore(run, returnPoint, trails(run.index, returnPoint).at(-1).x);
      run.target = missed.x;
      announce(run, missed.type === 'post'
        ? 'Return trail. Lift your finger near the lit signal post.'
        : 'Return trail. Follow the gold sign to the pouch.', 6);
      return;
    }
    const falling = run.elapsed - run.lastCrash < FALL_SECONDS;
    if (!falling && run.recoverAtCheckpoint) {
      retryCheckpoint(run);
      return;
    }
    const beforeZ = run.z;
    const beforeX = run.x;
    const offTrail = !trails(run.index, run.z).some(lane => Math.abs(run.x - lane.x) <= lane.width);
    const fork = run.level.forks.find(item => beforeZ > item.start && beforeZ < item.end);
    const shortcut = run.index === 2 && fork && Math.abs(run.x - center(run.index, beforeZ) - forkOffset(fork, beforeZ)) < 2 && Math.abs(forkOffset(fork, beforeZ)) > 4;
    const preferredSpeed = falling ? 9 : offTrail ? distance(20) : shortcut ? distance(38) : CRUISE;
    run.braking = input.brake;
    if (input.brake && !falling) run.speed = Math.max(0, run.speed - STOP_DECELERATION * dt);
    else run.speed += (preferredSpeed - run.speed) * Math.min(1, dt * 3);
    run.z += dt * run.speed;
    run.elapsed += dt;
    run.grace = Math.max(0, run.grace - dt);
    const { left, right } = treeLine(run.index, run.z);
    if (!falling && !input.brake && input.steer) run.target += input.steer * dt * 15;
    run.target = clamp(run.target, left, right);
    const steering = !falling && !input.brake;
    const offset = run.target - run.x;
    const desiredVelocity = steering ? clamp(offset * 10, -23, 23) : 0;
    const response = 1 - Math.exp(-dt * 13);
    run.lateralVelocity = steering ? run.lateralVelocity + (desiredVelocity - run.lateralVelocity) * response : 0;
    const moveX = run.x + run.lateralVelocity * dt;
    const reachedTarget = offset * (run.target - moveX) < 0;
    if (reachedTarget || moveX < left || moveX > right) run.lateralVelocity = 0;
    run.x = clamp(reachedTarget ? run.target : moveX, left, right);
    function crosses(object, radius) {
      if (run.z === beforeZ || object.z < beforeZ || object.z > run.z) return false;
      const fraction = (object.z - beforeZ) / (run.z - beforeZ);
      return Math.abs(beforeX + (run.x - beforeX) * fraction - object.x) < radius;
    }
    for (const marker of run.course.markers) {
      if (run.collected.has(marker.id)) continue;
      const stoppingAtPost = marker.type === 'post' && input.brake && run.speed <= distance(21) &&
        Math.abs(marker.z - run.z) <= 12 && Math.abs(marker.x - run.x) < 2.8;
      if (!stoppingAtPost && !crosses(marker, marker.type === 'post' ? 2.8 : 2.15)) continue;
      if (marker.type === 'post' && !input.brake && run.speed > distance(21)) {
        announce(run, 'Lift your finger to brake as you pass the operator.');
        continue;
      }
      run.collected.add(marker.id);
      announce(run, marker.type === 'post' ? 'Dispatch confirmed.' : 'Dispatch pouch recovered.');
    }

    const missed = run.course.markers.find(marker => !run.collected.has(marker.id) && run.z > marker.z + distance(72));
    if (missed && !falling) {
      run.pendingReturn = { marker: missed, remaining: MISSED_WARNING_SECONDS };
      run.speed = 0;
      run.lateralVelocity = 0;
      run.braking = true;
      return;
    }

    if (!run.attack) {
      const incoming = run.course.attacks.find(attack => attack.z >= beforeZ && attack.z - run.z <= WARNING_DISTANCE);
      if (incoming) {
        run.attack = { ...incoming, aim: run.x, x: run.x, startedAt: run.elapsed, locked: false };
      }
    }
    const attack = run.attack;
    if (attack) {
      if (attack.kind === 'bomb') {
        if (beforeZ < attack.z && run.z >= attack.z) {
          run.lastBlast = { x: attack.x, z: attack.z, expires: run.elapsed + 0.65 };
          if (run.grace === 0 && crosses(attack, 2.55)) takeHit(run, 'The bomb blast knocked you down.');
          run.attack = null;
        }
      } else {
        if (!attack.locked) {
          const adjustment = RIFLE_TRACK_SPEED * dt;
          attack.aim += clamp(run.x - attack.aim, -adjustment, adjustment);
          const age = run.elapsed - attack.startedAt;
          const sweep = attack.side * RIFLE_SWEEP * Math.sin(age * 1.18);
          const edge = treeLine(run.index, attack.z);
          attack.x = clamp(attack.aim + sweep, edge.left + 0.5, edge.right - 0.5);
          if (input.brake && !falling && run.speed === 0 && Math.abs(attack.x - run.x) >= RIFLE_CLEARANCE) {
            attack.locked = true;
          }
        }
        for (let shot = 0; shot < 3; shot++) {
          const impact = { x: attack.x, z: attack.z + shot * GUN_SHOT_SPACING };
          if (run.grace === 0 && crosses(impact, 1.25)) {
            takeHit(run, 'Rifle fire knocked you down.');
            break;
          }
        }
        if (run.z >= attack.z + 2 * GUN_SHOT_SPACING) run.attack = null;
      }
    }
    if (run.grace === 0 && run.z !== beforeZ) {
      const tree = run.course.trees.some(pine => {
        const depth = 3.2 * pine.scale;
        if (pine.z < beforeZ - depth || pine.z > run.z + depth) return false;
        const radius = 0.86 * pine.scale;
        const x = (beforeX - pine.x) / radius, z = (beforeZ - pine.z) / depth;
        const dx = (run.x - beforeX) / radius, dz = (run.z - beforeZ) / depth;
        const fraction = clamp(-(x * dx + z * dz) / (dx * dx + dz * dz), 0, 1);
        return (x + fraction * dx) ** 2 + (z + fraction * dz) ** 2 <= 1;
      });
      if (tree) takeHit(run, 'You hit a tree.');
      else {
        const obstacle = run.course.obstacles.find(item => crosses(item, item.radius));
        if (obstacle) takeHit(run, OBSTACLE_HITS[obstacle.type]);
      }
    }
    if (run.index === 2 && BLACKOUT_POINTS.some(point => beforeZ < point && run.z >= point)) {
      announce(run, 'The valley lights are going out. Follow the trail lanterns.');
    }
    const nextCheckpoint = run.level.checkpoints.filter(z => z <= run.z).at(-1);
    if (nextCheckpoint > run.checkpoint) {
      run.checkpoint = nextCheckpoint;
      run.damage = 0;
    }
    if (!falling && !run.recoverAtCheckpoint && run.z >= DISTANCE && run.collected.size === run.level.markers.length) run.finished = true;
  }

  return { levels, DISTANCE, WORLD_EDGE, WARNING_DISTANCE, GUN_SHOT_SPACING, FALL_SECONDS, clamp, center, trails, treeLine, createRun, retryCheckpoint, step };
});
