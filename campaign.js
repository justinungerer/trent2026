'use strict';

/* Campaign router. Continue codes live in this file. They are bookmarks, not security.
   The latest code is stored under trent-campaign-pin. Campaign resume does not read trent-quiz-cinema2.
   The prologue has no quiz. Chapters 1–10 each draw 10 questions from WWII-TRIVIA-BANK.md
   in trivia.js. Chapter 6 then launches Ribbonfall with the score mapped in quiz.js. */

var PIN_KEY = 'trent-campaign-pin';
var INTRO_MS = 30000;
var campaignRoot = document.getElementById('app');
var cinema = document.getElementById('cinema');
var ending = document.getElementById('ending');
var endingVideo = document.getElementById('ending-video');
var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

var active = null;
var shelfOpen = false;
var pendingMissionUrl = '';
var missionLandscape = false;
var resumeEndingAfterTurn = false;
var introToken = 0;
var introRaf = 0;
var introDone = null;
var introImages = [];
var cleanupIntroVideo = null;
var openingTimer = 0;
var openingVideo = null;

var CREDITS = ['Designer', 'Producer', 'Developer', 'Tester', 'Marketing', 'Music'];

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
    line: 'Months later, near Christmas, Trent tunes a field radio in the snow. Allied intel says Hitler has captured Santa and is holding him. Buddy, the elf on the shelf, was sent by the Allies to spy on the Nazis. He has been caught and has to be rescued. The same report says the Luftwaffe plans to bomb Santa’s secret workshop, and that the enemy plans to turn Rudolph into hamburgers. Hold the band until it locks.',
    lines: [
      'Months after the landing, Trent tunes a field radio in the snow. Allied intel is on a narrow band.',
      'Hitler has captured Santa and is holding him. Buddy, the elf on the shelf, was sent by the Allies to spy on the Nazis. He has been caught and has to be rescued.',
      'The Luftwaffe plans to bomb Santa’s secret workshop. The enemy plans to turn Rudolph into hamburgers.',
      'Hold the dial still until the lock fills. Trent is the Allied hero who has to stop all of it.'
    ],
    story: 'Months after the landing, Christmas is close. Trent opens a field radio in the snow and holds a narrow band until it locks. Allied intel says Hitler has captured Santa and is holding him. Buddy, the elf on the shelf, was sent by the Allies to spy on the Nazis. He has been caught and has to be rescued. The Luftwaffe plans to bomb Santa’s secret workshop. The enemy plans to turn Rudolph into hamburgers. Trent is the Allied hero who has to carry the depot, the escape, the workshop, and the flight home.',
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
    line: 'The Luftwaffe plans to bomb Santa’s secret workshop, and this flight is what stops that bombing. Trent takes the ribbon sleigh into the winter valley, breaks the raid, and turns it back before it reaches the roof.',
    lines: [
      'The Luftwaffe plans to bomb Santa’s secret workshop. This flight is what stops that bombing.',
      'Trent flies the ribbon sleigh over the valley. The cannons fire on their own.',
      'Scout craft and amber fire cross his path. Repair parcels keep the hull together.',
      'Stop the raid. The workshop has to still be standing, and the race to save Rudolph comes next.'
    ],
    story: 'The radio already named the raid. The Luftwaffe plans to bomb Santa’s secret workshop, and Frosted Skies is the flight that stops that bombing. Trent flies the ribbon sleigh over the valley, past scout craft and amber fire, and breaks the attack before it reaches the roof.',
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
    line: 'The enemy plans to turn Rudolph into meat for hamburgers. White Rail is the race to stop that. Trent pumps a handcar through the snow and shifts tracks to miss crates, gaps, and a lowered signal arm. The yard mouth is the first half of the race.',
    lines: [
      'The enemy plans to turn Rudolph into hamburgers. The handcar is the race to the yard.',
      'Crates, gaps, and a signal arm block the straight line.',
      'The left thumb picks the track. The right thumb keeps the speed up.',
      'Reach the yard mouth before three slips. Special Delivery finishes the race.'
    ],
    story: 'The enemy plans to turn Rudolph into meat for hamburgers. White Rail is the race to stop that. Trent pumps a handcar through the snow and shifts tracks to miss crates, gaps, and a lowered signal arm. The yard mouth is the way through.',
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
    line: 'The freight yard is the rest of the race to stop the enemy turning Rudolph into hamburgers. Trent avoids the inspectors, uses a wind-up penguin when a patrol gets close, and takes the dispatches. They mark the depot where Buddy, the elf on the shelf, is held.',
    lines: [
      'The race to keep Rudolph from becoming hamburgers continues in the freight yard.',
      'Inspectors walk fixed routes. Stay out of their sight.',
      'A wind-up penguin draws them away for a few seconds.',
      'The dispatches stop that order, and they point to the depot where Buddy is held.'
    ],
    story: 'Special Delivery is the rest of the race to stop the enemy from turning Rudolph into hamburgers. Inspectors walk fixed routes. A wind-up penguin can draw them off. Trent gathers every dispatch, then slips out through the mail hatch. The papers point to the depot, where Buddy, the elf on the shelf, is still held and still has to be rescued.',
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
    line: 'Buddy, the elf on the shelf, was caught spying and is held at the depot. A train can reach him. The destination board shows the lever order. Throw the switches to match it or the train is sent back. Three wrong routes restart the puzzle.',
    lines: [
      'Buddy is held at the depot. This train is the way to the elf on the shelf.',
      'The destination board shows the lever order as pictures, not a speech.',
      'Trent throws each lever left or right before the train arrives.',
      'The matching pattern lets the rescue train leave the yard.'
    ],
    story: 'Buddy, the elf on the shelf, was caught spying and is still held at the depot. The destination board shows the lever order as pictures. Trent throws each switch to match it so the train can leave and the rescue can start.',
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
    line: 'The depot is where Buddy, the elf on the shelf, is held. The quiz builds his ribbon gun. Then Trent plays as Buddy: wrap the guards, disable the relays, and leave through the mail hatch with the way to Santa.',
    lines: [
      'This is the rescue. Buddy, the elf the Allies sent to spy, is trapped in the depot.',
      'The questions decide his ammunition, his reload, and his ribbon.',
      'Inside, shelves block shots. Guards can be wrapped into parcels.',
      'Disable the alarms, get Buddy out, and take the route toward Santa.'
    ],
    story: 'Trent reaches the depot to rescue Buddy, the elf on the shelf. The questions build Buddy’s ribbon gun. Then Buddy wraps the guards, quiets the alarms, and leaves through the mail hatch with the route toward Santa.',
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
    title: 'The Corridor',
    kicker: 'Chapter 7',
    line: 'Buddy is free, and the way to Santa is a first-person cartoon corridor maze. The enemies shoot. Trent picks up health and ammunition as he fights through to the green door.',
    lines: [
      'Buddy is out. Santa is still held. The way ahead is a cartoon corridor maze.',
      'Trent moves in first person. The enemies shoot back.',
      'Health and ammunition sit in the halls. Pick them up and keep moving.',
      'Clear the maze. The green door at the end leads on toward Santa.'
    ],
    story: 'Buddy is free. Trent fights through a first-person cartoon corridor maze on the way to Santa. The enemies shoot. Health and ammunition pickups keep him moving. The green door at the end of the maze is the way through.',
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
    line: 'Santa is held in a cartoon holding camp. Trent fights the cartoon guards in a brawl and frees him. Buddy and Rudolph are waiting beyond the gate. The secret workshop is next.',
    lines: [
      'Santa is held here. This is a cartoon holding camp, and Trent has come to free him.',
      'Cartoon guards block the yard. Trent fights them in a brawl.',
      'When a guard sits in the snow, the path toward Santa opens.',
      'Free Santa and reach the gate. The secret workshop, and home, come next.'
    ],
    story: 'Santa is held in a cartoon holding camp. Trent fights the cartoon guards in a brawl and frees him. Buddy and Rudolph are waiting at the gate. Together they turn toward the workshop and the flight home.',
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
    line: 'Santa’s secret workshop is still standing after the Luftwaffe raid. Parcels ride a belt while Trent, Buddy, Rudolph, and Santa ready the flight home. Some parcels add points. Damaged ones take points away. Thirty points before the timer ends clears the line.',
    lines: [
      'The workshop the Luftwaffe meant to bomb is safe. Trent has Buddy, Rudolph, and Santa with him.',
      'The four of them ready the flight home. The belt brings one parcel after another.',
      'Whole parcels add points. A torn parcel takes points away.',
      'Thirty points before the timer ends finish the line. Order does not matter.'
    ],
    story: 'Trent has carried the rescue through the depot, the escape, and the holding camp. The workshop the Luftwaffe meant to bomb is still standing. Trent, Buddy, Rudolph, and Santa ready the flight home. Parcels ride a belt. Whole ones add points and damaged ones take points away. Thirty points before the timer ends clear the line.',
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
    line: 'Snowy roofs lead to the waiting sleigh. Trent climbs up and down the roofs, doubles back out of dead ends, and jumps the gaps, with Buddy, Rudolph, and Santa bound for home. The flight home comes after.',
    lines: [
      'The sleigh is parked above the first roofs. Home is the flight after it.',
      'Trent brings Buddy, Rudolph, and Santa from the workshop toward the sky.',
      'The road branches. Some paths climb, some drop, and some end and send him back.',
      'Jump the gaps and the moving hazards. The sleigh is the way home.'
    ],
    story: 'The sleigh waits above the last roofs. Trent, Buddy, Rudolph, and Santa are nearly home after the depot, the escape, and the workshop. Trent climbs, drops, and doubles back through the snowy paths until he reaches the chimney. The flight home comes after the sleigh.',
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
var COMPLETION_PIN = '19820424';
var pinTimer = 0;

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
    return value === COMPLETION_PIN || PIN_TO_ID[value] ? value : '';
  } catch (error) {
    return '';
  }
}

function storePin(pin) {
  try {
    var saved = readStoredPin();
    if (saved === COMPLETION_PIN) return;
    if (pin !== COMPLETION_PIN && saved && byId(PIN_TO_ID[saved]).number > byId(PIN_TO_ID[pin]).number) return;
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

function clearOpeningFilm() {
  if (openingTimer) clearInterval(openingTimer);
  openingTimer = 0;
  if (openingVideo) {
    openingVideo.pause();
    openingVideo.removeAttribute('src');
    openingVideo.load();
    openingVideo = null;
  }
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

function showChapterMenu(lastChapter, complete) {
  if (window.TrentTrivia) window.TrentTrivia.abort();
  clearInterval(pinTimer);
  clearOpeningFilm();
  stopIntro();
  closeMission();
  stopEndingVideo();
  ending.hidden = true;
  campaignRoot.hidden = false;
  campaignRoot.innerHTML = '';

  var section = document.createElement('section');
  section.className = 'campaign-start';
  var title = document.createElement('h1');
  title.tabIndex = -1;
  title.textContent = 'Chapter menu';
  section.appendChild(title);

  function button(label, handler, className) {
    var item = document.createElement('button');
    item.type = 'button';
    item.className = className;
    item.textContent = handler ? label : '—';
    item.disabled = !handler;
    if (handler) item.onclick = handler;
    else item.setAttribute('aria-label', 'Locked');
    return item;
  }

  var clips = document.createElement('div');
  clips.className = 'choices';
  function back() { showChapterMenu(lastChapter, complete); }
  clips.appendChild(button('Opening film', function () { showOpeningFilm(back); }, 'secondary'));
  clips.appendChild(button('Ending video', complete ? showEnding : null, 'secondary'));
  section.appendChild(clips);

  var chapters = document.createElement('div');
  chapters.className = 'choices';
  CHAPTERS.forEach(function (chapter) {
    var unlocked = chapter.number <= lastChapter;
    var row = document.createElement('div');
    row.className = 'chapter-menu-row';
    row.appendChild(button(chapter.kicker + ' · ' + chapter.title,
      unlocked ? function () { openChapter(chapter.id); } : null, 'choice'));
    row.appendChild(button('Watch intro · ' + chapter.title,
      unlocked ? function () { playIntro(chapter, back); } : null, 'secondary'));
    chapters.appendChild(row);
  });
  section.appendChild(chapters);
  section.appendChild(button('Start screen', showStart, 'primary'));
  campaignRoot.appendChild(section);
  title.focus({ preventScroll: true });
}

function showRules() {
  var modal = document.createElement('div');
  modal.className = 'quiz-modal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-labelledby', 'campaign-rules-title');
  modal.innerHTML = '<div class="quiz-modal-card"><h2 id="campaign-rules-title" tabindex="-1">How to play</h2>' +
    '<p>Ten chapters follow the prologue. Each chapter opens with a film, then asks ten WWII trivia questions.</p>' +
    '<p>Get at least five answers right to advance. A lower score ends the run. Scores of eight, nine, and ten earn increasingly useful bonuses in the chapter’s minigame.</p>' +
    '<p>Finish a chapter to earn a password for the next chapter. That password also unlocks the earlier chapters and films in the chapter menu.</p>' +
    '<button class="primary" type="button">Continue</button><button class="secondary" type="button">Cancel</button></div>';
  modal.querySelector('.primary').onclick = function () { modal.remove(); showLogo(); };
  modal.querySelector('.secondary').onclick = function () {
    modal.remove();
    document.getElementById('campaign-start').focus();
  };
  campaignRoot.appendChild(modal);
  modal.querySelector('h2').focus();
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
  clearOpeningFilm();
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
  start.onclick = showRules;
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
  open.textContent = 'Open chapter menu';
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
    if (pin === COMPLETION_PIN) {
      storePin(pin);
      showChapterMenu(CHAPTERS.length - 1, true);
      return;
    }
    var id = PIN_TO_ID[pin];
    if (!id) {
      status.textContent = 'That code is not on the list.';
      return;
    }
    storePin(pin);
    showChapterMenu(byId(id).number, false);
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
  clearOpeningFilm();
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
    showOpeningFilm(function () { openChapter('prologue'); });
  };
  var creditWindow = document.createElement('div');
  creditWindow.className = 'title-credit-window';
  creditWindow.setAttribute('role', 'region');
  creditWindow.setAttribute('aria-label', 'Opening credits');
  creditWindow.tabIndex = 0;
  var reel = document.createElement('dl');
  reel.className = 'credit-reel';
  var credits = [
    ['Starring', 'Trent Ungerer as the Allied war hero'],
    ['Introducing', 'Buddy, the notorious Elf on the Shelf']
  ].concat(CREDITS.map(function (role) { return [role, 'Justin Ungerer']; }));
  credits.forEach(function (row) {
    var credit = document.createElement('div');
    var role = document.createElement('dt');
    var name = document.createElement('dd');
    role.textContent = row[0];
    name.textContent = row[1];
    credit.append(role, name);
    reel.appendChild(credit);
  });
  creditWindow.appendChild(reel);
  section.append(title, creditWindow, begin);
  campaignRoot.appendChild(section);
  title.focus({ preventScroll: true });
}

function showOpeningFilm(done) {
  var generation = ++introToken;
  clearOpeningFilm();
  campaignRoot.hidden = false;
  campaignRoot.innerHTML = '';

  var section = document.createElement('section');
  section.className = 'campaign-start opening-film';
  section.innerHTML = '<video muted playsinline preload="auto" aria-hidden="true"></video>' +
    '<p class="opening-caption"></p><button type="button" class="overlay-skip">Skip</button>';

  function finishOpening() {
    if (generation !== introToken) return;
    introToken += 1;
    clearOpeningFilm();
    done();
  }

  openingVideo = section.querySelector('video');
  openingVideo.src = './assets/opening.mp4?v=film2';
  openingVideo.muted = true;
  var caption = section.querySelector('.opening-caption');
  openingVideo.addEventListener('timeupdate', function () {
    var time = this.currentTime;
    var text = time < 5 ? '' : time < 11 ? 'Hitler orders Santa’s capture.' :
      time < 17 ? 'Guards march Santa into a Nazi concentration camp.' :
      time < 24 ? 'The guards attack Santa behind the locked gate.' :
      'The Allies pick up the first report. A rescue is still possible.';
    if (caption.textContent !== text) caption.textContent = text;
  });
  openingVideo.addEventListener('ended', finishOpening);
  section.querySelector('button').onclick = finishOpening;
  campaignRoot.appendChild(section);
  syncTurn();
  openingTimer = schedulePortraitStep(finishOpening, 31000);
}

function wantsLandscape() {
  return missionLandscape && !document.getElementById('mission').hidden;
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
    note.textContent = landscape ? 'This minigame plays in landscape.' :
      document.getElementById('mission').hidden ? 'The campaign continues in portrait.' : 'Frosted Skies plays in portrait.';
    mark.classList.toggle('upright', !landscape);
  }
  document.body.classList.toggle('waiting-for-rotation', needed);
  [document.querySelector('header'), campaignRoot, cinema, ending,
    document.getElementById('mission'), document.querySelector('.quiz-modal')].forEach(function (screen) {
    if (screen && screen.inert !== needed) screen.inert = needed;
  });
  if (focusGate) heading.focus({ preventScroll: true });

  if (openingVideo) {
    if (needed || document.hidden) openingVideo.pause();
    else if (openingVideo.paused && !openingVideo.ended) openingVideo.play().catch(function () {});
  }
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
  address.searchParams.set('layout', 'film2');
  var game = address.pathname.split('/').filter(Boolean).pop();
  missionLandscape = window.TrentOrientation.gameUsesLandscape(game);
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
  var travel = reduced ? 0 : Math.min(1, elapsed / INTRO_MS);
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
      if (!video.hasAttribute('src')) video.src = './assets/intro-video/' + chapter.id + '.mp4?v=film3';
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
  var bonus = score >= 8 ? score - 7 : 0;
  active = { chapter: chapter, runId: runId };
  url.searchParams.set('runId', runId);
  if (bonus) url.searchParams.set('bonus', String(bonus));
  if (chapter.path === './wrapping-line/') url.searchParams.set('lives', String(7 + bonus));
  openMissionFrame(url.href, chapter.title);
}

function afterIntro(chapter) {
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

function openChapter(id) {
  var chapter = byId(id);
  if (!chapter) {
    showStart();
    return;
  }
  clearInterval(pinTimer);
  clearOpeningFilm();
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
  var password = nextId ? byId(nextId).pin : COMPLETION_PIN;
  storePin(password);
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
  code.textContent = password;
  code.setAttribute('aria-label', 'Continue code ' + password);
  copy.className = 'lead';
  copy.textContent = nextId ? 'Use this password to open ' + byId(nextId).title + ' and replay earlier chapters and films.' :
    'Campaign complete. This password opens every chapter and film.';
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
  var next = document.createElement('button');
  next.type = 'button';
  next.className = 'primary';
  next.textContent = nextId ? 'Continue' : 'Watch the ending';
  next.onclick = function () {
    if (chapter.id === 'prologue' && nextId) showCaptureCard(nextId);
    else if (nextId) openChapter(nextId);
    else showEnding();
  };
  section.insertBefore(next, home);
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
  copy.textContent = 'A few months have passed. Allied intel says Hitler has captured Santa and is holding him. Buddy, the elf on the shelf, was sent by the Allies to spy on the Nazis. He has been caught, and he has to be rescued.';
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
  document.getElementById('ending-copy').textContent = 'Christmas is restored. Completion password: ' + COMPLETION_PIN + '.';
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
