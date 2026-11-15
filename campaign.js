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
      "June 1944. At dawn, Trent’s landing craft noses into the Normandy surf.",
      "The ramp drops. Cold water pours in, and a sea of wire rises beyond the breakers.",
      "Through the smoke, Trent glimpses the seawall. For a moment it is the only solid thing in the world."
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
      "Months later, on a snowy December night, a radio lamp glows in Trent’s tent.",
      "The signal breaks through the static. Hitler has taken Santa, and the Allies’ scout Buddy has vanished.",
      "The same report names the workshop and a freight yard where Rudolph is being held.",
      "Trent folds the message into his coat. By dawn he will be over the winter valley."
    ],
    story: 'A radio transmission names the workshop, a freight yard, and the scouts Trent needs to find.',
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
      "The radio warned of a raid on Santa’s hidden workshop. Now the bombers are crossing the mountains.",
      "Trent’s sleigh climbs into the snow, its engine echoing off the frozen cliffs.",
      "Below the cloud line, the workshop’s lights shine through the fir trees.",
      "On the other side of the valley, a dark ribbon of rail leads toward Rudolph."
    ],
    story: "The bombers are already in the mountains. Down in the valley, Santa’s workshop is still lit.",
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
      "Through the trees, Trent spots the railway that leads to Rudolph’s freight yard.",
      "A handcar waits beside the signal shed. Its iron wheels are rimmed with frost.",
      "The valley fills with the drone of bombers as snow swallows the tracks ahead.",
      "At the yard mouth, a lantern swings in the wind. Someone is still working in there."
    ],
    story: "At the edge of the forest, a handcar waits on the railway to Rudolph.",
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
      "Night settles over the freight yard, and the lamps cast long shadows between the wagons.",
      "Trent finds a dispatch pouch beneath a pile of freight ledgers.",
      "Inside is the order that put Rudolph in danger, along with the address of a guarded depot.",
      "Buddy is being held at that depot. The next train is Trent’s only lead."
    ],
    story: "The freight yard holds the orders that could lead Trent to both Rudolph and Buddy.",
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
      "At the switch tower, the station lights are the only color in the snow.",
      "A rescue train waits on the approach. The yard’s guards are watching the points.",
      "Inside the tower, Trent spots the depot route on the board above the levers.",
      "Steam rolls across the glass as the train starts toward Buddy."
    ],
    story: "The winter train could reach Buddy’s depot, if it leaves the switch yard.",
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
      "Buddy hears a train pull in beyond the depot wall. Its whistle sounds like home.",
      "Hidden among the crates are the orders the guards took from him when he was caught.",
      "A mail hatch opens onto the alley. Beyond it, a dispatch points to the camp where Santa is held.",
      "Buddy tucks the papers under his coat and steps out of the shadows."
    ],
    story: "Buddy hears the rescue train. The papers hidden in the depot could lead him to Santa.",
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
      "Buddy is free, and the papers have led Trent to a lonely outpost beyond the depot.",
      "A searchlight washes over the yard. Inside, footsteps echo down branching corridors.",
      "From the radio room comes a burst of static and a mention of Santa’s name.",
      "At the far end of the corridor, a green door opens onto the road to the camp."
    ],
    story: "A green door at the end of the outpost corridor stands between Trent and the road to Santa.",
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
      "Beyond the wire, Trent finds Santa alive in the frozen holding camp.",
      "The yard falls quiet. A guard’s footsteps crunch across the snow by the gate.",
      "Trent reaches Santa under the lamps and helps him into the shelter of the passage.",
      "Buddy and Rudolph wait outside the fence. The workshop is still standing."
    ],
    story: "Santa is alive behind the wire. Buddy and Rudolph are waiting beyond the gate.",
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
      "The workshop the raiders meant to destroy is still standing.",
      "Buddy, Rudolph, Santa, and Trent gather in its warm light for the first time since the rescue.",
      "The packing line rattles to life, and a familiar smell of paper and pine fills the room.",
      "Outside, snow settles on the rooftops that lead to the waiting sleigh."
    ],
    story: "The rescued crew gathers in the workshop to prepare for the flight home.",
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
      "High above the village, a sleigh waits among the chimney pots.",
      "Trent, Buddy, Santa, and Rudolph can see its lantern through the snowfall.",
      "Below them, a few warm windows light the winding streets. Above, the clouds are beginning to clear.",
      "The last chimney sends up a plume of smoke. Beyond it lies the way home."
    ],
    story: "The sleigh waits beyond the snowy roofs, and the last clouds are beginning to clear.",
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
  var menuButton = document.getElementById('mission-menu');
  menuButton.hidden = true;
  menuButton.onclick = null;
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
  active = null;
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
    var introButton = button('Watch intro',
      unlocked ? function () { playIntro(chapter, back); } : null, 'secondary');
    var gameButton = button('Play minigame',
      unlocked ? function () { launchGame(chapter, 0, back); } : null, 'secondary chapter-minigame');
    if (unlocked) {
      introButton.setAttribute('aria-label', 'Watch intro · ' + chapter.title);
      gameButton.setAttribute('aria-label', 'Play minigame · ' + chapter.title);
    }
    row.append(introButton, gameButton);
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
    '<p>Finish a chapter to earn a password for the next chapter. That password also unlocks the earlier chapters, films, and minigames in the chapter menu.</p>' +
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
  section.innerHTML = '<video muted playsinline preload="auto"></video>' +
    '<button type="button" class="overlay-skip">Skip</button>';

  function finishOpening() {
    if (generation !== introToken) return;
    introToken += 1;
    clearOpeningFilm();
    done();
  }

  openingVideo = section.querySelector('video');
  openingVideo.setAttribute('aria-label', 'Opening film. Hitler orders Santa’s capture. ' +
    'Guards march him into a Nazi concentration camp, where they attack him behind a locked gate. ' +
    'The Allies pick up the first report. A rescue is still possible.');
  openingVideo.src = './assets/opening.mp4?v=portrait-story';
  openingVideo.addEventListener('ended', finishOpening);
  section.querySelector('button').onclick = finishOpening;
  campaignRoot.appendChild(section);
  syncTurn();
  // Let the video complete naturally, with a fallback for stalled playback.
  openingTimer = schedulePortraitStep(finishOpening, 45000);
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
  var menuButton = document.getElementById('mission-menu');
  var returnToMenu = active && active.returnToMenu;
  menuButton.hidden = !returnToMenu;
  menuButton.onclick = returnToMenu || null;
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

function drawFallbackIntroCaption(ctx, lines, elapsed) {
  var width = ctx.canvas.width;
  var height = ctx.canvas.height;
  var index = Math.min(lines.length - 1, Math.floor(elapsed * lines.length / INTRO_MS));
  var size = Math.round(Math.min(width * 37.12 / 720, height * 0.092));
  var rows = [''];
  var row = 0;
  ctx.font = size + 'px Segoe UI, sans-serif';
  lines[index].split(/\s+/).forEach(function (word) {
    var next = rows[row] ? rows[row] + ' ' + word : word;
    if (rows[row] && ctx.measureText(next).width > width * 0.86) rows[++row] = word;
    else rows[row] = next;
  });
  var widthOfText = Math.max.apply(null, rows.map(function (line) { return ctx.measureText(line).width; }));
  var lineHeight = size * 1.14;
  var block = rows.length * lineHeight;
  var top = Math.min(height * 0.84 - block / 2, height * 0.96 - block - size * 0.16);
  ctx.fillStyle = '#071018f3';
  ctx.fillRect((width - widthOfText) / 2 - size * 0.32, top - size * 0.16,
    widthOfText + size * 0.64, block + size * 0.32);
  ctx.fillStyle = '#fff1dc';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  rows.forEach(function (line, i) { ctx.fillText(line, width / 2, top + (i + 0.5) * lineHeight); });
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
      if (!video.hasAttribute('src')) video.src = './assets/intro-video/' + chapter.id + '.mp4?v=portrait-story';
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
  var introTitle = document.getElementById('intro-title');
  introTitle.textContent = chapter.title;
  introTitle.setAttribute('aria-description', chapter.lines.join(' '));
  progress.style.transform = 'scaleX(0)';
  cinema.dataset.chapter = chapter.id;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  cinema.hidden = false;
  campaignRoot.hidden = true;
  syncTurn();
  updateVideo = prepareIntroVideo(chapter, function () { return elapsed; });
  updateVideo();
  if (window.TrentMusic) window.TrentMusic.startIntro(chapter.id);
  introTitle.focus({ preventScroll: true });
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
    elapsed += Math.max(0, Math.min(80, now - last));
    last = now;
    reduced = reduceMotion.matches;
    if (!updateVideo()) {
      fitCanvas(canvas);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      drawBackground(ctx, images[0], spec, elapsed, reduced);
      for (i = 0; i < spec.layers.length; i++) drawActor(ctx, images[i + 1], spec.layers[i], elapsed, reduced);
      drawFallbackIntroCaption(ctx, chapter.lines, elapsed);
    }
    progress.style.transform = 'scaleX(' + Math.min(1, elapsed / INTRO_MS) + ')';
    if (elapsed >= INTRO_MS) {
      introDone();
      return;
    }
    introRaf = requestAnimationFrame(tick);
  }
  introRaf = requestAnimationFrame(tick);
}

function launchGame(chapter, score, returnToMenu) {
  if (chapter.id === 'shelf') {
    active = { chapter: chapter, returnToMenu: returnToMenu };
    window.TrentChapter6.startMission(score);
    return;
  }
  var runId = Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
  var url = new URL(chapter.path, location.href);
  var bonus = score >= 8 ? score - 7 : 0;
  active = { chapter: chapter, runId: runId, returnToMenu: returnToMenu };
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
    onClear: function (correct) { launchGame(chapter, correct); },
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
    endingVideo.src = new URL('./assets/ending.mp4?v=portrait-story', location.href).href;
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

function finishMission() {
  var run = active;
  if (run.returnToMenu) run.returnToMenu();
  else finishChapter(run.chapter);
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
  finishMission();
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
    if (active && active.chapter.id === 'shelf') finishMission();
  }
};

showStart();
