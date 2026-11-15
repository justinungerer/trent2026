# Holding Camp art sources

These paintings were generated for this repository. They are original artwork for this game, not a third-party license. No downloaded images and no third-party sprites.

The fight uses `santa.webp`, `warden.webp`, and `yard.webp`. `scene.webp` and `trent.webp` are the earlier yard and walk paintings. They stay in this folder for the campaign intro.

## santa.webp

Horizontal strip of equal frames on a transparent background. Santa matches the earlier painted Santa: a round friendly figure in a red coat with white fur, a black belt with a gold buckle, brown boots, and a red hat. He is not a soldier. The sheet replaces the old four-frame walk.

The feet of the standing poses share one baseline. The defeat pose sits on that same baseline.

- Frame width: 477 px
- Frame height: 515 px
- Frame count: 4
- Order, left to right: idle, punch, hit, defeat
- Anchor: (210, 509) in every frame. X is the center of the lower sole. Y is the shared ground baseline.
- Idle is held while Santa is on his feet and not punching.
- Punch is held for 180 ms, then idle.
- Hit is held for 280 ms, then idle.
- Defeat is held while Santa is sitting, about 1200 ms, then he stands in idle.
- The strip is one row. There is no loop on idle.

## warden.webp

Horizontal strip of equal frames on a transparent background. Each warden is a plump night watchman in a navy wool coat, cream scarf, green knit cap, and brown boots. No badge, no insignia, no helmet, and no weapon. The art faces left.

The feet of the standing poses share one baseline. The defeat pose sits on that same baseline.

- Frame width: 395 px
- Frame height: 469 px
- Frame count: 3
- Order, left to right: idle, punch, defeat
- Anchor: (162, 463) in every frame. X is the center of the lower sole. Y is the shared ground baseline.
- Idle is held while a warden is waiting or flinching. A flinch does not have its own frame.
- Punch is held for 200 ms.
- Defeat is held once he is sitting in the snow.

## yard.webp

Painted side view of the snowy yard at night, opaque. 1280 × 720 px. Log cabins, pines, a wooden fence, one lantern, and a wooden gate with a wreath. No people and no text.

## scene.webp

Earlier painted yard, opaque, kept for the campaign intro. 1280 × 720 px. Cabins, a palisade, a gate with a wreath, and one lamp post. No people and no text.

## trent.webp

Earlier horizontal strip, kept for the campaign intro. Equal frames on a transparent background. The feet share one baseline.

- Frame width: 412 px
- Frame height: 628 px
- Frame count: 4
- Order: contact, passing, contact, passing. A walk to the right.
- Anchor: (168, 618) in every frame, at the feet.
