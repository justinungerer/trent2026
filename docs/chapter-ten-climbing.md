# Chapter 10 climbing and searchlights

All three Chimney Road levels share this update.

- Climbable chimneys alternate between 216 and 324 world units tall, twice or three times their former 108-unit height. Visible painted art, top surfaces, rungs, side collisions, and climb limits use the same height.
- Both chimney faces block sideways passage below the top. Hold Jump beside either face to climb. Movement locks to the chimney front, and a four-frame back-facing painted animation shows Trent climbing. Letting go places him back on the approach side, so releasing midway cannot bypass the wall. Reaching the top restores normal movement and jumping.
- Adjacent chimneys can be climbed in sequence. Double jumping remains available elsewhere, but cannot clear a tall chimney from its base.
- Searchlights appear at occasional openings between main roofs: four in The Eaves, three in Above the Lanterns, and five in the final Chimney Road route. A painted projector sends a moving beam up from below.
- Each light sweeps for three seconds, followed by five fully clear seconds. A visible countdown reports sweep or clear time. Roof cover blocks detection. An exposed player caught in an active beam takes one fall and returns to the normal checkpoint.
- The searchlight clock uses active gameplay time and stops on pause. Retry restarts the schedule. Instructions explain climbing, the clear window, and searchlight falls.

WebKit phone checks exercise all 19 climbable chimneys, both side collisions, climbing, release-side protection, top exits, adjacent-chimney sequences, double-jump blocking, animated source frames, all light timing cycles, detection, fall/checkpoint behavior, roof cover, pause, and all three completion paths. Screenshots inspected for the back-facing pose, tall chimney art, moving beam, and readable countdown.

Generated asset paths and exact prompts are recorded in `chimney-road/art/ART-SOURCES.md`.
