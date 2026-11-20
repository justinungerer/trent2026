# Art sources — depot interactive props

These files are original painted images made for Operation Ribbonfall. They are not stock photos, not traced from the character sprite sheets, and not third-party game assets. No Nazi insignia, flags, or unit markings are included.

Each file is one still frame on a transparent background. The game draws them as the interactive objects. If a file fails to load, `game.js` falls back to a distinct canvas silhouette of the same object.

The pictures were generated as paintings on a flat color field, then keyed to transparency, cropped, and saved as WebP. The character sheets in `art/animated/` were not modified.

| File | Pixels | Depicts |
|------|--------|---------|
| `props/alarm-bell.webp` | 227 × 384 | Brass alarm bell with a red dome, hung from an iron bracket |
| `props/depot-key.webp` | 344 × 384 | Brass skeleton key |
| `props/order-page.webp` | 329 × 384 | Folded transport order with a wax seal |
| `props/cipher-book.webp` | 329 × 384 | Closed cipher book with a clasp |
| `props/rail-switch.webp` | 177 × 384 | Rail switch lever |
| `props/generator.webp` | 355 × 384 | Portable generator |
| `props/signal-fuse.webp` | 384 × 113 | Glass signal fuse |
| `props/ammo-box.webp` | 332 × 384 | Wooden box of red and gold ribbon coils |
| `props/gift-parcel.webp` | 359 × 384 | Wrapped ribbon parcel |
| `props/radio-aerial.webp` | 115 × 384 | Radio aerial mast |
| `props/field-radio.webp` | 384 × 294 | Field radio with a handset |
| `props/padlock.webp` | 266 × 384 | Brass padlock |
| `props/mail-hatch.webp` | 285 × 384 | Arched mail hatch |
| `props/wood-crate.webp` | 384 × 353 | Roped shipping crate with holly |

Cover crates and the tall boxes Buddy must jump use `wood-crate.webp`. No external license applies. No source URL applies.


## Painted freight yard and enemy types added November 18, 2026

`freight-depot.webp` is the exterior backdrop for the main depot mission. The other levels retain the distinct painted intake-room and sorting-annex interiors. The same paintings supply the foreground floor texture.

`props/guard-types.webp` is a 1536 × 1024 transparent atlas generated with the built-in image generation tool. Its left column shows rifle guards walking and aiming. Its right column shows the faster baton-carrying charging guards in two running poses.

The freight background prompt was “High resolution semi realistic hand painted background for a WWII Christmas side scrolling infiltration game. Landscape 1536 by 1024. A snowy military freight depot at night, warm lamps on brick warehouses and loading canopies, radio wires overhead, freight cars and rail signals in the middle distance, fir trees and cold blue mountain darkness in the background. A clear mostly unobstructed horizontal snowy loading platform occupies the bottom 22 percent of the image, with its walkable ground surface at roughly 83 percent image height. No people, no elf, no enemy figures, no loose collectible items, no text or labels, no large foreground crates. Detailed painted wood and brick textures, cold winter blue with warm amber lamps, a distinct exterior freight yard scene.”

The enemy atlas prompt was “High resolution painted 2 by 2 WWII enemy sprite atlas. Landscape canvas 1536 by 1024, exactly four equal 768 by 512 cells with no gutters and no text. Full body side view characters facing left, feet at local y480 in every cell, each body centered at local x384. Left column is the same grey green winter coat and steel helmet rifle guard in two poses, top left walking with rifle, bottom left standing aiming the rifle left. Right column is the same distinct brown leather jacket assault guard with dark helmet and rolled sleeves, carrying a short baton, top right running left with left leg forward, bottom right running left with right leg forward. Keep the two characters visibly distinct in clothing and silhouette, same realistic human scale in all cells, detailed semi realistic hand painted game texture. No badges, insignia or armbands. True transparent background, no ground, no shadows, no text or weapons outside the four contained full body silhouettes.”

## Painted Buddy and alternate objectives

Built-in image generation produced these transparent WebP atlases. The Buddy atlas used the existing painted elf sprite as a character reference.

`props/buddy-painted-atlas.webp`

> Transparent high-resolution sprite atlas for original hand-painted side-scrolling adventure game character Buddy. Use the supplied painted elf as the character design reference: small adult storybook Christmas elf, red pointed cap, brown curls, forest green coat with gold edging, red scarf, worn brown boots, brass ribbon launcher. Exactly four equal columns and two equal rows, eight fully separated cells, all sprites face RIGHT. Landscape canvas with each sprite centered horizontally in its cell, boots aligned near the bottom of its cell, matching size and clear transparent gutters. Reading order: idle holding launcher low, walk stride left foot forward, walk stride right foot forward, airborne jump with bent knees, poised firing stance with launcher held level, recoiling flinch, losing balance crouch, falling to one knee. Detailed semi-realistic brushwork matching the supplied sprite and other painted game art. Show only character and launcher in each cell. No ribbons outside figures, background, shadow, text, insignia, grids or borders. Genuine alpha transparent background.

`props/alternate-objectives.webp`

> High-resolution transparent hand-painted 2 by 2 sprite atlas for a Christmas wartime side-scrolling game in a snowy freight depot. Exactly four equal cells with large clear transparent gutters, each object fully contained and centered in its own cell. Reading order: top left open green wooden equipment kit with neatly coiled red and gold ribbons inside, top right cream folded dispatch envelope with crimson wax seal and a deep green ribbon, bottom left front-on old timber depot doorway with an inviting warm lit opening and narrow brass plate with no text, bottom right front-on dark blue metal Allied dispatch drop box with a prominent mail slot and copper fasteners, no lettering. Match a textured semi-realistic oil-painted adventure-game style, readable distinct silhouettes, isolated on genuine transparent alpha. No ground, scenery, cast shadows, words, people, or graphics outside the cells.

## Aligned sorting annex

Built-in image generation produced the new 2160 × 720 `sorting-annex-aligned.webp`. The walls and floor scroll as one mirrored layer.

> Create one high-resolution wide landscape hand-painted environment plate for The Last Dispatch, a side-scrolling stealth adventure in a snowy WWII-era railway mail depot. Context: deep inside the sorting annex at night, Buddy carries pages of a camp route to an Allied drop box. A broad straight wooden sorting-aisle floor fills the foreground and entire bottom 28 percent, with no steps, platforms, objects or interruptions in that region. Side-on orthographic game view with minimal perspective, perfectly horizontal floor-to-wall seam at about 72 percent of image height, horizontal rafters. Behind the walkable aisle: softly lit rows of pigeonhole mail racks, canvas mailbags on rear benches, broad recessed steel freight shutters, frosty upper transom windows, exposed timber and weathered brick. Keep the shelves behind the clear play lane. Cold blue moonlight and muted amber industrial lanterns, fine realistic gouache/oil-painted texture, readable shapes, clearly a sorting annex distinct from a prison intake room. Near-identical wall tone and plank direction at both vertical edges for mirrored scrolling, no framing border. No characters, enemies, readable text, signs, insignia, pickups, foreground obstacles, or UI. Opaque panoramic environment artwork.
