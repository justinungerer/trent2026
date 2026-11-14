# Switch Tower art sources

These paintings were generated for this repository. They are original artwork for this game, not a third-party license, and they are not copied from Frosted Skies or any other pack.

Trent is the same young man as the prologue: brown wool coat, red scarf, round helmet, brown boots. The yard is a smooth painted cartoon in the same winter palette as Frosted Skies.

No guns, no blood, and no insignia.

## scene.webp

Painted snowy switch yard, opaque. 1280 × 720 px. A wooden tower, pines, lanterns, and one main track through the snow. No text.

The near rail, used to seat the train, sits about here in this picture:

- x 250, y 506
- x 530, y 464
- x 800, y 448
- x 950, y 442

## board.webp

Painted wooden destination board, transparent outside the planks. 960 × 424 px.

Three pictures, left to right: lever thrown left, lever thrown right, lever thrown left. Those are the lever frames below, scaled into the panels. No words.

The game draws the whole board at view x 430, y 16, width 420.

## lever.webp

Two equal frames on a transparent background. The bases share one ground line. No divider between the frames.

- Frame width: 340 px
- Frame height: 663 px
- Sheet: 680 × 663 px
- Frame count: 2
- Order, left to right: thrown left, thrown right
- Base anchor: (150, 653) in every frame. X is the center of the stand. Y is the bottom of the base.
- The game shows one frame at a time. It is not a timed loop.

## train.webp

Side view of a small mail locomotive and tender, facing right, transparent background. 405 × 251 px. A wreath and a red bow, no letters.

- Wheel-bottom anchor: (202, 242). That point sits on the near rail.

## trent.webp

Horizontal strip of equal frames on a transparent background. The feet share one baseline. No horizontal rules or bars between frames. The frames were keyed and packed separately.

Trent faces right in a brown wool coat, red scarf, round helmet, and brown boots.

- Frame width: 360 px
- Frame height: 527 px
- Sheet: 2160 × 527 px
- Frame count: 6
- Order, left to right: idle, idle, reach, grip, haul, settle
- Foot anchor: (80, 518) in the idle frames. X is the center of the soles. Y is the shared sole baseline. The haul frame steps forward, so that boot sits a little to the right of the idle sole point.
- Milliseconds per frame:
  - idle: 450, looping while he is not pulling
  - pull: 120. The four pull frames divide one 480 ms throw, then idle resumes.
