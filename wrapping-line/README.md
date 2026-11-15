# Chapter 9 — The Wrapping Line

A belt brings presents through the workshop at different heights. The left stick moves a mark up and down to meet them. Only the point total matters. Thirty points clear the line.

The pictures are original generated paintings in `art/`: the workshop, Trent, and five presents. The mark and the bow that lands on a good present are small canvas drawings. There are no third-party assets and no build step.

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

- Hold the left stick, or hold the up and down arrows (or W and S), to move the mark.
- Escape pauses. Pause also opens when the page is hidden. Resume continues the same belt. Give up returns to the start and does not keep the run.

The stick is larger than 48 pixels.

If the device asks for reduced motion, a bad meet does not shake the shop, and the mark does not pulse.

## Win and lose

Meet a present with the mark to take its points. A present that passes unmatched scores nothing, and the total does not reset.

- Plain +1, ribbon +3, gilt +5.
- Torn −1, crushed −3. Meeting either damaged present also costs one life.
- Thirty points win.
- The clock is 27 seconds. If it hits zero first, that round starts over: points and the clock return to the start, and lives stay where they are.
- Lives still come from `?lives=10|9|8|7` (7 when the value is missing or anything else). At 0 lives the run ends.

## Victory event

On a win the page shows a short card and dispatches a `CustomEvent` named `wrapping-line:complete` on `window` once. The detail is `{ seconds }`: whole seconds on the winning round, not counting time spent paused and not counting a round that the clock restarted.

A clock restart does not dispatch the event. Running out of lives does not dispatch the event. Give up does not dispatch the event. Run the line again starts a fresh belt and allows the event again on the next win.
