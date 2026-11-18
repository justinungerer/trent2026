# White Rail art sources

These paintings were generated for this repository. They are original artwork for this game, not a third-party license.

## rails.webp

Painted snowy rail bed, opaque, 1600 × 900 px. Dark rails, snow banks, and winter trees in the distance. No text. The right edge is feathered into the left edge so the picture can scroll as a horizontal repeat.

- Sky source: rows 0–668. Sky, distant trees, and the snow field.
- Rail bed source: rows 640–860 (height 220). The rail center is 37% of the way down that band, which is where each lane is anchored.

## handcar.webp

Side view of a pump handcar, transparent background. 774 × 431 px.

- Wheel-bottom anchor: (386, 426). That point sits on the lane.
- Deck top: y 214. Trent's boots rest on that line.

## trent.webp

Horizontal strip of equal frames on a transparent background. The feet share one baseline. Trent faces right in a brown wool coat, red scarf, round helmet, and brown boots, with both hands on the pump handle.

- Frame width: 459 px
- Frame height: 512 px
- Frame count: 6
- Order, left to right: high, down, forward, low, rising, high
- Foot anchor: (168, 495) in every frame. X is the center of the soles. Y is the shared sole baseline.
- Milliseconds per frame: about 53. One pump stroke moves the animation from 0 to 1 in 320 ms, and the six frames play in that order across the stroke. Holding Pump starts the stroke again whenever the pump cooldown allows. When the stroke is finished, frame 0 holds.


## Painted tank and track additions

Generated with the built-in image generation tool on November 18, 2026.

`painted-tank.webp` is a 1024 × 936 transparent tank sprite used beside the tracks in levels 2 and 3.

The tank prompt was “A single WWII German heavy tank as a high resolution painted game sprite, semi realistic hand painted texture matching a snowy Christmas WWII action game. Front three quarter view seen slightly from above, tank facing the viewer with its long cannon pointing toward the bottom of the image, olive grey battered armor, snow resting on turret and tracks, dark steel treads, tiny warm headlamp, closed hatch and no people. Full tank silhouette including gun and tracks inside the frame. True transparent background, no ground plane, no floor shadow, no scenery, no text, no insignia. Detailed metal panels and snow accents, easy to recognize at small game sizes.”

`painted-track.webp` is a 1024 × 1536 overhead rail painting. The game projects its texture from fixed world positions, including breaks in the rail.

The track prompt was “High resolution painted game texture, one straight railway track viewed perfectly from directly overhead, flat orthographic top down view. Portrait canvas. Exactly two straight parallel steel rails running vertically from top edge to bottom edge, evenly spaced weathered wooden sleepers between and beyond the rails, iron bolts and rail clips, gravel ballast with soft powder snow along the sides and on the wood, dark steel and brown timber with cold winter blue snow. The rails and sleeper pattern must be parallel throughout with no perspective or vanishing point. Seamless continuous vertical repeating texture so the top and bottom edges join. One track centered with generous ballast edges. No train, no tank, no characters, no text, no buildings, no horizon, no shadows cast from objects outside the texture. Semi realistic rich hand painted game art, crisp detailed wood grain and metal texture.”
