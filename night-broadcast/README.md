# Chapter 1 — The Night Broadcast

A few months after D-Day, near Christmas. Trent tunes a field radio and holds the narrow station that says Santa has been captured. The other stations are harmless noise: a canteen, a weather report, and a music box. A careful player who already knows the band can finish in well under two minutes.

The pictures are original generated paintings in `art/`: a snowy night, a brass field radio, and Trent. The tuning needle and the signal meter are small canvas overlays. There are no third-party assets, no downloaded images, and no build step.

## Open it

Serve the repository root (the folder that contains `night-broadcast/`), then open the night-broadcast path. Links are relative, so the same files work on GitHub Pages under a repository subpath.

```bash
python -m http.server 8080
```

Open `http://localhost:8080/night-broadcast/`.

On GitHub Pages that is the site's `/night-broadcast/` path, for example `https://<user>.github.io/<repo>/night-broadcast/`.

Landscape is the intended orientation. A portrait visit shows a short "turn sideways" note with a Dismiss button.

## Controls

Touch first. Nothing you need is hover-only.

- Drag the tuning knob left or right.
- On-screen arrows tune lower and higher. Hold one to sweep.
- Keyboard left and right arrows tune the same way. Space is not used.
- The lock fills on its own while the needle stays inside the narrow band and the dial is still. Hold Lock to keep the dial from moving. Arrows and dragging do nothing while Lock is held.
- Escape pauses. Pause also opens when the page is hidden. Resume continues the same tune. Give up returns to the start and does not count as a lock.

Buttons are at least 48 pixels. The arrows and Lock are larger so a thumb can hold them.

If the device asks for reduced motion, the dial lamp does not flicker and the needle does not shake.

## Win rule

There is no fail state. Missing the band does not injure anyone. The signal meter climbs near any station. Words appear when the needle is inside one: the canteen, the weather desk, the music box, or the field report.

Only the field report can lock, and its band is the narrow one. Keep the needle inside that band, without moving the dial, for three seconds. The lock unwinds if the needle slips out. It does not unwind while you are still inside and only adjusting.

The run has no time limit. A practiced tune is a short sweep, a steady hold, and the card.

## Victory event

On a lock the page shows a short card — Santa has been taken — and dispatches a `CustomEvent` named `night-broadcast:complete` on `window` once. The detail is `{ seconds }`: whole seconds on the dial, not counting time spent paused.

Pause does not dispatch the event. Give up does not dispatch the event. Tune again starts a fresh dial at the low end and allows the event again on the next lock.
