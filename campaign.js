'use strict';

/* Campaign router. Continue codes live in this file. They are bookmarks, not security.
   The latest code is stored under trent-campaign-pin. Campaign resume does not read trent-quiz-cinema2.
   The prologue has no quiz. Chapters 1–10 each draw 10 questions from WWII-TRIVIA-BANK.md
   in trivia.js. Chapter 6 then launches Ribbonfall with the score mapped in quiz.js. */

var PIN_KEY = 'trent-campaign-pin';
var INTRO_MS = 20000;
var campaignRoot = document.getElementById('app');
var cinema = document.getElementById('cinema');
var ending = document.getElementById('ending');
var endingVideo = document.getElementById('ending-video');
var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

var active = null;
var shelfOpen = false;
var pendingMissionUrl = '';
var resumeEndingAfterTurn = false;
var introToken = 0;
var introRaf = 0;
var introDone = null;
var introImages = [];
var cleanupIntroVideo = null;
var creditTimer = 0;

var CREDITS = [
  'Trent Saves Christmas',
  'Music by Justin Ungerer',
  'Designer',
  'Justin Ungerer',
  'Producer',
  'Justin Ungerer',
  'Developer',
  'Justin Ungerer',
  'Tester',
  'Justin Ungerer',
  'Marketing',
  'Justin Ungerer'
];

var CHAPTERS = [
  {
    id: 'prologue',
    number: 0,
    title: 'Landing at Normandy',
    kicker: 'Prologue',
    lines: [
      "June 1944. Dawn breaks over Normandy as Trent’s landing craft noses into the surf.",
      "The ramp drops. Beyond the breakers, wire and steel obstacles cut across the beach.",
      "The seawall is the only cover. Trent has to reach it before the tide pushes him back."
    ],
    event: 'prologue:complete',
    path: './prologue/',
    pin: 'BEACH',
    nextId: 'night',
    intro: {
      pan: 'x',
      bg: 'prologue/art/beach.webp',
      layers: [
        { src: 'prologue/art/craft.webp', h: 0.3, x: 0.22, toX: 0.02, y: 0.8 },
        { src: 'prologue/art/seawall.webp', h: 0.46, x: 0.98, toX: 0.78, y: 0.78 },
        { src: 'prologue/art/trent.webp', h: 0.48, x: 0.18, toX: 0.62, y: 0.82, sheet: { fw: 539, start: 2, count: 6, ms: 125, still: 0 } }
      ]
    }
  },
  {
    id: 'night',
    number: 1,
    title: 'The Night Broadcast',
    kicker: 'Chapter 1',
    line: 'Months later, near Christmas, Trent tunes a field radio in the snow. Most stations are noise. One narrow band says Hitler has captured Santa and is holding him. Hold that band until it locks.',
    lines: [
      'Months after the landing, Christmas is close and Santa is missing.',
      'Trent opens a field radio. The canteen, the weather, and a music box are the wrong stations.',
      'The field report is a narrow band. Hold the dial still until the lock fills.',
      'When it locks, Allied intel is plain: Hitler has captured Santa and is holding him.'
    ],
    story: 'Months after the landing, Christmas is close. Trent opens a field radio in the snow. Most stations are noise. One narrow band says Hitler has captured Santa and is holding him, and Trent holds that band until the lock fills.',
    event: 'night-broadcast:complete',
    path: './night-broadcast/',
    pin: 'NIGHT',
    nextId: 'frost',
    intro: {
      pan: 'x',
      bg: 'night-broadcast/art/scene.webp',
      layers: [
        { src: 'night-broadcast/art/radio.webp', h: 0.28, x: 0.22, toX: 0.4, y: 0.78 },
        { src: 'night-broadcast/art/trent.webp', h: 0.58, x: 0.78, toX: 0.58, y: 0.84, sheet: { fw: 235, start: 2, count: 4, ms: 160, still: 0 } }
      ]
    }
  },
  {
    id: 'frost',
    number: 2,
    title: 'Frosted Skies',
    kicker: 'Chapter 2',
    line: 'The Luftwaffe plans to bomb Santa’s secret workshop. Trent takes the ribbon sleigh into the winter valley, breaks the raid, and stops that attack before it reaches the roof.',
    lines: [
      'The Luftwaffe plans to bomb Santa’s secret workshop.',
      'Trent flies the ribbon sleigh over the valley. The cannons fire on their own.',
      'Scout craft and amber fire cross his path. Repair parcels keep the hull together.',
      'Stop the raid. The workshop has to still be standing when they come home.'
    ],
    story: 'The Luftwaffe plans to bomb Santa’s secret workshop. Trent flies the ribbon sleigh over the valley, past scout craft and amber fire, and this flight stops that attack before the bombs arrive.',
    event: 'frosted-skies:complete',
    path: './frosted-skies/',
    pin: 'SKY',
    nextId: 'rail',
    intro: {
      pan: 'y',
      bg: 'frosted-skies/art/valley.webp',
      layers: [
        { src: 'frosted-skies/art/drone.webp', h: 0.1, x: 0.9, toX: 0.2, y: 0.34 },
        { src: 'frosted-skies/art/sleigh.webp', h: 0.16, x: 0.2, toX: 0.62, y: 0.52, bob: true }
      ]
    }
  },
  {
    id: 'rail',
    number: 3,
    title: 'White Rail',
    kicker: 'Chapter 3',
    line: 'The enemy plans to turn Rudolph into meat. Trent pumps a handcar through the snow and shifts tracks to miss crates, gaps, and a lowered signal arm. The yard mouth is the race to stop it.',
    lines: [
      'The enemy plans to turn Rudolph into meat. The handcar is the race to the yard.',
      'Crates, gaps, and a signal arm block the straight line.',
      'The left thumb picks the track. The right thumb keeps the speed up.',
      'Reach the yard mouth before three slips, and before that order is carried out.'
    ],
    story: 'The enemy plans to turn Rudolph into meat. Trent pumps a handcar through the snow and shifts tracks to miss crates, gaps, and a lowered signal arm. The yard mouth is the only way to stop it in time.',
    event: 'white-rail:complete',
    path: './white-rail/',
    pin: 'RAIL',
    nextId: 'yard',
    intro: {
      pan: 'x',
      bg: 'white-rail/art/rails.webp',
      layers: [
        { src: 'white-rail/art/handcar.webp', h: 0.26, x: 0.2, toX: 0.72, y: 0.8 },
        { src: 'white-rail/art/trent.webp', h: 0.4, x: 0.2, toX: 0.72, y: 0.64, sheet: { fw: 459, start: 0, count: 6, ms: 53, still: 0 } }
      ]
    }
  },
  {
    id: 'yard',
    number: 4,
    title: 'Special Delivery',
    kicker: 'Chapter 4',
    line: 'The freight yard is the rest of the race to stop the enemy turning Rudolph into meat. Trent avoids the inspectors, uses a wind-up penguin when a patrol gets close, and takes the dispatches. They also say Sprout was caught spying.',
    lines: [
      'The enemy still plans to turn Rudolph into meat. Three dispatches in the freight yard can stop it.',
      'Inspectors walk fixed routes. Stay out of their sight.',
      'A wind-up penguin draws them away for a few seconds.',
      'The dispatches save Rudolph, and they say Sprout was caught spying. He has to be rescued.'
    ],
    story: 'The freight yard is the race to stop the enemy from turning Rudolph into meat. Inspectors walk fixed routes. A wind-up penguin can draw them off. Trent gathers every dispatch, then slips out through the mail hatch. The papers say Sprout was caught spying and has to be rescued.',
    event: 'special-delivery:complete',
    path: './chapter-2/',
    pin: 'YARD',
    nextId: 'tower',
    intro: {
      pan: 'x',
      bg: 'chapter-2/art/yard.webp',
      layers: [
        { src: 'chapter-2/art/guard.webp', h: 0.16, x: 0.8, toX: 0.55, y: 0.66 },
        { src: 'chapter-2/art/elf.webp', h: 0.14, x: 0.18, toX: 0.46, y: 0.62 }
      ]
    }
  },
  {
    id: 'tower',
    number: 5,
    title: 'The Switch Tower',
    kicker: 'Chapter 5',
    line: 'Sprout was caught spying and is held at the depot. A train can reach him. The destination board shows the lever order. Throw the switches to match it or the train is sent back. Three wrong routes restart the puzzle.',
    lines: [
      'Sprout was caught spying. This train is the way to the depot, and to him.',
      'The destination board shows the lever order as pictures, not a speech.',
      'Trent throws each lever left or right before the train arrives.',
      'The matching pattern lets the rescue train leave the yard.'
    ],
    story: 'Sprout was caught spying and has to be rescued from the depot. The destination board shows the lever order as pictures. Trent throws each switch to match it so the train can leave for the depot.',
    event: 'switch-tower:complete',
    path: './switch-tower/',
    pin: 'SWITCH',
    nextId: 'shelf',
    intro: {
      pan: 'x',
      bg: 'switch-tower/art/scene.webp',
      layers: [
        { src: 'switch-tower/art/train.webp', h: 0.18, x: 0.15, toX: 0.78, y: 0.74 },
        { src: 'switch-tower/art/trent.webp', h: 0.52, x: 0.28, y: 0.86, sheet: { fw: 360, start: 2, count: 4, ms: 120, still: 0 } }
      ]
    }
  },
  {
    id: 'shelf',
    number: 6,
    title: 'The shelf operative',
    kicker: 'Chapter 6',
    line: 'Sprout was caught spying and is inside the depot. The quiz builds his ribbon gun. Then Trent plays as Sprout: wrap the guards, disable the relays, and leave through the mail hatch with the way to Santa.',
    lines: [
      'Sprout was caught spying. He is trapped in the depot, and this is the rescue.',
      'The questions decide his ammunition, his reload, and his ribbon.',
      'Inside, shelves block shots. Guards can be wrapped into parcels.',
      'Disable the alarms, get Sprout out, and take the route toward Santa.'
    ],
    story: 'Sprout was caught spying and has to be rescued from the depot. The questions build his ribbon gun. Then he wraps the guards, quiets the alarms, and leaves through the mail hatch with the route toward Santa.',
    event: null,
    path: './shelf-escape/',
    pin: 'DEPOT',
    nextId: 'wire',
    intro: {
      pan: 'x',
      bg: 'assets/depot.webp',
      layers: [
        { src: 'shelf-escape/art/animated/elf-walk.png', h: 0.46, x: 0.2, toX: 0.7, y: 0.84, sheet: { fw: 192, fh: 160, start: 0, count: 5, ms: 140, still: 0 } }
      ]
    }
  },
  {
    id: 'wire',
    number: 7,
    title: 'The Listening Wire',
    kicker: 'Chapter 7',
    line: 'Sprout is free and Rudolph is with them. A short Morse pattern has to reach Santa while a searchlight sweeps the yard. Trent sends only when the light is in the safe gap. Three slips restart the message.',
    lines: [
      'Sprout is out and Rudolph is safe. The message has to reach Santa.',
      'The searchlight sweeps the yard. The safe gap is brief.',
      'Hold Send only while the lamp is in that gap.',
      'Dot, dash, dot, dot. Three slips and the pattern starts over.'
    ],
    story: 'Sprout is free and Rudolph is with Trent. A short Morse pattern has to reach Santa before the next patrol. A searchlight sweeps the yard. Trent holds Send only in the safe gap. Three slips, and the message starts over.',
    event: 'listening-wire:complete',
    path: './listening-wire/',
    pin: 'WIRE',
    nextId: 'camp',
    intro: {
      pan: 'x',
      bg: 'listening-wire/art/scene.webp',
      layers: [
        { src: 'listening-wire/art/lamp.webp', h: 0.36, x: 0.08, toX: 0.78, y: 0.8 },
        { src: 'listening-wire/art/trent.webp', h: 0.62, x: 0.58, y: 0.86, sheet: { fw: 278, start: 2, count: 3, ms: 180, still: 0 } }
      ]
    }
  },
  {
    id: 'camp',
    number: 8,
    title: 'The Holding Camp',
    kicker: 'Chapter 8',
    line: 'Santa walks the cabin shadow toward the gate, where Sprout and Rudolph are waiting. Trent has to stay near him. Falling behind or stepping into a searchlight costs a slip. Three slips restart the walk. The workshop is next.',
    lines: [
      'Santa is walking out toward Sprout and Rudolph. He will not wait in the open.',
      'Stay close. The searchlights punish a wander.',
      'A slip is a setback, not the end, until the third one.',
      'Reach the gate together. The secret workshop, and home, come next.'
    ],
    story: 'Santa walks the cabin shadow toward the gate, where Sprout and Rudolph are waiting, and he will not wait in the open. Trent stays close. A searchlight or a long gap costs a slip. Three slips restart the walk. Together they turn toward the workshop and home.',
    event: 'holding-camp:complete',
    path: './holding-camp/',
    pin: 'CAMP',
    nextId: 'wrap',
    intro: {
      pan: 'x',
      bg: 'holding-camp/art/scene.webp',
      layers: [
        { src: 'holding-camp/art/trent.webp', h: 0.5, x: 0.22, toX: 0.48, y: 0.84, sheet: { fw: 412, start: 0, count: 4, ms: 150, still: 0 } },
        { src: 'holding-camp/art/santa.webp', h: 0.38, x: 0.4, toX: 0.7, y: 0.84, sheet: { fw: 348, start: 0, count: 4, ms: 150, still: 0 } }
      ]
    }
  },
  {
    id: 'wrap',
    number: 9,
    title: 'The Wrapping Line',
    kicker: 'Chapter 9',
    line: 'Santa’s secret workshop is still standing. Parcels ride a belt while Trent, Sprout, Rudolph, and Santa ready the flight home. Trent taps on the beat to drop a bow. Early or late resets the run. Eight bows in a row clear the line.',
    lines: [
      'The workshop the Luftwaffe meant to bomb is safe. The four of them ready the flight home.',
      'The belt brings one parcel after another.',
      'A bow has to land as the parcel meets the mark.',
      'Early and late both reset the count. Eight bows in time finish the line.'
    ],
    story: 'The workshop is still standing, and Trent, Sprout, Rudolph, and Santa are inside it, ready for home. Parcels ride a belt. A bow has to land as each parcel meets the mark. Early or late resets the count. Eight bows in time clear the line.',
    event: 'wrapping-line:complete',
    path: './wrapping-line/',
    pin: 'BOW',
    nextId: 'chimney',
    intro: {
      pan: 'x',
      bg: 'wrapping-line/art/scene.webp',
      layers: [
        { src: 'wrapping-line/art/parcel.webp', h: 0.18, x: 0.15, toX: 0.82, y: 0.72 },
        { src: 'wrapping-line/art/trent.webp', h: 0.58, x: 0.4, y: 0.86, sheet: { fw: 302, start: 2, count: 3, ms: 120, still: 0 } }
      ]
    }
  },
  {
    id: 'chimney',
    number: 10,
    title: 'The Chimney Road',
    kicker: 'Chapter 10',
    line: 'Snowy roofs lead to the waiting sleigh. Trent runs and jumps the gaps, gets past a sliding crate, and reaches the chimney, with Sprout, Rudolph, and Santa bound for home. Three falls restart the road. The flight home comes after.',
    lines: [
      'The sleigh is parked on the last roof. Home is the flight after it.',
      'Trent, Sprout, Rudolph, and Santa have the workshop behind them and the sky ahead.',
      'The road is snowy rooftops and open gaps. A crate slides across one roof. Jump it.',
      'Three falls send him back. The sleigh is the way home.'
    ],
    story: 'The sleigh waits on the last roof, and Trent, Sprout, Rudolph, and Santa are nearly home. Trent runs the snowy gaps, jumps a sliding crate, and reaches the chimney. Three falls send him back. The flight home comes after the sleigh.',
    event: 'chimney-road:complete',
    path: './chimney-road/',
    pin: 'HOME',
    nextId: null,
    intro: {
      pan: 'x',
      bg: 'chimney-road/art/panorama.webp',
      layers: [
        { src: 'chimney-road/art/roof.webp', h: 0.14, x: 0.2, toX: 0.7, y: 0.74 },
        { src: 'chimney-road/art/sleigh.webp', h: 0.16, x: 0.92, y: 0.62 },
        { src: 'chimney-road/art/trent.webp', h: 0.42, x: 0.16, toX: 0.7, y: 0.72, sheet: { fw: 558, start: 2, count: 4, ms: 90, still: 0 } }
      ]
    }
  }
];

var PIN_TO_ID = {
  BEACH: 'prologue',
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
var TEST_PIN = '19820424';
var pinTimer = 0;
var pendingTest = null;

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
  if (cleanupIntroVideo) cleanupIntroVideo();
  cleanupIntroVideo = null;
  cinema.hidden = true;
  if (window.TrentMusic) window.TrentMusic.stopIntro();
}

function clearCredits() {
  if (creditTimer) clearInterval(creditTimer);
  creditTimer = 0;
}

function closeMission() {
  pendingMissionUrl = '';
  var frame = document.getElementById('game');
  if (frame) frame.src = 'about:blank';
  document.getElementById('mission').hidden = true;
  document.body.classList.remove('playing');
  syncTurn();
}

function stopEndingVideo() {
  resumeEndingAfterTurn = false;
  endingVideo.pause();
  endingVideo.removeAttribute('src');
  endingVideo.load();
}

function showTester() {
  var section = document.createElement('section');
  var title = document.createElement('h1');
  var bonusLabel = document.createElement('label');
  var bonus = document.createElement('select');
  var list = document.createElement('div');
  var videos = document.createElement('div');
  var home = document.createElement('button');
  var scores = [10, 9, 8, 7];
  var i;
  clearInterval(pinTimer);
  clearCredits();
  stopIntro();
  closeMission();
  stopEndingVideo();
  ending.hidden = true;
  campaignRoot.hidden = false;
  campaignRoot.innerHTML = '';
  section.className = 'campaign-start';
  title.tabIndex = -1;
  title.textContent = 'Test gate';
  bonusLabel.textContent = 'Bonus';
  bonusLabel.htmlFor = 'test-bonus';
  bonus.id = 'test-bonus';
  for (i = 0; i < scores.length; i++) {
    var option = document.createElement('option');
    option.value = String(scores[i]);
    option.textContent = scores[i] + ' of 10';
    bonus.appendChild(option);
  }
  list.className = 'choices';
  for (i = 0; i < CHAPTERS.length; i++) {
    (function (chapter) {
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'choice';
      button.textContent = chapter.kicker + ' · ' + chapter.title;
      button.onclick = function () {
        openChapter(chapter.id, { bonus: Number(bonus.value) });
      };
      list.appendChild(button);
    })(CHAPTERS[i]);
  }
  videos.className = 'choices';
  for (i = 0; i < CHAPTERS.length; i++) {
    (function (chapter) {
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'secondary';
      button.textContent = 'Intro · ' + chapter.title;
      button.onclick = function () {
        playIntro(chapter, showTester);
      };
      videos.appendChild(button);
    })(CHAPTERS[i]);
  }
  var endingButton = document.createElement('button');
  endingButton.type = 'button';
  endingButton.className = 'secondary';
  endingButton.textContent = 'Ending video';
  endingButton.onclick = showEnding;
  videos.appendChild(endingButton);
  home.type = 'button';
  home.className = 'primary';
  home.textContent = 'Start screen';
  home.onclick = showStart;
  section.appendChild(title);
  section.appendChild(bonusLabel);
  section.appendChild(bonus);
  section.appendChild(list);
  section.appendChild(videos);
  section.appendChild(home);
  campaignRoot.appendChild(section);
  title.focus({ preventScroll: true });
}

function showStart() {
  var stored = readStoredPin();
  if (window.TrentTrivia) window.TrentTrivia.abort();
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
  clearInterval(pinTimer);
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
  start.onclick = showLogo;
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
    event.preventDefault();
    if (pin === TEST_PIN) {
      showTester();
      return;
    }
    var id = PIN_TO_ID[pin];
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

function showLogo() {
  var section = document.createElement('section');
  var title = document.createElement('h1');
  var begin = document.createElement('button');
  if (window.TrentTrivia) window.TrentTrivia.abort();
  clearCredits();
  clearInterval(pinTimer);
  stopIntro();
  active = null;
  shelfOpen = false;
  closeMission();
  stopEndingVideo();
  ending.hidden = true;
  campaignRoot.hidden = false;
  campaignRoot.innerHTML = '';
  section.className = 'campaign-start logo-screen';
  title.className = 'logo-title';
  title.tabIndex = -1;
  title.textContent = 'Trent Saves Christmas';
  begin.type = 'button';
  begin.className = 'primary';
  begin.id = 'logo-begin';
  begin.textContent = 'Begin';
  begin.onclick = function () {
    showCredits(function () { openChapter('prologue'); });
  };
  section.appendChild(title);
  section.appendChild(begin);
  campaignRoot.appendChild(section);
  title.focus({ preventScroll: true });
}

function showCredits(done) {
  var generation = ++introToken;
  var section = document.createElement('section');
  var reel = document.createElement('div');
  var i;
  clearCredits();
  campaignRoot.hidden = false;
  campaignRoot.innerHTML = '';
  section.className = 'campaign-start credit-scroll';
  reel.className = 'credit-reel';
  for (i = 0; i < CREDITS.length; i++) {
    var line = document.createElement(i % 2 ? 'p' : 'h1');
    line.textContent = CREDITS[i];
    reel.appendChild(line);
  }
  section.appendChild(reel);
  campaignRoot.appendChild(section);
  creditTimer = schedulePortraitStep(function () {
    if (generation !== introToken) return;
    introToken += 1;
    clearCredits();
    done();
  }, 14000);
}

function wantsLandscape() {
  return !document.getElementById('mission').hidden;
}

function turnNeeded() {
  return window.TrentOrientation.blocked(wantsLandscape());
}

function schedulePortraitStep(done, duration) {
  var elapsed = 0;
  var last = performance.now();
  var timer = setInterval(function () {
    var now = performance.now();
    if (!turnNeeded() && !document.hidden) elapsed += now - last;
    last = now;
    if (elapsed >= duration) {
      clearInterval(timer);
      done();
    }
  }, 100);
  return timer;
}

function syncTurn() {
  var gate = document.getElementById('turn-gate');
  var heading = document.getElementById('turn-heading');
  var note = document.getElementById('turn-note');
  var mark = document.getElementById('turn-mark');
  var needed = turnNeeded();
  var landscape = wantsLandscape();
  var focusGate = needed && gate.hidden;
  if (gate.hidden === needed) gate.hidden = !needed;
  if (needed) {
    heading.textContent = landscape ? 'Turn your phone sideways' : 'Turn your phone upright';
    note.textContent = landscape ? 'Minigames play in landscape.' : 'The campaign continues in portrait.';
    mark.classList.toggle('upright', !landscape);
  }
  document.body.classList.toggle('waiting-for-rotation', needed);
  [document.querySelector('header'), campaignRoot, cinema, ending,
    document.getElementById('mission'), document.querySelector('.quiz-modal')].forEach(function (screen) {
    if (screen && screen.inert !== needed) screen.inert = needed;
  });
  if (focusGate) heading.focus({ preventScroll: true });

  if (needed && !endingVideo.hidden && !endingVideo.paused) {
    resumeEndingAfterTurn = true;
    endingVideo.pause();
  } else if (!needed && resumeEndingAfterTurn && !ending.hidden && !endingVideo.hidden) {
    resumeEndingAfterTurn = false;
    endingVideo.play().catch(function () {});
  }

  if (!needed && pendingMissionUrl) {
    document.getElementById('game').src = pendingMissionUrl;
    pendingMissionUrl = '';
  }
}

function openMissionFrame(url, title) {
  document.getElementById('game').title = title;
  var address = new URL(url, location.href);
  address.searchParams.set('layout', 'rotation2');
  pendingMissionUrl = address.href;
  campaignRoot.hidden = true;
  cinema.hidden = true;
  ending.hidden = true;
  document.getElementById('mission').hidden = false;
  document.body.classList.add('playing');
  syncTurn();
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
  var travel = reduced ? 0 : Math.min(1, elapsed / 20000);
  var xPos = typeof actor.toX === 'number' ? actor.x + (actor.toX - actor.x) * travel : actor.x;
  dx = ctx.canvas.width * xPos - destW / 2;
  dy = ctx.canvas.height * actor.y - destH;
  if (actor.bob && !reduced) dy += Math.sin(elapsed / 380) * ctx.canvas.height * 0.015;
  ctx.drawImage(image, sx, 0, fw, fh, dx, dy, destW, destH);
}

function updateIntroCrawl(beats, count, elapsed, reduced) {
  if (reduced) {
    beats.style.transform = '';
    return;
  }
  var beatDuration = INTRO_MS / count;
  var beat = Math.min(count - 1, Math.floor(elapsed / beatDuration));
  var transition = beat === count - 1 ? 0 :
    Math.max(0, (elapsed - (beat + 1) * beatDuration + 1250) / 1250);
  var offset = beat + transition * transition * (3 - 2 * transition);
  beats.style.transform = 'translate3d(0,' + (-100 * offset / count) + '%,0)';
}

function prepareIntroVideo(chapter, getElapsed) {
  var video = document.getElementById('intro-video');
  var showing = false;
  var requested = false;
  var failed = false;

  function displayVideo(display) {
    showing = display;
    cinema.classList.toggle('has-video', display);
  }

  function showFrame() {
    if (requested && !video.paused && !video.seeking) displayVideo(true);
  }

  function syncFrame() {
    var time = getElapsed() / 1000;
    if (requested && !video.seeking && Math.abs(video.currentTime - time) > 0.45) {
      video.currentTime = time;
    } else {
      showFrame();
    }
  }

  function updateVideo() {
    var allowed = !failed && !document.hidden && !reduceMotion.matches && !turnNeeded();
    if (requested === allowed) return showing;
    requested = allowed;
    if (!allowed) {
      video.pause();
      displayVideo(false);
    } else {
      if (!video.hasAttribute('src')) video.src = './assets/intro-video/' + chapter.id + '.mp4';
      video.play().catch(function (error) {
        if (requested && error.name !== 'AbortError') {
          failed = true;
          displayVideo(false);
        }
      });
    }
    return showing;
  }

  video.muted = true;
  video.onplaying = syncFrame;
  video.onseeked = showFrame;
  video.onwaiting = function () { displayVideo(false); };
  video.onerror = function () {
    failed = true;
    displayVideo(false);
  };
  document.addEventListener('visibilitychange', updateVideo);
  cleanupIntroVideo = function () {
    requested = false;
    document.removeEventListener('visibilitychange', updateVideo);
    video.onplaying = video.onseeked = video.onwaiting = video.onerror = null;
    video.pause();
    video.removeAttribute('src');
    video.load();
    displayVideo(false);
  };
  return updateVideo;
}

function playIntro(chapter, done) {
  var canvas = document.getElementById('intro-canvas');
  var ctx = canvas.getContext('2d');
  var spec = chapter.intro;
  var crawl = document.getElementById('intro-crawl');
  var beats = document.getElementById('intro-beats');
  var progress = document.getElementById('intro-progress');
  var images = [];
  var started = performance.now();
  var elapsed = 0;
  var last = started;
  var token;
  var updateVideo;
  stopIntro();
  token = introToken;
  images.push(loadImage(spec.bg));
  spec.layers.forEach(function (layer) { images.push(loadImage(layer.src)); });
  introImages = images;
  document.getElementById('intro-kicker').textContent = chapter.kicker;
  document.getElementById('intro-title').textContent = chapter.title;
  beats.replaceChildren();
  chapter.lines.forEach(function (line) {
    var paragraph = document.createElement('p');
    paragraph.textContent = line;
    beats.appendChild(paragraph);
  });
  beats.style.transform = '';
  progress.style.transform = 'scaleX(0)';
  crawl.tabIndex = reduceMotion.matches ? 0 : -1;
  cinema.dataset.chapter = chapter.id;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  cinema.hidden = false;
  campaignRoot.hidden = true;
  syncTurn();
  updateVideo = prepareIntroVideo(chapter, function () { return elapsed; });
  updateVideo();
  if (window.TrentMusic) window.TrentMusic.startIntro(chapter.id);
  document.getElementById('intro-title').focus({ preventScroll: true });
  introDone = function () {
    if (introToken !== token) return;
    stopIntro();
    done();
  };
  function tick(now) {
    var reduced;
    var i;
    if (introToken !== token) return;
    syncTurn();
    if (document.hidden || turnNeeded()) {
      updateVideo();
      last = now;
      introRaf = requestAnimationFrame(tick);
      return;
    }
    elapsed += Math.min(80, now - last);
    last = now;
    reduced = reduceMotion.matches;
    if (!updateVideo()) {
      fitCanvas(canvas);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      drawBackground(ctx, images[0], spec, elapsed, reduced);
      for (i = 0; i < spec.layers.length; i++) drawActor(ctx, images[i + 1], spec.layers[i], elapsed, reduced);
    }
    updateIntroCrawl(beats, chapter.lines.length, elapsed, reduced);
    progress.style.transform = 'scaleX(' + Math.min(1, elapsed / INTRO_MS) + ')';
    if (elapsed >= INTRO_MS) {
      introDone();
      return;
    }
    introRaf = requestAnimationFrame(tick);
  }
  introRaf = requestAnimationFrame(tick);
}

function launchGame(chapter, score) {
  var runId = Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
  var url = new URL(chapter.path, location.href);
  var lives;
  active = { chapter: chapter, runId: runId };
  url.searchParams.set('runId', runId);
  if (chapter.path === './wrapping-line/') {
    lives = (typeof score === 'number' && isFinite(score)) ? score : 7;
    url.searchParams.set('lives', String(lives));
  }
  openMissionFrame(url.href, chapter.title);
}

function afterIntro(chapter) {
  if (pendingTest) {
    var bonus = pendingTest.bonus;
    pendingTest = null;
    if (!chapter.number) {
      launchGame(chapter);
      return;
    }
    if (chapter.number === 6) {
      active = null;
      shelfOpen = true;
      window.TrentChapter6.startMission(bonus);
      return;
    }
    launchGame(chapter, bonus);
    return;
  }
  if (!chapter.number) {
    launchGame(chapter);
    return;
  }
  window.TrentTrivia.start(chapter, {
    story: chapter.story,
    onClear: function (correct) {
      if (chapter.number === 6) {
        active = null;
        shelfOpen = true;
        window.TrentChapter6.startMission(correct);
        return;
      }
      launchGame(chapter, correct);
    },
    onHome: showStart
  });
}

function openChapter(id, test) {
  var chapter = byId(id);
  if (!chapter) {
    showStart();
    return;
  }
  clearInterval(pinTimer);
  clearCredits();
  pendingTest = test || null;
  active = null;
  shelfOpen = false;
  closeMission();
  stopEndingVideo();
  ending.hidden = true;
  playIntro(chapter, function () { afterIntro(chapter); });
}

function showPin(chapter) {
  var section = document.createElement('section');
  var kicker = document.createElement('p');
  var title = document.createElement('h1');
  var code = document.createElement('p');
  var copy = document.createElement('p');
  var home = document.createElement('button');
  var nextId = chapter.nextId;
  storePin(chapter.pin);
  closeMission();
  ending.hidden = true;
  cinema.hidden = true;
  campaignRoot.hidden = false;
  campaignRoot.innerHTML = '';
  section.className = 'campaign-start pin-card';
  kicker.className = 'eyebrow';
  kicker.textContent = 'Remember this code';
  title.tabIndex = -1;
  title.textContent = chapter.title;
  code.className = 'pin-code';
  code.textContent = chapter.pin;
  code.setAttribute('aria-label', 'Continue code ' + chapter.pin);
  copy.className = 'lead';
  copy.textContent = 'Remember ' + chapter.pin + ' to return to ' + chapter.title + ' from the start screen.';
  home.type = 'button';
  home.className = 'secondary';
  home.textContent = 'Start screen';
  home.onclick = function () {
    clearInterval(pinTimer);
    showStart();
  };
  section.appendChild(kicker);
  section.appendChild(title);
  section.appendChild(code);
  section.appendChild(copy);
  section.appendChild(home);
  campaignRoot.appendChild(section);
  title.focus({ preventScroll: true });
  clearInterval(pinTimer);
  pinTimer = schedulePortraitStep(function () {
    if (chapter.id === 'prologue' && nextId) showCaptureCard(nextId);
    else if (nextId) openChapter(nextId);
    else showEnding();
  }, 4500);
}

function showCaptureCard(nextId) {
  var section = document.createElement('section');
  var kicker = document.createElement('p');
  var title = document.createElement('h1');
  var copy = document.createElement('p');
  clearInterval(pinTimer);
  closeMission();
  ending.hidden = true;
  cinema.hidden = true;
  campaignRoot.hidden = false;
  campaignRoot.innerHTML = '';
  section.className = 'campaign-start story-card';
  kicker.className = 'eyebrow';
  kicker.textContent = 'Months later';
  title.tabIndex = -1;
  title.textContent = 'A report comes in';
  copy.className = 'lead';
  copy.textContent = 'A few months have passed, and Allied intel says Hitler has captured Santa and is holding him.';
  section.appendChild(kicker);
  section.appendChild(title);
  section.appendChild(copy);
  campaignRoot.appendChild(section);
  title.focus({ preventScroll: true });
  pinTimer = schedulePortraitStep(function () {
    openChapter(nextId);
  }, 6500);
}

function showRestored() {
  resumeEndingAfterTurn = false;
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
  if (turnNeeded()) return;
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
window.TrentOrientation.subscribe(syncTurn);
document.getElementById('ending-play').onclick = playEnding;
document.getElementById('ending-skip').onclick = showRestored;
document.getElementById('ending-home').onclick = showStart;
endingVideo.addEventListener('ended', showRestored);

window.TrentCampaign = {
  openMissionFrame: openMissionFrame,
  onShelfWon: function () {
    var chapter;
    if (!shelfOpen) return;
    shelfOpen = false;
    chapter = byId('shelf');
    if (chapter) showPin(chapter);
  }
};

showStart();
