'use strict';

/* Campaign router. Continue codes live in this file. They are bookmarks, not security.
   The latest code is stored under trent-campaign-pin. Campaign resume does not read trent-quiz-cinema2.
   The prologue has no quiz. Chapters 1–10 each draw 10 questions from WWII-TRIVIA-BANK.md
   in trivia.js. Chapter 6 then launches Ribbonfall with the score mapped in quiz.js. */

var PIN_KEY = 'trent-campaign-pin';
var FILM_VERSION = 'trent-portrait-mac';
var campaignRoot = document.getElementById('app');
var cinema = document.getElementById('cinema');
var ending = document.getElementById('ending');
var endingVideo = document.getElementById('ending-video');
var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

var active = null;
var pendingMissionUrl = '';
var missionLandscape = false;
var missionInstructionsAccepted = false;
var resumeEndingAfterTurn = false;
var introToken = 0;
var introRaf = 0;
var introDone = null;
var cleanupIntroVideo = null;
var openingTimer = 0;
var openingVideo = null;

var CREDITS = ['Designer', 'Producer', 'Developer', 'Tester', 'Marketing', 'Music'];

var OPENING_FILM = {
  "id": "opening",
  "filmSeconds": 34,
  "captionFrames": [
    0,
    83,
    184,
    376,
    486,
    633
  ],
  "lines": [
    "",
    "Hitler orders Santa’s capture, hoping to demoralize the American troops.",
    "The Nazis capture Santa and lock him in a concentration camp, where he waits his turn in the gas chamber.",
    "Behind locked gates, the guards beat and torture Santa each day.",
    "In early December, the Allies pick up the first report. A rescue is still possible.",
    "The Allies pin their hopes on decorated war hero Trent Ungerer and a little-known spy named Buddy."
  ]
};

var CAST_FILM = {
  "id": "cast",
  "filmSeconds": 15,
  "captionFrames": [0, 120, 240],
  "lines": [
    "Starring Trent Ungerer as the Allied war hero",
    "A cameo by Mac, Trent’s faithful guardian",
    "Introducing Buddy, the notorious Elf on the Shelf"
  ]
};

var CHAPTERS = [
  {
    id: 'prologue',
    number: 0,
    title: 'Landing at Normandy',
    kicker: 'Prologue',
    filmSeconds: 28,
    captionFrames: [0, 83, 212, 368, 543],
    lines: [
      "Prologue. Six months earlier…",
      "It’s June 1944. At dawn, Trent’s landing craft noses into the Normandy surf.",
      "The ramp drops. Cold water pours in, and a sea of wire rises beyond the breakers.",
      "Through the smoke, Trent glimpses the seawall. For a moment, it’s the only solid thing in the world.",
      "As Trent rushes forward, bullets fly past him and bombs explode all around."
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
    filmSeconds: 34,
    captionFrames: [0, 137, 339, 485, 650, 733],
    lines: [
      "Months later, on a snowy December night, a radio lamp glows in Trent’s tent.",
      "A garbled signal breaks through the static. Hitler has taken Santa, and Buddy has vanished while deep undercover in Hitler’s mansion.",
      "The same report names the workshop and a freight yard where Rudolph is being held.",
      "Recent intelligence suggests the Nazi commanders plan to turn Rudolph into hamburgers to feed their starving troops.",
      "Trent folds the message into his coat.",
      "He has one mission. Save Christmas."
    ],
    story: 'A radio transmission names the workshop, a freight yard, and the scouts Trent needs to find.',
    event: 'night-broadcast:complete',
    path: './night-broadcast/',
    pin: 'NIGHT',
    quizPin: 'CARRIER7',
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
    filmSeconds: 34,
    captionFrames: [0, 281, 417, 535, 652, 734],
    lines: [
      "The radio warned of a raid on Santa’s hidden workshop. Now the bombers are crossing the mountains. Trent climbs into his prototype sleigh, modified for aerial combat against the Luftwaffe.",
      "Trent’s sleigh climbs into the snow, its magic engine echoing off the frozen cliffs.",
      "Below the cloud line, the workshop’s lights shine through the fir trees.",
      "Just over the horizon, Trent spots the first squadron of German fighters.",
      "Trent reaches down and arms the sleigh’s weapons.",
      "Then he pushes the throttle to full power."
    ],
    story: "The bombers are already in the mountains. Down in the valley, Santa’s workshop is still lit.",
    event: 'frosted-skies:complete',
    path: './frosted-skies/',
    pin: 'SKY',
    quizPin: 'TAILWIND8',
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
    filmSeconds: 43,
    captionFrames: [0, 110, 322, 451, 682, 820],
    lines: [
      "After saving the secret workshop, Trent resumes Operation Rescue Santa Claus.",
      "New intelligence reveals Rudolph’s whereabouts, sending Trent on a side mission. He’ll need all the help he can get to rescue Santa.",
      "Through the trees, Trent spots the railway that leads to Rudolph’s freight yard.",
      "He can’t land the sleigh too close without being spotted. Luckily, a handcar waits beside the signal shed, its iron wheels rimmed with frost.",
      "The valley fills with the drone of bombers as snow swallows the tracks ahead.",
      "At the yard entrance, a lantern swings in the wind. Someone is still working in there, and Trent has to get inside."
    ],
    story: "At the edge of the forest, a handcar waits on the railway to Rudolph.",
    event: 'white-rail:complete',
    path: './white-rail/',
    pin: 'RAIL',
    quizPin: 'COASTLINE4',
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
    line: 'Trent and his bulldog Mac slip into the freight yard to find Rudolph and Buddy. While Mac sends the inspectors running, Trent takes the dispatches that identify Buddy’s depot.',
    filmSeconds: 30,
    captionFrames: [0, 146, 255, 419, 501, 583],
    lines: [
      "Trent keeps his bulldog Mac close as they slip past the freight wagons.",
      "Trent finds a dispatch pouch beneath a pile of freight ledgers.",
      "Inside is the order that put Rudolph in danger, along with the address of a guarded depot.",
      "Trent sneaks into the stables and frees Rudolph.",
      "Rudolph knows where the guards are taking Buddy.",
      "Buddy is being held at the depot. The next train is Trent’s only lead."
    ],
    story: "The freight yard holds the orders that could lead Trent to both Rudolph and Buddy.",
    event: 'special-delivery:complete',
    path: './chapter-2/',
    pin: 'YARD',
    quizPin: 'BULLDOG2',
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
    filmSeconds: 28,
    captionFrames: [0, 136, 272, 409, 563],
    lines: [
      "Rudolph is injured and can’t fly. This is going to be a difficult jailbreak.",
      "At the switch tower, the station lights are the only color in the snow.",
      "A rescue train waits on the approach. The yard guards are watching the switches.",
      "Inside the tower, Trent spots the route to the depot on the board above the levers.",
      "Steam rolls across the glass as the train starts toward Buddy."
    ],
    story: "The winter train could reach Buddy’s depot, if it leaves the switch yard.",
    event: 'switch-tower:complete',
    path: './switch-tower/',
    pin: 'SWITCH',
    quizPin: 'SIGNAL9',
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
    filmSeconds: 34,
    captionFrames: [0, 93, 241, 399, 575, 686],
    lines: [
      "Meanwhile, Buddy has just slipped out of his cell.",
      "Buddy hears a train pull in beyond the depot wall. Its whistle sounds like home.",
      "Hidden among the crates are the orders the guards took from him when he was caught.",
      "A mail hatch opens onto the alley. A dispatch points to the camp where Santa is being held.",
      "Buddy knows he must get a message to the Allied forces.",
      "He tucks the papers under his coat and steps out of the shadows."
    ],
    story: "Buddy hears the rescue train. The papers hidden in the depot could lead him to Santa.",
    event: null,
    path: './shelf-escape/',
    pin: 'DEPOT',
    quizPin: 'RIBBON3',
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
    filmSeconds: 31,
    captionFrames: [0, 154, 272, 417, 580, 662],
    lines: [
      "Buddy is free, and the papers have led Trent to a lonely outpost beyond the depot.",
      "A searchlight washes over the yard. Inside, footsteps echo down branching corridors.",
      "From the radio room comes a burst of static and a mention of Santa’s name.",
      "At the far end of the corridor, a green door opens onto the road to the camp.",
      "Guards patrol the labyrinth of the concentration camp.",
      "Trent is Santa’s only hope."
    ],
    story: "A green door at the end of the outpost corridor stands between Trent and the road to Santa.",
    event: 'listening-wire:complete',
    path: './listening-wire/',
    pin: 'WIRE',
    quizPin: 'LANTERN6',
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
    filmSeconds: 37,
    captionFrames: [0, 120, 259, 398, 518, 666],
    lines: [
      "Beyond the wire, Trent finds Santa alive in the frozen holding camp.",
      "The yard falls quiet. A guard’s footsteps crunch across the snow by the gate.",
      "Under the cover of the passage, Trent gets close enough to reach Santa’s cell.",
      "Buddy and Rudolph wait outside the fence. The workshop is still standing.",
      "Trent steals a guard’s key and slips it through the barred window of Santa’s cell.",
      "This is as close as Trent can get. Santa will have to fight his way across the prison yard to the open gate."
    ],
    story: "Santa is alive behind the wire. Buddy and Rudolph are waiting beyond the gate.",
    event: 'holding-camp:complete',
    path: './holding-camp/',
    pin: 'CAMP',
    quizPin: 'LOCKSMITH8',
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
    filmSeconds: 38,
    captionFrames: [0, 90, 207, 370, 578, 795],
    lines: [
      "Santa is free, and the team is back together.",
      "The Nazi workshop the Allied raiders meant to destroy is still standing.",
      "Buddy, Rudolph, Santa, and Trent gather in the warm light for the first time since the rescue.",
      "The packing line in the Nazis’ secret toy factory rattles to life. A familiar smell of paper and pine fills the room.",
      "The team packs the presents into the sleigh for the children back home.",
      "Outside, snow settles on the rooftops that lead to the waiting sleigh."
    ],
    story: "The rescued crew gathers in the workshop to prepare for the flight home.",
    event: 'wrapping-line:complete',
    path: './wrapping-line/',
    pin: 'BOW',
    quizPin: 'SLEDBELLS5',
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
    filmSeconds: 29,
    captionFrames: [0, 82, 190, 307, 470, 552],
    lines: [
      "At last, it’s time to escape Nazi Germany.",
      "High above the village, a sleigh waits among the chimney stacks.",
      "Trent, Buddy, Santa, and Rudolph can see its lantern through the snowfall.",
      "Below them, a few warm windows light the winding streets. Above, the clouds are beginning to clear.",
      "Nazi patrols move through the streets below.",
      "The last chimney sends up a plume of smoke. Beyond it lies the way home."
    ],
    story: "The sleigh waits beyond the snowy roofs, and the last clouds are beginning to clear.",
    event: 'chimney-road:complete',
    path: './chimney-road/',
    pin: 'HOME',
    quizPin: 'ROOFTOP7',
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
var COMPLETION_PIN = 'HOME2026';
var TEST_PIN = '19820424';
var testMode = false;
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
    if (value === TEST_PIN) return COMPLETION_PIN;
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

function stopIntro() {
  introToken += 1;
  if (introRaf) cancelAnimationFrame(introRaf);
  introRaf = 0;
  introDone = null;
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
    if (window.TrentMusic) window.TrentMusic.stopIntro();
    openingVideo.removeAttribute('src');
    openingVideo.load();
    openingVideo = null;
  }
}

function closeMission() {
  if (window.TrentMusic) window.TrentMusic.endBoss();
  pendingMissionUrl = '';
  missionInstructionsAccepted = false;
  var menuButton = document.getElementById('mission-menu');
  menuButton.hidden = true;
  menuButton.onclick = null;
  var frame = document.getElementById('game');
  if (frame && frame.hasAttribute('src')) {
    // Replacing the frame keeps a queued blank navigation from racing the next level.
    var emptyFrame = frame.cloneNode(false);
    emptyFrame.removeAttribute('src');
    frame.replaceWith(emptyFrame);
  }
  document.getElementById('mission').hidden = true;
  document.body.classList.remove('playing');
  syncTurn();
}

function stopEndingVideo() {
  resumeEndingAfterTurn = false;
  endingVideo.pause();
  if (endingVideo.getAttribute('src') && window.TrentMusic) window.TrentMusic.stopIntro();
  endingVideo.removeAttribute('src');
  endingVideo.load();
}

function showChapterMenu(lastChapter, complete, canTest, quizAssist) {
  if (!canTest) testMode = false;
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
  function back() { showChapterMenu(lastChapter, complete, canTest, quizAssist); }
  if (canTest) {
    clips.appendChild(button('Opening film', function () { showOpeningFilm(back); }, 'secondary'));
    clips.appendChild(button('Ending video', complete ? showEnding : null, 'secondary'));
  }
  var testControls = [];
  if (canTest) {
    var testToggle = button('Test mode', function () {
      testMode = !testMode;
      updateTestToggle();
      testControls.forEach(function (update) { update(); });
    }, 'secondary');
    testToggle.id = 'test-mode';
    function updateTestToggle() {
      testToggle.setAttribute('aria-pressed', String(testMode));
      testToggle.textContent = 'Test mode ' + (testMode ? 'on' : 'off');
    }
    updateTestToggle();
    clips.appendChild(testToggle);
  }
  if (canTest) section.appendChild(clips);

  var chapters = document.createElement('div');
  chapters.className = 'choices';
  CHAPTERS.forEach(function (chapter) {
    var unlocked = chapter.number <= lastChapter;
    var row = document.createElement('div');
    row.className = 'chapter-menu-row';
    if (!canTest) {
      var chapterLabel = chapter.kicker + ' · ' + chapter.title;
      if (!unlocked) {
        var lockedChapter = button('', null, 'choice chapter-locked');
        lockedChapter.textContent = chapterLabel + ' · Locked';
        lockedChapter.removeAttribute('aria-label');
        row.appendChild(lockedChapter);
      } else if (chapter.number === lastChapter && !complete) {
        row.appendChild(button('Continue at ' + chapterLabel, function () {
          openChapter(chapter.id, { highlightCorrect: quizAssist });
        }, 'choice'));
      } else {
        var chapterHeading = document.createElement('h2');
        chapterHeading.className = 'chapter-replay-heading';
        chapterHeading.textContent = chapterLabel;
        row.appendChild(chapterHeading);
        var returnFromReplay = chapter.nextId ? back : function () { showEnding(back); };
        function addReplay(label, skipQuiz) {
          var replay = button(label, function () {
            openChapter(chapter.id, { skipQuiz: skipQuiz, returnToMenu: returnFromReplay });
          }, 'secondary');
          replay.setAttribute('aria-label', label + ' · ' + chapterLabel);
          row.appendChild(replay);
        }
        if (chapter.number) {
          addReplay('Replay without quiz', true);
          addReplay('Replay with quiz', false);
        } else {
          addReplay('Replay prologue', true);
          row.lastElementChild.classList.add('chapter-replay-single');
        }
      }
      chapters.appendChild(row);
      return;
    }
    var chapterAction = chapter.number === lastChapter ? 'Continue at ' : 'Replay ';
    row.appendChild(button(chapterAction + chapter.kicker + ' · ' + chapter.title,
      unlocked ? function () { openChapter(chapter.id); } : null, 'choice'));
    var introButton = button('Cutscene only',
      unlocked ? function () { playIntro(chapter, back); } : null, 'secondary');
    var levelPicker;
    var gameButton = button('Minigame only', unlocked ? function () {
      if (testMode && levelPicker && levelPicker.value === 'final-fight') launchFinalFight(chapter, back);
      else launchGame(chapter, 0, back, testMode && levelPicker ? Number(levelPicker.value) : undefined);
    } : null, 'secondary chapter-minigame');
    if (unlocked) {
      introButton.setAttribute('aria-label', 'Cutscene only · ' + chapter.title);
      gameButton.setAttribute('aria-label', 'Minigame only · ' + chapter.title);
    }
    row.append(introButton, gameButton);
    if (chapter.id === 'chimney') {
      var finalFightButton = button('Final fight only', unlocked ? function () { launchFinalFight(chapter, back); } : null, 'secondary chapter-final-fight');
      if (unlocked) finalFightButton.setAttribute('aria-label', 'Final fight only · ' + chapter.title);
      row.appendChild(finalFightButton);
    }
    if (canTest && unlocked) {
      levelPicker = document.createElement('select');
      levelPicker.className = 'chapter-level';
      levelPicker.setAttribute('aria-label', 'Test level · ' + chapter.title);
      window.TrentLevels[chapter.id].forEach(function (level, index) {
        var option = document.createElement('option');
        option.value = index;
        option.textContent = 'Level ' + (index + 1) + ' · ' + (level ? level.title : chapter.title);
        levelPicker.appendChild(option);
      });
      if (chapter.id === 'chimney') {
        var finalFightOption = document.createElement('option');
        finalFightOption.value = 'final-fight';
        finalFightOption.textContent = 'Final fight · Hitler guards the sleigh';
        levelPicker.appendChild(finalFightOption);
      }
      row.insertBefore(levelPicker, gameButton);
      var update = function () {
        levelPicker.hidden = !testMode;
        var action = testMode ? 'Play level' : 'Minigame only';
        gameButton.textContent = action;
        gameButton.setAttribute('aria-label', action + ' · ' + chapter.title);
      };
      testControls.push(update);
      update();
    }
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
    '<p>You get two guesses per question. Afterward, you can review why each answer is right or wrong.</p>' +
    '<p>Get at least five answers right to enter the chapter’s minigame. A lower score ends the run. Scores of eight, nine, and ten earn increasingly useful bonuses. Each level starts with your full earned loadout.</p>' +
    '<p>Pass the quiz to earn a quiz password. Use it to restart that chapter with the correct answers highlighted in green.</p>' +
    '<p>Play the three minigame levels in order. If you lose, you can retry the level or start that minigame over.</p>' +
    '<p>Finish Level 3 to earn the password for the next chapter. Entering it lets you replay completed chapters with or without their quizzes.</p>' +
    '<button class="primary" type="button">Close</button></div>';
  modal.querySelector('.primary').onclick = function () {
    modal.remove();
    document.getElementById('start-rules').focus();
  };
  campaignRoot.appendChild(modal);
  modal.querySelector('h2').focus();
}

function showStart() {
  if (window.TrentMusic) window.TrentMusic.startScene();
  testMode = false;
  if (window.TrentTrivia) window.TrentTrivia.abort();
  var section;
  var title;
  var start;
  var form;
  var label;
  var input;
  var help;
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
  section.className = 'campaign-start start-home';
  title = document.createElement('h1');
  title.tabIndex = -1;
  title.textContent = 'Trent Saves Christmas';
  start = document.createElement('button');
  start.type = 'submit';
  start.className = 'primary';
  start.id = 'campaign-start';
  start.textContent = 'Start';
  form = document.createElement('form');
  form.id = 'pin-form';
  label = document.createElement('label');
  label.htmlFor = 'pin';
  label.textContent = 'Chapter or quiz password (optional)';
  input = document.createElement('input');
  input.id = 'pin';
  input.name = 'pin';
  input.type = 'text';
  input.maxLength = 12;
  input.autocomplete = 'off';
  input.autocapitalize = 'characters';
  input.spellcheck = false;
  input.enterKeyHint = 'go';
  help = document.createElement('button');
  help.type = 'button';
  help.className = 'secondary';
  help.id = 'start-rules';
  help.textContent = 'How to play';
  help.onclick = showRules;
  status = document.createElement('p');
  status.id = 'pin-status';
  status.setAttribute('role', 'status');
  input.setAttribute('aria-describedby', 'pin-status');
  input.oninput = function () {
    input.removeAttribute('aria-invalid');
    status.textContent = '';
  };
  form.appendChild(start);
  form.appendChild(label);
  form.appendChild(input);
  form.appendChild(status);
  form.onsubmit = function (event) {
    var pin = normalizePin(input.value);
    event.preventDefault();
    if (!pin) {
      showOpeningFilm(showLogo, CAST_FILM);
      return;
    }
    if (pin === TEST_PIN) {
      showChapterMenu(CHAPTERS.length - 1, true, true);
      return;
    }
    if (pin === COMPLETION_PIN) {
      storePin(pin);
      showChapterMenu(CHAPTERS.length - 1, true);
      return;
    }
    var quizChapter = CHAPTERS.find(function (chapter) { return chapter.quizPin === pin; });
    var chapter = quizChapter || byId(PIN_TO_ID[pin]);
    if (!chapter) {
      status.textContent = 'That password is not on the list.';
      input.setAttribute('aria-invalid', 'true');
      input.focus();
      return;
    }
    storePin(chapter.pin);
    showChapterMenu(chapter.number, false, false, Boolean(quizChapter));
  };
  section.appendChild(title);
  section.appendChild(form);
  section.appendChild(help);
  campaignRoot.appendChild(section);
  title.focus({ preventScroll: true });
}

function showLogo() {
  if (window.TrentMusic) window.TrentMusic.startScene();
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
  var credits = CREDITS.map(function (role) { return [role, 'Justin Ungerer']; });
  credits.forEach(function (row) {
    var credit = document.createElement('div');
    var role = document.createElement('dt');
    var name = document.createElement('dd');
    role.textContent = row[0];
    name.textContent = row[1];
    if (row[0] === 'Music') {
      var note = document.createElement('small');
      note.className = 'credit-note';
      note.textContent = '(except 1 track)';
      name.appendChild(note);
    }
    credit.append(role, name);
    reel.appendChild(credit);
  });
  creditWindow.appendChild(reel);
  section.append(title, creditWindow, begin);
  campaignRoot.appendChild(section);
  title.focus({ preventScroll: true });
}

function showOpeningFilm(done, film) {
  film = film || OPENING_FILM;
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
  openingVideo.setAttribute('aria-label', film.lines.join(' ').trim());
  openingVideo.src = './assets/' + film.id + '.mp4?v=' + FILM_VERSION;
  openingVideo.addEventListener('ended', finishOpening);
  section.querySelector('button').onclick = finishOpening;
  campaignRoot.appendChild(section);
  if (window.TrentMusic) window.TrentMusic.startIntro(film.id);
  syncTurn();
  // Let the video complete naturally, with a fallback for stalled playback.
  openingTimer = schedulePortraitStep(finishOpening, (film.filmSeconds + 12) * 1000);
}

function wantsLandscape() {
  return missionInstructionsAccepted && missionLandscape && !document.getElementById('mission').hidden;
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
      document.getElementById('mission').hidden ? 'The campaign continues in portrait.' :
      missionInstructionsAccepted ? 'Frosted Skies plays in portrait.' : 'Read the minigame instructions in portrait.';
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
  address.searchParams.set('layout', 'painted-obstacles');
  var game = address.pathname.split('/').filter(Boolean).pop();
  missionLandscape = window.TrentOrientation.gameUsesLandscape(game);
  missionInstructionsAccepted = false;
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

function drawFallbackIntroCaption(ctx, chapter, elapsed) {
  var width = ctx.canvas.width;
  var height = ctx.canvas.height;
  var index = chapter.captionFrames.length - 1;
  while (index > 0 && chapter.captionFrames[index] * 1000 / 24 > elapsed) index -= 1;
  var line = chapter.lines[index];
  var size = Math.round(Math.min(width * 37.12 / 720, height * 0.092));
  var rows = [''];
  var row = 0;
  ctx.font = size + 'px Segoe UI, sans-serif';
  line.split(/\s+/).forEach(function (word) {
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

function prepareIntroVideo(chapter, getElapsed, resetClock) {
  var previous = document.getElementById('intro-video');
  var video = previous.cloneNode(false);
  previous.replaceWith(video);
  var showing = false;
  var requested = false;
  var failed = false;

  function displayVideo(display) {
    showing = display;
    cinema.classList.toggle('has-video', display);
  }

  function showFrame() {
    if (requested && video.readyState >= 2 && !video.paused && !video.seeking) displayVideo(true);
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
      if (!video.hasAttribute('src')) {
        var path = chapter.videoPath || './assets/intro-video/' + chapter.id + '.mp4';
        video.src = path + '?v=' + (chapter.videoVersion || FILM_VERSION);
      }
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
  video.onended = function () {
    if (requested && introDone) introDone();
  };

  video.onerror = function () {
    failed = true;
    displayVideo(false);
  };
  function onVisibilityChange() {
    resetClock();
    updateVideo();
  }
  document.addEventListener('visibilitychange', onVisibilityChange);
  cleanupIntroVideo = function () {
    requested = false;
    document.removeEventListener('visibilitychange', onVisibilityChange);
    video.onplaying = video.onseeked = video.onended = video.onerror = null;
    video.pause();
    video.removeAttribute('src');
    video.load();
    displayVideo(false);
  };
  updateVideo.useFallback = function () { return failed || reduceMotion.matches; };
  return updateVideo;
}

function playIntro(chapter, done) {
  var canvas = document.getElementById('intro-canvas');
  var ctx = canvas.getContext('2d');
  var duration = chapter.filmSeconds * 1000;
  var progress = document.getElementById('intro-progress');
  var started = performance.now();
  var elapsed = 0;
  var last = started;
  var token;
  var updateVideo;
  stopIntro();
  token = introToken;
  document.getElementById('intro-kicker').textContent = chapter.kicker;
  var introTitle = document.getElementById('intro-title');
  introTitle.textContent = chapter.title;
  introTitle.setAttribute('aria-description', chapter.lines.join(' '));
  progress.style.transform = 'scaleX(0)';
  cinema.dataset.chapter = chapter.id;
  var skip = document.getElementById('intro-skip');
  skip.hidden = !testMode && chapter.allowSkip === false;
  skip.textContent = testMode && chapter.videoPath ? 'Skip to gameplay' : 'Skip';
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  cinema.hidden = false;
  campaignRoot.hidden = true;
  syncTurn();
  updateVideo = prepareIntroVideo(chapter, function () { return elapsed; }, function () {
    last = performance.now();
  });
  updateVideo();
  if (window.TrentMusic) {
    if (chapter.musicLevel) window.TrentMusic.startLevel(chapter.id, chapter.musicLevel);
    else window.TrentMusic.startChapter(chapter.id);
  }
  introTitle.focus({ preventScroll: true });
  introDone = function () {
    if (introToken !== token) return;
    stopIntro();
    done();
  };
  function tick(now) {
    if (introToken !== token) return;
    syncTurn();
    if (document.hidden || turnNeeded()) {
      updateVideo();
      last = now;
      introRaf = requestAnimationFrame(tick);
      return;
    }
    elapsed += Math.max(0, now - last);
    last = now;
    updateVideo();
    if (updateVideo.useFallback()) {
      fitCanvas(canvas);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawFallbackIntroCaption(ctx, chapter, elapsed);
    }
    progress.style.transform = 'scaleX(' + Math.min(1, elapsed / duration) + ')';
    if (elapsed >= duration) {
      introDone();
      return;
    }
    introRaf = requestAnimationFrame(tick);
  }
  introRaf = requestAnimationFrame(tick);
}

function launchGame(chapter, score, returnToMenu, selectedLevel) {
  var levels = window.TrentLevels[chapter.id];
  var practice = testMode && returnToMenu && Number.isInteger(selectedLevel) &&
    selectedLevel >= 0 && selectedLevel < levels.length;
  active = {
    chapter: chapter,
    score: score,
    returnToMenu: returnToMenu,
    levels: levels,
    seen: new Set(),
    levelIndex: practice ? selectedLevel : 0,
    practice: practice
  };
  launchMissionLevel(active);
}

function launchFinalFight(chapter, returnToMenu) {
  active = {
    chapter: chapter, score: 0, returnToMenu: returnToMenu,
    levels: [null], seen: new Set(), levelIndex: 0, practice: true, finalFight: true
  };
  openMissionLevel(active, 'final-fight');
}

function launchMissionLevel(run) {
  var level = run.levels[run.levelIndex];
  run.runId = null;
  if (run.levels.length > 1) closeMission();
  if (level) {
    playIntro({
      id: run.chapter.id,
      musicLevel: level.id,
      kicker: run.chapter.kicker + ' · Level ' + (run.levelIndex + 1),
      title: level.title,
      lines: level.lines,
      filmSeconds: 24,
      captionFrames: [0, 192, 384],
      videoPath: './assets/level-video/' + level.id + '.mp4',
      videoVersion: level.videoVersion,
      allowSkip: run.seen.has(level.id)
    }, function () {
      run.seen.add(level.id);
      openMissionLevel(run, level.id);
    });
    return;
  }
  openMissionLevel(run);
}

function openMissionLevel(run, stage) {
  var chapter = run.chapter;
  if (window.TrentMusic) window.TrentMusic.startLevel(chapter.id, stage || 'main');
  run.runId = Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
  if (chapter.id === 'shelf') {
    window.TrentChapter6.startMission(run.score, {
      runId: run.runId, stage: stage, sequence: run.levels.length > 1 ? run.levelIndex + 1 : null
    });
    return;
  }
  var url = new URL(chapter.path, location.href);
  var bonus = run.score >= 8 ? run.score - 7 : 0;
  url.searchParams.set('runId', run.runId);
  if (stage) url.searchParams.set('stage', stage);
  if (run.levels.length > 1) url.searchParams.set('sequence', String(run.levelIndex + 1));
  if (bonus) url.searchParams.set('bonus', String(bonus));
  if (chapter.path === './wrapping-line/') url.searchParams.set('lives', String(7 + bonus));
  openMissionFrame(url.href, chapter.title + (run.finalFight ? ' · Final fight' : ''));
}

function afterIntro(chapter, options) {
  if (!chapter.number || options.skipQuiz) {
    launchGame(chapter, 0, options.returnToMenu);
    return;
  }
  window.TrentTrivia.start(chapter, {
    story: chapter.story,
    testMode: testMode,
    highlightCorrect: options.highlightCorrect,
    onClear: function (correct) { showQuizPin(chapter, correct, options.returnToMenu); },
    onHome: showStart
  });
}

function openChapter(id, options) {
  options = options || {};
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
  playIntro(chapter, function () { afterIntro(chapter, options); });
}

function showQuizPin(chapter, score, returnToMenu) {
  var section = document.createElement('section');
  section.className = 'campaign-start pin-card';
  section.innerHTML = '<p class="eyebrow"></p><h1 tabindex="-1">Quiz passed</h1>' +
    '<p class="pin-code"></p><p class="lead">Write down this quiz password. Enter it at the start screen to restart this chapter with correct answers highlighted in green.</p>' +
    '<button type="button" class="primary">Continue to minigame</button>';
  section.querySelector('.eyebrow').textContent = chapter.kicker + ' · ' + score + ' of 10 correct';
  var code = section.querySelector('.pin-code');
  code.textContent = chapter.quizPin;
  code.setAttribute('aria-label', 'Quiz password ' + code.textContent);
  section.querySelector('button').onclick = function () {
    launchGame(chapter, score, returnToMenu);
  };
  campaignRoot.replaceChildren(section);
  campaignRoot.hidden = false;
  section.querySelector('h1').focus({ preventScroll: true });
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
  copy.textContent = (nextId ? 'Use this password to open ' + byId(nextId).title + ' and replay earlier chapters. ' :
    'This completion password opens every chapter for replay. ') +
    'Trent, write it down. If you forget it, you’ll have to replay ' + chapter.title + ' to get back here.';
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
  if (window.TrentMusic) window.TrentMusic.startScene();
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
  if (window.TrentMusic) window.TrentMusic.startScene();
  resumeEndingAfterTurn = false;
  endingVideo.pause();
  endingVideo.hidden = true;
  document.getElementById('ending-skip').hidden = true;
  document.getElementById('ending-gate').hidden = false;
  document.querySelector('#ending-gate h1').textContent = 'Home';
  document.getElementById('ending-copy').textContent = 'Christmas is restored. Completion password: ' + COMPLETION_PIN +
    '. Trent, write it down. If you forget it, you’ll have to replay the final chapter to get back here.';
  document.getElementById('ending-play').hidden = true;
  document.getElementById('ending-home').hidden = false;
  document.getElementById('ending-home').focus({ preventScroll: true });
}

function showEnding(returnToMenu) {
  var home = document.getElementById('ending-home');
  var hasMenu = typeof returnToMenu === 'function';
  home.textContent = hasMenu ? 'Chapter menu' : 'Start screen';
  home.onclick = hasMenu ? returnToMenu : showStart;
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
  if (window.TrentMusic) window.TrentMusic.startIntro('ending');
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
  if (run.practice) {
    run.returnToMenu();
    return;
  }
  if (run.levelIndex + 1 < run.levels.length) {
    run.levelIndex++;
    launchMissionLevel(run);
    return;
  }
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
  if (!data || !data.runId || data.runId !== active.runId) return;
  if (data.type === 'trent:restart-minigame' && active.levels.length > 1) {
    if (!active.practice) active.levelIndex = 0;
    launchMissionLevel(active);
    return;
  }
  if (data.type !== active.chapter.event) return;
  finishMission();
});

document.getElementById('intro-skip').onclick = function () {
  if (introDone) introDone();
};
window.TrentOrientation.acceptMissionInstructions = function (source) {
  var frame = document.getElementById('game');
  if (document.getElementById('mission').hidden || source !== frame.contentWindow || source.location.href !== frame.src) return false;
  missionInstructionsAccepted = true;
  syncTurn();
  return true;
};
window.TrentOrientation.subscribe(syncTurn);
document.getElementById('ending-play').onclick = playEnding;
document.getElementById('ending-skip').onclick = showRestored;
document.getElementById('ending-home').onclick = showStart;
endingVideo.addEventListener('ended', showRestored);

window.TrentCampaign = {
  openMissionFrame: openMissionFrame,
  onShelfWon: function (runId) {
    if (active && active.chapter.id === 'shelf' && active.runId === runId) finishMission();
  }
};

showStart();
