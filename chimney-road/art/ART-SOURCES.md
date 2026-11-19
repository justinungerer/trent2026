# Chimney Road art sources

These paintings were generated for this repository. They are original artwork for this game, not a third-party license.

## trent.webp

Horizontal strip of equal frames on a transparent background. The feet share one baseline.

- Frame width: 558 px
- Frame height: 578 px
- Frame count: 8
- Order: idle, idle, run contact, run leap, run leap, run leap, jump rising, jump falling.
- Anchor: (210, 568) in every frame, at the feet. X is the center of the lower sole. Y is the shared sole baseline. The game lifts the whole frame when Trent is in the air; the jump poses are not extra height in the strip.
- Milliseconds per frame:
  - idle: 520
  - run: 90, while he is on a roof and moving
  - jump rising: the single rising frame while vertical speed is upward
  - jump falling: the single falling frame while vertical speed is downward

## panorama.webp

Painted night village of snowy roofs, opaque. 1280 × 720 px. Moon, pines, and lit windows. It scrolls slowly behind the platforms. No people and no text.

## roof.webp

One straight snowy roof on a transparent background, 1100 × 192 px. The walk surface is the top edge of the bitmap (the snow cap). Tiles and icicles hang below that line and are not the collision. The game stretches this sprite to each platform.

## crate.webp

A wooden crate with a cap of snow, transparent background, 360 × 232 px. It slides on the long roof. The top edge is the surface Trent can land on.

## sleigh.webp

A small parked wooden sleigh, side view, transparent background, 520 × 331 px. Honey-colored wood, red runners, a brass bell, and a pine sprig. It sits on the last roof. It is not a copy of the Frosted Skies sleigh.


## Tall-chimney climb and searchlight update

Generated using the built-in image generation tool. Outputs inspected and converted to WebP while preserving transparency.

`trent-climbing-painted.webp`: 1536 × 1024, four back-facing climbing poses. Clothing/style reference: existing `trent.webp`.

Prompt:

Create a high resolution painted character animation atlas for the snowy WWII platform game. Use the supplied character sheet as clothing, colour and painted style reference. Trent is an 18 year old slim Allied hero in an olive helmet, long brown winter coat, brown trousers and boots, red scarf. EXACTLY four equal cells arranged 2 columns by 2 rows. Every pose is FULL BACK VIEW, facing AWAY from the viewer, climbing an invisible vertical ladder. Same scale and centered anchor in all four cells, boots near bottom. Frame1 left arm reaching upward and right knee raised; frame2 right arm reaching upward and left knee raised; frame3 left hand high pulling upward with alternate lower foot; frame4 right hand high pulling upward alternate lower foot. Distinct coordinated climbing arm and leg positions. No actual ladder, no wall, no words, no grid lines, no backdrop, no floor shadows. Genuine fully transparent background. Detailed hand painted art matching the reference, full character within each cell and empty margins.

`painted-searchlight.webp`: isolated painted WWII searchlight projector. The moving beam and timers are rendered in canvas.

Prompt:

High resolution realistically hand painted WWII military rooftop searchlight projector prop, single isolated heavy steel searchlight with large circular pale glass lens tilted upward on a dark olive yoke and tripod base. Weathered metal details, cold snowy highlights, three quarter view. No beam painted into image, no text, no insignia, no people. All parts fully within frame with empty margins. Truly transparent background, no haze or shadow.
