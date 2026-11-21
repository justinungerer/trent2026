# Listening Wire art sources

These paintings were generated for this repository. They are original artwork for this game, not a third-party license. No insignia, no blood.

## Corridor fight

### wall.webp

Painted plaster corridor wall, opaque, 256 × 256 px. Sampled across each wall face by the raycaster.

### floor.webp

Painted floorboards from above, opaque, 256 × 256 px. Tiled in world space on the floor.

### ceiling.webp

Painted plaster ceiling with a warm lamp glow, opaque, 256 × 256 px. Tiled in world space on the ceiling.

### door.webp

A sage-green wooden door, opaque, 256 × 256 px. Drawn as a billboard on the listening-post cell. Reaching it wins.

### soldier.webp

One cartoon soldier on a transparent background, about 348 × 620 px. Olive coat, plain helmet, wooden rifle. No emblem. The same picture is drawn three ways: the olive soldier as painted, a cool-tinted runner, and a warm-tinted spotter. A hit is a white flash, then the sprite is gone. Nothing is left on the floor except a bullet pickup.

The gun, the crosshair, the hit flash, the health kit, and the bullet crate are drawn in canvas, not from files.

## Chapter card paintings

These stay so the campaign intro can still pan the snowy yard. The corridor fight does not draw them.

### trent.webp

Horizontal strip of equal frames on a transparent background. The feet share one baseline.

- Frame width: 278 px
- Frame height: 676 px
- Frame count: 5
- Order: idle, idle, raise, press, recover.
- Anchor: (105, 666) in every frame, at the feet.

### scene.webp

Painted snowy night yard, opaque. 1280 × 720 px. Pines, a fence, a crate, and a shed with one warm window. No people and no text.

### lamp.webp

A searchlight head on a transparent background, 360 × 470 px. The yoke sits about 48% across and 78% down the bitmap. No beam is painted into the sprite.


## November 18 maze and boss art

Generated with the built-in image generation tool. Original output inspected, alpha preserved, cropped into texture tiles or converted to WebP.

Prompt (listening):

High resolution hand painted realistic WWII game material atlas 1536 by 1024, exactly 3 columns by 2 rows equal square tiles. Top row THREE similar yet distinct worn green-grey plaster brick walls. Bottom row THREE similar yet distinct slate stone floors. Flat orthographic seamless material squares, detailed texture, subtle neutral lighting, no perspective, no bevels no gutters no text no borders no objects, full opaque coverage. These are wall and ground texture maps for a first person maze.

Prompt (bunker):

High resolution hand painted realistic WWII game material atlas 1536 by 1024, exactly 3 columns by 2 rows equal square tiles. Top row THREE similar yet distinct dark concrete walls with restrained rust seams. Bottom row THREE similar yet distinct worn concrete floor slabs. Flat orthographic seamless material squares, detailed texture, subtle neutral lighting, no perspective, no bevels no gutters no text no borders no objects, full opaque coverage. These are wall and ground texture maps for a first person maze.

Prompt (gatehouse):

High resolution hand painted realistic WWII game material atlas 1536 by 1024, exactly 3 columns by 2 rows equal square tiles. Top row THREE similar yet distinct weathered red-brown brick walls. Bottom row THREE similar yet distinct terracotta stone floors. Flat orthographic seamless material squares, detailed texture, subtle neutral lighting, no perspective, no bevels no gutters no text no borders no objects, full opaque coverage. These are wall and ground texture maps for a first person maze.

Assets: `listening-wall-0..2.webp`, `listening-floor-0..2.webp`, matching `bunker-*` and `gatehouse-*` tiles. Each tile is 512 square.

Map collectible: `painted-map.webp`. Built-in image generation, transparent background, converted to WebP preserving alpha.

Prompt:

A single collectible WWII folded paper maze map for a realistic hand painted game. A worn cream paper sheet partly unfolded, clearly visible dark corridor lines, a small red compass marking, olive canvas band. No words no labels no letters. Three quarter top view isolated item fully inside frame with generous transparent margin. Highly detailed painted art, genuinely transparent background, no cast shadow or backdrop.

Cleanup prompt: Remove the entire brown glowing haze and all background from this folded paper map collectible, leaving only the actual paper map and canvas strap as a crisp isolated cutout on fully transparent alpha zero background. Preserve the painted map and strap exactly. No shadow no glow no vignette. Keep generous transparent margins.

## Body armor pickup

`painted-body-armor.webp` is a transparent painted pickup that appears in place of a health kit while Trent is at full health. Generated with OpenAI ImageGen.

> A single collectible olive canvas WWII-era flak vest with stitched rectangular armored panels, battered brass buckles and broad shoulder straps. Three-quarter front view, isolated game pickup, crisp recognizable compact silhouette for a first-person painted maze game. Realistic textured hand-painted gouache in muted olive, charcoal and tan, fully transparent alpha outside the vest. No person, no background, no lettering, no insignia, no glow or shadow. Centered, fully inside the frame with modest transparent margins.
