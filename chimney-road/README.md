# Chapter 10 — The Chimney Road

Trent runs and jumps a line of snowy roofs to a sleigh that is waiting on the last one. The gaps are short. A crate slides on the long roof. This is a platformer: not the beach scroller, and not the handcar.

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

- Left and right run. Jump hops. Arrow keys run, and Up or Space jumps.
- A running jump clears a gap. Jump near the edge. The crate can be landed on, and it will push Trent if it meets him.
- Escape pauses. Pause also opens when the page is hidden. Resume continues the same roofs. Give up returns to the start and does not reach the sleigh.

Left, right, and Jump are at least 76 pixels tall.

If the device asks for reduced motion, a fall does not shake the view. Running holds one running pose, and the jump still shows rising or falling.

## Win and lose

Missing a roof is a fall. Trent is set back on the roof he last stood on. Three falls start the whole road again from the first roof and clear the fall count. The clock keeps running.

Reaching the sleigh on the last roof wins. There is no time limit.

## Victory event

On a win the page shows a short card and dispatches a `CustomEvent` named `chimney-road:complete` on `window` once. The detail is `{ seconds }`: whole seconds on the roofs, not counting time spent paused.

A fall does not dispatch the event. Give up does not dispatch the event. Run the roofs again starts from the first roof and allows the event again on the next win.
