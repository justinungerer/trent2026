# Chapter 8 — The Holding Camp

Santa is leaving a snowy cartoon yard. Three night wardens stand between him and the wreath gate. He walks the line and punches with a mitten. Nobody is hurt for real: a beaten warden sits in the snow, and if Santa sits down dizzy he gets back up. There is no blood.

The pictures are original generated paintings in `art/`: Santa's idle, punch, hit, and defeat frames, the wardens, and the side-view yard. There are no third-party assets and no build step.

## Open it

Serve the repository root (the folder that contains `holding-camp/`), then open the holding-camp path. Links are relative, so the same files work on GitHub Pages under a repository subpath.

```bash
python -m http.server 8080
```

Open `http://localhost:8080/holding-camp/`.

On GitHub Pages that is the site's `/holding-camp/` path, for example `https://<user>.github.io/<repo>/holding-camp/`.

Landscape is the intended orientation. A portrait visit shows a "turn sideways" note and pauses the fight until the phone is landscape.

## Controls

Touch first. Nothing you need is hover-only.

- Left thumb: Left and Right move Santa along the yard. Each button is 48 pixels. Arrow keys do the same.
- Right thumb: A punches. The button is 48 pixels. The A key, J, and Space punch too.
- A warden blocks the path until he sits down. Santa cannot walk through him.
- Escape pauses. Pause also opens when the page is hidden. Resume continues the same fight. Give up returns to the how-to-play card and does not open the gate.

The how-to-play card is the card shown before the fight.

If the device asks for reduced motion, a hit does not shake the yard, and the snow holds still. Poses still change with the action.

## Win and a sit-down

Each warden takes three punches. Santa has four hearts. Step into reach, punch, and step back while a warden is winding up. If Santa's hearts run out he sits, then stands back up and that warden is ready again. Wardens who are already sitting stay sitting. The clock keeps running.

The gate opens when every warden is sitting and Santa walks up to it. There is no time limit.

## Victory event

On a win the page shows a short card and dispatches a `CustomEvent` named `holding-camp:complete` on `window` once. The detail is `{ seconds }`: whole seconds on the fight, not counting time spent paused.

When the page is inside another frame, it also `postMessage`s `{ type: 'holding-camp:complete', detail: { seconds }, runId }` to the parent. `runId` is copied from the page query string.

A sit-down does not dispatch the event. Give up does not dispatch the event. Fighting through again starts from the first warden and allows the event again on the next win.
