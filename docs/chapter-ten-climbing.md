# Chapter 10 climbing and searchlights

All three Chimney Road levels share this update.

- Climbable chimneys alternate between 216 and 324 world units tall, twice or three times their former 108-unit height. Visible painted art, top surfaces, rungs, side collisions, and climb limits use the same height.
- Both chimney faces block sideways passage below the top. Hold the up-arrow above the left-side movement buttons beside either face to climb. The right-side Jump button remains dedicated to jumping and double jumping. Movement locks to the chimney front, and a four-frame back-facing painted animation shows Trent climbing. Letting go places him back on the approach side, so releasing midway cannot bypass the wall. Reaching the top restores normal movement and jumping.
- Adjacent chimneys can be climbed in sequence. Double jumping remains available elsewhere, but cannot clear a tall chimney from its base.
- Searchlights appear at occasional openings between main roofs: four in The Eaves, three in Above the Lanterns, and five in the final Chimney Road route. A painted projector sends a moving beam up from below.
- Each light sweeps for three seconds, followed by five fully clear seconds. A visible countdown reports sweep or clear time. Spotting an exposed player starts a four-second warning and volley. The first bullet fires immediately on contact, followed by bullets at 1, 2, and 3 seconds during the four-second volley. Detection uses the same polygon that draws the visible beam and the painted bounds of Trent’s current animation, including his head, arms, and climbing pose. It applies outside the roof-gap center and during respawn immunity. Bullets angle upward from below, aiming at the player at launch, then follow fixed paths so they can be dodged. Roofs and chimneys block bullets. Detection itself causes no damage; a bullet hit takes one fall and clears the volley. The same sweep cannot repeatedly restart firing.
- The searchlight clock uses active gameplay time and stops on pause. Retry restarts the schedule. Instructions explain climbing, the clear window, and searchlight-triggered gunfire and dodging.

WebKit phone checks exercise all 20 climbable chimneys, both side collisions, climbing, release-side protection, top exits, adjacent-chimney sequences, double-jump blocking, animated source frames, all light timing cycles, detection, fall/checkpoint behavior, roof cover, pause, and all three completion paths. Screenshots inspected for the back-facing pose, tall chimney art, moving beam, and readable countdown.

Generated asset paths and exact prompts are recorded in `chimney-road/art/ART-SOURCES.md`.

The gunfire update additionally checks the dedicated climb touch control, independent Jump release, exact four-shot cadence, no immediate detection damage, swept bullet hits, dodging, solid cover, pause, and retry resets in all three stages.

Chapter-menu divider lines now use `assets/chapter-menu-lights.webp`, a generated painted strand of Christmas lights. Space above each divider increases from 18 to 22.5 pixels. Space below increases from 24 to 30 pixels, including the existing 12-pixel chapter-list gap. These are both 1.25 times the previous spacing. Divider art is decorative, and chapter access controls remain unchanged.

The beam-contact fix verifies upper-body and climbing-pose contact, contact outside the gap while standing on a roof, detection during respawn immunity, immediate first-shot launch, follow-up shots at one-second intervals, and no firing for a switched-off light or a character outside the visible cone. Beam drawing and detection share the same polygon. Transparent sprite margins are excluded using cached painted-frame bounds. Bullet cover remains independent of detection.

## Level 1 opening lesson

The first roof now ends in a 324-unit chimney. The next landing starts at x=520, y=-184, 160 units above the chimney top at y=-24. A single jump rises approximately 134 units; a timed double jump can rise approximately 194 units. The original lower lantern roof remains accessible after this landing. This practice crossing has no searchlight or added crate.

A red arrow and “Climb this chimney” cue appear only beside the starting chimney. No double-jump hint appears before an attempt. Missing that first crossing records a normal fall, returns Trent to the chimney top, and reveals “Try a double jump — Tap Jump again near the top.” Landing on the practice platform removes both lesson cues for the remainder of the run. The generic in-game instruction banner is hidden elsewhere. Starting or restarting the level resets the lesson.

WebKit simulation used normal movement, climbing, and jump input: it walked to the blocked chimney, climbed it, verified that a single jump fails and exposes the retry hint, completed the crossing with a second jump near the apex, then continued to collect the original lantern. Checks also verify that levels 2 and 3 do not get the lesson and that existing climbing, searchlight contact, immediate gunfire, menu dividers, and completion paths still work.

## Missing lantern at the sleigh

Reaching the level 1 sleigh without its lantern opens a message: “You can’t take off without the lantern you dropped. Go find it on the lower coach-house roof, then come back to the sleigh.” Dismissing it resumes at the same location and checkpoint. The message remains dismissed until Trent leaves the sleigh area, so he can walk away without being trapped by repeated dialogs. Collecting the lantern preserves his location and checkpoint; he must return to the sleigh to finish. Both former shortcut movements, to the lantern and back to the sleigh, have been removed.
