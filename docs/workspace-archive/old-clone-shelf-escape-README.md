# Operation Ribbonfall

The three-question chapter leads into a side-scrolling depot mission. Sprout recovers Santa's orders, disables three relays, collects three train manifests, transmits them, unlocks three track controls and escapes. There are five moving bridge passages: approach the lit platform and cross when its position aligns with Sprout's lane. Avoid the sweeping searchlight circles: being spotted temporarily makes guards faster. Shelves block movement and shots; guards pursue Sprout, and a reinforcement arrives during transmission. A guard hit by ordinary ribbon is briefly stunned and marked until wrapped.

The quiz determines starting ammunition (24 or 12), firing interval (0.27 or 0.57 seconds), and guard durability (one or two hits). Three wrong answers end the quiz; a mission retry retains the earned loadout. Relays take 1.5 seconds and the radio six seconds of proximity, with progress retained if interrupted. Green crates heal; red-and-gold supply crates replenish the player's earned starting ammunition once. No ammunition is needed to operate objectives.

## Run and controls

Serve the **repository root** with any static HTTP server and open its `index.html`; `shelf-escape/` also runs standalone with a default loadout. All URLs are relative and work under a GitHub Pages repository subpath. There is no application server, build step, CDN, runtime package, or orientation lock. Canvas 2D is required.

The action mission is designed for landscape phones: a portrait notice recommends turning the device sideways but can be dismissed. The quiz remains usable in portrait. On touch screens, drag the left pad to move and hold/drag the right pad to aim and fire; holding its center aims at the nearest guard. Both pads accept separate simultaneous pointers. On a keyboard use WASD to move, arrow keys to aim, Space to fire (auto-aims without an arrow), and Escape to pause. The pause menu resumes, retries, or returns to the chapter briefing when embedded. Switching tabs, losing focus, or changing orientation pauses the mission and clears held input. The chapter music and synthesized mission effects have independent controls; audio requires a user gesture.

The HUD gives the active objective and its direction/lane. Use the blue relays, paper manifests, larger blue radio, red track controls and green hatch; proximity progress appears in the HUD. The on-screen dialog and controls respect safe-area insets, and the chapter respects reduced-motion preferences. Physical-device testing is still needed, particularly on iOS Safari and Android, including interruption, rotation, sound, touch cancellation and two-thumb input.

## Artwork

The current scene uses original, locally generated vector illustrations rasterized into character sprite sheets for idle, movement, firing and hit reactions, plus layered parallax scenery and combat effects. It deliberately uses smooth Canvas rendering rather than pixel or 3D graphics. The illustrated art is a lightweight cartoon treatment, not a match for the detailed supplied reference; character animation, environmental variation and polish require further artistic work and review. No new external art or runtime dependencies were added. Existing chapter illustrations and soundtrack were retained; the soundtrack's composition script describes it as original synthesized music, but the repository contains no explicit license or provenance documentation for those inherited files. Confirm their rights before distribution.

## Campaign integration

The parent passes `charges=2` (12 shots) or `charges=4` (24), `reload=slow|fast`, `ribbon=plain|enchanted`, and an exact `parentOrigin`. A missing parameter uses the stronger standalone default. The child accepts an exact HTTPS origin, or HTTP localhost/127.0.0.1 for local testing.

The child sends `{type:'trent:ready',version:1,mission:'shelf-escape'}` to that origin. The parent verifies origin and iframe source and replies with `{type:'trent:init',version:1,runId,music}`. The child accepts messages only from that parent and origin. Completion and return-to-briefing messages contain the run ID; the parent checks origin, source, mission, version and current run ID before acting, and consumes completion once. Music toggles use the same validated run ID and parent-origin/source checks. Retrying resets only the mission; a page reload returns to the saved chapter loadout.

## Validation and pacing

From the repository root, run `node --test shelf-escape/mission.test.js shelf-escape/render.test.js` (Node 18 or newer). The deterministic test follows a movement-and-firing route through the entire mission for all eight parameter combinations, including the all-wrong combination unavailable through the three-strike quiz. It tests ammo, firing rate, damage, objective gates, cover, health, bridges, searchlights, resupply and retry state. The renderer test uses a mock Canvas context to check sprite-sheet creation and drawing; it does not replace browser or device testing.

The repeatable scripted route took **124.3 seconds** of simulation for each loadout, spending 10.5 seconds on relay/radio proximity and firing 16 enchanted or 32 ordinary shots. This is an efficient automated route, not a proof of the theoretical optimum or a measurement of human playtime. There is no measured typical-human duration; the approximately five-minute engaged-play target has **not been validated**. The longer route and repeated objectives also need human playtesting to determine whether traversal and challenges remain varied rather than feeling padded.
