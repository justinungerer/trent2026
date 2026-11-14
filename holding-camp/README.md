# Chapter 8 — The Holding Camp

Santa walks the cabin shadow to the gate. Trent has to stay with him. The open snow is where the searchlights pass. Santa is a round, friendly figure in red. He is not a soldier, and nobody is fired on.

The pictures are original generated paintings in `art/`: the camp yard, Trent walking, and Santa walking. The beams are canvas cones. There are no third-party assets, no downloaded images, and no build step.

## Open it

Serve the repository root (the folder that contains `holding-camp/`), then open the holding-camp path. Links are relative, so the same files work on GitHub Pages under a repository subpath.

```bash
python -m http.server 8080
```

Open `http://localhost:8080/holding-camp/`.

On GitHub Pages that is the site's `/holding-camp/` path, for example `https://<user>.github.io/<repo>/holding-camp/`.

Landscape is the intended orientation. A portrait visit shows a short "turn sideways" note with a Dismiss button.

## Controls

Touch first. Nothing you need is hover-only.

- The pad moves Trent up, down, left, and right. Arrow keys do the same. Up stays toward the cabins. Down steps into the open yard.
- Stay near Santa. He walks, waits, and walks again. Match that pace.
- Escape pauses. Pause also opens when the page is hidden. Resume continues the same walk. Give up returns to the start and does not open the gate.

Each pad button is 64 pixels.

If the device asks for reduced motion, a slip does not shake the yard. A walk holds one walking pose instead of cycling.

## Win and lose

Falling too far from Santa is a slip. Standing in a searchlight is a slip. The shadow along the cabins is clear of the lights. Three slips start the walk again from the cabins and clear the slip count. The clock keeps running.

The gate opens when Santa reaches it and Trent is still with him. There is no time limit.

## Victory event

On a win the page shows a short card and dispatches a `CustomEvent` named `holding-camp:complete` on `window` once. The detail is `{ seconds }`: whole seconds on the walk, not counting time spent paused.

A slip does not dispatch the event. Give up does not dispatch the event. Walk again starts from the cabins and allows the event again on the next win.
