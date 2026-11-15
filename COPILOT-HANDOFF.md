# Trent 2026 — illustrated action prototypes

Work from branch `illustrated-missions`. The branch is based on the published quiz and Operation Ribbonfall build.

Run from the repo root with `python -m http.server 8080` and open:

- `http://localhost:8080/frosted-skies/` for the standalone Chapter 1 prototype. Drag to steer with automatic fire, or use WASD or arrow keys. A flagship enters at about 51 seconds.
- `http://localhost:8080/shelf-escape/` for the updated standalone depot mission. Left thumb moves, right thumb aims/fires. On desktop use WASD and Space.
- `http://localhost:8080/` for the existing quiz, including the real equipment handoff into Shelf Escape.

## What changed

- **Frosted Skies:** Added the illustrated version under `frosted-skies/`, with a red rocket sleigh, painted winter valley, separate snowfall speeds, aircraft sprites, and recoil, impacts, and gift-wrap effects. It is static, with bundled WebP art and no runtime dependencies.
- **Shelf Escape:** Added distinct illustrated sprites for Buddy, guards, and stocked shelves. Reworked the depot into cool floorboards and track lines under amber warehouse lamps. Added objective glows, muzzle flare, hit flashes, and a pop animation when a guard is wrapped. The level geometry and quiz-driven ammo, damage, and cadence still use the original mission logic. The mission continues to load Phaser 3.90.0 from its existing CDN.

Sprite motion uses transforms on illustrated frames. Fully authored movement cycles are future art work. Art under both missions is original generated artwork.

## Integration

Frosted Skies remains standalone. On victory it emits `frosted-skies:complete` in its own window with `{score, hull}`. For iframe integration, add a child-side relay and verify the exact origin, event source, message type, and active run ID in the campaign. Decide how quiz effects should affect the sleigh before adding campaign wiring. Use relative paths and retain each mission's `art/` folder for GitHub Pages deployment under a subpath.

Shelf Escape already has a quiz iframe contract. Preserve its existing origin, run ID, and completion checks. Verify collision around shelves, shots through the dual-thumb controls, the low- and high-ammo paths, retry, and victory. Test both missions on physical iPhone Safari and Android. The short Frosted Skies prototype has not been tuned for a five-minute chapter.

Suggested Copilot prompt: “Read COPILOT-HANDOFF.md on this branch. Run the three entry points and check the existing quiz-to-depot flow. Use the notes to integrate Frosted Skies when the Chapter 1 quiz handoff is specified.”
