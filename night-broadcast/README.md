# Chapter 1 — The Night Broadcast

A few months after D-Day, near Christmas. Trent tunes a field radio and chases the field report that says Santa has been captured. That signal drifts, then jumps after each lock. The other stations are harmless noise: a canteen, a weather report, and a music box. Three knobs have to lock, in order.

The pictures are original generated paintings in `art/`: a snowy night, a brass field radio, and Trent. The tuning needle and the signal meter are small canvas overlays. There are no third-party assets, no downloaded images, and no build step.

## Open it

Serve the repository root (the folder that contains `night-broadcast/`), then open the night-broadcast path. Links are relative, so the same files work on GitHub Pages under a repository subpath.

```bash
python -m http.server 8080
```

Open `http://localhost:8080/night-broadcast/`.

On GitHub Pages that is the site's `/night-broadcast/` path, for example `https://<user>.github.io/<repo>/night-broadcast/`.

Landscape is the intended orientation. A portrait phone shows a short "turn sideways" note, and the tune stays paused until the phone is landscape.

## Controls

Touch first. Nothing you need is hover-only.

- Drag the tuning knob left or right. The painted gear on the radio is the tuner.
- On-screen arrows tune lower and higher. Hold one to sweep. Drag and the arrows move the dial at twice the earlier rate.
- Keyboard left and right arrows tune the same way. Space is not used.
- Three numbered knobs sit beside the set. Only one is active. The lock on that knob fills while the needle stays inside the drifting field-report band and the dial is still. A few steady seconds, three on the counter, locks it.
- Hold Lock to keep the dial from moving. Arrows and dragging do nothing while Lock is held.
- Slipping out of the band unwinds the current knob. A small nudge that stays inside the band pauses the count and does not unwind it.
- Escape pauses. Pause also opens when the page is hidden. Resume continues the same tune. Give up returns to the start and does not count as a lock.

Buttons are at least 48 pixels. The arrows and Lock are larger so a thumb can hold them.

If the device asks for reduced motion, the dial lamp does not flicker and the needle does not shake.

## Win rule

There is no fail state. Missing the band does not injure anyone. The signal meter climbs near any station. Words appear when the needle is inside one: the canteen, the weather desk, the music box, or the field report.

Only the field report can lock. Its center drifts along the dial, and it is still the narrow band. While you are turning the dial, or while you are outside that band, it drifts quickly enough that you have to chase it. While the needle is inside the band and the dial is steady, the drift slows to a creep so a centered hold can last a few seconds. Catch it on the edge and the creep can still carry it off.

Lock knob 1, then the signal jumps to a new frequency and keeps drifting. Knob 2 is next, then knob 3. Each lock is three steady seconds inside the band. The third lock wins.

The run has no time limit. A practiced tune is a chase, a steady hold, and the same again for the next knob.

## Victory event

On the third lock the page shows a short card — Santa has been taken — and dispatches a `CustomEvent` named `night-broadcast:complete` on `window` once. The detail is `{ seconds }`: whole seconds on the dial, not counting time spent paused.

The first and second knobs do not dispatch the event. Pause does not dispatch the event. Give up does not dispatch the event. Tune again starts a fresh dial at the low end, with knob 1 waiting, and allows the event again on the next win.
