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
- All three enemy types patrol and approach at 0.75 their previous movement speeds. Player and projectile speeds remain unchanged.
- Enemy totals remain 52 / 60 / 78.

## Chapter 8 — Holding Camp

- Level 1 retains its 4,260-unit outward route and return objective. Regular guards double from 3 to 6. A unique 10-HP Key Warden guards the key. Collecting it requires his defeat.
- Level 2 increases from 5,035 to 15,105 world units. Encounters repeat along the extended route at unchanged density, totaling 72 regular guards. A unique 12-HP Yard Enforcer guards the exit.
- Level 3 increases from 1,770 to 5,310 world units with triple regular guard density. Six encounter positions send three batches five seconds apart, including while earlier guards are still fighting. All batches must arrive and be defeated before passage clears. A countdown appears while waiting for reinforcements.
- Level 3 now has 189 regular guards in these encounters, tripled from the previous 63 by tripling each arriving batch throughout the route. The three-wave timing remains five seconds apart. At the final gate, both bosses arrive together with three additional guards, making 194 enemies total.
- Each boss has a unique 1,254-square transparent painted atlas with idle, two walking poses, and a strike pose. Facing, walk and strike animation, damage, health bars, and defeat use the existing fighting mechanics.

## Validation

Playwright WebKit phone touch emulation exercised all six stages. Checks cover both map pickups, placement, fog pixels against actual walls/openings, paused enemies and timer, exploration persistence, retry reset, patrol speed, boss HP and key release, timed reinforcements, the simultaneous final group, animated atlas frames, and all Holding Camp completion paths. Screenshots inspected for the menu, maze materials, map, and boss finale. JavaScript syntax and whitespace checks pass.

Artwork prompts and generated asset paths are recorded in each game's art/ART-SOURCES.md.
