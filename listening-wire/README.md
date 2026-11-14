# Chapter 7 — The Listening Wire

Trent sends a short Morse pattern from a snowy yard while a lamp sweeps. The wire takes a mark only while that light sits in the safe gap. A careful run is well under a minute.

The pictures are original generated paintings in `art/`: the night yard, the sweeping lamp, and Trent. The beam and the safe-gap mark are canvas overlays. There are no third-party assets, no downloaded images, and no build step.

## Open it

Serve the repository root (the folder that contains `listening-wire/`), then open the listening-wire path. Links are relative, so the same files work on GitHub Pages under a repository subpath.

```bash
python -m http.server 8080
```

Open `http://localhost:8080/listening-wire/`.

On GitHub Pages that is the site's `/listening-wire/` path, for example `https://<user>.github.io/<repo>/listening-wire/`.

Landscape is the intended orientation. A portrait visit shows a short "turn sideways" note with a Dismiss button.

## Controls

Touch first. Nothing you need is hover-only.

- Hold Send for a dash. Tap it for a dot. Space and Enter do the same.
- Key only while the light is inside the marked gap. The pattern is dot, dash, dot, dot.
- Escape pauses. Pause also opens when the page is hidden. Resume continues the same pattern. Give up returns to the start and does not send the pattern.

Send is larger than 48 pixels so a thumb can hold it.

If the device asks for reduced motion, a slip does not shake the yard.

## Win and lose

A press that starts in the open light, or that is still down when the light leaves the gap, is a slip. A dot that is held like a dash, or a dash that is too short or too long, is a slip.

Three slips start the pattern over and clear the slip count. The clock keeps running. Finishing dot, dash, dot, dot wins. There is no time limit.

## Victory event

On a win the page shows a short card and dispatches a `CustomEvent` named `listening-wire:complete` on `window` once. The detail is `{ seconds }`: whole seconds on the key, not counting time spent paused.

A slip does not dispatch the event. Give up does not dispatch the event. Send again starts a fresh pattern and allows the event again on the next win.
