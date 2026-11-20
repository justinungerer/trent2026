var CAMP_FRAMES = {
  yardHorizon: 0.3903,
  santa: { w: 442, h: 476, ax: 184, ay: 464,
    idle: { src: "art/brawl-santa-actions-painted.webp", n: 1, start: 0, columns: 4 },
    walk: { src: "art/brawl-santa-walk-painted.webp", n: 6 },
    punch: { src: "art/brawl-santa-actions-painted.webp", n: 4, start: 0, columns: 4 },
    upper: { src: "art/brawl-santa-actions-painted.webp", n: 4, start: 4, columns: 4 },
    hit: { src: "art/brawl-santa-actions-painted.webp", n: 2, start: 8, columns: 4 },
    defeat: { src: "art/brawl-santa-actions-painted.webp", n: 2, start: 10, columns: 4 },
  },
};

['club', 'knuckles'].forEach(function (weapon) {
  var src = 'art/brawl-santa-' + weapon + '-painted.webp';
  function clip(frames) {
    return { src: src, n: frames.length, columns: 4, rows: 2, frames: frames, anchorX: 0.44, anchorY: 0.982 };
  }
  CAMP_FRAMES.santa[weapon + 'Idle'] = clip([0]);
  CAMP_FRAMES.santa[weapon + 'Walk'] = clip([0, 1, 0, 2]);
  CAMP_FRAMES.santa[weapon] = clip([3, 4, 5, 6]);
});

// Painted four-pose boss atlases: idle, two walking poses, striking pose.
['warden', 'enforcer'].forEach(function (kind) {
  var src = 'art/boss-' + kind + '-painted.webp';
  function clip(frames) { return { src: src, n: frames.length, columns: 2, frames: frames }; }
  CAMP_FRAMES[kind] = { w: 627, h: 627, ax: 313.5, ay: 620,
    idle: clip([0]), walk: clip([1, 2]), punch: clip([0, 0, 3, 3]),
    upper: clip([0, 0, 3, 3]), hit: clip([0]), defeat: clip([0]) };
});

// The three regular guard classes share six-pose painted action atlas layouts.
['light', 'mid', 'heavy'].forEach(function (kind) {
  var src = 'art/guard-' + kind + '-painted.webp';
  function clip(frames) { return { src: src, n: frames.length, columns: 3, frames: frames }; }
  CAMP_FRAMES[kind] = { w: 512, h: 512, ax: 256, ay: 504,
    idle: clip([0]), walk: clip([1, 2]), punch: clip([0, 0, 3, 3]),
    upper: clip([0, 0, 3, 3]), hit: clip([4]), defeat: clip([5]) };
});
