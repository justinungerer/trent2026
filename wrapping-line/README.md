# Chapter 9 — The Wrapping Line

A belt brings presents through the workshop at different heights. The up and down buttons move a targeting bow. The score goals for Levels 1, 2, and 3 are 36, 50, and 75 points respectively.

The workshop, Trent, presents, and targeting bow are original generated paintings in `art/`. There are no third-party assets and no build step.

## Open it

Serve the repository root (the folder that contains `wrapping-line/`), then open the wrapping-line path. Links are relative, so the same files work on GitHub Pages under a repository subpath.

```bash
python -m http.server 8080
```

Open `http://localhost:8080/wrapping-line/`.

On GitHub Pages that is the site's `/wrapping-line/` path, for example `https://<user>.github.io/<repo>/wrapping-line/`.

Landscape is the intended orientation. A portrait visit shows a short "turn sideways" note. The belt pauses until the phone is landscape.

## Controls

Touch first. Nothing you need is hover-only.

- Hold the up or down button to move the bow and tap Wrap when a good box reaches its height.
- Tap Pause to take a break. Pause also opens when the page is hidden. Resume continues the same belt. Give up returns to the start and does not keep the run.

Both movement buttons are 60 pixels tall.

If the device asks for reduced motion, a bad meet does not shake the shop.

## Win and lose

Wrap a box near the bow to score. The horizontal hit window extends 94 game pixels on either side of the bow. Boxes that pass score nothing.

- Plain +1, ribbon +3, gilt +5.
- Wrapping a torn or crushed box costs 5 points and one life.
- Each round has about 1.5 times the goal in intact gift points. The clock covers the time those boxes take to pass the bow. Damaged boxes add no points to that budget. At zero, Level 2 restarts with the same lives, while Levels 1 and 3 show the retry screen.
- Lives still come from `?lives=10|9|8|7` (7 when the value is missing or anything else). At 0 lives the run ends.

## Victory event

On a win the page shows a short card and dispatches a `CustomEvent` named `wrapping-line:complete` on `window` once. The detail is `{ seconds }`: whole seconds on the winning round, not counting time spent paused and not counting a round that the clock restarted.

A clock restart does not dispatch the event. Running out of lives does not dispatch the event. Give up does not dispatch the event. Run the line again starts a fresh belt and allows the event again on the next win.
