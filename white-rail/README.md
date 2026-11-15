# Chapter 3 — White Rail

Trent pumps his handcar toward the yard mouth. The three snowy tracks converge at the horizon, and the handcar advances down them in perspective.

The sky, handcar, and Trent use painted artwork from `art/`. The renderer projects the tracks and obstacles from their positions along the route. There are no third-party assets, no downloaded images, and no build step.

A careful run that holds Pump and misses the obstacles finishes in about one minute.

## Open it

Serve the repository root (the folder that contains `white-rail/`), then open the white-rail path. Links are relative, so the same files work on GitHub Pages under a repository subpath.

```bash
python -m http.server 8080
```

Open `http://localhost:8080/white-rail/`.

On GitHub Pages that is the site's `/white-rail/` path, for example `https://<user>.github.io/<repo>/white-rail/`.

Landscape is the intended orientation. A portrait visit shows a short "turn sideways" note with a Dismiss button.

## Controls

Touch first. Nothing you need is hover-only.

- Left thumb: Left and Right pick the track. Swipe sideways on the left half of the picture to change tracks.
- Right thumb: Pump. Hold it and the lever keeps stroking. Each stroke pushes the car. Let go and the car slows.
- Pause also opens when the page is hidden. Resume continues the same run. Start the line over returns to the start and does not count as reaching the yard.

Buttons are at least 48 pixels. Left, Right, and Pump are larger so a thumb can hold them.

If the device asks for reduced motion, a slip does not shake the picture.

## Rules

Three rails run side by side. The car starts on the middle one. Crates, missing rail, and a lowered signal arm each sit on one rail. One rail is always open.

Touch an obstacle and the car slips: a jolt, a loss of speed, and one mark. A slip is not a fall and not a death. Three slips, and the handcar is back at the start of the line. That run does not count as a win.

Reach the open mouth of the yard to win. The distance on the HUD is meters left to that mouth. Speed is in km/h. Slips are counted out of three.

## Victory event

On a win the page shows a short card and dispatches a `CustomEvent` named `white-rail:complete` on `window` once. The detail is `{ seconds }`: whole seconds on the line, not counting time spent paused.

A slip, three slips, pause, and starting the line over do not dispatch the event. Ride again, or try the line again, starts a fresh run and allows the event again the next time the car reaches the yard.
