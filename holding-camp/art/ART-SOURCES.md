# Holding Camp art sources

The pictures in this folder are original paintings made for this game. They are not a third-party license, and they are not copies of Capcom or other published brawler sprites. No downloaded sprite packs.

`scene.webp`, `trent.webp`, and `santa.webp` are the earlier yard and walk paintings. The campaign intro still uses them. They were not replaced.

The brawler uses the `brawl-` files below. Each character strip is one row of equal frames on a transparent background. Within a character, every frame uses the same cell size. The anchor is the sole on the shared baseline, so a punch does not shuffle the feet. The game flips a frame when the actor faces left. The source paintings face right.

Poses were generated as painted cartoon strips on a flat magenta field, then keyed, scaled so standing heights match inside each character, and pasted so the soles share one anchor. The heavy uppercut strip is four of those painted frames in order: guard, windup, raised fist, recovery.

## Timing

These are the clocks the fight uses. A loop wraps. A one-shot holds its last frame.

- Idle and walk loop.
- Santa's punch is 4 frames at 50 ms (200 ms). Damage lands on frame 3 (index 2). Then 100 ms of cooldown. Damage is 1.
- Santa's uppercut is 4 frames at 120 ms (480 ms). Damage lands on frame 3. Then 260 ms of cooldown. Damage is 3.
- A hit pose plays once and holds while the actor is staggered.
- A defeat pose plays once. Guards then flash for about half a second and are removed. Santa's defeat holds while he sits.

## brawl-santa-idle.webp

Santa, red coat, white fur, black belt, gold buckle, brown boots and mittens, red hat. Not a soldier.

- Frame size: 442 × 476
- Frames: 3
- Order: idle, breath, blink
- Anchor: (184, 464)

## brawl-santa-walk.webp

- Frame size: 442 × 476
- Frames: 4
- Order: left step, passing, right step, passing
- Anchor: (184, 464)

## brawl-santa-punch.webp

- Frame size: 442 × 476
- Frames: 4
- Order: guard, jab extended, jab extended, recovery
- Anchor: (184, 464)

## brawl-santa-upper.webp

- Frame size: 442 × 476
- Frames: 4
- Order: crouch, rising, uppercut extended, follow-through
- Anchor: (184, 464)

## brawl-santa-hit.webp

- Frame size: 442 × 476
- Frames: 2
- Order: flinch, stagger
- Anchor: (184, 464)

## brawl-santa-defeat.webp

- Frame size: 442 × 476
- Frames: 2
- Order: dizzy sit, dizzy sit
- Anchor: (184, 464)
- A small painted snow mound sits under him. It is part of the frame, not a separate sprite.

## brawl-light-idle.webp

Slim guard in a green knit cap, teal jacket, cream scarf, brown mittens. No badge, no insignia, no weapon.

- Frame size: 324 × 418
- Frames: 1
- Order: idle
- Anchor: (166, 406)

## brawl-light-walk.webp

- Frame size: 324 × 418
- Frames: 2
- Order: left step, right step
- Anchor: (166, 406)

## brawl-light-punch.webp

- Frame size: 324 × 418
- Frames: 4
- Order: guard, windup, jab extended, recovery
- Anchor: (166, 406)

## brawl-light-upper.webp

- Frame size: 324 × 418
- Frames: 4
- Order: crouch, rising, fist high, recovery
- Anchor: (166, 406)

## brawl-light-hit.webp

- Frame size: 324 × 418
- Frames: 2
- Order: flinch, stagger
- Anchor: (166, 406)

## brawl-light-defeat.webp

- Frame size: 324 × 418
- Frames: 2
- Order: dizzy sit, dizzy sit
- Anchor: (166, 406)
- Painted swirl marks float above his hat. They vanish with the frame.

## brawl-mid-idle.webp

Plump guard in a navy coat, cream scarf, green knit cap. No badge, no insignia, no weapon.

- Frame size: 378 × 476
- Frames: 2
- Order: idle, blink
- Anchor: (174, 464)

## brawl-mid-walk.webp

- Frame size: 378 × 476
- Frames: 2
- Order: left step, right step
- Anchor: (174, 464)

## brawl-mid-punch.webp

- Frame size: 378 × 476
- Frames: 4
- Order: guard, windup, jab extended, recovery
- Anchor: (174, 464)

## brawl-mid-upper.webp

- Frame size: 378 × 476
- Frames: 4
- Order: crouch, fist high, fist high, recovery
- Anchor: (174, 464)

## brawl-mid-hit.webp

- Frame size: 378 × 476
- Frames: 1
- Order: flinch
- Anchor: (174, 464)

## brawl-mid-defeat.webp

- Frame size: 378 × 476
- Frames: 1
- Order: dizzy sit
- Anchor: (174, 464)

## brawl-heavy-idle.webp

Broad guard in a long brown coat, red scarf, and cream trapper hat. No badge, no insignia, no weapon.

- Frame size: 426 × 476
- Frames: 2
- Order: idle, blink
- Anchor: (193, 465)

## brawl-heavy-walk.webp

- Frame size: 426 × 476
- Frames: 2
- Order: left step, right step
- Anchor: (193, 465)

## brawl-heavy-punch.webp

- Frame size: 426 × 476
- Frames: 4
- Order: guard, windup, punch extended, recovery
- Anchor: (193, 465)

## brawl-heavy-upper.webp

- Frame size: 426 × 476
- Frames: 4
- Order: guard, windup, raised fist, recovery
- Anchor: (193, 465)
- Guard, windup, and recovery are the punch paintings. The raised fist is its own painting, pasted into the same cell.

## brawl-heavy-hit.webp

- Frame size: 426 × 476
- Frames: 1
- Order: flinch
- Anchor: (193, 465)

## brawl-heavy-defeat.webp

- Frame size: 426 × 476
- Frames: 2
- Order: dizzy sit, dizzy sit
- Anchor: (193, 465)

## brawl-yard.webp

Painted side view of the snowy yard at night, opaque, 1280 × 720. Cabins, pines, and a wooden fence sit in the top of the picture. The open snow fills the lower portion. No people and no text. The fight scales it so the snow line meets the top of the movement band, which is three quarters of the screen, and tiles it along the lane.

The measured snow line is 39.03% down the painting (`yardHorizon` in `frames.js`).

## brawl-gate.webp

A wooden gate with a wreath and a red bow, transparent background, 457 × 590. No text and no insignia. Drawn at the end of the lane, feet on the near edge of the movement band.

## brawl-cocoa.webp

A blue mug of cocoa with cream and a candy cane, transparent background, 584 × 658. Two of these sit on the lane. Each is worth 1 hit point, and Santa cannot rise above 5.

## scene.webp

Earlier painted yard, opaque, kept for the campaign intro. 1280 × 720. Cabins, a palisade, a gate with a wreath, and one lamp post. No people and no text.

## trent.webp

Earlier horizontal strip, kept for the campaign intro. Equal frames on a transparent background. The feet share one baseline.

- Frame width: 412 px
- Frame height: 628 px
- Frame count: 4
- Order: contact, passing, contact, passing. A walk to the right.
- Anchor: (168, 618) in every frame, at the feet.

## santa.webp

Earlier Santa strip, kept for the campaign intro. It is not the brawler sheet.

Horizontal strip of equal frames on a transparent background. Santa is a round friendly figure in a red coat with white fur, a black belt with a gold buckle, brown boots, and a red hat.

- Frame width: 477 px
- Frame height: 515 px
- Frame count: 4
- Order, left to right: idle, punch, hit, defeat
- Anchor: (210, 509)

## warden.webp

Earlier night-watchman strip, kept in the folder. It is not used by the brawler. Navy coat, cream scarf, green knit cap, brown boots. No badge, no insignia, no helmet, and no weapon. The art faces left.

- Frame width: 395 px
- Frame height: 469 px
- Frame count: 3
- Order, left to right: idle, punch, defeat
- Anchor: (162, 463)

## yard.webp

Earlier painted side view of the snowy yard, opaque, 1280 × 720. Kept in the folder. The brawler uses `brawl-yard.webp` so the open snow matches the taller movement band.


## November 18 maze and boss art

Generated with the built-in image generation tool. Original output inspected, alpha preserved, cropped into texture tiles or converted to WebP.

Prompt (boss1):

High resolution painted game sprite atlas exactly 2 columns by 2 rows, four equal cells. One unique fictional WWII prison key warden, bulky man in dark olive winter officer coat, brass keyring at belt, grey moustache, boots, no insignia or text. Side view facing right full body with feet near bottom of each cell, same scale and position. Top left standing defensive, top right walking forward left leg, bottom left walking forward right leg, bottom right punching right arm forward. Realistic detailed hand painted storybook action game art. No blood. Isolated on genuinely transparent background. All four separate poses fully within cells.

Prompt (boss2):

High resolution painted game sprite atlas exactly 2 columns by 2 rows four equal cells. One unique fictional WWII yard enforcer, tall broad man in charcoal winter greatcoat with steel helmet and burgundy scarf, no insignia or text. Side view facing right full body with feet near bottom of each cell, same scale and position. Top left standing defensive, top right walking forward left leg, bottom left walking forward right leg, bottom right powerful punching right arm forward. Realistic detailed hand painted storybook action game art. No blood. Isolated on genuinely transparent background. All four separate poses fully within cells.

Prompt (cleanup):

Edit the provided sprite atlas. Preserve exactly the same four characters, poses, colours, detailed painted artwork and 2 by 2 layout. Remove ALL background, checker pattern, divider lines, borders, ground shadows, and grid seams, leaving only the four character cutouts on genuinely fully transparent alpha zero background. Nothing may touch the outer or center edges. No white matte. Keep all boots and hands within their individual equal cells. Output square atlas.

Assets: `boss-warden-painted.webp` and `boss-enforcer-painted.webp`, four 627-square poses each, animated for walking and strikes.


## Painted regular guards throughout Chapter 8

Built-in image generation tool, inspected and converted to WebP preserving alpha. Each atlas is 1536 by 1024 with six 512-square poses: idle, two walking poses, strike, recoil, seated defeat. WWII period sentries in grey military uniforms, no insignia.

Asset: `guard-light-painted.webp`

Prompt:

High resolution realistically painted sprite sheet for a fictional WWII adventure videogame. One lean adult sentry, grey wool WWII military tunic, leather belt, steel helmet, clean shaven. Exactly 3 columns by 2 rows, six equal square cells in a 1536 by 1024 image. Full body profile facing RIGHT in all cells, same character and same size, boots near bottom edge of each cell. Top row: standing fists raised; walking with left foot forward; walking with right foot forward. Bottom row: extending right fist horizontally in an action pose; leaning backward with hands raised; sitting down dazed. Empty hands. Detailed painted clothing, realistic anatomy, muted period colours. No lettering, no political emblems, no symbols. Each figure isolated with generous empty margins within its cell. Fully transparent alpha zero background with no haze, no grid lines, no shadows and no borders.

Asset: `guard-mid-painted.webp`

Prompt:

High resolution realistically painted sprite sheet for a fictional WWII adventure videogame. One stocky middle aged sentry wearing dark grey belted military winter tunic, side cap, short dark moustache. Exactly 3 columns by 2 rows, six equal square cells in a 1536 by 1024 image. Full body profile facing RIGHT in all cells, same character and same size, boots near bottom edge of each cell. Top row: standing fists raised; walking with left foot forward; walking with right foot forward. Bottom row: extending right fist horizontally in an action pose; leaning backward with hands raised; sitting down dazed. Empty hands. Detailed painted clothing, realistic anatomy, muted period colours. No lettering, no political emblems, no symbols. Each figure isolated with generous empty margins within its cell. Fully transparent alpha zero background with no haze, no grid lines, no shadows and no borders.

Asset: `guard-heavy-painted.webp`

Prompt:

High resolution realistically painted sprite sheet for a fictional WWII adventure videogame. One large broad adult sentry, long grey green WWII military greatcoat, leather gloves, steel helmet. Exactly 3 columns by 2 rows, six equal square cells in a 1536 by 1024 image. Full body profile facing RIGHT in all cells, same character and same size, boots near bottom edge of each cell. Top row: standing fists raised; walking with left foot forward; walking with right foot forward. Bottom row: extending right fist horizontally in an action pose; leaning backward with hands raised; sitting down dazed. Empty hands. Detailed painted clothing, realistic anatomy, muted period colours. No lettering, no political emblems, no symbols. Each figure isolated with generous empty margins within its cell. Fully transparent alpha zero background with no haze, no grid lines, no shadows and no borders.

- stamina-cookie.webp uses a generated transparent gouache illustration of a golden chocolate-chip cookie. It restores stamina in all Holding Camp levels.
