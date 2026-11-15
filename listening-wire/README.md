# Chapter 7 — The Listening Wire

A first-person corridor. Trent walks a painted hall, turns, and shoots cartoon soldiers who drop in a puff of dust. The gun fires faster partway down the hall, then throws a spread. The green door at the end wins the run. A careful walk is about a minute.

The corridor pictures are original generated paintings in `art/`: wall, floor, ceiling, the green door, and one soldier. The gun, dust, and crosshair are canvas drawings. The older yard paintings (`scene.webp`, `lamp.webp`, `trent.webp`) stay in this folder for the campaign’s chapter card. There are no third-party assets, no downloaded images, and no build step.

## Open it

Serve the repository root (the folder that contains `listening-wire/`), then open the listening-wire path. Links are relative, so the same files work on GitHub Pages under a repository subpath.

```bash
python -m http.server 8080
```

Open `http://localhost:8080/listening-wire/`.

On GitHub Pages that is the site's `/listening-wire/` path, for example `https://<user>.github.io/<repo>/listening-wire/`.

Landscape is the intended orientation. A portrait visit shows a short "turn sideways" note and pauses a run already in progress.

## Controls

Touch first. Nothing you need is hover-only. Every control is at least 48 pixels.

- Turn left and turn right, or A and D, or the left and right arrow keys.
- Walk forward and back, or W and S, or the up and down arrow keys.
- Shoot, or hold Space or Enter. The button keeps firing when the gun is ready.
- Escape pauses. Pause also opens when the page is hidden. Resume continues the same walk. Give up returns to the how-to card and does not count as reaching the door.

If the device asks for reduced motion, the view does not shake and the gun does not bob.

## Gun

The gun starts as a single steady shot. Farther along the corridor it becomes a quicker shot, then a three-way spread. A hit sits a soldier down in dust. Soldiers who reach you bump you back. They do not end the run.

## Win

Walk up to the green door. There is no time limit and no fail state. Reaching the door wins.

## Victory event

On a win the page shows a short card and dispatches a `CustomEvent` named `listening-wire:complete` on `window` once. The detail is `{ seconds }`: whole seconds spent walking, not counting time spent paused.

A bump does not dispatch the event. Give up does not dispatch the event. Walk it again starts a fresh corridor and allows the event again on the next win.

If the page is inside a parent frame, that same win also posts `{ type: 'listening-wire:complete', detail: { seconds }, runId? }` to the parent. `runId` is copied from the page query string when it is present.
