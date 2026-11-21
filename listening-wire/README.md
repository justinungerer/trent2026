# Chapter 7 — The Listening Wire

A first-person maze in the enemy wire room. Trent walks painted corridors, turns, and shoots cartoon soldiers who shoot back. Health kits and bullet crates sit on the floor. The green door at the far end is the listening post.

The corridor pictures are original generated paintings in `art/`: wall, floor, ceiling, the green door, and one soldier. Runners and spotters are that same soldier, tinted in canvas. Health kits, body armor, and ammo pickups use painted art. The gun, hit flash, and tracers are drawn on the canvas. The older yard paintings (`scene.webp`, `lamp.webp`, `trent.webp`) stay in this folder for the campaign’s chapter card. There are no third-party assets, no downloaded images, and no build step.

## Open it

Serve the repository root (the folder that contains `listening-wire/`), then open the listening-wire path. Links are relative, so the same files work on GitHub Pages under a repository subpath.

```bash
python -m http.server 8080
```

Open `http://localhost:8080/listening-wire/`.

On GitHub Pages that is the site's `/listening-wire/` path, for example `https://<user>.github.io/<repo>/listening-wire/`.

Landscape is the intended orientation. A portrait visit shows a short "turn sideways" note and pauses a run already in progress.

## Map

The Listening Post is 21 × 17. The Corridor uses the former Listening Post layout (25 × 19), and Gatehouse Code uses the former Corridor layout (33 × 25). Each successive maze has more junctions and guards. The map is available from the start and initially covered in fog. It reveals passages and bordering walls as Trent enters new tiles. Trent starts at the northwest opening. The green door is the farthest floor cell from that opening. Cartoon soldiers, health kits, and bullet crates are spread along the corridors.

## Controls

Touch first. Nothing you need is hover-only. Every control is at least 48 pixels.

- Tap the turn controls to look left or right.
- Tap the movement controls to walk forward or back.
- Tap or hold Shoot. Each shot spends one bullet.
- Tap Pause to take a break. Pause also opens when the page is hidden. Resume continues the same walk. Give up returns to the opening card and does not count as reaching the door.

If the device asks for reduced motion, the view does not shake and the gun does not bob.

## Fight

Trent starts with five health plus any quiz bonus and zero armor. A kit restores one health, or grants one armor at full health. Armor absorbs a hit before health and caps at three. A kit stays available when both are full. At zero health the run ends.

Starting bullets come from the `lives` query, the same quiz score the parent passes into wrapping-line. A missing or unreadable value starts the run at 10. The number is capped at 10. Bullet crates in the maze add more, and a killed soldier drops 1 bullet where they stood. The soldier flashes and vanishes. No body stays on screen.

There are three soldier pictures, all from `art/soldier.webp`:

- Soldier — olive, as painted. Middling step and shot.
- Runner — cool tint. Closes in and shoots sooner.
- Spotter — warm tint. Hangs back and fires farther down the corridor.

With bullets left, a soldier in the way shoves Trent back. With an empty gun, Trent can slip past to look for another crate.

## Win

Walk up to the green door. Reaching the listening post wins.

## Victory event

On a win the page shows a short card and dispatches a `CustomEvent` named `listening-wire:complete` on `window` once. The detail is `{ seconds }`: whole seconds spent in the maze, not counting time spent paused.

A hit does not dispatch the event. Running out of health does not dispatch the event. Give up does not dispatch the event. Walk it again starts a fresh maze and allows the event again on the next win.

If the page is inside a parent frame, that same win also posts `{ type: 'listening-wire:complete', detail: { seconds }, runId? }` to the parent. `runId` is copied from the page query string when it is present.
