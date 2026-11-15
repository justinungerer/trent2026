# Campaign plan: Trent Saves Christmas

Status: The owner asked for this plan and the placeholder slots to be pushed to main.

## Where the code is

Current main is https://github.com/justinungerer/trent2026 at origin/main commit a2e3863, "Merge latest quiz presentation". That commit already contains the quiz presentation, Frosted Skies in `frosted-skies/`, Special Delivery in `chapter-2/`, Operation Ribbonfall in `shelf-escape/`, plus `ART-DIRECTION.md`, `COPILOT-HANDOFF.md`, and `CHAPTER-2-HANDOFF.md`. Those branches are already on main. Leave them there.

The current local checkout of that main is `c:\Users\justi\OneDrive\Documents\_Vibe coding\Trent 2026\trent2026-integration-64c5683287f6`.

The folder `c:\Users\justi\OneDrive\Documents\_Vibe coding\Trent 2026\trent2026` is an older checkout still at b957a7f, with uncommitted files. It is not current main. Do not use it as the base.

## What the campaign is

A static GitHub Pages site. No build step, no server, and no accounts. Paths stay relative so a repository subpath works.

In order, the player gets short opening credits, a prologue, ten chapters, and an ending video. The prologue and each chapter have their own minigame and their own playstyle. The ending video is separate from the ten minigames.

The look stays painted cartoon. No blood, no bodies, no Nazi insignia, and no jokes about victims.

The prologue is the Normandy landing on D-Day, 6 June 1944. The playable goal is to get Trent from the landing craft to the seawall through smoke, obstacles, and surf. It is an advance to the seawall, not a casualty simulator, not a Christmas-cargo comedy, and not a paperwork gag. A few months pass after the landing. Santa is captured after that gap. The ten chapters happen in that later season, near Christmas.

Action missions, including the prologue, are for a phone in landscape. A chapter that asks questions works in portrait.

## iPhone Safari

This is a smartphone game meant to run on Safari. iPhone Safari is the primary target, not a later extra test. Build every screen and minigame for that browser first.

Touch first. Every control works with a tap or a drag. Nothing important is hover-only. Action missions, including the prologue, stay landscape. The quiz and the start screen stay usable in portrait.

Use safe-area insets, `viewport-fit=cover`, and dynamic viewport height. Do not depend on `100vh` alone.

Audio and the ending video start only after a tap. The ending video uses `playsinline` and does not go fullscreen by itself. The 20-second intros stay sprite or canvas motion, so they do not depend on inline video autoplay.

The pin stays in localStorage. Paths stay relative. There is no build step. The same static files have to work in Safari, including under a GitHub Pages subpath.

## Player flow

### Start

1. The player chooses Start. Start does not ask for a pin.
2. Short opening-credit cards.
3. The prologue's 20-second intro, with the characters moving.
4. The D-Day minigame. The prologue has no questions.
5. The screen shows the pin that opens Chapter 1. The same browser stores that pin.

### A typed pin

1. On the start screen, the player types a pin. If this browser has a stored pin, the field can show it.
2. The page checks the pin against the list in the page. A pin that does not match stays on the start screen.
3. A pin from a finished chapter opens the next chapter at its start. That start is the chapter's 20-second intro, then its question step if this chapter has questions, then its minigame.
4. Winning shows the pin for the chapter after it. Chapter 10 does not. Winning Chapter 10 starts the ending video.

A failed minigame retries that chapter. It does not issue a new pin.

## Pins

A pin is a continue code carried in the page. It is also stored in localStorage. It is not security. Campaign resume does not use `trent-quiz-cinema2`.

Anyone who can see a pin can use it. The page holds the list. Each finished chapter reveals the one code that starts the next chapter. The start screen compares the typed code with that list. A match opens that next chapter from the beginning. There is no account and no server check. A player who edits the page can jump ahead. That is acceptable, because the code is a bookmark.

localStorage keeps the latest code under a new key, so the same browser can offer it in a new tab. Clearing site data removes the stored copy. A code written down still works on any other device that can open the site, because the list is in the page. The site cannot look a player up by itself.

## Opening credits

Short cards, played after Start and before the prologue intro. These cards are not the 20-second action intro.

The owner accepted these lines:

- Trent Saves Christmas
- Game design and production
- Justin Ungerer

## Chapters

The ten chapters each have a question step in the router. Until the later question bank exists, only Chapter 6 asks the current SOS, convoy, and Bombe questions. Every other chapter goes from its intro to its minigame. The prologue has no question step.

### Prologue — D-Day, 6 June 1944

Status: not started. Playstyle: beach advance from the landing craft to the seawall.

No questions. Winning issues the Chapter 1 pin. The Chapter 1 intro then opens a few months later, near Christmas.

### 1. The Night Broadcast

Status: not started. Playstyle: radio tuning.

Trent catches word that Santa has been captured.

### 2. Frosted Skies

Status: already on main in `frosted-skies/`. Playstyle: scrolling flight shooter. Not yet wired to the campaign.

On victory the mission emits `frosted-skies:complete` in its own window. Wiring adds a relay and accepts the result only after origin, source, and run id checks.

### 3. White Rail

Status: not started. Playstyle: rail chase on a handcar.

This is the handcar chase. The freight-yard stealth game is Chapter 4.

### 4. Special Delivery

Status: already on main in `chapter-2/`. Playstyle: overhead stealth. Not yet wired to the campaign.

On victory the mission emits `special-delivery:complete`. Wiring accepts it only after the same origin, source, and run id checks.

### 5. The Switch Tower

Status: not started. Playstyle: route puzzle.

Throw switches so the right train leaves.

### 6. The shelf operative, Operation Ribbonfall

Status: already on main in `shelf-escape/`. Playstyle: side-scrolling aim and wrap.

This is the only chapter with real questions today. Those questions are the current SOS, convoy, and Bombe items, and they still set the mission loadout. Three wrong answers fail the quiz. The action mission keeps its own retries. The on-screen label currently says Chapter 3. That label will change to Chapter 6.

### 7. The Listening Wire

Status: not started. Playstyle: one-screen timing.

Send a Morse message while lights sweep.

### 8. The Holding Camp

Status: not started. Playstyle: escort.

Stay with Santa and walk him out.

### 9. The Wrapping Line

Status: not started. Playstyle: rhythm.

Time the bows on a moving belt.

### 10. The Chimney Road

Status: not started. Playstyle: rooftop platformer to the sleigh.

Winning starts the ending video. No pin after Chapter 10.

## Ending video

A real video of the flight home and Christmas restored. It plays after Chapter 10 is won. It is not one of the ten minigames, and it is not a chapter intro.

## Twenty-second intros

The prologue and each of the ten chapters get a 20-second intro with the characters actually moving. Opening credits stay short cards.

Use sprite or canvas motion, as plain files, with no build step. Each intro is a short script and a WebP sprite sheet in that chapter's folder. The character performs a few actions while the background moves. About 24 to 48 frames is enough, because the frames can loop and the camera carries the rest of the 20 seconds. The page loads that sheet only when the player reaches that chapter. It does not preload the other intros.

Size budget: about 500 KB of images per intro, and under 1 MB including the script.

A video file was not chosen for these intros. Eleven clips would be a heavy download before every chapter, and a phone often will not play video until a tap, especially with sound. A sprite sheet is one image, it can start as soon as it loads, and the same scene can offer a skip when the player prefers reduced motion. If an intro has sound, the Start click or the pin confirmation is the gesture that unlocks it.

The ending is a video because the owner asked for an ending video. That is one file, played once, after Chapter 10 is won.

## Completion list

Work from the current main checkout, top to bottom. The quiz presentation, Frosted Skies, Special Delivery, and Operation Ribbonfall are already on main.

- [ ] Owner reviews this file. Push it to main only after the owner says so.
- [x] Owner confirmed the seven new playstyles, the three credit lines, and the D-Day goal (landing craft to the seawall).
- [ ] Use `trent2026-integration-64c5683287f6` as the base. Leave the older `trent2026` folder at b957a7f alone.
- [x] Empty quiz slots added in quiz-placeholders.js, not wired into the live page.
- [ ] Add the start screen: Start, or type a pin. Touch first, no hover-only controls. Portrait stays usable. Use relative paths and safe-area insets.
- [ ] Put the continue codes in the page, store the latest in localStorage under a new key, and check a typed pin on the start screen. Do not use `trent-quiz-cinema2` for campaign resume. The stored pin has to survive a new Safari tab on the same phone.
- [ ] Add one chapter router. Each of the ten chapters has a question step. Until the later question bank exists, only Chapter 6 asks the SOS, convoy, and Bombe questions. The other chapters go from their intro to their minigame. The prologue has no question step.
- [ ] Add the short opening-credit cards, using the three accepted lines.
- [ ] Add the 20-second sprite or canvas intro player. Load only the intro for the chapter being played. Stay inside the size budget above. Do not use inline video autoplay for these intros. If an intro has sound, start it only after the Start tap or the pin confirmation.
- [ ] Build the prologue: beach advance from the landing craft to the seawall. No questions. Winning issues the Chapter 1 pin.
- [ ] Build Chapter 1, The Night Broadcast, as radio tuning.
- [ ] Wire Frosted Skies (`frosted-skies/`) as Chapter 2. Accept `frosted-skies:complete` only after origin, source, and run id checks.
- [ ] Build Chapter 3, White Rail, as a handcar chase.
- [ ] Wire Special Delivery (`chapter-2/`) as Chapter 4. Accept `special-delivery:complete` only after the same checks.
- [ ] Build Chapter 5, The Switch Tower, as a route puzzle.
- [ ] Place Operation Ribbonfall (`shelf-escape/`) as Chapter 6. Keep the current three questions, the three-strike fail, and the loadout handoff. Change the on-screen label from Chapter 3 to Chapter 6.
- [ ] Build Chapter 7, The Listening Wire, as one-screen Morse timing.
- [ ] Build Chapter 8, The Holding Camp, as an escort.
- [ ] Build Chapter 9, The Wrapping Line, as a rhythm game.
- [ ] Build Chapter 10, The Chimney Road, as a rooftop platformer to the sleigh. Winning starts the ending video. No pin after Chapter 10.
- [ ] Add the ending video of the flight home and Christmas restored. Start it only after a tap. Use `playsinline`. Do not send it fullscreen by itself.
- [ ] Issue the next pin only after that chapter's minigame is won. A failed minigame retries the chapter and does not issue a pin.
- [ ] Test on iPhone Safari, not as a leftover pass: landscape action, portrait quiz and start screen, rotation, safe areas, a typed pin, reduced motion, the ending video after a tap, and a GitHub Pages subpath.

## Later: harder questions

The owner will write a harder question bank later. This plan does not draft any new question text.

The empty slots are in `quiz-placeholders.js` and are not loaded by `index.html`. Chapter 6 questions remain in `quiz.js`.

The router already has a question step on each of the ten chapters. That step should read questions from data, so the bank can drop in. Until the bank exists, only Chapter 6 asks the current SOS, convoy, and Bombe questions. The prologue still has no quiz.

## Decided

The owner confirmed all three:

- Keep the seven new playstyles: radio tuning, handcar chase, switch-tower puzzle, Morse under sweeping lights, escort, wrapping-line rhythm, and rooftop climb.
- Opening credits are exactly: "Trent Saves Christmas", "Game design and production", "Justin Ungerer".
- The D-Day goal is the landing craft to the seawall, through smoke, obstacles, and surf.