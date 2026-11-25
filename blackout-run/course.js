'use strict';

(function (root, makeGame) {
  const game = makeGame();
  if (typeof module === 'object' && module.exports) module.exports = game;
  else root.BlackoutRun = game;
})(globalThis, function () {
  const SPEED_MULTIPLIER = 1.5;
  const distance = value => value * SPEED_MULTIPLIER;
  const DISTANCE = distance(4680);
  const CRUISE = distance(26);
  const BLACKOUT_POINTS = [1260, 2230, 3200].map(distance);
  const WARNING_DISTANCE = 210;
  const GUN_SHOT_SPACING = 17;
  const WORLD_EDGE = 12;
  const levels = [
    {
      title: 'The Broken Dispatch',
      briefing: 'Recover both dispatch pouches and bring them to the relay hut.',
      objective: 'Pouches', destination: 'Relay hut', marker: 'satchel', markers: [1050, 3190],
      checkpoints: [0, 650, 2220, 2740, 4170],
      attacks: [[520, 'gun'], [1740, 'bomb'], [2480, 'gun'], [3880, 'bomb']],
      forks: [{ start: 690, end: 1450, side: -1 }, { start: 2750, end: 3620, side: 1 }]
    },
    {
      title: 'Lights Across the Valley',
      briefing: 'Ski through both Allied signal posts. Hold Brake as you pass each operator.',
      objective: 'Confirmations', destination: 'Valley relay', marker: 'post', markers: [1410, 3480],
      checkpoints: [0, 810, 2240, 2930, 4140],
      attacks: [[480, 'gun'], [2020, 'bomb'], [2650, 'gun'], [3830, 'bomb'], [4450, 'gun']],
      forks: [{ start: 900, end: 1820, side: 1 }, { start: 2940, end: 3950, side: -1 }]
    },
    {
      title: 'Beat the Blackout',
      briefing: 'Carry the confirmed dispatch to the workshop airstrip. Follow the lanterns when the lights go out.',
      objective: '', destination: 'Workshop airstrip', marker: '', markers: [],
      checkpoints: [0, 1060, 2190, 3290, 4150],
      attacks: [[470, 'gun'], [1240, 'bomb'], [1940, 'gun'], [2730, 'bomb'], [3690, 'gun'], [4430, 'bomb']],
      forks: [{ start: 740, end: 1620, side: -1 }, { start: 1990, end: 2830, side: 1 }, { start: 3220, end: 4060, side: -1 }]
    }
  ].map(level => ({
    ...level,
    markers: level.markers.map(distance),
    checkpoints: level.checkpoints.map(distance),
    forks: level.forks.map(fork => ({ ...fork, start: distance(fork.start), end: distance(fork.end) })),
    attacks: level.attacks.map(([z, kind]) => ({ z: distance(z), kind }))
  }));

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  function center(levelIndex, z) {
    return 1.45 * Math.sin(z / distance(261) + levelIndex) + 0.9 * Math.sin(z / distance(109) + levelIndex * 2);
  }

  function forkOffset(fork, z) {
    const position = clamp((z - fork.start) / (fork.end - fork.start), 0, 1);
    return fork.side * 6.5 * Math.sin(Math.PI * position) ** 1.5;
  }

  function trails(levelIndex, z) {
    const main = center(levelIndex, z);
    const fork = levels[levelIndex].forks.find(item => z > item.start && z < item.end);
    return fork ? [{ x: main, width: 4.7 }, { x: main + forkOffset(fork, z), width: 2.8 }] : [{ x: main, width: 4.7 }];
  }

  function createCourse(index) {
    const level = levels[index];
    const markers = level.markers.map((z, id) => {
      const path = trails(index, z);
      return { type: level.marker, z, id, x: path[path.length - 1].x };
    });
    const scenery = [];
    for (let z = 35; z < DISTANCE + 270; z += 27) {
      for (const side of [-1, 1]) {
        const path = trails(index, z);
        const edge = side < 0
          ? Math.min(...path.map(lane => lane.x - lane.width))
          : Math.max(...path.map(lane => lane.x + lane.width));
        scenery.push({ type: 'pine', z: z + (side > 0 ? 8 : 0), x: edge + side * (1.5 + ((z * 11 + side) % 31) / 10), scale: 0.8 + (z % 37) / 63 });
      }
    }
    const attacks = level.attacks.map((attack, id) => ({
      ...attack,
      side: (id + index) % 2 ? 1 : -1,
      shooterX: center(index, attack.z) + ((id + index) % 2 ? 1 : -1) * 7.5
    }));
    const obstacles = [];
    for (let z = 615, id = 0; z < DISTANCE - 180; z += 91 - index * 9, id++) {
      if (markers.some(marker => Math.abs(marker.z - z) < 58) ||
        level.checkpoints.some(point => Math.abs(z - point) < 34) ||
        attacks.some(attack => Math.abs(attack.z - z) < 62)) continue;
      const path = trails(index, z);
      const lane = path[path.length === 2 && id % 3 === 0 ? 1 : 0];
      obstacles.push({
        type: 'rock', z, x: lane.x + (id % 2 ? 1 : -1) * (1.35 + (z % 7) / 5),
        scale: 0.8 + (z % 11) / 22
      });
    }
    const signs = level.forks.map(fork => ({
      type: 'sign', z: fork.start - 22, x: center(index, fork.start) + fork.side * 4.4,
      label: index === 2 ? 'Shortcut' : 'Dispatch route', direction: fork.side
    }));
    if (index === 0) {
      const bridgeZ = distance(1020);
      signs.push({ type: 'bridge', z: bridgeZ, x: trails(index, bridgeZ)[1].x });
    }
    if (index === 2) {
      for (let z = 95; z < DISTANCE; z += 65) {
        const path = trails(index, z);
        signs.push({ type: 'lantern', z, x: path[0].x + 3.8, darkAt: BLACKOUT_POINTS[Math.min(2, Math.floor(z / distance(1560)))] });
        signs.push({ type: 'lantern', z: z + 8, x: path[0].x - 3.8 });
        if (path.length > 1 && Math.abs(path[1].x - path[0].x) > 4) {
          signs.push({ type: 'lantern', z: z + 3, x: path[1].x });
        }
      }
    }
    const finish = { type: index === 2 ? 'hangar' : 'cabin', z: DISTANCE + 27, x: center(index, DISTANCE) };
    return { markers, obstacles, attacks, objects: scenery.concat(obstacles, signs, markers, finish).sort((a, b) => b.z - a.z) };
  }

  function restore(run, z) {
    run.z = z;
    run.x = center(run.index, z);
    run.target = run.x;
    run.speed = CRUISE;
    run.grace = 3;
    run.lastCrash = -Infinity;
    run.attack = null;
    run.lastBlast = null;
  }

  function createRun(index) {
    const run = {
      index, level: levels[index], course: createCourse(index), checkpoint: 0, collected: new Set(),
      elapsed: 0, loops: 0, crashes: 0, damage: 0, finished: false,
      notice: '', noticeUntil: 0, braking: false
    };
    restore(run, 0);
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
    if (run.damage >= 3) {
      retryCheckpoint(run);
      return;
    }
    run.speed = distance(10);
    run.grace = 2.5;
    run.lastCrash = run.elapsed;
    announce(run, message);
  }

  function step(run, dt, input) {
    if (run.finished) return;
    const beforeZ = run.z;
    const beforeX = run.x;
    const offTrail = !trails(run.index, run.z).some(lane => Math.abs(run.x - lane.x) <= lane.width);
    const fork = run.level.forks.find(item => beforeZ > item.start && beforeZ < item.end);
    const shortcut = run.index === 2 && fork && Math.abs(run.x - center(run.index, beforeZ) - forkOffset(fork, beforeZ)) < 2 && Math.abs(forkOffset(fork, beforeZ)) > 4;
    const preferredSpeed = input.brake ? distance(15) : offTrail ? distance(20) : shortcut ? distance(38) : CRUISE;
    run.braking = input.brake;
    run.speed += (preferredSpeed - run.speed) * Math.min(1, dt * 3);
    run.z += dt * run.speed;
    run.elapsed += dt;
    run.grace = Math.max(0, run.grace - dt);
    if (input.steer) run.target = clamp(run.target + input.steer * dt * 10, -WORLD_EDGE, WORLD_EDGE);
    const delta = run.target - run.x;
    run.x += clamp(delta, -dt * (input.brake ? 15 : 12), dt * (input.brake ? 15 : 12));
    function crosses(object, radius) {
      if (object.z < beforeZ || object.z > run.z) return false;
      const fraction = (object.z - beforeZ) / (run.z - beforeZ);
      return Math.abs(beforeX + (run.x - beforeX) * fraction - object.x) < radius;
    }
    for (const marker of run.course.markers) {
      if (run.collected.has(marker.id) || !crosses(marker, marker.type === 'post' ? 2.8 : 2.15)) continue;
      if (marker.type === 'post' && !input.brake && run.speed > distance(21)) {
        announce(run, 'Hold Brake as you pass the operator.');
        continue;
      }
      run.collected.add(marker.id);
      announce(run, marker.type === 'post' ? 'Dispatch confirmed.' : 'Dispatch pouch recovered.');
    }

    const missed = run.course.markers.find(marker => !run.collected.has(marker.id) && run.z > marker.z + distance(72));
    if (missed) {
      run.loops++;
      const returnPoint = missed.z - distance(145);
      restore(run, returnPoint);
      run.target = missed.x;
      announce(run, missed.type === 'post'
        ? 'Return trail. Hold Brake at the lit signal post.'
        : 'Return trail. Follow the gold sign to the pouch.', 6);
      return;
    }

    if (!run.attack) {
      const incoming = run.course.attacks.find(attack => attack.z >= beforeZ && attack.z - run.z <= WARNING_DISTANCE);
      if (incoming) {
        run.attack = { ...incoming, x: clamp(run.x, -WORLD_EDGE + 1, WORLD_EDGE - 1) };
      }
    }
    const attack = run.attack;
    if (attack) {
      if (attack.kind === 'bomb') {
        if (beforeZ < attack.z && run.z >= attack.z) {
          run.lastBlast = { x: attack.x, z: attack.z, expires: run.elapsed + 0.65 };
          if (run.grace === 0 && crosses(attack, 2.55)) takeHit(run, 'Bomb blast. Back on your skis.');
          run.attack = null;
        }
      } else {
        for (let shot = 0; shot < 3; shot++) {
          const impact = { x: attack.x, z: attack.z + shot * GUN_SHOT_SPACING };
          if (run.grace === 0 && crosses(impact, 1.25)) {
            takeHit(run, 'Hit by gunfire. Back on your skis.');
            break;
          }
        }
        if (run.z >= attack.z + 2 * GUN_SHOT_SPACING) run.attack = null;
      }
    }
    if (run.grace === 0 && run.course.obstacles.some(rock => crosses(rock, 0.82 * rock.scale))) {
      takeHit(run, 'Back on your skis.');
    }
    if (run.index === 2 && BLACKOUT_POINTS.some(point => beforeZ < point && run.z >= point)) {
      announce(run, 'The valley lights are going out. Follow the trail lanterns.');
    }
    const nextCheckpoint = run.level.checkpoints.filter(z => z <= run.z).at(-1);
    if (nextCheckpoint > run.checkpoint) {
      run.checkpoint = nextCheckpoint;
      run.damage = 0;
    }
    if (run.z >= DISTANCE && run.collected.size === run.level.markers.length) run.finished = true;
  }

  return { levels, DISTANCE, WORLD_EDGE, WARNING_DISTANCE, GUN_SHOT_SPACING, clamp, center, trails, createRun, retryCheckpoint, step };
});
