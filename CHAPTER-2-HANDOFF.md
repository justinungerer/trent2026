# Chapter 2 — Special Delivery: Freight Yard

This version replaces the lane runner with a free-roaming overhead stealth
prototype. From the repo root run `python -m http.server 8080` and open
`http://localhost:8080/chapter-2/`. No build step or dependencies.

Find all three dispatches, then reach the northeast mail hatch. Avoid the
three clockwork inspectors. Three contacts end the attempt, with a short
invulnerability window after each hit. You have three wind-up penguins.
A penguin appears ahead of Trent and draws nearby inspectors for five seconds.

- Phone: drag anywhere in the yard like a floating joystick. Release to stop.
  Use the Decoy button with either thumb.

## Implementation and art

`chapter-2/game.js` owns free movement, collision, patrols, decoy behavior,
and the tracking camera. It uses a new illustrated yard backdrop and reuses
painted art from the existing prototypes for the character placeholder,
patrols, shelving and dispatches. Movement uses sprite bob and facing changes.
The fenced map limits and shelf rectangles are gameplay geometry. There is
no timer to force a route. This is an exploration prototype.

## Copilot integration

The standalone game retains the `special-delivery:complete` window event and
`{postcards, hull, seconds}` payload. It emits exactly once per victory and
never on loss. Preserve that contract. In a campaign iframe, relay the event
with postMessage to the expected parent origin. Check exact source, origin,
and active run ID in the parent before recording success and entering
Operation Ribbonfall. Quiz loadout mapping and chapter persistence are
future integration work. Use project-relative paths for GitHub Pages.

Mobile Safari needs device testing. Playtest navigation, patrolling, decoy
placement, and map readability before tuning the final chapter length.

## Art-direction pass

Movement animation now uses actual distance traveled, including when sliding
along a shelf, and stops when a wall blocks motion. Alternating footprints
fade in the snow. Reduced motion suppresses body sway, reduces snow density,
and replaces damage blinking with a steady outline. This pass uses the
existing project-generated assets and adds no external art to the branch.
