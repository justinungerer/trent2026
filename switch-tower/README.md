# Chapter 5 — The Switch Tower

A route puzzle in a small snowy yard. Trent throws five track levers so the right train can leave. The sky, the yard, the destination board, the levers, the train, and Trent are original painted pictures in `art/`. Snow specks are still drawn on the canvas. There are no third-party assets, no downloaded images, and no build step.

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

- The five buttons along the bottom control levers 1 through 5. Each tap flips that lever between left and right and plays Trent's pull.
- Pause also opens when the page is hidden. Resume continues the same run. Start the puzzle over returns to the first throw and does not count as sending the train out.

Buttons are at least 48 pixels. The lever buttons are larger so a thumb can hit them.

If the device asks for reduced motion, a wrong route does not shake the picture.

## Rules

Five trains roll in from the left, one after another, at one and a half times the original pace. The wooden board over the yard shows the route for the train that is coming: five pictures, one for each lever. Match every lever to its picture before the train reaches the switch.

A wrong pattern explodes that train and costs one miss. Three misses, and the puzzle starts over from the first throw. That run does not count as a win.

After two trains get away, a soldier appears beside the levers and throws a random one about every two seconds. Put the levers back before the train arrives. A miss still explodes that train.

Five trains away is the win.

## Victory event

On a win the page shows a short card and dispatches a `CustomEvent` named `switch-tower:complete` on `window` once. The detail is `{ seconds }`: whole seconds on the puzzle, not counting time spent paused.

A wrong route, three misses, pause, and starting the puzzle over do not dispatch the event. Run the yard again, or set the route again, starts a fresh run and allows the event again the next time five trains leave.

## Art

The paintings in `art/` were generated for this chapter. `art/ART-SOURCES.md` records the frame sizes, the order, and the anchor points. Trent is the same young man as the prologue: brown wool coat, red scarf, round helmet, brown boots.
