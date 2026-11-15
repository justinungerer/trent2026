# Art direction — Operation Ribbonfall

## Goal and feel

Make the depot a polished, 2D, smooth, high-resolution side-scrolling action game for landscape phones. The left thumb moves Buddy; the right thumb aims and fires independently. Keep the action, hazards, objectives, and controls readable at phone size. It must remain a static GitHub Pages site, including when hosted under a repository subpath.

The painted, illustrated look of **Frosted Skies** is an inspiration, not a requirement to find an exact match. The preferred result is the best available smooth cartoon art; adapt the depot scenery to harmonize with it when matching painted assets are unavailable. Avoid blocky or pixelated art, stiff flat-bobbing characters, and distracting effects that obscure gameplay.

The setting is a Christmas-themed WWII adventure with appealing characters and respectful comedy. No jokes about Holocaust victims. Keep the tone playful without making suffering the punchline.

## Characters and animation

Give Buddy and enemies coherent, full-body designs with convincing motion, consistent proportions, equipment, facing, and ground contact. Aim for distinct idle, walk, run, aim, fire, hit, defeat, and wrapping sequences where those actions actually occur. Animations should reflect the real game state and direction: moving should look like moving, aiming should follow the aim, firing should correspond to a shot, and wrapping should show the target becoming a parcel. Do not invent enemy ranged attacks or other gameplay solely to justify an animation. Avoid implying that a bow animation is a directional ribbon gun.

Use readable silhouettes and well-separated colors against the background. Recommend transparent character backgrounds, consistent canvas sizes and anchor points across each character's frames, and enough source resolution to remain crisp at the largest intended mobile display size. Supply individual frames or a documented atlas/spritesheet, including frame dimensions, order, anchor points, and recommended timing for loops and one-shot actions. Choose dimensions and timings to suit the artwork, gameplay, memory, and mobile performance rather than treating any arbitrary size or frame rate as mandatory.

## Depot environment

Build a richer, layered warehouse with depth and a unified palette: foreground and background scenery, stocked shelves, floor, windows or openings, and warm lights against a winter setting. Use subtle parallax, snow, steam, and lighting where appropriate; animate the actual environmental elements rather than merely bobbing a static scene. Preserve clear sightlines and legible movement paths. Respect reduced-motion preferences and keep mobile performance and download size practical.

## Existing art and known gaps

- `frosted-skies/art/` contains the sleigh, drone, boss, and winter valley WebP illustrations. Its README describes generated art and transform-based motion with effects; it is a separate prototype. Use it as visual inspiration only. Do not make unsolicited changes to Frosted Skies.
- `shelf-escape/art/` contains illustrated elf, guard, and shelf WebP files. The current working tree also contains `shelf-escape/art/animated/` sprite sheets for elf idle, walk, fire, hurt, and defeat, and guard idle, walk, attack, hurt, and defeat. Depot work is active and may change; inspect the current implementation before building on it.
- The current depot README describes Canvas-drawn scenery with animated snow, steam, lights, and parallax. It also notes the elf's attack is a horizontally facing bow animation, not a directional ribbon-gun rig; the soldier's gun attack is used at close contact, not for a ranged projectile. The defeat transitions into a parcel effect. These are starting points, not proof the desired action-specific animation or cohesive final art is complete.
- The depot README identifies the elf sheets as CraftPix.net's **Elf 2D Game Sprite** and the guard sheets as Segel's **2D Soldier Guy Character**, citing their OpenGameArt releases and OGA-BY 3.0; it describes resizing and other changes and includes a copy of the license. Check `shelf-escape/README.md` and `shelf-escape/art/animated/OGA-BY-3.0.txt` for its source and attribution details. The handoff describes earlier mission art as generated, but that alone does not establish its provenance or rights. Verify rights for existing art before reuse or redistribution; do not assume inherited assets are cleared.

## Sourcing and delivery

Use original artwork, free assets with verified suitable licenses, or generated artwork if a free tool is available. Do not pay for assets or tools. Before using any asset, verify its exact source, creator, applicable license and version, and whether the license permits the intended modifications and public distribution of the actual asset files in a static GitHub Pages repository. Follow all attribution, license-copy, and other applicable requirements. Record the source URL, creator, license and version, required attribution, modifications, and any relevant conditions alongside each asset. Do not label unverified material as licensed or distributable.

Preserve art and work from other independently developed branches; coordinate or integrate carefully rather than overwriting it. Keep assets and paths portable for the static site. Review the result on landscape mobile devices and verify movement, independent aiming and firing, wrapping, animation transitions, visual clarity, reduced motion, and the existing quiz-to-depot flow.
