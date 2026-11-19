# Chapter 10 climbing and searchlights

All three Chimney Road levels share this update.

- Climbable chimneys alternate between 216 and 324 world units tall, twice or three times their former 108-unit height. Visible painted art, top surfaces, rungs, side collisions, and climb limits use the same height.
- Both chimney faces block sideways passage below the top. Hold the up-arrow above the left-side movement buttons beside either face to climb. The right-side Jump button remains dedicated to jumping and double jumping. Movement locks to the chimney front, and a four-frame back-facing painted animation shows Trent climbing. Letting go places him back on the approach side, so releasing midway cannot bypass the wall. Reaching the top restores normal movement and jumping.
- Adjacent chimneys can be climbed in sequence. Double jumping remains available elsewhere, but cannot clear a tall chimney from its base.
- Searchlights appear at occasional openings between main roofs: four in The Eaves, three in Above the Lanterns, and five in the final Chimney Road route. A painted projector sends a moving beam up from below.
- Each light sweeps for three seconds, followed by five fully clear seconds. A visible countdown reports sweep or clear time. Spotting an exposed player starts a four-second warning and volley. The first bullet fires immediately on contact, followed by bullets at 1, 2, and 3 seconds during the four-second volley. Detection uses the same polygon that draws the visible beam and the painted bounds of Trent’s current animation, including his head, arms, and climbing pose. It applies outside the roof-gap center and during respawn immunity. Bullets angle upward from below, aiming at the player at launch, then follow fixed paths so they can be dodged. Roofs and chimneys block bullets. Detection itself causes no damage; a bullet hit takes one fall and clears the volley. The same sweep cannot repeatedly restart firing.
- The searchlight clock uses active gameplay time and stops on pause. Retry restarts the schedule. Instructions explain climbing, the clear window, and searchlight-triggered gunfire and dodging.

WebKit phone checks exercise all 19 climbable chimneys, both side collisions, climbing, release-side protection, top exits, adjacent-chimney sequences, double-jump blocking, animated source frames, all light timing cycles, detection, fall/checkpoint behavior, roof cover, pause, and all three completion paths. Screenshots inspected for the back-facing pose, tall chimney art, moving beam, and readable countdown.

Generated asset paths and exact prompts are recorded in `chimney-road/art/ART-SOURCES.md`.

The gunfire update additionally checks the dedicated climb touch control, independent Jump release, exact four-shot cadence, no immediate detection damage, swept bullet hits, dodging, solid cover, pause, and retry resets in all three stages.

Chapter-menu divider lines now use `assets/chapter-menu-lights.webp`, a generated painted strand of Christmas lights. Space above each divider increases from 18 to 22.5 pixels. Space below increases from 24 to 30 pixels, including the existing 12-pixel chapter-list gap. These are both 1.25 times the previous spacing. Divider art is decorative, and chapter access controls remain unchanged.

The beam-contact fix verifies upper-body and climbing-pose contact, contact outside the gap while standing on a roof, detection during respawn immunity, immediate first-shot launch, follow-up shots at one-second intervals, and no firing for a switched-off light or a character outside the visible cone. Beam drawing and detection share the same polygon. Transparent sprite margins are excluded using cached painted-frame bounds. Bullet cover remains independent of detection.
