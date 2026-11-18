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
  light: { w: 324, h: 418, ax: 166, ay: 406,
    idle: { src: "art/brawl-light-idle.webp", n: 1 },
    walk: { src: "art/brawl-light-walk.webp", n: 2 },
    punch: { src: "art/brawl-light-punch.webp", n: 4 },
    upper: { src: "art/brawl-light-upper.webp", n: 4 },
    hit: { src: "art/brawl-light-hit.webp", n: 2 },
    defeat: { src: "art/brawl-light-defeat.webp", n: 2 },
  },
  mid: { w: 378, h: 476, ax: 174, ay: 464,
    idle: { src: "art/brawl-mid-idle.webp", n: 2 },
    walk: { src: "art/brawl-mid-walk.webp", n: 2 },
    punch: { src: "art/brawl-mid-punch.webp", n: 4 },
    upper: { src: "art/brawl-mid-upper.webp", n: 4 },
    hit: { src: "art/brawl-mid-hit.webp", n: 1 },
    defeat: { src: "art/brawl-mid-defeat.webp", n: 1 },
  },
  heavy: { w: 426, h: 476, ax: 193, ay: 465,
    idle: { src: "art/brawl-heavy-idle.webp", n: 2 },
    walk: { src: "art/brawl-heavy-walk.webp", n: 2 },
    punch: { src: "art/brawl-heavy-punch.webp", n: 4 },
    upper: { src: "art/brawl-heavy-upper.webp", n: 4 },
    hit: { src: "art/brawl-heavy-hit.webp", n: 1 },
    defeat: { src: "art/brawl-heavy-defeat.webp", n: 2 },
  },
};

// Painted four-pose boss atlases: idle, two walking poses, striking pose.
['warden', 'enforcer'].forEach(function (kind) {
  var src = 'art/boss-' + kind + '-painted.webp';
  function clip(frames) { return { src: src, n: frames.length, columns: 2, frames: frames }; }
  CAMP_FRAMES[kind] = { w: 627, h: 627, ax: 313.5, ay: 620,
    idle: clip([0]), walk: clip([1, 2]), punch: clip([0, 0, 3, 3]),
    upper: clip([0, 0, 3, 3]), hit: clip([0]), defeat: clip([0]) };
});
