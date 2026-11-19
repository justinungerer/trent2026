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


## Final rooftop boxing encounter

The following original assets were created with the built-in image-generation tool, visually inspected, and converted to WebP with the original alpha preserved. The enemy body and historical face are composed at runtime in `boxing.js`; no likeness generation is used.

### boxing-rooftop.webp

Prompt:

High resolution semi-realistic hand painted landscape game background, wide 16:9 composition of a makeshift boxing ring on a snowy WWII airfield hangar rooftop at night. Ring ropes and posts framing the outer edges, empty flat central ring floor for two fighters, snow and industrial searchlights in the distant background, a Christmas sleigh parked beyond the back ropes at the right. Dramatic cold blue moonlight and warm amber lamps, no people, no words, no symbols. Camera from just behind one fighter's position looking towards far side of ring, low third-person boxing videogame composition, clear uncluttered center. Detailed painted textures.

### trent-boxing-painted.webp

Prompt:

High resolution realistically hand painted four-pose game animation atlas exactly 2 columns by 2 rows equal cells. Trent, an 18 year old slim Allied hero seen ONLY FROM BEHIND facing away from camera, olive helmet, long brown winter coat, red scarf and dark boxing gloves. Full body consistent anchor and scale boots at bottom. Top left boxing guard fists raised, top right left arm punching forward, bottom left right arm punching forward, bottom right crouching defensive block both gloves up covering head. Match a painted WWII snowy adventure game style. No weapons, no text or insignia, no ladder or wall. Each pose isolated fully inside cell with empty margins. Truly transparent alpha zero background, no glow no shadows no grid lines.

### painted-bomb.webp

Prompt:

A hand painted stylized videogame falling-projectile icon: simple olive-green teardrop shaped metal movie prop with four little fins at its top, pointed nose downward. No diagrams or internal components, no text or symbols. Single isolated game object on truly transparent background, all parts within frame. Painted adventure game style, chunky readable silhouette.

### hitler-boxing-painted.webp

Prompt:

High resolution realistically painted character sprite atlas for an arcade sports videogame. An older stern European man with dark side-parted hair wearing a plain grey belted long-sleeve jacket, dark trousers, boots and dark padded sports gloves. Six equal square cells in 3 columns by 2 rows. Full body FRONT view same scale and centered boots near cell bottom. Top row: guard fists up, left shoulder drawn back, right shoulder drawn back. Bottom row: right glove extended toward camera, left glove extended toward camera, seated tired hands down. Same face and clothing in every cell. No emblems or insignia, no lettering, no other people, no blood or injuries. Hand painted fabric and face details, transparent background with no floor shadows, no haze, no grid lines. Every figure isolated within generous cell margins.

### Historical face: hitler-front-historical.jpg

Heinrich Hoffmann, 1938. **Bundesarchiv, Bild 183-H1216-0500-002 / CC-BY-SA 3.0**.

Source: [1938 portrait photograph of Adolf Hitler](https://commons.wikimedia.org/wiki/File:1938_portrait_photograph_of_Adolf_Hitler.jpg). Downloaded the 500-pixel Wikimedia preview. License: [Creative Commons Attribution-ShareAlike 3.0 Germany](https://creativecommons.org/licenses/by-sa/3.0/de/deed.en).

The source photograph is retained unchanged. At runtime, only the head is cropped, oval-masked, lightly tinted, scaled and placed over each painted body pose. The resulting enemy artwork/composite and the contributed body artwork are distributed under the same CC BY-SA 3.0 Germany license. This artwork licensing statement does not relicense the game code or other independent assets. An attribution link is also displayed on the fight introduction/pause/retry card. No endorsement by the photographer or archive is implied.
