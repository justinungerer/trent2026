# Chapter menu, Corridor, and Holding Camp update

## Duplicate level 2 instruction

The request first specifies level 2 at triple length with unchanged density, then repeats level 2 with triple density and timed waves. A clarification was requested. Pending a correction, the second instruction applies to level 3, as described during implementation.

## Chapter menu

Added 12 pixels above each chapter group after its divider. Existing space between buttons and dividers remains.

## Chapter 7 — Corridor

- Three settings: green plaster/slate listening post, concrete radio bunker, and brick/terracotta gatehouse. Each has three related painted wall textures and three related floor textures, all 512 square.
- Two hidden map pickups per level, placed on reachable floor cells without overlapping other pickups.
- Collecting either map pauses the run and opens the full-screen map. Map above Shoot reopens it. Before collection, the button explains that a map must be found.
- Exploration records from the start. Only visited floor cells and adjacent solid walls appear. Unvisited openings remain unexplored. A red arrow marks the player and heading. A discovered exit appears green.
- Simulation and its clock stop while viewing the map. Closing preserves discoveries. Retrying resets discoveries and map possession.
- Trent starts each Corridor level with five hit points plus any earned quiz bonus. Enemy patrol, approach, and retreat speeds are half their previous values. Player movement and projectile speeds are unchanged.
- Enemy totals remain 52 / 60 / 78.

## Chapter 8 — Holding Camp

Santa has 10 stamina in every level. A punch uses 1, an uppercut uses 3, and stamina refills at 2 points per second. Painted cookies restore the full meter.

- Level 1 is 8,520 units long and has 12 regular guards spread along the route. The Key Warden still guards the far-right key. The exit is halfway across the passage.
- Level 2 is 12,084 units long, 20% shorter than before. Groups of up to two enter more quickly and nearby groups can overlap. The 72 regular guards and 12-HP Yard Enforcer remain.
- Level 3 increases from 1,770 to 5,310 world units with triple regular guard density. Six encounter positions send three batches five seconds apart, including while earlier guards are still fighting. All batches must arrive and be defeated before passage clears. A countdown appears while waiting for reinforcements.
- Level 3 now has 378 regular guards across the six route encounters, doubled from 189. Each section retains its original three batches five seconds apart. An equal number of extra guards then enters individually every two seconds, starting two seconds after the third original batch enters. Types, entry sides, and lanes repeat in their original order. All queued reinforcements must arrive and be defeated before passage clears. The finale retains both bosses and three additional guards, making 383 enemies total.
- Each boss has a unique 1,254-square transparent painted atlas with idle, two walking poses, and a strike pose. Facing, walk and strike animation, damage, health bars, and defeat use the existing fighting mechanics.

All regular guards throughout all three Chapter 8 levels now use distinct high-resolution painted WWII military sentry atlases. Each has six 512-square poses for standing, walking, striking, recoiling, and defeat, with the original 2/4/6 HP and combat behavior. The two bosses retain their distinct painted animations.

## Validation

Playwright WebKit phone touch emulation exercised all six stages. Checks cover both map pickups, placement, fog pixels against actual walls/openings, paused enemies and timer, exploration persistence, retry reset, patrol speed, boss HP and key release, timed reinforcements, the simultaneous final group, animated atlas frames, and all Holding Camp completion paths. Screenshots inspected for the menu, maze materials, map, and boss finale. The reinforcement update additionally verifies that all six route sections double, extra guards arrive at 12, 14, and subsequent two-second intervals after the original 0/5/10-second waves, pending guards prevent early completion, pausing freezes the schedule, all regular guards draw six distinct painted poses, and all three painted types can attack. JavaScript syntax and whitespace checks pass.

Artwork prompts and generated asset paths are recorded in each game's art/ART-SOURCES.md.
