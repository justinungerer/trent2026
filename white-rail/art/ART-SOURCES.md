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
