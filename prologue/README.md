# Prologue — The Seawall

D-Day, 6 June 1944. Trent walks from the landing craft on the left to the seawall on the right. The beach scrolls. A careful crossing stays well under three minutes.

The pictures are original Canvas 2D drawing. There are no third-party assets, no downloaded images, and no build step.

## Open it

Serve the repository root (the folder that contains `prologue/`), then open the prologue path. Links are relative, so the same files work on GitHub Pages under a repository subpath.

```bash
python -m http.server 8080
```

Open `http://localhost:8080/prologue/`.

On GitHub Pages that is the site's `/prologue/` path, for example `https://<user>.github.io/<repo>/prologue/`.

Landscape is the intended orientation. A portrait visit shows a short "turn sideways" note with a Dismiss button.

## Controls

Touch first. Nothing you need is hover-only.

- Drag on the left half of the screen to walk. Up the sand is away from the water. Down the sand is toward the surf.
- Hold the Brace button on the lower right. It sits where a right thumb rests in landscape.
- Keyboard: arrow keys or WASD to walk, Space to brace, Escape to pause.
- Pause also opens when the page is hidden. Resume continues the same run.

Buttons are at least 48 pixels. Brace is larger so it is easy to hold.

## Win and lose

Reach the seawall to win.

Surf runs up the sand on a cycle. If Trent is in that water and he is not bracing, the wave shoves him backward and he stumbles: he falls, then gets up. Bracing holds him, with only a short shove. Wire, metal hedgehogs, and craters are solid. Walk around them. Smoke hides the path until he is close. The foam still shows through the smoke so a wave stays readable.

Three stumbles ends the run. He gets up at the landing craft and can try again. A stumble is not a death. The page does not dispatch a victory event on failure.

## Victory event

On victory the page shows a continue card and dispatches a `CustomEvent` named `prologue:complete` on `window` once. The detail is `{ seconds }`: whole seconds on the sand, not counting time spent paused.

A failed run does not dispatch the event. Pressing Continue does not dispatch it again.
