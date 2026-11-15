# Chapter 8 — The Holding Camp

Santa walks out of a snowy cartoon yard. Night guards in knit caps and winter coats step in from either side. He moves along the lane and toward the fence or the foreground, jabs with a fast punch, and throws a slower uppercut. A beaten guard flashes and vanishes. There is no blood, and nobody is left lying in the snow.

The fight art is original painted strips in `art/brawl-*.webp`. `art/scene.webp`, `art/trent.webp`, and `art/santa.webp` stay as they were for the campaign intro.

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

- Left thumb: a four-way pad. Up, down, left, and right each are 56 pixels.
- Right thumb: Punch and Upper. Punch is at least 64 pixels tall. Upper is at least 72.
- Punch is fast and deals 1 hit point. Uppercut is slower and deals 3.
- Step up or down, off a guard's line, while he winds up.
- Tap Pause to take a break. Pause also opens when the page is hidden. Resume continues the same walk. Give up returns to the how-to-play card and does not open the gate.

The how-to-play card is the card shown before the walk.

If the device asks for reduced motion, a hit does not shake the yard, the snow holds still, and a beaten guard fades out instead of strobing. Poses still change with the action.

## The walk

Santa starts with 5 hit points. The lane he can walk up and down is three quarters of the screen height. The yard ahead is five times the old one-screen walk from Santa's start to the gate.

Guards come in three sizes. The slim runner falls to 1 damage, the plump warden takes 2, and the big coat takes 3. One uppercut drops any of them. They walk in from the left or the right and punch back for 1 hit point.

Two mugs of cocoa sit along the lane. Each gives 1 hit point back, and neither raises Santa above 5. A mug stays put until he needs it.

Santa cannot pass a group until that group has vanished. When the yard is clear he walks through the wreath gate. There is no time limit. If his hit points run out he sits, and the walk starts over. That sit-down does not open the gate.

## Victory event

On a win the page shows a short card and dispatches a `CustomEvent` named `holding-camp:complete` on `window` once. The detail is `{ seconds }`: whole seconds on the walk, not counting time spent paused.

When the page is inside another frame, it also `postMessage`s `{ type: 'holding-camp:complete', detail: { seconds }, runId }` to the parent. `runId` is copied from the page query string.

A sit-down does not dispatch the event. Give up does not dispatch the event. Walking it again starts from the first step and allows the event again on the next win.
