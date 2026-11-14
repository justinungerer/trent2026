'use strict';

/* Campaign router. Continue codes live in this file. They are bookmarks, not security.
   The latest code is stored under trent-campaign-pin. Campaign resume does not read trent-quiz-cinema2.
   Chapter 6 questions stay in quiz.js. Other chapters skip the question step until a supplied
   question file has real question text and answers. This script does not invent questions. */

var PIN_KEY = 'trent-campaign-pin';
var INTRO_MS = 20000;
var campaignRoot = document.getElementById('app');
var cinema = document.getElementById('cinema');
var ending = document.getElementById('ending');
var endingVideo = document.getElementById('ending-video');
var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

var active = null;
var shelfOpen = false;
var introToken = 0;
var introRaf = 0;
var introDone = null;
var introImages = [];
var creditTimer = 0;

var CREDITS = [
  'Trent Saves Christmas',
  'Game design and production',
  'Justin Ungerer'
];

var CHAPTERS = [
  {
    id: 'prologue',
    number: 0,
    title: 'The seawall',
    kicker: 'Prologue · 6 June 1944',
    line: 'From the landing craft to the seawall.',
    event: 'prologue:complete',
    path: './prologue/',
    pin: 'NIGHT',
    nextId: 'night',
    intro: {
      pan: 'x',
      bg: 'prologue/art/beach.webp',
      layers: [
        { src: 'prologue/art/craft.webp', h: 0.3, x: 0.16, y: 0.8 },
        { src: 'prologue/art/seawall.webp', h: 0.46, x: 0.86, y: 0.78 },
        { src: 'prologue/art/trent.webp', h: 0.48, x: 0.42, y: 0.82, sheet: { fw: 539, start: 2, count: 6, ms: 125, still: 0 } }
      ]
    }
  },
  {
    id: 'night',
    number: 1,
    title: 'The Night Broadcast',
    kicker: 'Chapter 1',
    line: 'A radio in the snow. Somewhere, Santa is calling.',
    event: 'night-broadcast:complete',
    path: './night-broadcast/',
    pin: 'SKY',
    nextId: 'frost',
    intro: {
      pan: 'x',
      bg: 'night-broadcast/art/scene.webp',
      layers: [
        { src: 'night-broadcast/art/radio.webp', h: 0.28, x: 0.34, y: 0.78 },
        { src: 'night-broadcast/art/trent.webp', h: 0.58, x: 0.64, y: 0.84, sheet: { fw: 235, start: 2, count: 4, ms: 160, still: 0 } }
      ]
    }
  },
  {
    id: 'frost',
    number: 2,
    title: 'Frosted Skies',
    kicker: 'Chapter 2',
    line: 'The sleigh takes the winter sky.',
    event: 'frosted-skies:complete',
    path: './frosted-skies/',
    pin: 'RAIL',
    nextId: 'rail',
    intro: {
      pan: 'y',
      bg: 'frosted-skies/art/valley.webp',
      layers: [
        { src: 'frosted-skies/art/drone.webp', h: 0.1, x: 0.74, y: 0.34 },
        { src: 'frosted-skies/art/sleigh.webp', h: 0.16, x: 0.46, y: 0.52, bob: true }
      ]
    }
  },
  {
    id: 'rail',
    number: 3,
    title: 'White Rail',
    kicker: 'Chapter 3',
    line: 'A handcar on the white rails.',
    event: 'white-rail:complete',
    path: './white-rail/',
    pin: 'YARD',
    nextId: 'yard',
    intro: {
      pan: 'x',
      bg: 'white-rail/art/rails.webp',
      layers: [
        { src: 'white-rail/art/handcar.webp', h: 0.26, x: 0.5, y: 0.8 },
        { src: 'white-rail/art/trent.webp', h: 0.4, x: 0.5, y: 0.64, sheet: { fw: 459, start: 0, count: 6, ms: 53, still: 0 } }
      ]
    }
  },
  {
    id: 'yard',
    number: 4,
    title: 'Special Delivery',
    kicker: 'Chapter 4',
    line: 'Three dispatches are hidden in the yard.',
    event: 'special-delivery:complete',
    path: './chapter-2/',
    pin: 'SWITCH',
    nextId: 'tower',
    intro: {
      pan: 'x',
      bg: 'chapter-2/art/yard.webp',
      layers: [
        { src: 'chapter-2/art/guard.webp', h: 0.16, x: 0.68, y: 0.66 },
        { src: 'chapter-2/art/elf.webp', h: 0.14, x: 0.36, y: 0.62 }
      ]
    }
  },
  {
    id: 'tower',
    number: 5,
    title: 'The Switch Tower',
    kicker: 'Chapter 5',
    line: 'The right train has to leave.',
    event: 'switch-tower:complete',
    path: './switch-tower/',
    pin: 'DEPOT',
    nextId: 'shelf',
    intro: {
      pan: 'x',
      bg: 'switch-tower/art/scene.webp',
      layers: [
        { src: 'switch-tower/art/train.webp', h: 0.18, x: 0.58, y: 0.74 },
        { src: 'switch-tower/art/trent.webp', h: 0.52, x: 0.28, y: 0.86, sheet: { fw: 360, start: 2, count: 4, ms: 120, still: 0 } }
      ]
    }
  },
  {
    id: 'shelf',
    number: 6,
    title: 'The shelf operative',
    kicker: 'Chapter 6',
    line: 'Sprout is still inside the depot.',
    event: null,
    path: './shelf-escape/',
    pin: 'WIRE',
    nextId: 'wire',
    intro: {
      pan: 'x',
      bg: 'assets/depot.webp',
      layers: [
        { src: 'shelf-escape/art/animated/elf-walk.png', h: 0.46, x: 0.48, y: 0.84, sheet: { fw: 192, fh: 160, start: 0, count: 5, ms: 140, still: 0 } }
      ]
    }
  },
  {
    id: 'wire',
    number: 7,
    title: 'The Listening Wire',
    kicker: 'Chapter 7',
    line: 'A message, between the searchlights.',
    event: 'listening-wire:complete',
    path: './listening-wire/',
    pin: 'CAMP',
    nextId: 'camp',
    intro: {
      pan: 'x',
      bg: 'listening-wire/art/scene.webp',
      layers: [
        { src: 'listening-wire/art/lamp.webp', h: 0.36, x: 0.18, y: 0.8 },
        { src: 'listening-wire/art/trent.webp', h: 0.62, x: 0.58, y: 0.86, sheet: { fw: 278, start: 2, count: 3, ms: 180, still: 0 } }
      ]
    }
  },
  {
    id: 'camp',
    number: 8,
    title: 'The Holding Camp',
    kicker: 'Chapter 8',
    line: 'Santa is walking out.',
    event: 'holding-camp:complete',
    path: './holding-camp/',
    pin: 'BOW',
    nextId: 'wrap',
    intro: {
      pan: 'x',
      bg: 'holding-camp/art/scene.webp',
      layers: [
        { src: 'holding-camp/art/trent.webp', h: 0.5, x: 0.36, y: 0.84, sheet: { fw: 412, start: 0, count: 4, ms: 150, still: 0 } },
        { src: 'holding-camp/art/santa.webp', h: 0.38, x: 0.62, y: 0.84, sheet: { fw: 348, start: 0, count: 4, ms: 150, still: 0 } }
      ]
    }
  },
  {
    id: 'wrap',
    number: 9,
    title: 'The Wrapping Line',
    kicker: 'Chapter 9',
    line: 'The bows have to land on time.',
    event: 'wrapping-line:complete',
    path: './wrapping-line/',
    pin: 'HOME',
    nextId: 'chimney',
    intro: {
      pan: 'x',
      bg: 'wrapping-line/art/scene.webp',
      layers: [
        { src: 'wrapping-line/art/parcel.webp', h: 0.18, x: 0.62, y: 0.72 },
        { src: 'wrapping-line/art/trent.webp', h: 0.58, x: 0.4, y: 0.86, sheet: { fw: 302, start: 2, count: 3, ms: 120, still: 0 } }
      ]
    }
  },
  {
    id: 'chimney',
    number: 10,
    title: 'The Chimney Road',
    kicker: 'Chapter 10',
    line: 'The sleigh is on the last roof.',
    event: 'chimney-road:complete',
    path: './chimney-road/',
    pin: null,
    nextId: null,
    intro: {
      pan: 'x',
      bg: 'chimney-road/art/panorama.webp',
      layers: [
        { src: 'chimney-road/art/roof.webp', h: 0.14, x: 0.48, y: 0.74 },
        { src: 'chimney-road/art/sleigh.webp', h: 0.16, x: 0.8, y: 0.62 },
        { src: 'chimney-road/art/trent.webp', h: 0.42, x: 0.32, y: 0.72, sheet: { fw: 558, start: 2, count: 4, ms: 90, still: 0 } }
      ]
    }
  }
];

var PIN_TO_ID = {
  NIGHT: 'night',
  SKY: 'frost',
  RAIL: 'rail',
  YARD: 'yard',
  SWITCH: 'tower',
  DEPOT: 'shelf',
  WIRE: 'wire',
  CAMP: 'camp',
  BOW: 'wrap',
  HOME: 'chimney'
};

function byId(id) {
  var i;
  for (i = 0; i < CHAPTERS.length; i++) {
    if (CHAPTERS[i].id === id) return CHAPTERS[i];
  }
  return null;
}

function normalizePin(value) {
  return String(value || '').trim().toUpperCase().replace(/\s+/g, '');
}

function readStoredPin() {
  try {
    var value = normalizePin(localStorage.getItem(PIN_KEY) || '');
    return PIN_TO_ID[value] ? value : '';
  } catch (error) {
    return '';
  }
}

function storePin(pin) {
  try {
    localStorage.setItem(PIN_KEY, pin);
  } catch (error) {}
}

function loadImage(src) {
  var image = new Image();
  image.decoding = 'async';
  image.src = src;
  return image;
}

function releaseImages(list) {
  var i;
  for (i = 0; i < list.length; i++) list[i].src = '';
}

function stopIntro() {
  introToken += 1;
  if (introRaf) cancelAnimationFrame(introRaf);
  introRaf = 0;
  introDone = null;
  if (introImages.length) releaseImages(introImages);
  introImages = [];
  cinema.hidden = true;
}

function clearCredits() {
  if (creditTimer) clearTimeout(creditTimer);
  creditTimer = 0;
}

function closeMission() {
  var frame = document.getElementById('game');
  if (frame) frame.src = 'about:blank';
  document.getElementById('mission').hidden = true;
  document.body.classList.remove('playing');
}

function stopEndingVideo() {
  endingVideo.pause();
  endingVideo.removeAttribute('src');
  endingVideo.load();
}

function showStart() {
  var stored = readStoredPin();
  var section;
  var title;
  var lead;
  var start;
  var form;
  var label;
  var input;
  var open;
  var status;
  clearCredits();
  stopIntro();
  active = null;
  shelfOpen = false;
  closeMission();
  stopEndingVideo();
  ending.hidden = true;
  campaignRoot.hidden = false;
  campaignRoot.innerHTML = '';
  section = document.createElement('section');
  section.className = 'campaign-start';
  title = document.createElement('h1');
  title.tabIndex = -1;
  title.textContent = 'Trent Saves Christmas';
  lead = document.createElement('p');
  lead.className = 'lead';
  lead.textContent = 'Start at the beach, or type a continue code.';
  start = document.createElement('button');
  start.type = 'button';
  start.className = 'primary';
  start.id = 'campaign-start';
  start.textContent = 'Start';
  start.onclick = function () { showCredits(function () { openChapter('prologue'); }); };
  form = document.createElement('form');
  form.id = 'pin-form';
  label = document.createElement('label');
  label.htmlFor = 'pin';
  label.textContent = 'Continue code';
  input = document.createElement('input');
  input.id = 'pin';
  input.name = 'pin';
  input.type = 'text';
  input.maxLength = 12;
  input.autocomplete = 'off';
  input.autocapitalize = 'characters';
  input.spellcheck = false;
  input.enterKeyHint = 'go';
  input.value = stored;
  open = document.createElement('button');
  open.type = 'submit';
  open.className = 'primary';
  open.textContent = 'Open chapter';
  status = document.createElement('p');
  status.id = 'pin-status';
  status.setAttribute('role', 'status');
  if (stored) status.textContent = 'Saved on this phone: ' + stored;
  form.appendChild(label);
  form.appendChild(input);
  form.appendChild(open);
  form.appendChild(status);
  form.onsubmit = function (event) {
    var pin = normalizePin(input.value);
    var id = PIN_TO_ID[pin];
    event.preventDefault();
    if (!id) {
      status.textContent = 'That code is not on the list.';
      return;
    }
    openChapter(id);
  };
  section.appendChild(title);
  section.appendChild(lead);
  section.appendChild(start);
  section.appendChild(form);
  campaignRoot.appendChild(section);
  title.focus({ preventScroll: true });
}

function showCredits(done) {
  var index = 0;
  var generation = ++introToken;
  function finish() {
    if (generation !== introToken) return;
    introToken += 1;
    clearCredits();
    done();
  }
  function paint() {
    var section = document.createElement('section');
    var title = document.createElement('h1');
    var row = document.createElement('div');
    var next = document.createElement('button');
    var skip = document.createElement('button');
    campaignRoot.innerHTML = '';
    section.className = 'campaign-start credit-card';
    title.tabIndex = -1;
    title.textContent = CREDITS[index];
    row.className = 'button-row';
    next.type = 'button';
    next.className = 'primary';
    next.textContent = 'Next';
    next.onclick = advance;
    skip.type = 'button';
    skip.className = 'secondary';
    skip.textContent = 'Skip';
    skip.onclick = finish;
    row.appendChild(next);
    row.appendChild(skip);
    section.appendChild(title);
    section.appendChild(row);
    campaignRoot.appendChild(section);
    title.focus({ preventScroll: true });
  }
  function advance() {
    clearCredits();
    if (generation !== introToken) return;
    index += 1;
    if (index >= CREDITS.length) {
      finish();
      return;
    }
    paint();
    creditTimer = setTimeout(advance, 2400);
  }
  campaignRoot.hidden = false;
  paint();
  creditTimer = setTimeout(advance, 2400);
}

function fitCanvas(canvas) {
  var rect = canvas.getBoundingClientRect();
  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  var width = Math.max(1, Math.round(rect.width * dpr));
  var height = Math.max(1, Math.round(rect.height * dpr));
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
}

function drawBackground(ctx, image, spec, elapsed, reduced) {
  var cw = ctx.canvas.width;
  var ch = ctx.canvas.height;
  var scale;
  var dw;
  var dh;
  var extraX;
  var extraY;
  var p;
  if (!image || !image.complete || !image.naturalWidth) {
    ctx.fillStyle = '#1e3036';
    ctx.fillRect(0, 0, cw, ch);
    return;
  }
  scale = Math.max(cw / image.naturalWidth, ch / image.naturalHeight);
  if (!reduced) scale *= 1.12;
  dw = image.naturalWidth * scale;
  dh = image.naturalHeight * scale;
  extraX = Math.max(0, dw - cw);
  extraY = Math.max(0, dh - ch);
  p = reduced ? 0 : Math.min(1, elapsed / INTRO_MS);
  ctx.drawImage(
    image,
    spec.pan === 'y' ? -extraX * 0.5 : -extraX * p,
    spec.pan === 'y' ? -extraY * p : -extraY * 0.35,
    dw,
    dh
  );
}

function drawActor(ctx, image, actor, elapsed, reduced) {
  var sheet = actor.sheet;
  var fw;
  var fh;
  var sx = 0;
  var frame;
  var destH;
  var destW;
  var dx;
  var dy;
  if (!image || !image.complete || !image.naturalWidth) return;
  fw = image.naturalWidth;
  fh = image.naturalHeight;
  if (sheet) {
    fw = sheet.fw;
    fh = Math.min(sheet.fh || image.naturalHeight, image.naturalHeight);
    frame = reduced ? (sheet.still || 0) : sheet.start + Math.floor(elapsed / sheet.ms) % sheet.count;
    sx = frame * sheet.fw;
    if (sx + fw > image.naturalWidth) return;
  }
  destH = ctx.canvas.height * actor.h;
  destW = destH * (fw / fh);
  dx = ctx.canvas.width * actor.x - destW / 2;
  dy = ctx.canvas.height * actor.y - destH;
  if (actor.bob && !reduced) dy += Math.sin(elapsed / 380) * ctx.canvas.height * 0.015;
  ctx.drawImage(image, sx, 0, fw, fh, dx, dy, destW, destH);
}

function playIntro(chapter, done) {
  var canvas = document.getElementById('intro-canvas');
  var ctx = canvas.getContext('2d');
  var spec = chapter.intro;
  var images = [];
  var started = performance.now();
  var elapsed = 0;
  var last = started;
  var token;
  stopIntro();
  token = introToken;
  images.push(loadImage(spec.bg));
  spec.layers.forEach(function (layer) { images.push(loadImage(layer.src)); });
  introImages = images;
  document.getElementById('intro-kicker').textContent = chapter.kicker;
  document.getElementById('intro-title').textContent = chapter.title;
  document.getElementById('intro-line').textContent = chapter.line;
  cinema.hidden = false;
  campaignRoot.hidden = true;
  document.getElementById('intro-title').focus({ preventScroll: true });
  introDone = function () {
    if (introToken !== token) return;
    introToken += 1;
    if (introRaf) cancelAnimationFrame(introRaf);
    introRaf = 0;
    introDone = null;
    releaseImages(images);
    if (introImages === images) introImages = [];
    cinema.hidden = true;
    done();
  };
  function tick(now) {
    var reduced;
    var i;
    if (introToken !== token) return;
    elapsed += Math.min(80, now - last);
    last = now;
    reduced = reduceMotion.matches;
    fitCanvas(canvas);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    drawBackground(ctx, images[0], spec, elapsed, reduced);
    for (i = 0; i < spec.layers.length; i++) drawActor(ctx, images[i + 1], spec.layers[i], elapsed, reduced);
    if (elapsed >= INTRO_MS) {
      introDone();
      return;
    }
    introRaf = requestAnimationFrame(tick);
  }
  introRaf = requestAnimationFrame(tick);
}

function readSuppliedQuestions(number) {
  var bank = window.TRENT_QUIZ_PLACEHOLDERS;
  var slot = null;
  var ready = [];
  var i;
  var q;
  if (!bank || !bank.length) return null;
  for (i = 0; i < bank.length; i++) {
    if (bank[i].chapter === number) slot = bank[i];
  }
  if (!slot || !Array.isArray(slot.questions) || !slot.questions.length) return null;
  for (i = 0; i < slot.questions.length; i++) {
    q = slot.questions[i];
    if (!q || typeof q.question !== 'string' || !q.question.trim()) return null;
    if (!Array.isArray(q.answers) || !q.answers.length) return null;
    ready.push(q);
  }
  return ready;
}

function askSupplied(questions, index, done) {
  var q = questions[index];
  var section = document.createElement('section');
  var kicker = document.createElement('p');
  var title = document.createElement('h1');
  var box = document.createElement('div');
  campaignRoot.hidden = false;
  campaignRoot.innerHTML = '';
  section.className = 'campaign-start';
  kicker.className = 'eyebrow';
  kicker.textContent = 'Question ' + (index + 1) + ' of ' + questions.length;
  title.tabIndex = -1;
  title.textContent = q.question.trim();
  box.className = 'choices';
  q.answers.forEach(function (answer) {
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'choice';
    button.textContent = String(answer);
    button.onclick = function () {
      if (index + 1 < questions.length) askSupplied(questions, index + 1, done);
      else done();
    };
    box.appendChild(button);
  });
  section.appendChild(kicker);
  section.appendChild(title);
  section.appendChild(box);
  campaignRoot.appendChild(section);
  title.focus({ preventScroll: true });
}

function launchGame(chapter) {
  var frame = document.getElementById('game');
  var runId = Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
  var url = new URL(chapter.path, location.href);
  active = { chapter: chapter, runId: runId };
  url.searchParams.set('runId', runId);
  campaignRoot.hidden = true;
  cinema.hidden = true;
  ending.hidden = true;
  frame.title = chapter.title;
  document.getElementById('mission').hidden = false;
  document.body.classList.add('playing');
  frame.src = url.href;
}

function afterIntro(chapter) {
  var supplied;
  if (!chapter.number) {
    launchGame(chapter);
    return;
  }
  if (chapter.number === 6) {
    active = null;
    shelfOpen = true;
    campaignRoot.hidden = false;
    window.TrentChapter6.start();
    return;
  }
  supplied = readSuppliedQuestions(chapter.number);
  if (!supplied) {
    launchGame(chapter);
    return;
  }
  askSupplied(supplied, 0, function () { launchGame(chapter); });
}

function openChapter(id) {
  var chapter = byId(id);
  if (!chapter) {
    showStart();
    return;
  }
  clearCredits();
  active = null;
  shelfOpen = false;
  closeMission();
  stopEndingVideo();
  ending.hidden = true;
  playIntro(chapter, function () { afterIntro(chapter); });
}

function showPin(chapter) {
  var next = byId(chapter.nextId);
  var section = document.createElement('section');
  var kicker = document.createElement('p');
  var title = document.createElement('h1');
  var code = document.createElement('p');
  var copy = document.createElement('p');
  var row = document.createElement('div');
  var cont = document.createElement('button');
  var home = document.createElement('button');
  storePin(chapter.pin);
  closeMission();
  ending.hidden = true;
  cinema.hidden = true;
  campaignRoot.hidden = false;
  campaignRoot.innerHTML = '';
  section.className = 'campaign-start pin-card';
  kicker.className = 'eyebrow';
  kicker.textContent = next ? 'Continue code' : 'Chapter complete';
  title.tabIndex = -1;
  title.textContent = next ? next.title : chapter.title;
  code.className = 'pin-code';
  code.textContent = chapter.pin;
  code.setAttribute('aria-label', 'Continue code ' + chapter.pin);
  copy.className = 'lead';
  copy.textContent = 'Type ' + chapter.pin + ' on the start screen to open ' + (next ? next.title : 'the next chapter') + '.';
  row.className = 'button-row';
  cont.type = 'button';
  cont.className = 'primary';
  cont.textContent = 'Continue';
  cont.onclick = function () { openChapter(chapter.nextId); };
  home.type = 'button';
  home.className = 'secondary';
  home.textContent = 'Start screen';
  home.onclick = showStart;
  row.appendChild(cont);
  row.appendChild(home);
  section.appendChild(kicker);
  section.appendChild(title);
  section.appendChild(code);
  section.appendChild(copy);
  section.appendChild(row);
  campaignRoot.appendChild(section);
  title.focus({ preventScroll: true });
}

function showRestored() {
  endingVideo.pause();
  endingVideo.hidden = true;
  document.getElementById('ending-skip').hidden = true;
  document.getElementById('ending-gate').hidden = false;
  document.querySelector('#ending-gate h1').textContent = 'Home';
  document.getElementById('ending-copy').textContent = 'Christmas is restored.';
  document.getElementById('ending-play').hidden = true;
  document.getElementById('ending-home').hidden = false;
  document.getElementById('ending-home').focus({ preventScroll: true });
}

function showEnding() {
  closeMission();
  cinema.hidden = true;
  campaignRoot.hidden = true;
  stopEndingVideo();
  ending.hidden = false;
  endingVideo.hidden = true;
  document.getElementById('ending-skip').hidden = true;
  document.getElementById('ending-gate').hidden = false;
  document.querySelector('#ending-gate h1').textContent = 'Flight home';
  document.getElementById('ending-copy').textContent = 'The flight home, and Christmas restored.';
  document.getElementById('ending-play').hidden = false;
  document.getElementById('ending-home').hidden = true;
  document.getElementById('ending-play').focus({ preventScroll: true });
}

function playEnding() {
  var pending;
  document.getElementById('ending-gate').hidden = true;
  document.getElementById('ending-skip').hidden = false;
  endingVideo.hidden = false;
  endingVideo.muted = true;
  endingVideo.defaultMuted = true;
  endingVideo.playsInline = true;
  endingVideo.setAttribute('playsinline', '');
  endingVideo.setAttribute('webkit-playsinline', '');
  endingVideo.preload = 'auto';
  if (!endingVideo.getAttribute('src')) {
    endingVideo.src = new URL('./assets/ending.mp4', location.href).href;
  }
  try { endingVideo.currentTime = 0; } catch (error) {}
  pending = endingVideo.play();
  if (pending && pending.catch) {
    pending.catch(function () {
      endingVideo.hidden = true;
      document.getElementById('ending-skip').hidden = true;
      document.getElementById('ending-gate').hidden = false;
      document.getElementById('ending-copy').textContent = 'The ending video did not start. Tap again.';
      document.getElementById('ending-play').hidden = false;
      document.getElementById('ending-play').focus({ preventScroll: true });
    });
  }
}

function finishChapter(chapter) {
  active = null;
  if (chapter.pin) showPin(chapter);
  else showEnding();
}

window.addEventListener('message', function (event) {
  var frame = document.getElementById('game');
  var data = event.data;
  if (event.origin !== location.origin) return;
  if (!active || !frame || event.source !== frame.contentWindow) return;
  if (!data || data.type !== active.chapter.event) return;
  if (!data.runId || data.runId !== active.runId) return;
  finishChapter(active.chapter);
});

document.getElementById('intro-skip').onclick = function () {
  if (introDone) introDone();
};
document.getElementById('ending-play').onclick = playEnding;
document.getElementById('ending-skip').onclick = showRestored;
document.getElementById('ending-home').onclick = showStart;
endingVideo.addEventListener('ended', showRestored);

window.TrentCampaign = {
  onShelfWon: function () {
    var chapter;
    if (!shelfOpen) return;
    shelfOpen = false;
    chapter = byId('shelf');
    if (chapter) showPin(chapter);
  }
};

showStart();
