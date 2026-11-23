/* Chapter 10 — The Chimney Road.
   Old route: world 2860px wide, about 2598px of running,
   camera locked to one 390px-tall view.
   This route: world 8580px wide (3x), about 8820px along the main path.
   Platforms run from y=-80 to y=558, and the camera follows both ways.
   Painted sprites live in art/. */
'use strict';

(function () {
  var canvas = document.getElementById('roofs');
  var ctx = canvas.getContext('2d');
  var roadEl = document.getElementById('road');
  var fallsEl = document.getElementById('falls');
  var pauseBtn = document.getElementById('pause');
  var hintEl = document.getElementById('hint');
  var startSheet = document.getElementById('start-sheet');
  var pauseSheet = document.getElementById('pause-sheet');
  var winSheet = document.getElementById('win-sheet');
  var loseSheet = document.getElementById('lose-sheet');
  var boardingSheet = document.getElementById('boarding-sheet');
  var boardingHint = document.getElementById('boarding-hint');
  var winTimeEl = document.getElementById('win-time');
  var portraitEl = document.getElementById('portrait');
  var statusEl = document.getElementById('status');
  var levelParams = new URLSearchParams(location.search);
  var stage = levelParams.get('stage') || (location.hash === '#final-fight' ? 'final-fight' : null);
  var finalFightOnly = stage === 'final-fight';
  var eaves = stage === 'the-eaves';
  var flags = stage === 'above-the-lanterns';
  var objectives = [];
  var objectiveNoticeUntil = 0;
  var objectiveNotice = '';

  var VIEW_W = 844;
  var VIEW_H = 390;
  var WORLD_W = 8580;
  var WORLD_TOP = -620;
  var WORLD_BOTTOM = 1120;
  var TRENT = { w: 558, h: 578, ax: 210, ay: 568, n: 8 };
  /* Main path is a chain of roofs. role "end" is a dead end: the way on
     is back the way you came. A fall returns you to the last main roof. */
  var PLATFORMS = [
    { x: 0, y: 300, w: 500, name: 'The first roof', role: 'main' },
    { x: 630, y: 348, w: 380, name: 'The lower eave', role: 'main' },
    { x: 560, y: 198, w: 240, name: 'The cold chimney', role: 'end', cap: 'right' },
    { x: 1120, y: 290, w: 340, name: 'The snow step', role: 'main' },
    { x: 1580, y: 248, w: 420, name: 'The broken span', role: 'main' },
    { x: 1760, y: 408, w: 200, name: 'The alley roof', role: 'end', cap: 'right' },
    { x: 1780, y: 558, w: 160, name: 'The dark well', role: 'end', cap: 'right' },
    { x: 2120, y: 220, w: 620, name: 'The long roof', role: 'main' },
    { x: 2460, y: 70, w: 300, name: 'The high gutter', role: 'main' },
    { x: 2360, y: -80, w: 200, name: 'The capped stack', role: 'end', cap: 'right' },
    { x: 2880, y: 24, w: 380, name: 'The ridge', role: 'main' },
    { x: 3380, y: 190, w: 360, name: 'The drop roof', role: 'main' },
    { x: 3220, y: 340, w: 400, name: 'The cellar run', role: 'end', cap: 'left' },
    { x: 3340, y: 490, w: 220, name: 'The sealed hatch', role: 'end', cap: 'left' },
    { x: 3860, y: 190, w: 400, name: 'The lantern roof', role: 'main' },
    { x: 4380, y: 140, w: 680, name: 'The chimney row', role: 'main' },
    { x: 4460, y: -10, w: 300, name: 'The false stair', role: 'end', cap: 'right' },
    { x: 5180, y: 86, w: 320, name: 'The north eave', role: 'main' },
    { x: 5600, y: 10, w: 360, name: 'The high slate', role: 'main' },
    { x: 5480, y: 170, w: 320, name: 'The broken gutter', role: 'end', cap: 'left' },
    { x: 6080, y: 48, w: 700, name: 'The snowball roof', role: 'main' },
    { x: 6560, y: 228, w: 520, name: 'The low road', role: 'main' },
    { x: 7200, y: 176, w: 460, name: 'The narrow cap', role: 'main' },
    { x: 7220, y: 26, w: 120, name: 'The short stack', role: 'end', cap: 'right' },
    { x: 7780, y: 236, w: 260, name: 'The last eave', role: 'main' },
    { x: 285, y: 166, w: 152, name: 'The upper landing', role: 'end' },
    { x: 430, y: 458, w: 235, name: 'The garden roof', role: 'end' },
    { x: 870, y: 88, w: 192, name: 'The frozen dormer', role: 'end', cap: 'left' },
    { x: 980, y: 490, w: 288, name: 'The coal shed', role: 'end' },
    { x: 1300, y: 152, w: 198, name: 'The split gable', role: 'end' },
    { x: 1930, y: 339, w: 226, name: 'The alley crossing', role: 'end' },
    { x: 2055, y: 94, w: 190, name: 'The watch ledge', role: 'end' },
    { x: 2670, y: 333, w: 245, name: 'The bakery eave', role: 'end' },
    { x: 2740, y: -86, w: 184, name: 'The high ridge', role: 'end', cap: 'right' },
    { x: 3100, y: 142, w: 188, name: 'The narrow junction', role: 'end' },
    { x: 3710, y: 372, w: 205, name: 'The curving gutter', role: 'end' },
    { x: 4000, y: 58, w: 217, name: 'The lantern walk', role: 'end' },
    { x: 4250, y: 286, w: 267, name: 'The stable roofs', role: 'end' },
    { x: 4820, y: -91, w: 221, name: 'The shuttered loft', role: 'end', cap: 'right' },
    { x: 5015, y: 222, w: 229, name: 'The lower crossing', role: 'end' },
    { x: 5360, y: -52, w: 193, name: 'The high passage', role: 'end' },
    { x: 5840, y: 139, w: 233, name: 'The winter steps', role: 'end' },
    { x: 5900, y: -116, w: 184, name: 'The frozen crown', role: 'end', cap: 'left' },
    { x: 6700, y: 116, w: 279, name: 'The branch roof', role: 'end' },
    { x: 6900, y: 375, w: 314, name: 'The snowbound annex', role: 'end' },
    { x: 7550, y: 41, w: 214, name: 'The upper run', role: 'end' },
    { x: 7685, y: 373, w: 230, name: 'The roof below the sleigh', role: 'end' },
    { x: 8160, y: 260, w: 420, name: 'The sleigh roof', role: 'main', goal: true }
  ];
  if (eaves || flags) {
    WORLD_W = 2970;
    document.getElementById('roof-stage-title').textContent = eaves ? 'The Eaves' : 'Above the Lanterns';
    document.getElementById('roof-win-title').textContent = eaves ? 'Sleigh boarded' : 'Junction roof reached';
    document.getElementById('roof-objective').textContent = eaves
      ? 'Follow the yellow LANTERN arrow to the lower coach-house roof, collect the lantern, then board the sleigh.'
      : 'Collect both markers, one on the high roofs and one below, and reach the junction roof.';
    PLATFORMS = [
      { x: 0, y: 300, w: 386, name: 'First roof', role: 'main' },
      { x: 428, y: 372, w: 315, name: 'Lower gutter', role: 'main' },
      { x: 540, y: 528, w: 335, name: 'Coach house', role: 'main' },
      { x: 916, y: 452, w: 350, name: 'Snowbound eave', role: 'main', cap: 'right' },
      { x: 1330, y: 338, w: 353, name: 'Covered walkway', role: 'main' },
      { x: 1720, y: 312, w: 447, name: 'Junction approach', role: 'main' },
      { x: 2185, y: 264, w: 335, name: 'North dormer', role: 'main', cap: 'left' },
      { x: 2520, y: 239, w: 450, name: 'Junction roof', role: 'main', goal: true }
    ];
    if (eaves) {
      PLATFORMS[0].cap = 'right';
      PLATFORMS[1] = { x: 520, y: -184, w: 260, name: 'The practice landing', role: 'main' };
      document.getElementById('roof-controls').textContent =
        'Jump over the painted presents. Tap Jump again near the top of a jump to go higher. ' +
        'Ice makes stopping harder. Wait for the blowing snow to clear before crossing a windy roof.';
      WORLD_W *= 2;
      var sleighRoof = PLATFORMS.pop();
      sleighRoof.x = WORLD_W - sleighRoof.w;
      sleighRoof.name = 'The sleigh roof';
      PLATFORMS.push(
        { x: 2580, y: 250, w: 345, name: 'Bellmaker’s roof', role: 'main' },
        { x: 3010, y: 283, w: 380, name: 'Icy tiles', role: 'main' },
        { x: 3470, y: 238, w: 335, name: 'The high shutters', role: 'main' },
        { x: 3890, y: 292, w: 430, name: 'Windward roof', role: 'main' },
        { x: 4400, y: 352, w: 345, name: 'The snow terrace', role: 'main' },
        { x: 4820, y: 294, w: 320, name: 'The glass ridge', role: 'main' },
        { x: 5225, y: 250, w: 210, name: 'The sleigh approach', role: 'main' },
        sleighRoof
      );
      objectives = [{ x: 805, y: 528, roof: 2 }];
    }
    else {
      // The wide roofs form the route without the added terraces or narrow stairs.
      PLATFORMS[3].y = 430;
      PLATFORMS[4].y = 353;
      PLATFORMS.splice(7, 0,
        { x: 360, y: 244, w: 627, name: 'Bell tower step', role: 'end' },
        { x: 1035, y: 166, w: 375, name: 'Bell tower ridge', role: 'end' },
        { x: 1485, y: 208, w: 332, name: 'Dormer walk', role: 'end' },
        { x: 1360, y: 488, w: 676, name: 'Lower lantern walk', role: 'end' });
      objectives = [{ x: 1185, y: 166 }, { x: 1850, y: 488 }];
    }
  }
  if (flags) {
    var extension = PLATFORMS.map(function (roof) {
      return Object.assign({}, roof, { x: roof.x + WORLD_W, name: 'Far ' + roof.name });
    });
    PLATFORMS[PLATFORMS.length - 1].goal = false;
    PLATFORMS = PLATFORMS.concat(extension);
    objectives[1].x += WORLD_W;
    WORLD_W *= 2;
  }
  var escapeMode = !eaves && !flags;
  var expansion = null;
  var tierAnchors = PLATFORMS.filter(function (roof) { return roof.role === 'main'; }).map(function (roof) {
    return { x: roof.x, y: roof.y, w: roof.w };
  });
  if (!eaves) {
    WORLD_W = Math.round(WORLD_W * (escapeMode ? 1.5 : 1));
    expansion = window.TrentRoofExpansion(PLATFORMS, objectives, { flags: flags, width: WORLD_W });
    WORLD_TOP = expansion.top; WORLD_BOTTOM = expansion.bottom;
  }
  tierAnchors.forEach(function (roof) {
    if (escapeMode) { roof.x *= 1.5; roof.w *= 1.5; }
    if (!eaves) roof.y = 300 + (roof.y - 300) * expansion.scale;
  });
  if (!flags) window.TrentAddRoofTiers(PLATFORMS, tierAnchors, WORLD_W, escapeMode, eaves);
  PLATFORMS.forEach(function (roof, index) {
    if (roof.cap) roof.chimneyHeight = 108 * (index % 2 ? 3 : 2);
    roof.drawDepth = 55;
    PLATFORMS.forEach(function (lower) {
      if (lower.y > roof.y && lower.x < roof.x + roof.w && lower.x + lower.w > roof.x) {
        roof.drawDepth = Math.min(roof.drawDepth, lower.y - roof.y);
      }
    });
  });
  if (eaves) PLATFORMS[0].chimneyHeight = 324;
  var SEARCH_SWEEP = 3;
  var SEARCH_BREAK = 5;
  var SEARCHLIGHTS = [];
  var mainRoofs = tierAnchors.slice().sort(function (a, b) { return a.x - b.x; });
  var openingIndex = 0;
  for (var opening = 1; opening < mainRoofs.length; opening++) {
    var before = mainRoofs[opening - 1], after = mainRoofs[opening];
    var leftEdge = before.x + before.w, gap = after.x - leftEdge;
    if (eaves && opening === 1) continue;
    if (gap < 30 || gap > 230) continue;
    if (openingIndex++ % 3 !== 0) continue;
    var lightX = leftEdge + gap / 2;
    var sourceY = Math.max(before.y, after.y) + 230;
    PLATFORMS.forEach(function (lower) {
      if (lower.y > Math.max(before.y, after.y) + 60 && lightX >= lower.x && lightX <= lower.x + lower.w) {
        sourceY = Math.min(sourceY, lower.y - 60);
      }
    });
    SEARCHLIGHTS.push({ left: leftEdge, right: after.x, x: lightX,
      y: sourceY, top: Math.min(before.y, after.y) - 360,
      labelY: Math.min(before.y, after.y) - 78, phase: SEARCHLIGHTS.length * 1.7 });
  }
  document.getElementById('roof-controls').textContent +=
    ' Hold the up-arrow button above the left-side movement buttons beside a tall chimney to climb all the way to its top before crossing. Trent faces the chimney while climbing. ' +
    'Watch for searchlights sweeping up through roof openings. Each three-second sweep is followed by five clear seconds to jump across. Touching a searchlight starts gunfire immediately. Soldiers fire upward once per second until you leave the screen where they spotted you. These slower tracers can pass through roofs, so dodge the bright shots.';
  var GOAL = PLATFORMS.findIndex(function (roof) { return roof.goal; });
  var ROOF_BLOCKS = PLATFORMS.map(function (roof, index) {
    if (roof.permanentRoute || (index % 4 === 0 && index !== 4) || index === GOAL || (eaves && (index === 1 || index === objectives[0].roof))) return null;
    var height = 26 + (index % 3) * 7;
    var width = eaves ? height * .98 : Math.min(44, roof.w * .18);
    return { x: roof.x + roof.w * .58, y: roof.y - height, w: width, h: height, bottom: roof.y, roof: index };
  }).filter(Boolean);
  var SLEIGH_X = PLATFORMS[GOAL].x + 250;
  var SLEIGH_W = 168;
  var GUARD_X = SLEIGH_X - 100;
  var bossBeaten = false;
  var fight = escapeMode ? window.TrentBoxing.create({ onWin: function () { bossBeaten = true; win(); } }) : null;
  var fallingBomb = null, bombNext = 3, roofBlasts = [];
  if (escapeMode) {
    document.getElementById('roof-objective').textContent = 'You have been spotted. Escape the bombed roofs, follow the reinforced stone route to the sleigh, and confront Hitler guarding it.';
    document.getElementById('roof-controls').textContent += ' Red target marks warn of incoming bombs. Bombs punch holes through individual roof sections. Gold-braced stone remains. Follow the permanent switchbacks up, down, and back across the skyline.';
  }
  var ICE_PATCHES = eaves ? [{ x: 3070, y: 283, w: 194 }, { x: 4870, y: 294, w: 190 }] : [];
  var WIND_ZONES = eaves ? [{ x: 3980, y: 292, w: 212, phase: 0 }, { x: 4490, y: 352, w: 150, phase: 1.3 }] : [];
  var GRAV = 1480;
  var JUMP = -630;
  var HOP = -420;
  var RUN = 260;
  var LONG = 7;
  var BALLS = 20;
  var smokeStacks = eaves ? [] : flags ? [
    { roof: authoredRoof(3), offset: 0.4, phase: 0 },
    { roof: authoredRoof(6), offset: 0.8, phase: 1.9 }
  ] : [
    { roof: widestRoofSection(11), offset: 0.5, phase: 0 },
    { roof: widestRoofSection(18), offset: 0.5, phase: 1.9 }
  ];

  var trentVisibleBounds = [];
  var climbVisibleBounds = [];
  var climbImg = new Image();
  var bombImg = new Image();
  if (escapeMode) bombImg.src = 'art/painted-bomb.webp';
  var projectorImg = new Image();
  climbImg.onload = function () { climbVisibleBounds = spriteBounds(climbImg, 2, 2); };
  climbImg.src = 'art/trent-climbing-painted.webp';
  projectorImg.src = 'art/painted-searchlight.webp';
  var panoramaImg = new Image();
  var roofImg = new Image();
  var trentImg = new Image();
  var sleighImg = new Image();
  var crateImg = new Image();
  panoramaImg.src = 'art/panorama.webp';
  roofImg.src = 'art/roof.webp';
  trentImg.onload = function () { trentVisibleBounds = spriteBounds(trentImg, TRENT.n, 1); };
  trentImg.src = 'art/trent.webp';
  sleighImg.src = 'art/sleigh.webp';
  crateImg.src = 'art/crate.webp';
  var rooftopArt = {};
  var presentImg = new Image();
  if (eaves) presentImg.src = '../wrapping-line/art/present-ribbon.webp';
  ['chimney', 'roof-crate', 'snowball', 'icicle', 'lantern', 'smoke', 'flag', 'dormer'].forEach(function (name) {
    var image = new Image();
    image.src = 'art/painted-' + name + '.webp';
    rooftopArt[name] = image;
  });

  function paintedProp(name, x, y, width, height) {
    var image = rooftopArt[name];
    if (!imageReady(image)) return false;
    ctx.drawImage(image, x, y, width, height);
    return true;
  }


  var state = 'title';
  var cssW = 844;
  var cssH = 390;
  var dpr = 1;
  var view = { s: 1, ox: 0, oy: 0 };
  var played = 0;
  var victorySent = false;
  var boardingWarned = false;
  var tutorialReachedTop = false;
  var tutorialAttempt = false;
  var tutorialDoubleJumpHint = false;
  var tutorialPassed = false;
  var rotateHold = false;
  var visualTime = 0;
  var lastFrame = 0;
  var shake = 0;
  var falls = 0;
  var cp = 0;
  var stood = 0;
  var body = { x: 96, y: 300, vx: 0, vy: 0, face: 1, ground: true, runT: 0, climbing: false, climbT: 0 };
  var gunfire = null;
  var hostileShots = [];
  var shotSerial = 0;
  var gunfireWarning = document.getElementById('gunfire-warning');
  var climbRoof = null;
  var climbSide = -1;
  var held = { left: false, right: false, climb: false };
  var jumpQueued = 0;
  var coyote = 0;
  var jumpBonus = (window.TrentMissionBonus || 0) * 0.04;
  var airJumps = 1;
  var airBuffer = 0;
  var hurt = 0;
  var camX = 0;
  var camY = 0;
  var camSnap = true;
  var cratePrev = 0;
  var onCrate = false;
  var flakes = [];
  var fi;

  for (fi = 0; fi < 42; fi++) {
    flakes.push({
      x: Math.random() * VIEW_W,
      y: Math.random() * VIEW_H,
      v: 16 + Math.random() * 22,
      r: 1 + Math.random() * 1.5,
      drift: Math.random() * 12 - 6
    });
  }

  var motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

  function reduceMotion() {
    return motionQuery.matches;
  }

  function imageReady(img) {
    return !!(img && img.complete && img.naturalWidth > 0);
  }

  function say(text) {
    statusEl.textContent = text;
  }

  function clamp(v, a, b) {
    if (v < a) return a;
    if (v > b) return b;
    return v;
  }

  function spawnX(roof) {
    return roof.x + Math.min(96, Math.max(48, roof.w * 0.22));
  }

  function hazardRoof(kind) {
    return authoredRoof({ crate: flags ? 4 : LONG, snowball: flags ? 5 : BALLS,
      lantern: flags ? 10 : 14, ice1: flags ? 4 : 10, ice2: flags ? 6 : 22 }[kind]);
  }

  function authoredRoof(index) {
    return PLATFORMS.find(function (roof) { return roof.originalIndex === index; }) || PLATFORMS[index] || PLATFORMS[0];
  }

  function widestRoofSection(index) {
    var original = authoredRoof(index);
    return PLATFORMS.reduce(function (widest, roof) {
      return roof.name === original.name && roof.w > widest.w ? roof : widest;
    }, original);
  }

  function crateBox() {
    if (eaves) return { x: -1000, y: -1000, w: 0, h: 0 };
    var roof = hazardRoof('crate');
    if (roof.destroyed) return { x: -1000, y: -1000, w: 0, h: 0 };
    var w = 112;
    var h = 74;
    var left = roof.x + roof.w * .4 + Math.sin(visualTime * .9) * Math.min(60, roof.w * .15);
    return { x: left, y: roof.y - h, w: w, h: h };
  }

  function snowball() {
    if (eaves) return { x: -1000, y: -1000, r: 0, roofY: -1000 };
    var roof = hazardRoof('snowball');
    if (roof.destroyed) return { x: -1000, y: -1000, r: 0, roofY: -1000 };
    var span = 120;
    var travel = visualTime * 68;
    var ping = travel % (span * 2);
    if (ping < 0) ping += span * 2;
    if (ping > span) ping = span * 2 - ping;
    var r = 22;
    return { x: roof.x + roof.w * .4 + ping, y: roof.y - r, r: r, roofY: roof.y };
  }

  function icicleAt(x, roofY, phase) {
    var period = 2.9;
    var t = (visualTime + phase) % period;
    var len = 54;
    var tip = roofY - 124;
    var mode = 'hang';
    if (t < 1.15) mode = 'warn';
    else if (t < 1.42) {
      mode = 'fall';
      tip = (roofY - 124) + ((roofY - 8) - (roofY - 124)) * ((t - 1.15) / 0.27);
    } else if (t < 2.05) {
      mode = 'down';
      tip = roofY - 8;
    }
    return { x: x, hang: tip - len, tip: tip, roofY: roofY, mode: mode, shake: mode === 'warn' };
  }

  function lanternBob() {
    var angle = Math.sin(visualTime * Math.PI * 2 / 3.15) * 0.85;
    var len = 130;
    var roof = hazardRoof('lantern');
    if (roof.destroyed) return { px: -1000, py: -1000, x: -1000, y: -1000, r: 0 };
    var pivotX = eaves ? 3800 : roof.x + roof.w * .35;
    var pivotY = eaves ? -20 : roof.y - 150;
    return {
      px: pivotX,
      py: pivotY,
      x: pivotX + Math.sin(angle) * len,
      y: pivotY + Math.cos(angle) * len,
      r: 16
    };
  }

  function smokeList() {
    return smokeStacks.filter(function (stack) {
      return !stack.roof.destroyed;
    }).map(function (stack) {
      return puffAt(stack.roof.x + stack.roof.w * stack.offset, stack.roof.y, stack.phase);
    });
  }

  function puffAt(x, roofY, phase) {
    var period = 3.8;
    var t = (visualTime + phase) % period;
    if (t < 1.05) return { x: x, y: roofY, h: 0, danger: false, pot: true };
    if (t < 1.9) return { x: x, y: roofY, h: 36, danger: false, pot: true };
    var grow = t < 3.25 ? 158 : 158 * (1 - (t - 3.25) / 0.55);
    return { x: x, y: roofY, h: grow, danger: grow > 70, pot: true };
  }

  function renderHud() {
    roadEl.textContent = eaves
      ? PLATFORMS[stood].name + (objectives[0].taken ? ' · Lantern recovered' : ' · Find the lantern')
      : objectives.length ? PLATFORMS[stood].name + ' · ' + objectives.filter(function (item) { return item.taken; }).length + '/' + objectives.length
      : PLATFORMS[stood].name;
    fallsEl.textContent = falls + ' / 3';
    gunfireWarning.hidden = !gunfire && !hostileShots.length;
    gunfireWarning.textContent = gunfire ? 'Spotted! Leave this screen to escape the gunfire' : 'Dodge the incoming bullets!';
    fallsEl.className = falls ? 'warn' : '';
  }

  function placeOn(index) {
    var roof = PLATFORMS[index];
    gunfire = null;
    hostileShots = [];
    climbRoof = null;
    body.climbing = false;
    body.climbT = 0;
    body.x = spawnX(roof);
    body.y = roof.y;
    if (eaves && index === 0 && tutorialReachedTop && !tutorialPassed) {
      body.x = capX(roof) + 21;
      body.y = roof.y - roof.chimneyHeight;
    }
    body.vx = 0;
    body.vy = 0;
    body.ground = true;
    body.face = 1;
    airJumps = 1;
    airBuffer = 0;
    jumpQueued = 0;
    onCrate = false;
    hurt = 0.45;
    stood = index;
    camSnap = true;
    cratePrev = crateBox().x;
  }

  function beginRun() {
    objectiveNoticeUntil = 0;
    objectiveNotice = '';
    objectives.forEach(function (item) { item.taken = false; });
    falls = 0;
    played = 0;
    shotSerial = 0;
    SEARCHLIGHTS.forEach(function (light) { light.spottedCycle = -1; });
    PLATFORMS.forEach(function (roof) { roof.destroyed = false; });
    fallingBomb = null; roofBlasts = []; bombNext = 3; bossBeaten = false;
    if (fight) fight.stop();
    shake = 0;
    jumpQueued = 0;
    coyote = 0;
    airJumps = 1;
    airBuffer = 0;
    victorySent = false;
    boardingWarned = false;
    tutorialReachedTop = tutorialAttempt = tutorialDoubleJumpHint = tutorialPassed = false;
    boardingSheet.hidden = true;
    boardingHint.hidden = true;
    held.left = held.right = held.climb = false;
    placeOn(0);
    cp = 0;
    state = 'play';
    startSheet.hidden = true;
    pauseSheet.hidden = true;
    winSheet.hidden = true;
    loseSheet.hidden = true;
    hintEl.hidden = true;
    renderHud();
    say(eaves ? 'Recover the lantern from the lower roof.' : escapeMode ? 'Spotted! Escape the bombing and reach the final sleigh.' : 'The sleigh is at the end of the road.');
    if (finalFightOnly) {
      placeOn(GOAL); body.x = GUARD_X; checkBoarding();
    } else if (escapeMode) startGunfire({ x: body.x, y: body.y + 220, left: body.x - 110, right: body.x + 110, phase: 0, spottedCycle: -1 });
  }

  function openPause() {
    if (state !== 'play') return;
    state = 'pause';
    held.left = false;
    held.right = false;
    held.climb = false;
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
    say('Gave up. The sleigh is still waiting.');
  }

  function win() {
    var seconds;
    if (state === 'win') return;
    seconds = Math.max(0, Math.round(played));
    state = 'win';
    winTimeEl.textContent = 'Across in ' + seconds + ' seconds.';
    winSheet.hidden = false;
    say('Route cleared in ' + seconds + ' seconds.');
    if (!victorySent) {
      victorySent = true;
      window.dispatchEvent(new CustomEvent('chimney-road:complete', {
        detail: { seconds: seconds }
      }));
      if (window.parent !== window) {
        var relay = { type: 'chimney-road:complete', detail: { seconds: seconds } };
        try {
          var relayRun = levelParams.get('runId');
          if (relayRun) relay.runId = relayRun;
        } catch (ignoreRelay) {}
        window.parent.postMessage(relay, (location.protocol === 'http:' || location.protocol === 'https:') ? location.origin : '*');
      }
    }
  }

  function drop(reason) {
    if (eaves && tutorialAttempt && !tutorialPassed) {
      tutorialDoubleJumpHint = true;
      tutorialAttempt = false;
    }
    boardingHint.hidden = true;
    falls += 1;
    if (!reduceMotion()) shake = 8;
    if (falls >= 3) {
      if (levelParams.has('sequence')) {
        state = 'lost';
        loseSheet.hidden = false;
        say('Three falls. The route was not cleared.');
        renderHud();
        return;
      }
      objectives.forEach(function (item) { item.taken = false; });
      tutorialReachedTop = tutorialAttempt = tutorialDoubleJumpHint = tutorialPassed = false;
      falls = 0;
      placeOn(0);
      cp = 0;
      say('Three falls. The road starts again.');
    } else {
      placeOn(cp);
      say(reason || 'Back on the roof.');
    }
    renderHud();
  }

  document.getElementById('retry-lose').addEventListener('click', beginRun);
  document.getElementById('close-boarding').addEventListener('click', function () {
    if (state !== 'boarding') return;
    state = 'play';
    boardingSheet.hidden = true;
    lastFrame = performance.now();
    say('Find the lantern you dropped on the lower coach-house roof, then return to the sleigh.');
  });

  function checkBoarding() {
    var roof = PLATFORMS[GOAL];
    if (escapeMode && !bossBeaten) {
      if (body.x >= GUARD_X - 42 && body.y >= roof.y - 178 && body.y <= roof.y + 25) {
        state = 'boxing'; gunfire = null; hostileShots = []; fallingBomb = null;
        held.left = held.right = held.climb = false; fight.start();
      }
      return;
    }
    var nearSleigh = body.y <= roof.y + 2 && body.y >= roof.y - 84 &&
      body.x >= SLEIGH_X - 12 && body.x <= SLEIGH_X + SLEIGH_W + 12;
    if (!nearSleigh) {
      boardingWarned = false;
      boardingHint.hidden = true;
      return;
    }
    if (objectives.every(function (item) { return item.taken; })) {
      win();
    } else if (eaves) {
      if (!boardingWarned) {
        boardingWarned = true;
        state = 'boarding';
        held.left = held.right = held.climb = false;
        boardingSheet.hidden = false;
        document.getElementById('close-boarding').focus();
      }
    } else {
      var missing = objectives.filter(function (item) { return !item.taken; }).length;
      var message = 'You still need to collect ' + missing + (missing === 1 ? ' flag.' : ' flags.');
      if (objectiveNotice !== message) say(message);
      objectiveNoticeUntil = played + 4;
      objectiveNotice = message;
      boardingHint.hidden = true;
    }
  }

  function windTime(zone) {
    return (visualTime + zone.phase) % 4.4;
  }

  function inWind(zone) {
    return windTime(zone) >= 2.55 && Math.abs(body.y - zone.y) < 112 &&
      body.x >= zone.x && body.x <= zone.x + zone.w;
  }

  function hitsBob(bob) {
    var y;
    for (y = body.y - 96; y <= body.y - 10; y += 18) {
      if (Math.hypot(body.x - bob.x, y - bob.y) < bob.r + 12) return true;
    }
    return false;
  }

  function overlapsBody(x, y, w, h) {
    var top = body.y - 108;
    var bot = body.y - 4;
    if (bot < y || top > y + h) return false;
    if (body.x + 14 < x || body.x - 14 > x + w) return false;
    return true;
  }

  function requestJump() {
    if (state !== 'play') return;
    if (eaves && tutorialReachedTop && !tutorialPassed && body.ground && stood === 0) tutorialAttempt = true;
    if (body.ground || coyote > 0) jumpQueued = 0.14 + jumpBonus;
    else airBuffer = 0.52;
  }

  function nearChimney() {
    return PLATFORMS.find(function (roof) {
      return !roof.destroyed && roof.cap && body.x >= capX(roof) - 28 && body.x <= capX(roof) + 70 &&
        body.y <= roof.y + 8 && body.y > roof.y - roof.chimneyHeight + 0.1;
    });
  }

  function stepClimb(dt) {
    if (climbRoof && climbRoof.destroyed) { climbRoof = null; body.climbing = false; }
    if (!held.climb) {
      if (climbRoof) body.x = capX(climbRoof) + (climbSide < 0 ? -14 : 56);
      climbRoof = null; body.climbing = false;
      return false;
    }
    if (!climbRoof) {
      climbRoof = nearChimney();
      if (!climbRoof) { body.climbing = false; return false; }
      climbSide = body.x < capX(climbRoof) + 21 ? -1 : 1;
      body.climbT = 0;
    }
    var top = climbRoof.y - climbRoof.chimneyHeight;
    body.x = capX(climbRoof) + 21;
    body.y = Math.max(top, body.y - 180 * dt);
    body.vx = body.vy = 0;
    body.ground = false; body.climbing = true; body.climbT += dt;
    jumpQueued = airBuffer = coyote = 0;
    if (body.y <= top) {
      body.ground = true; body.climbing = false; airJumps = 1;
      stood = PLATFORMS.indexOf(climbRoof);
      if (eaves && stood === 0) tutorialReachedTop = true;
      if (climbRoof.permanent || (!escapeMode && climbRoof.role === 'main')) cp = stood;
      climbRoof = null;
    }
    return true;
  }

  function resolveChimneyWalls(prevX, prevY) {
    PLATFORMS.forEach(function (roof) {
      if (roof.destroyed || !roof.cap) return;
      var x = capX(roof), top = roof.y - roof.chimneyHeight;
      if (prevY <= top + 1 || body.y <= top + 1 || body.y - 48 >= roof.y) return;
      if (body.x + 13 <= x || body.x - 13 >= x + 42) return;
      if (prevX <= x + 21) body.x = x - 14;
      else body.x = x + 56;
      body.vx = 0;
    });
  }

  function searchlightState(light) {
    var t = (played + light.phase) % (SEARCH_SWEEP + SEARCH_BREAK);
    return { active: t < SEARCH_SWEEP, remaining: t < SEARCH_SWEEP ? SEARCH_SWEEP - t : SEARCH_SWEEP + SEARCH_BREAK - t,
      slope: Math.sin(t / SEARCH_SWEEP * Math.PI * 2) * 0.65 };
  }

  // Cache painted frame bounds once so transparent atlas margins do not count as Trent.
  function spriteBounds(image, columns, rows) {
    var canvas = document.createElement('canvas');
    var width = image.naturalWidth / columns, height = image.naturalHeight / rows;
    canvas.width = width; canvas.height = height;
    var painter = canvas.getContext('2d', { willReadFrequently: true });
    var frames = [];
    for (var frame = 0; frame < columns * rows; frame++) {
      painter.clearRect(0, 0, width, height);
      painter.drawImage(image, frame % columns * width, Math.floor(frame / columns) * height, width, height, 0, 0, width, height);
      var pixels = painter.getImageData(0, 0, width, height).data;
      var left = width, right = 0, top = height, bottom = 0;
      for (var y = 0; y < height; y++) for (var x = 0; x < width; x++) {
        if (pixels[(y * width + x) * 4 + 3] <= 64) continue;
        left = Math.min(left, x); right = Math.max(right, x + 1);
        top = Math.min(top, y); bottom = Math.max(bottom, y + 1);
      }
      frames.push({ left: left, right: right, top: top, bottom: bottom });
    }
    return frames;
  }

  function trentSearchlightBounds() {
    var scale, bounds, left, right, top, bottom;
    if (body.climbing && imageReady(climbImg)) {
      var frame = reduceMotion() ? 0 : Math.floor(body.climbT * 8) % 4;
      var width = climbImg.naturalWidth / 2, height = climbImg.naturalHeight / 2;
      scale = 132 / height; bounds = climbVisibleBounds[frame];
      if (bounds) {
        left = (bounds.left - width / 2) * scale; right = (bounds.right - width / 2) * scale;
        top = (bounds.top - height) * scale; bottom = (bounds.bottom - height) * scale;
      }
    } else {
      scale = 132 / TRENT.h; bounds = trentVisibleBounds[trentFrame()];
      if (bounds) {
        left = (bounds.left - TRENT.ax) * scale; right = (bounds.right - TRENT.ax) * scale;
        if (body.face < 0) { var oldLeft = left; left = -right; right = -oldLeft; }
        top = (bounds.top - TRENT.ay) * scale; bottom = (bounds.bottom - TRENT.ay) * scale;
      }
    }
    if (!bounds) return { left: body.x - 34, right: body.x + 34, top: body.y - 132, bottom: body.y };
    return { left: body.x + left, right: body.x + right, top: body.y + top, bottom: body.y + bottom };
  }

  function searchlightPolygon(light, beam) {
    var distance = light.y - light.top, tip = light.x + beam.slope * distance;
    return [{ x: light.x - 5, y: light.y }, { x: tip - distance * .075, y: light.top },
      { x: tip + distance * .075, y: light.top }, { x: light.x + 5, y: light.y }];
  }

  function polygonsTouch(a, b) {
    var shapes = [a, b];
    for (var shape = 0; shape < shapes.length; shape++) {
      var polygon = shapes[shape];
      for (var edge = 0; edge < polygon.length; edge++) {
        var next = polygon[(edge + 1) % polygon.length];
        var nx = next.y - polygon[edge].y, ny = polygon[edge].x - next.x;
        var minA = Infinity, maxA = -Infinity, minB = Infinity, maxB = -Infinity;
        a.forEach(function (point) { var dot = point.x * nx + point.y * ny; minA = Math.min(minA, dot); maxA = Math.max(maxA, dot); });
        b.forEach(function (point) { var dot = point.x * nx + point.y * ny; minB = Math.min(minB, dot); maxB = Math.max(maxB, dot); });
        if (maxA < minB || maxB < minA) return false;
      }
    }
    return true;
  }

  function inSearchlight(light) {
    var beam = searchlightState(light);
    if (!beam.active) return false;
    var bounds = trentSearchlightBounds();
    return polygonsTouch(searchlightPolygon(light, beam), [
      { x: bounds.left, y: bounds.top }, { x: bounds.right, y: bounds.top },
      { x: bounds.right, y: bounds.bottom }, { x: bounds.left, y: bounds.bottom }
    ]);
  }

  function startGunfire(light) {
    var cycle = Math.floor((played + light.phase) / (SEARCH_SWEEP + SEARCH_BREAK));
    if (gunfire || light.spottedCycle === cycle) return;
    light.spottedCycle = cycle;
    gunfire = { light: light, next: played, fired: 0, screen: { left: camX, right: camX + VIEW_W, top: camY, bottom: camY + VIEW_H } };
    say('Spotted! Soldiers keep firing once per second until you leave this screen. Keep moving. Bullets pass through roofs.');
  }

  function fireHostileShot(burst) {
    var side = burst.fired % 2 ? -1 : 1;
    var x = burst.light.x + side * Math.min(90, (burst.light.right - burst.light.left) * .4);
    var y = Math.max(burst.light.y, body.y + 120);
    var dx = body.x - x, dy = body.y - 24 - y;
    var length = Math.hypot(dx, dy) || 1;
    hostileShots.push({ x: x, y: y, oldX: x, oldY: y, vx: dx / length * 265, vy: dy / length * 265, age: 0 });
    shotSerial++;
  }

  function segmentHitsRect(ax, ay, bx, by, x, y, w, h) {
    var enter = 0, exit = 1;
    var axes = [[ax, bx - ax, x, x + w], [ay, by - ay, y, y + h]];
    for (var i = 0; i < axes.length; i++) {
      var line = axes[i];
      if (Math.abs(line[1]) < .00001) { if (line[0] < line[2] || line[0] > line[3]) return false; }
      else {
        var a = (line[2] - line[0]) / line[1], b = (line[3] - line[0]) / line[1];
        enter = Math.max(enter, Math.min(a, b)); exit = Math.min(exit, Math.max(a, b));
        if (enter > exit) return false;
      }
    }
    return true;
  }

  function updateGunfire(dt) {
    if (gunfire) {
      var visible = trentSearchlightBounds(), screen = gunfire.screen;
      if (visible.right < screen.left || visible.left > screen.right || visible.bottom < screen.top || visible.top > screen.bottom) gunfire = null;
      else while (played >= gunfire.next) { fireHostileShot(gunfire); gunfire.fired++; gunfire.next++; }
    }
    for (var i = hostileShots.length - 1; i >= 0; i--) {
      var shot = hostileShots[i];
      shot.oldX = shot.x; shot.oldY = shot.y;
      shot.x += shot.vx * dt; shot.y += shot.vy * dt; shot.age += dt;
      if (shot.age > 3) { hostileShots.splice(i, 1); continue; }
      if (hurt <= 0 && segmentHitsRect(shot.oldX, shot.oldY, shot.x, shot.y, body.x - 16, body.y - 51, 32, 54)) {
        drop('A bullet hit Trent. Dodge the next volley. Bullets pass through roofs.');
        return;
      }
    }
  }

  function drawHostileShots() {
    hostileShots.forEach(function (shot) {
      var speed = Math.hypot(shot.vx, shot.vy) || 1;
      var x = shot.x - camX, y = shot.y - camY;
      ctx.strokeStyle = '#ff5938'; ctx.lineWidth = 10; ctx.lineCap = 'round';
      ctx.beginPath();ctx.moveTo(x - shot.vx / speed * 35, y - shot.vy / speed * 35);ctx.lineTo(x, y);ctx.stroke();
      ctx.strokeStyle = '#fff5ac'; ctx.lineWidth = 5;
      ctx.beginPath();ctx.moveTo(x - shot.vx / speed * 23, y - shot.vy / speed * 23);ctx.lineTo(x, y);ctx.stroke();
    });
  }

  function updateBombing(dt) {
    roofBlasts.forEach(function (blast) { blast.age += dt; });
    roofBlasts = roofBlasts.filter(function (blast) { return blast.age < 1; });
    if (!fallingBomb && played >= bombNext) {
      var roof = PLATFORMS[stood];
      if (!roof || roof.destroyed || roof.permanent || Math.abs(body.y - roof.y) > 100) {
        roof = PLATFORMS.filter(function (candidate) {
          return !candidate.permanent && !candidate.destroyed &&
            Math.abs(candidate.y - body.y) < 170 &&
            candidate.x < body.x + 380 && candidate.x + candidate.w > body.x - 380;
        }).sort(function (a, b) {
          return Math.abs(a.x + a.w / 2 - body.x) - Math.abs(b.x + b.w / 2 - body.x);
        })[0];
      }
      if (roof) fallingBomb = { roof: roof, x: roof.x + roof.w / 2, y: roof.y, due: played + 2.2, startY: camY - 140 };
      bombNext = played + 5;
    }
    if (fallingBomb && played >= fallingBomb.due) {
      var target = fallingBomb;
      if (!target.roof.permanent) target.roof.destroyed = true;
      roofBlasts.push({ x: target.x, y: target.y, age: 0 });
      fallingBomb = null;
      if (!reduceMotion()) shake = 9;
    }
  }

  function drawBombing() {
    if (!escapeMode) return;
    if (fallingBomb) {
      var target = fallingBomb, x = target.x - camX, y = target.y - camY;
      var left = Math.max(0, target.due - played), progress = 1 - left / 2.2;
      ctx.strokeStyle = '#ff4c35';ctx.lineWidth = 4;ctx.beginPath();ctx.ellipse(x, y - 5, 77, 15, 0, 0, Math.PI * 2);ctx.stroke();
      ctx.fillStyle = '#ffe0ab';ctx.font = 'bold 18px system-ui';ctx.textAlign = 'center';ctx.fillText('BOMB ' + left.toFixed(1) + 's', x, y - 35);
      var by = target.startY + (target.y - target.startY) * progress;
      if (imageReady(bombImg)) ctx.drawImage(bombImg, x - 22, by - camY - 50, 44, 64);
    }
    roofBlasts.forEach(function (blast) {
      var x = blast.x - camX, y = blast.y - camY, radius = 35 + blast.age * 150;
      var fire = ctx.createRadialGradient(x, y - 20, 2, x, y - 20, radius);
      fire.addColorStop(0, 'rgba(255,245,176,' + (1 - blast.age) + ')');fire.addColorStop(.35, 'rgba(255,112,35,' + (1 - blast.age) + ')');fire.addColorStop(1, 'rgba(60,40,45,0)');
      ctx.fillStyle = fire;ctx.beginPath();ctx.arc(x, y - 20, radius, 0, Math.PI * 2);ctx.fill();
      if (imageReady(roofImg)) for (var i = 0; i < 6; i++) {
        var px = x + (i - 2.5) * blast.age * 95, py = y - Math.sin(i + 1) * blast.age * 120 + blast.age * blast.age * 190;
        ctx.drawImage(roofImg, i * roofImg.naturalWidth / 6, 0, roofImg.naturalWidth / 6, roofImg.naturalHeight / 2, px, py, 32, 18);
      }
    });
  }

  function drawSearchlights() {
    SEARCHLIGHTS.forEach(function (light) {
      if (light.right < camX - 300 || light.left > camX + VIEW_W + 300) return;
      var beam = searchlightState(light), x = light.x - camX, y = light.y - camY;
      if (beam.active) {
        var distance = light.y - light.top, tip = x + beam.slope * distance;
        var glow = ctx.createLinearGradient(x, y, tip, light.top - camY);
        glow.addColorStop(0, 'rgba(255,244,176,.64)'); glow.addColorStop(1, 'rgba(255,244,176,.06)');
        ctx.fillStyle = glow;
        var polygon = searchlightPolygon(light, beam);
        ctx.beginPath();
        polygon.forEach(function (point, index) {
          if (index === 0) ctx.moveTo(point.x - camX, point.y - camY);
          else ctx.lineTo(point.x - camX, point.y - camY);
        });
        ctx.closePath();ctx.fill();
      }
      if (imageReady(projectorImg)) ctx.drawImage(projectorImg, x - 36, y - 20, 72, 72);

    });
  }

  function drawSearchlightCues() {
    SEARCHLIGHTS.forEach(function (light) {
      var beam = searchlightState(light);
      if (Math.abs(body.x - light.x) < 430) {
        var x = light.x - camX;
        ctx.fillStyle = '#102635e8';ctx.fillRect(x - 95, light.labelY - camY - 22, 190, 30);
        ctx.fillStyle = beam.active ? '#ffe09a' : '#aef6b4';ctx.font = 'bold 15px system-ui';ctx.textAlign = 'center';
        ctx.fillText((beam.active ? 'Searchlight · ' : 'Clear · ') + beam.remaining.toFixed(1) + 's', x, light.labelY - camY - 2);
      }
    });
  }

  function update(dt) {
    var dir = 0;
    var box;
    var n;
    var roof;
    var prevY;
    var best;
    var ball;
    var ice;
    var bob;
    var puff;
    var puffs;
    var si;
    var onIce = body.ground && ICE_PATCHES.some(function (ice) {
      return Math.abs(body.y - ice.y) < 2 && body.x >= ice.x && body.x <= ice.x + ice.w;
    });
    var inGust = WIND_ZONES.some(inWind);
    if (held.left) dir -= 1;
    if (held.right) dir += 1;
    if (!stepClimb(dt)) {
      if (dir < 0) body.face = -1;
      if (dir > 0) body.face = 1;
      if (dir) body.vx += dir * (onIce ? 620 : 1600) * dt;
      else body.vx *= Math.max(0, 1 - (onIce ? 1.7 : 10) * dt);
      if (inGust) body.vx -= 4600 * dt;
      body.vx = clamp(body.vx, inGust ? -RUN - 85 : -RUN, RUN);
      if (jumpQueued > 0) jumpQueued -= dt;
      if (body.ground) {
        coyote = 0.11 + jumpBonus;
        airJumps = 1;
        airBuffer = 0;
      } else {
        coyote -= dt;
        if (airBuffer > 0) airBuffer -= dt;
      }
      if (jumpQueued > 0 && coyote > 0) {
        body.vy = JUMP;
        body.ground = false;
        coyote = 0;
        jumpQueued = 0;
        airBuffer = 0;
      } else if (!body.ground && airJumps > 0 && airBuffer > 0 && body.vy > -70) {
        body.vy = HOP;
        airJumps = 0;
        airBuffer = 0;
      }
      body.vy += GRAV * dt;
      if (body.vy > 820) body.vy = 820;
      box = crateBox();
      if (onCrate) body.x += box.x - cratePrev;
      cratePrev = box.x;
      var prevX = body.x;
      body.x += body.vx * dt;
      prevY = body.y;
      body.y += body.vy * dt;
      resolveChimneyWalls(prevX, prevY);
      body.ground = false;
      onCrate = false;
      best = null;
      if (body.vy >= 0 && prevY <= box.y + 8 && body.y >= box.y && body.x >= box.x + 8 && body.x <= box.x + box.w - 8) {
        best = { top: box.y, id: -1 };
      }
      for (n = 0; n < PLATFORMS.length; n++) {
        roof = PLATFORMS[n];
        if (roof.destroyed) continue;
        if (body.vy < 0) break;
        if (roof.cap) {
          var cap = capX(roof);
          var capTop = roof.y - roof.chimneyHeight;
          if (prevY <= capTop + 6 && body.y >= capTop && body.x >= cap - 4 && body.x <= cap + 46 &&
              (!best || capTop < best.top)) best = { top: capTop, id: n };
        }
        if (prevY > roof.y + 8) continue;
        if (body.y < roof.y) continue;
        var edgeInset = roof.section || roof.permanentRoute ? 0 : 10;
        if (body.x < roof.x + edgeInset || body.x > roof.x + roof.w - edgeInset) continue;
        if (!best || roof.y < best.top) best = { top: roof.y, id: n };
      }
      for (var obstacleIndex = 0; obstacleIndex < ROOF_BLOCKS.length; obstacleIndex++) {
        var obstacle = ROOF_BLOCKS[obstacleIndex];
        if (PLATFORMS[obstacle.roof].destroyed) continue;
        if (body.x < obstacle.x - 11 || body.x > obstacle.x + obstacle.w + 11 || body.y - 30 > obstacle.bottom) continue;
        if (body.vy >= 0 && prevY <= obstacle.y + 5 && body.y >= obstacle.y &&
            body.x >= obstacle.x && body.x <= obstacle.x + obstacle.w && (!best || obstacle.y < best.top)) {
          best = { top: obstacle.y, id: obstacle.roof };
        } else if (prevY > obstacle.y && body.y > obstacle.y && body.y <= obstacle.bottom + 6) {
          if (prevX <= obstacle.x - 10) body.x = obstacle.x - 11;
          else if (prevX >= obstacle.x + obstacle.w + 10) body.x = obstacle.x + obstacle.w + 11;
        }
      }
      if (best) {
        body.y = best.top;
        body.vy = 0;
        body.ground = true;
        if (best.id < 0) onCrate = true;
        else {
          stood = best.id;
          if (PLATFORMS[best.id].permanent || (!escapeMode && PLATFORMS[best.id].role === 'main')) cp = best.id;
        }
      }
      if (!onCrate && body.x > box.x - 16 && body.x < box.x + box.w + 16 && body.y > box.y + 18 && body.y - 48 < box.y + box.h) {
        if (body.x < box.x + box.w / 2) body.x = box.x - 18;
        else body.x = box.x + box.w + 18;
        body.vx = body.x < box.x ? Math.min(body.vx, 0) : Math.max(body.vx, 0);
      }
    }
    if (eaves && !tutorialPassed && tutorialReachedTop) {
      var tutorialTop = PLATFORMS[0].y - PLATFORMS[0].chimneyHeight;
      if (body.ground && stood === 1 && Math.abs(body.y - PLATFORMS[1].y) < 1) {
        tutorialPassed = true; tutorialAttempt = false; tutorialDoubleJumpHint = false;
      } else {
        if (body.x > capX(PLATFORMS[0]) + 46) tutorialAttempt = true;
        if (tutorialAttempt && body.y > tutorialTop + 60) {
          drop('Try a double jump: tap Jump again near the top of your first jump.');
          return;
        }
      }
    }
    if (Math.abs(body.vx) > 30 && body.ground) body.runT += dt;
    if (hurt > 0) hurt -= dt;
    else {
      ball = snowball();
      if (body.y > ball.roofY - 40 && body.y < ball.roofY + 24 && Math.abs(body.x - ball.x) < ball.r + 12) {
        drop('The snowball knocked you off.');
      } else {
        ice = firstIcicle();
        if (ice.mode === 'fall' && overlapsBody(ice.x - 16, ice.hang, 32, ice.tip - ice.hang)) {
          drop('The icicle knocked you off.');
        } else {
          ice = secondIcicle();
          if (ice.mode === 'fall' && overlapsBody(ice.x - 16, ice.hang, 32, ice.tip - ice.hang)) {
            drop('The icicle knocked you off.');
          } else {
            bob = lanternBob();
            if (!eaves && hitsBob(bob)) drop('The lantern knocked you off.');
            else {
              puffs = smokeList();
              for (si = 0; si < puffs.length; si++) {
                puff = puffs[si];
                if (!puff.danger) continue;
                if (overlapsBody(puff.x - 34, puff.y - 18 - puff.h, 68, puff.h)) {
                  drop('The smoke knocked you off.');
                  break;
                }
              }
            }
          }
        }
      }
    }
    if (state === 'play') {
      var spottingLight = SEARCHLIGHTS.find(inSearchlight);
      if (spottingLight) startGunfire(spottingLight);
      updateGunfire(dt);
    }
    if (escapeMode && state === 'play') {
      if (body.ground) PLATFORMS.forEach(function (roof, index) { if (roof.permanent && Math.abs(body.y - roof.y) < 1 && body.x >= roof.x + 10 && body.x <= roof.x + roof.w - 10) cp = index; });
      updateBombing(dt);
    }
    if (state === 'play' && (body.y > WORLD_BOTTOM - 120 || body.x < -40 || body.x > WORLD_W + 40)) drop();
    if (state !== 'play') return;
    objectives.forEach(function (item) {
      var pickupWidth = eaves ? 64 : 28;
      if (item.taken || Math.abs(item.x - body.x) > pickupWidth || Math.abs(item.y - body.y) > 40) return;
      item.taken = true;
      say(eaves ? 'Lantern recovered.' : 'Route marker collected.');

    });
    checkBoarding();
  }

  function firstIcicle() {
    if (eaves) return icicleAt(1470, PLATFORMS[4].y, 0);
    var roof = hazardRoof('ice1'); if (roof.destroyed) return {x:-1000,hang:-1000,tip:-1000,roofY:-1000,mode:'down'}; return icicleAt(roof.x + roof.w * .45, roof.y, 0);
  }

  function secondIcicle() {
    if (eaves) return icicleAt(2300, PLATFORMS[6].y, 1.3);
    var roof = hazardRoof('ice2'); if (roof.destroyed) return {x:-1000,hang:-1000,tip:-1000,roofY:-1000,mode:'down'}; return icicleAt(roof.x + roof.w * .55, roof.y, 1.3);
  }

  function trentFrame() {
    if (!body.ground) return body.vy < 0 ? 6 : 7;
    if (Math.abs(body.vx) > 30) {
      if (reduceMotion()) return 2;
      return 2 + (Math.floor(body.runT * 1000 / 90) % 4);
    }
    if (reduceMotion()) return 0;
    return Math.floor(visualTime * 1000 / 520) % 2;
  }

  function followCamera(dt) {
    var look = body.face * 56;
    var tx = clamp(body.x - 310 + look, 0, WORLD_W - VIEW_W);
    var ty = clamp(body.y - 230, WORLD_TOP, WORLD_BOTTOM - VIEW_H);
    var k;
    if (camSnap || reduceMotion()) {
      camX = tx;
      camY = ty;
      camSnap = false;
      return;
    }
    k = Math.min(1, dt * 5.5);
    camX += (tx - camX) * k;
    camY += (ty - camY) * k;
  }

  function drawSky() {
    var g = ctx.createLinearGradient(0, 0, 0, VIEW_H);
    g.addColorStop(0, '#07111c');
    g.addColorStop(0.55, '#16324e');
    g.addColorStop(1, '#0e1c2e');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }

  function drawPanorama() {
    var iw;
    var ih;
    var scale;
    var dw;
    var dh;
    var extra;
    var u;
    var v;
    var span;
    if (!imageReady(panoramaImg)) return;
    iw = panoramaImg.naturalWidth;
    ih = panoramaImg.naturalHeight;
    scale = Math.max(VIEW_W / iw, (VIEW_H * 1.85) / ih);
    dw = iw * scale;
    dh = ih * scale;
    extra = Math.max(0, dw - VIEW_W);
    u = camX / Math.max(1, WORLD_W - VIEW_W);
    span = Math.max(1, (WORLD_BOTTOM - WORLD_TOP) - VIEW_H);
    v = (camY - WORLD_TOP) / span;
    ctx.drawImage(panoramaImg, -u * extra * 0.35, -v * (dh - VIEW_H) * 0.9, dw, dh);
  }

  function drawRoofs() {
    var n;
    var roof;
    var dh;
    if (!imageReady(roofImg)) return;
    for (n = 0; n < PLATFORMS.length; n++) {
      roof = PLATFORMS[n];
      if (roof.destroyed || roof.x + roof.w < camX || roof.x > camX + VIEW_W || roof.y < camY - 300 || roof.y > camY + VIEW_H) continue;
      dh = Math.min(roof.drawDepth, roof.w * roofImg.naturalHeight / roofImg.naturalWidth);
      ctx.drawImage(roofImg, roof.x - camX, roof.y - camY, roof.w, dh);
      if (roof.permanentRoute) { ctx.fillStyle = '#eac976'; ctx.fillRect(roof.x - camX + 8, roof.y - camY + Math.min(16, dh * .55), roof.w - 16, Math.min(4, dh * .35)); }
    }
  }

  function capX(roof) {
    return roof.cap === 'left' ? roof.x + 16 : roof.x + roof.w - 58;
  }

  function drawCaps() {
    var n;
    var roof;
    var x;
    var y;
    for (n = 0; n < PLATFORMS.length; n++) {
      roof = PLATFORMS[n];
      if (roof.destroyed || !roof.cap) continue;
      x = capX(roof) - camX;
      y = roof.y - camY;
      var height = roof.chimneyHeight;
      var painted = paintedProp('chimney', x - 6, y - height, 54, height);
      if (!painted) {
        ctx.fillStyle = '#5c4034';
        ctx.fillRect(x, y - height + 24, 42, height - 24);
      }
      ctx.fillStyle = '#b28c5c';
      for (var rung = 18; rung <= height - 20; rung += 18) ctx.fillRect(x + 7, y - rung, 28, 4);
      if (!painted) {
        ctx.fillStyle = '#c5d0dc';
        ctx.fillRect(x - 6, y - height + 14, 54, 12);
        ctx.fillStyle = '#241c18';
        ctx.fillRect(x + 10, y - height, 22, 16);
      }
    }
  }

  function drawRoofBlocks() {
    ROOF_BLOCKS.forEach(function (obstacle) {
      if (PLATFORMS[obstacle.roof].destroyed) return;
      var x = obstacle.x - camX;
      var y = obstacle.y - camY;
      if (x > VIEW_W + 50 || x + obstacle.w < -50) return;
      if (eaves && imageReady(presentImg)) {
        var width = obstacle.h * presentImg.naturalWidth / presentImg.naturalHeight;
        ctx.drawImage(presentImg, x + (obstacle.w - width) / 2, y, width, obstacle.h);
        return;
      }
      if (paintedProp(flags ? 'dormer' : 'roof-crate', x - 2, y - 3, obstacle.w + 4, obstacle.h + 3)) return;
      ctx.fillStyle = '#614838';
      ctx.fillRect(x, y, obstacle.w, obstacle.h);
      ctx.fillStyle = '#a37c58';
      ctx.fillRect(x + 4, y + 7, obstacle.w - 8, obstacle.h - 11);
      ctx.fillStyle = '#e3edf3';
      ctx.fillRect(x - 2, y - 3, obstacle.w + 4, 8);
    });
  }

  function drawIce() {
    ICE_PATCHES.forEach(function (ice) {
      var x = ice.x - camX;
      var y = ice.y - camY;
      ctx.fillStyle = 'rgba(130, 211, 235, .8)';
      ctx.beginPath();
      ctx.ellipse(x + ice.w / 2, y + 3, ice.w / 2, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#e0fbff';
      ctx.lineWidth = 2;
      for (var line = 14; line < ice.w - 22; line += 31) {
        ctx.beginPath();
        ctx.moveTo(x + line, y + 4);
        ctx.lineTo(x + line + 18, y + 1);
        ctx.stroke();
      }
    });
  }

  function drawWind() {
    WIND_ZONES.forEach(function (zone) {
      var t = windTime(zone);
      if (t < 1.75) return;
      var blowing = t >= 2.55;
      var x = zone.x - camX;
      var y = zone.y - camY;
      ctx.strokeStyle = blowing ? 'rgba(219, 244, 255, .86)' : 'rgba(219, 244, 255, .48)';
      ctx.lineWidth = blowing ? 3 : 2;
      for (var streak = 0; streak < 9; streak++) {
        var shift = reduceMotion() ? 0 : visualTime * (blowing ? 200 : 65);
        var offset = zone.w - 45 - ((shift + streak * 57) % (zone.w - 45));
        var height = 12 + (streak * 23) % 105;
        ctx.beginPath();
        ctx.moveTo(x + 42 + offset, y - height);
        ctx.quadraticCurveTo(x + 16 + offset, y - height - 6, x + offset, y - height);
        ctx.stroke();
      }
    });
  }

  function drawCrate() {
    var box = crateBox();
    if (!imageReady(crateImg)) return;
    ctx.drawImage(crateImg, box.x - camX, box.y - camY, box.w, box.h);
  }

  function drawSnowball() {
    var ball = snowball();
    var x = ball.x - camX;
    var y = ball.y - camY;
    ctx.fillStyle = 'rgba(18, 28, 42, 0.35)';
    ctx.beginPath();
    ctx.ellipse(x, ball.roofY - camY + 2, ball.r * 0.85, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    if (paintedProp('snowball', x - ball.r, y - ball.r, ball.r * 2, ball.r * 2)) return;
    ctx.fillStyle = '#f4f7fb';
    ctx.beginPath();
    ctx.arc(x, y, ball.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#d5e2ef';
    ctx.beginPath();
    ctx.arc(x - 6, y - 6, ball.r * 0.45, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawIcicle(ice) {
    var x = ice.x - camX + (ice.shake && !reduceMotion() ? Math.sin(visualTime * 46) * 3 : 0);
    var hang = ice.hang - camY;
    var tip = ice.tip - camY;
    if (ice.mode === 'hang' || ice.mode === 'warn') {
      ctx.fillStyle = 'rgba(210, 224, 234, 0.45)';
      ctx.beginPath();
      ctx.ellipse(ice.x - camX, ice.roofY - camY + 2, 18, 4, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    if (paintedProp('icicle', x - 13, hang, 26, tip - hang)) return;
    ctx.fillStyle = ice.mode === 'warn' ? '#d7ecf6' : '#e7f3f8';
    ctx.beginPath();
    ctx.moveTo(x - 12, hang);
    ctx.lineTo(x + 12, hang);
    ctx.lineTo(x, tip);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(90, 120, 140, 0.7)';
    ctx.stroke();
  }

  function drawLantern() {
    var bob = lanternBob();
    ctx.strokeStyle = '#cbb48a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(bob.px - camX, bob.py - camY);
    ctx.lineTo(bob.x - camX, bob.y - camY);
    ctx.stroke();
    if (paintedProp('lantern', bob.x - camX - 15, bob.y - camY - 17, 30, 39)) return;
    ctx.fillStyle = '#f0d7a8';
    ctx.beginPath();
    ctx.arc(bob.x - camX, bob.y - camY, bob.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#8a6230';
    ctx.fillRect(bob.x - camX - 7, bob.y - camY - 4, 14, 10);
  }

  function drawPuffs() {
    var list = smokeList();
    var i;
    var p;
    var x;
    var y;
    for (i = 0; i < list.length; i++) {
      p = list[i];
      x = p.x - camX;
      y = p.y - camY;
      if (!paintedProp('chimney', x - 20, y - 36, 40, 36)) {
        ctx.fillStyle = '#6a5348';
        ctx.fillRect(x - 16, y - 28, 32, 28);
        ctx.fillStyle = '#d5dde6';
        ctx.fillRect(x - 20, y - 34, 40, 8);
      }
      if (p.h < 8) continue;
      ctx.globalAlpha = p.danger ? .86 : .54;
      var paintedSmoke = paintedProp('smoke', x - 35, y - 36 - p.h, 70, p.h + 15);
      ctx.globalAlpha = 1;
      if (paintedSmoke) continue;
      ctx.fillStyle = p.danger ? 'rgba(206, 214, 222, 0.72)' : 'rgba(206, 214, 222, 0.4)';
      ctx.beginPath();
      ctx.ellipse(x, y - 36 - p.h * 0.45, p.danger ? 30 : 14, Math.max(12, p.h * 0.45), 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawOpeningLesson() {
    if (!eaves || tutorialPassed || body.x > PLATFORMS[1].x + 60) return;
    if (tutorialReachedTop && !tutorialDoubleJumpHint) return;
    var x = capX(PLATFORMS[0]) + 21 - camX;
    var cardX = clamp(x + 205, 180, VIEW_W - 170), cardY = 105;
    ctx.fillStyle = '#102635f2';ctx.fillRect(cardX - 150, cardY, 300, 62);
    ctx.fillStyle = '#fff1d4';ctx.font = 'bold 19px system-ui';ctx.textAlign = 'center';
    ctx.fillText(tutorialDoubleJumpHint ? 'Try a double jump' : 'Climb this chimney', cardX, cardY + 24);
    ctx.font = 'bold 15px system-ui';
    ctx.fillText(tutorialDoubleJumpHint ? 'Tap Jump again near the top' : 'Hold the left-side ▲ button', cardX, cardY + 48);
    if (!tutorialReachedTop) {
      var y = clamp(PLATFORMS[0].y - 100 - camY, 178, VIEW_H - 90);
      ctx.strokeStyle = '#ff3030';ctx.fillStyle = '#ff3030';ctx.lineWidth = 5;
      ctx.beginPath();ctx.moveTo(x + 72, y);ctx.lineTo(x + 13, y);ctx.stroke();
      ctx.beginPath();ctx.moveTo(x + 6, y);ctx.lineTo(x + 31, y - 15);ctx.lineTo(x + 31, y + 15);ctx.closePath();ctx.fill();
    }
  }

  function drawLedgeCues() {
    var above = null;
    var below = null;
    PLATFORMS.forEach(function (roof) {
      if (roof.destroyed) return;
      var dx = Math.max(roof.x - body.x, body.x - (roof.x + roof.w), 0);
      if (dx > 235) return;
      var screenY = roof.y - camY;
      if (screenY < 22 && (!above || roof.y > above.y)) above = roof;
      if (screenY > VIEW_H - 25 && (!below || roof.y < below.y)) below = roof;
    });
    cue(above, 40, -1);
    cue(below, VIEW_H - 40, 1);

    function cue(roof, y, dir) {
      if (!roof) return;
      var x = clamp(roof.x + roof.w / 2 - camX, 120, VIEW_W - 120);
      ctx.fillStyle = '#102b3c';
      ctx.beginPath();
      ctx.arc(x, y, 30, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ff3030';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(x, y - dir * 16);
      ctx.lineTo(x, y + dir * 14);
      ctx.moveTo(x - 12, y + dir * 2);
      ctx.lineTo(x, y + dir * 14);
      ctx.lineTo(x + 12, y + dir * 2);
      ctx.stroke();
    }
  }

  function drawLanternGuide() {
    if (state !== 'play' || !eaves || objectives[0].taken) return;
    var lantern = objectives[0];
    var targetX = lantern.x - camX;
    var targetY = lantern.y - camY - 32;
    var x = VIEW_W / 2;
    var y = VIEW_H / 2;
    var angle = Math.atan2(targetY - y, targetX - x);

    ctx.save();
    ctx.setTransform(dpr * view.s, 0, 0, dpr * view.s, dpr * view.ox, dpr * view.oy);
    ctx.fillStyle = '#102b3cf2';
    ctx.fillRect(x - 57, y - 23, 114, 64);
    ctx.fillStyle = '#ffdb54';
    ctx.font = 'bold 16px system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('LANTERN', x, y + 27);
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(-17, -4);
    ctx.lineTo(2, -4);
    ctx.lineTo(2, -12);
    ctx.lineTo(19, 0);
    ctx.lineTo(2, 12);
    ctx.lineTo(2, 4);
    ctx.lineTo(-17, 4);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawSleigh() {
    var w = SLEIGH_W;
    var h;
    var roof = PLATFORMS[GOAL];
    if (!imageReady(sleighImg)) return;
    h = w * sleighImg.naturalHeight / sleighImg.naturalWidth;
    ctx.drawImage(sleighImg, SLEIGH_X - camX, roof.y - camY - h + 10, w, h);
  }

  function drawTrent() {
    var frame;
    var destH = 132;
    var s;
    if (body.climbing && imageReady(climbImg)) {
      var climbFrame = reduceMotion() ? 0 : Math.floor(body.climbT * 8) % 4;
      var cw = climbImg.naturalWidth / 2, ch = climbImg.naturalHeight / 2;
      var width = destH * cw / ch;
      ctx.drawImage(climbImg, climbFrame % 2 * cw, Math.floor(climbFrame / 2) * ch, cw, ch,
        body.x - camX - width / 2, body.y - camY - destH, width, destH);
      return;
    }
    if (!imageReady(trentImg)) return;
    frame = trentFrame();
    s = destH / TRENT.h;
    ctx.save();
    ctx.translate(body.x - camX, body.y - camY);
    if (body.face < 0) ctx.scale(-1, 1);
    ctx.drawImage(
      trentImg,
      frame * TRENT.w, 0, TRENT.w, TRENT.h,
      -TRENT.ax * s,
      -TRENT.ay * s,
      TRENT.w * s,
      destH
    );
    ctx.restore();
  }

  function drawSnow() {
    var f;
    if (reduceMotion()) return;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    for (fi = 0; fi < flakes.length; fi++) {
      f = flakes[fi];
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function render(dt) {
    if (state === 'boxing') { fight.draw(ctx, cssW, cssH, dpr); return; }
    var mag = reduceMotion() ? 0 : shake;
    followCamera(dt || 0);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssW, cssH);
    ctx.setTransform(
      dpr * view.s, 0, 0, dpr * view.s,
      dpr * (view.ox + Math.sin(visualTime * 34) * mag),
      dpr * (view.oy + (reduceMotion() ? 0 : Math.cos(visualTime * 29) * mag * 0.4))
    );
    drawSky();
    drawPanorama();
    drawSearchlights();
    drawRoofs();
    drawCaps();
    drawIce();
    drawRoofBlocks();
    drawCrate();
    drawSnowball();
    drawIcicle(firstIcicle());
    drawIcicle(secondIcicle());
    if (!eaves) drawLantern();
    drawPuffs();
    drawWind();
    drawSleigh();
    if (escapeMode && !bossBeaten) fight.drawGuard(ctx, GUARD_X - camX, PLATFORMS[GOAL].y - camY, 178);
    drawBombing();
    objectives.forEach(function (item) {
      if (item.taken) return;
      var x = item.x - camX;
      var y = item.y - camY;
      if (eaves) {
        ctx.fillStyle = 'rgba(255, 202, 110, .26)';
        ctx.beginPath();
        ctx.arc(x, y - 33, 36, 0, Math.PI * 2);
        ctx.fill();
      }
      paintedProp(flags ? 'flag' : 'lantern', x - 19, y - 58, 38, 54);
    });
    drawTrent();
    drawHostileShots();
    drawSearchlightCues();
    drawLedgeCues();
    drawSnow();
    drawOpeningLesson();
    drawLanternGuide();
    if (state === 'play' && objectiveNoticeUntil > played) {
      ctx.fillStyle = '#102b3cf2';
      ctx.fillRect(VIEW_W / 2 - 240, 64, 480, 46);
      ctx.fillStyle = '#fff1df';
      ctx.font = 'bold 20px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(objectiveNotice, VIEW_W / 2, 94);
    }
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
    var f;
    lastFrame = now;
    if (dt < 0) dt = 0;
    if (dt > 0.05) dt = 0.05;
    if (state !== 'pause' && state !== 'boarding') visualTime += dt;
    if (state === 'boxing' && !portraitWanted() && !document.hidden) { if (fight.state().mode === 'fight') played += dt; fight.update(dt); }
    if (state === 'play') {
      played += dt;
      update(dt);
      if (shake > 0) shake = Math.max(0, shake - dt * 14);
    }
    if (!reduceMotion() && state !== 'pause') {
      for (fi = 0; fi < flakes.length; fi++) {
        f = flakes[fi];
        f.y += f.v * dt;
        f.x += f.drift * dt;
        if (f.y > VIEW_H + 6) {
          f.y = -6;
          f.x = Math.random() * VIEW_W;
        }
        if (f.x < -8) f.x = VIEW_W + 4;
        if (f.x > VIEW_W + 8) f.x = -4;
      }
    }
    renderHud();
    render(dt);
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

  function bindHold(button, key) {
    var pointer = 0;
    button.addEventListener('pointerdown', function (event) {
      if (event.button !== 0) return;
      event.preventDefault();
      held[key] = true;
      pointer = event.pointerId;
      button.classList.add('held');
      hintEl.hidden = true;
      if (button.setPointerCapture) button.setPointerCapture(event.pointerId);
    });
    function release(event) {
      if (event.pointerId !== pointer) return;
      held[key] = false;
      button.classList.remove('held');
    }
    button.addEventListener('pointerup', release);
    button.addEventListener('pointercancel', release);
    button.addEventListener('contextmenu', function (event) { event.preventDefault(); });
  }

  bindHold(document.getElementById('left'), 'left');
  bindHold(document.getElementById('right'), 'right');
  bindHold(document.getElementById('climb'), 'climb');

  document.getElementById('jump').addEventListener('pointerdown', function (event) {
    if (event.button !== 0) return;
    event.preventDefault();
    requestJump();
    hintEl.hidden = true;
    if (event.currentTarget.setPointerCapture) event.currentTarget.setPointerCapture(event.pointerId);
    event.currentTarget.classList.add('held');
  });
  document.getElementById('jump').addEventListener('pointerup', function (event) {
    event.currentTarget.classList.remove('held');
  });
  document.getElementById('jump').addEventListener('pointercancel', function (event) {
    event.currentTarget.classList.remove('held');
  });

  window.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') {
      event.preventDefault();
      if (state === 'play') openPause();
      else if (state === 'pause') closePause();
      return;
    }
    if (event.key === 'ArrowLeft') held.left = true;
    else if (event.key === 'ArrowRight') held.right = true;
    else if (event.key === 'ArrowUp') held.climb = true;
    else if (event.key === ' ') { if (!event.repeat) requestJump(); }
    else return;
    event.preventDefault();
    hintEl.hidden = true;
  });

  window.addEventListener('keyup', function (event) {
    if (event.key === 'ArrowLeft') held.left = false;
    if (event.key === 'ArrowRight') held.right = false;
    if (event.key === 'ArrowUp') held.climb = false;
  });

  window.addEventListener('blur', function () {
    held.left = false;
    held.right = false;
    held.climb = false;
  });

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) openPause();
  });
  window.addEventListener('pagehide', function () { openPause(); });

  document.getElementById('start').addEventListener('click', beginRun);
  document.getElementById('resume').addEventListener('click', closePause);
  document.getElementById('give-up').addEventListener('click', giveUp);
  document.getElementById('retry').addEventListener('click', beginRun);
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
  cratePrev = crateBox().x;
  if (finalFightOnly) beginRun();
  lastFrame = performance.now();
  requestAnimationFrame(loop);
})();
