# Chapter 2 — Special Delivery

Branch: chapter-2-special-delivery. Based on illustrated-missions, which carries
Frosted Skies and the updated Shelf Escape mission.

From the repository root run `python -m http.server 8080`, then open
`http://localhost:8080/chapter-2/`. Static files need no dependencies or build
step. The route works under a GitHub Pages project subpath.

## What changed

Chapter 2 is a 95-second, three-lane handcar chase. Trent follows the lead from
Santa's broadcast and collects Sprout's coded postcards to find the entrance
to the depot from Operation Ribbonfall. Three postcards and surviving to the
end wins. Three hits end the attempt. The obstacle layout is deterministic.

The painted edition replaces the newspaper-comic visuals with original,
locally bundled WebP art: a twilight forest railway, two pumping poses, wooden
crates, and wax-sealed postcards. The handcar banks between lanes and its
shadow changes as it hops. Snow moves in layers and pickups and impacts
throw particles. The two poses are blended at runtime. Barriers and feedback
remain Canvas shapes for readability. Keep chapter-2/art with the game.

Tap Left, Hop, and Right, or use the arrow keys and Space. A hop clears striped
barriers. Change lanes to dodge crates, and stay in lane to collect mint mail.
Escape toggles pause. Switching away pauses the mission.

## Integration details

The prototype lives in chapter-2/index.html and chapter-2/game.js.
It dispatches `special-delivery:complete` once per victory on its window.
The event detail contains `{postcards, hull, seconds}`. Defeat does not emit
this event. Retry resets all mission state.

For a campaign iframe, bridge the victory event with postMessage and a fixed
parent origin, following the Shelf Escape protocol for source, origin, and
active run ID validation. The parent should persist the result before moving
to Chapter 3. Decide which Chapter 2 quiz rewards should affect the handcar
before adding loadout input. The standalone build has no quiz dependency.

The rules were exercised in a simulated browser environment. Playtest tap
latency, hop timing, lane readability, and pause on real iOS and Android.
Chapter 2 is a short prototype. Expand its pacing before targeting five minutes.

Suggested Copilot prompt: “Read CHAPTER-2-HANDOFF.md and COPILOT-HANDOFF.md.
Launch Chapter 2 locally, then use the integration notes to connect it when
the campaign's Chapter 2 quiz and rewards are defined.”
