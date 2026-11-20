# Chapter 3 — White Rail

Trent pumps his handcar toward the yard mouth over 1,560 meters. Levels 1 and 2 have three tracks, and level 3 has five. The top speed is about 164 meters per second.

The sky, handcar, and Trent use painted artwork from `art/`. The renderer projects the tracks and obstacles from their positions along the route. There are no third-party assets, no downloaded images, and no build step.

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
- Right thumb: tap Pump once per stroke. Each stroke pushes the car. Stop tapping to coast.
- Hold Brake above Pump to slow at twice the coasting rate. Brake takes priority over Pump.

Levels 2 and 3 have painted roadside tanks. Each tank fires when its center reaches about 20% of the screen height and targets the player's current track. Level 2 tanks fire twice, 1.5 seconds apart, and aim at the current track each time. Changing tracks after the shot avoids it. Tank shells count as one hit. New bomb gaps and shell markers reserve clear stretches across every track.
- Pause also opens when the page is hidden. Resume continues the same run. Start the line over returns to the start and does not count as reaching the yard.

Buttons are at least 48 pixels. Left, Right, and Pump are larger for easy tapping.

If the device asks for reduced motion, a slip does not shake the picture.

## Rules

Three rails run side by side. The car starts on the middle one. Crates, missing rail, and a lowered signal arm each sit on one rail. One rail is always open.

Touch an obstacle and the car slips, losing speed and taking a hit. Rail gaps count as two hits. After a hit, the handcar is protected for three seconds of play. The run ends at three hits plus any quiz bonuses.

Reach the open mouth of the yard to win. The distance on the HUD is meters left to that mouth. Speed is in km/h. Slips are counted out of three.

## Victory event

On a win the page shows a short card and dispatches a `CustomEvent` named `white-rail:complete` on `window` once. The detail is `{ seconds }`: whole seconds on the line, not counting time spent paused.

A slip, three slips, pause, and starting the line over do not dispatch the event. Ride again, or try the line again, starts a fresh run and allows the event again the next time the car reaches the yard.
