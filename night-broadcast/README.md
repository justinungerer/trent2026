# Chapter 1 — The Night Broadcast

A few months after D-Day, near Christmas. Trent tunes a field radio and finds the field report that says Santa has been captured. Five stations move on the dial and change direction. The other four are a canteen, a weather report, a music box, and a chapel. Only the field report finishes the tune.

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
- On-screen arrows tune lower and higher. Hold one to sweep.
- Each station shows a moving marker and a strong-signal wedge. Stay inside one wedge for 1 second. That reveals a red band on that station. The red band is hidden until the 1-second hold succeeds. Leaving the strong wedge clears the hold and hides the band.
- Hold Lock and keep the needle inside the red band for 3 seconds. Tuning still works while Lock is held, so the other hand can keep chasing. Releasing Lock, or leaving the red band while still in the strong wedge, unwinds the lock. Leaving the strong wedge hides the red band.
- Lock works on any of the five stations. A lock on the wrong station shows the text "wrong station" and does not win. The field report is the correct station on every run.
- Tap Pause to take a break. Pause also opens when the page is hidden. Resume continues the same tune. Give up returns to the start and does not count as a lock.

Buttons are at least 48 pixels. The arrows and Lock are larger so a thumb can hold them.

If the device asks for reduced motion, the dial lamp does not flicker and the needle does not shake.

## Win rule

There is no fail state. Missing a band does not injure anyone. The signal meter climbs near any station. Words appear when the needle is inside one: the canteen, the weather desk, the music box, the chapel, or the field report.

The markers keep their 75% drift speed. They reverse half as often and wait for the next turn if they reach an end of the dial. The strong wedge is the wide zone. The red band is narrower and only appears after 1 continuous second in that station's strong wedge.

The correct station is the field report. It is chosen by its id, `santa`, and it is the same every run. Nothing random picks it. Locking a different station shows "wrong station" and the tune continues.

The run has no time limit. A practiced tune is a chase, a 1-second strong hold, then 3 seconds in the red band with Lock held.

## Victory event

Locking the field report shows a short card — Santa has been taken — and dispatches a `CustomEvent` named `night-broadcast:complete` on `window` once. The detail is `{ seconds }`: whole seconds on the dial, not counting time spent paused. The same message is posted to the parent frame when the page is embedded.

A lock on a wrong station does not dispatch the event. Pause does not dispatch the event. Give up does not dispatch the event. Tune again starts a fresh dial at the low end and allows the event again on the next win.
