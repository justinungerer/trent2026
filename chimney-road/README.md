# Chapter 10 — The Chimney Road

Trent runs and jumps a long road of snowy roofs to a sleigh that is waiting on the last one. The road is about three times the old run: the world is 8580 pixels wide, and the main path is about 8820 pixels from the first roof to the sleigh. The old world was 2860 pixels wide, about 2600 pixels of running, with the camera locked to one 390-pixel-tall view. Roofs now climb above that first view and drop below it, and the camera follows Trent up and down.

Some roofs are dead ends. The way on is back the way you came. A double jump, pressed again near the top of a jump, reaches the higher roofs. Hazards knock Trent off a roof if they touch him. Each one can be dodged: jump the rolling snowball, step out from under a falling icicle, time the swinging lantern, move aside from chimney smoke, and jump or wait out the sliding crate. A hit is a fall. There is no gore.

The pictures are original generated paintings in `art/`: a night rooftop panorama, roof platforms, Trent, a crate, and a small parked sleigh. The sleigh is its own painting. There are no third-party assets, no downloaded images, and no build step.

## Open it

Serve the repository root (the folder that contains `chimney-road/`), then open the chimney-road path. Links are relative, so the same files work on GitHub Pages under a repository subpath.

```bash
python -m http.server 8080
```

Open `http://localhost:8080/chimney-road/`.

On GitHub Pages that is the site's `/chimney-road/` path, for example `https://<user>.github.io/<repo>/chimney-road/`.

Landscape is the intended orientation. A portrait visit shows a short "turn sideways" note with a Dismiss button.

## Controls

Touch first. Nothing you need is hover-only.

- Left and right run. Jump hops, and a second jump near the top of the first one climbs higher.
- A running jump clears a gap. Jump near the edge. The crate can be landed on, and it will push Trent if it meets him. The snowball, icicles, lantern, smoke, and brush each cost a fall when they hit.
- Tap Pause to take a break. Pause also opens when the page is hidden. Resume continues the same roofs. Give up returns to the start and does not reach the sleigh.

Left, right, and Jump are at least 76 pixels tall.

If the device asks for reduced motion, a fall does not shake the view. Running holds one running pose, and the jump still shows rising or falling.

## Win and lose

Missing a roof, or being knocked off by a hazard, is a fall. Trent is set back on the last main roof he reached. A dead-end roof does not become that checkpoint. Three falls start the whole road again from the first roof and clear the fall count. The clock keeps running.

Reaching the sleigh on the last roof wins. There is no time limit.

## Victory event

On a win the page shows a short card and dispatches a `CustomEvent` named `chimney-road:complete` on `window` once. The detail is `{ seconds }`: whole seconds on the roofs, not counting time spent paused.

A fall does not dispatch the event. Give up does not dispatch the event. Run the roofs again starts from the first roof and allows the event again on the next win.
