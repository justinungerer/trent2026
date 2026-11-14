# Chapter 5 — The Switch Tower

A route puzzle in a small snowy yard. Trent throws three track levers so the right train can leave. The sky, the yard, the destination board, the levers, the train, and Trent are original painted pictures in `art/`. Snow specks are still drawn on the canvas. There are no third-party assets, no downloaded images, and no build step.

## Open it

Serve the repository root (the folder that contains `switch-tower/`), then open the switch-tower path. Links are relative, so the same files work on GitHub Pages under a repository subpath.

```bash
python -m http.server 8080
```

Open `http://localhost:8080/switch-tower/`.

On GitHub Pages that is the site's `/switch-tower/` path, for example `https://<user>.github.io/<repo>/switch-tower/`.

Landscape is the intended orientation. A portrait visit shows a short "turn sideways" note with a Dismiss button.

## Controls

Touch first. Nothing you need is hover-only.

- The three buttons along the bottom throw lever 1, lever 2, and lever 3. Each tap flips that lever between left and right and plays Trent's pull.
- Keyboard: 1, 2, and 3 throw those levers. Escape pauses.
- Pause also opens when the page is hidden. Resume continues the same run. Start the puzzle over returns to the first throw and does not count as sending the train out.

Buttons are at least 48 pixels. The lever buttons are larger so a thumb can hit them.

If the device asks for reduced motion, a wrong route does not shake the picture.

## Rules

The train rolls in from the left. The wooden board over the yard shows the route as three pictures, one for each lever. Match every lever to its picture before the train reaches the switch.

The pictures are a lever thrown left, a lever thrown right, and a lever thrown left.

A wrong pattern sends the train back and costs one miss. The levers stay where you left them, so you can change them while the train rolls out and comes in again. Three misses, and the puzzle starts over from the first throw. That run does not count as a win.

The matching pattern lets the train leave the yard. That is the win.

## Victory event

On a win the page shows a short card and dispatches a `CustomEvent` named `switch-tower:complete` on `window` once. The detail is `{ seconds }`: whole seconds on the puzzle, not counting time spent paused.

A wrong route, three misses, pause, and starting the puzzle over do not dispatch the event. Run another train, or set the route again, starts a fresh run and allows the event again the next time the train leaves.

## Art

The paintings in `art/` were generated for this chapter. `art/ART-SOURCES.md` records the frame sizes, the order, and the anchor points. Trent is the same young man as the prologue: brown wool coat, red scarf, round helmet, brown boots.
