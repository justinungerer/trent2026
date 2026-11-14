# Chapter 9 — The Wrapping Line

A belt brings parcels through the workshop. Trent taps on the beat and drops a bow. Early or late breaks the run. This is a rhythm game: not the handcar, and not Morse.

The pictures are original generated paintings in `art/`: the workshop, Trent, and a parcel. The beat mark and the bow that lands on a parcel are small canvas drawings. There are no third-party assets, no downloaded images, and no build step.

## Open it

Serve the repository root (the folder that contains `wrapping-line/`), then open the wrapping-line path. Links are relative, so the same files work on GitHub Pages under a repository subpath.

```bash
python -m http.server 8080
```

Open `http://localhost:8080/wrapping-line/`.

On GitHub Pages that is the site's `/wrapping-line/` path, for example `https://<user>.github.io/<repo>/wrapping-line/`.

Landscape is the intended orientation. A portrait visit shows a short "turn sideways" note with a Dismiss button.

## Controls

Touch first. Nothing you need is hover-only.

- Tap Bow, tap the workshop, or press Space or Enter as a parcel reaches the gold mark.
- Escape pauses. Pause also opens when the page is hidden. Resume continues the same belt. Give up returns to the start and does not keep the run.

Bow is larger than 48 pixels.

If the device asks for reduced motion, a miss does not shake the shop, and the mark does not pulse.

## Win and lose

The mark is the beat. A tap while the parcel is on it counts. A tap before or after, a tap with no parcel close, or a parcel that passes the mark untapped, is a miss. A miss sets the run of bows back to zero. The belt keeps moving.

Eight bows in a row win. There is no time limit and no separate slip counter.

## Victory event

On a win the page shows a short card and dispatches a `CustomEvent` named `wrapping-line:complete` on `window` once. The detail is `{ seconds }`: whole seconds on the belt, not counting time spent paused.

A miss does not dispatch the event. Give up does not dispatch the event. Run the line again starts a fresh belt and allows the event again on the next win.
