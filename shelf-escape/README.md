# Operation Ribbonfall

The depot is a landscape, side-scrolling mission in three gated yards:

1. Recover three pages of transport orders and disable the freight alarm.
2. Find the switchyard key, set three marked rail switches in sequence, and
   disable the switchyard alarm.
3. Find the cipher, start the generator, install the fuse, and disable the
   signal-yard alarm. Connect three marked aerials, return to the radio to
   transmit, shoot three locks on the mail train, then reach the mail hatch.

Collecting each yard's objective triggers an alarm reinforcement while its
relay is active. Guards telegraph and fire actual projectiles. Crates block
their shots; pull down while stationary behind one to hide. Moving or firing
exposes Buddy. Follow the arrow and yellow marker to the current objective;
relays require a brief interaction by standing next to them.

Serve the repository root over HTTP and open `shelf-escape/`, or play from the
quiz at the root. The game uses Canvas 2D and the included sprites;
there is no build step or external runtime dependency. Keep the `art/`
directory alongside the game.
Relative paths support GitHub Pages subpaths.

The backdrop, cover and environmental effects are original Canvas artwork.
Interactive props (alarm bell, key, order page, cipher book, rail switch, generator, fuse, ribbon ammo box, gift, aerial, radio, padlock, mail hatch, and crate) are original painted WebP files in `art/props/`. Provenance is in `art/ART-SOURCES.md`.
Snow, steam, lights and parallax animate; reduced-motion preference freezes
snow and character idle cycling and disables moving steam. Characters use
actual animation frames. To replace the elf's original bow, the animation is
cropped at render time and an original rotating ribbon launcher is drawn in
front. Arms are not separately rigged to follow the aim angle. Guard fire uses
the gun attack animation and a damaging projectile. A guard's defeat animation
transitions into an original parcel effect.

### Third-party character art

- **Elf 2D Game Sprite**, by CraftPix.net:
  <https://opengameart.org/content/elf-2d-game-sprite>, OGA-BY 3.0.
  Five-frame idle, walk, attack, hurt and defeat sequences from the separately
  licensed OpenGameArt release were resized and assembled into sheets; the
  attack sheet was cropped to omit the original arrow; render-time cropping
  removes most of the bow and an original launcher is overlaid. The storefront's
  separate terms do not govern this OpenGameArt release.
- **2D Soldier Guy Character**, by Segel:
  <https://opengameart.org/content/2d-soldier-guy-character>, OGA-BY 3.0
  (also offered under CC BY 3.0). Ten-frame idle, run, shot, hurt and defeat
  sequences were resized and assembled into sheets.
- The full [OGA-BY 3.0 license](art/animated/OGA-BY-3.0.txt) ships with the
  assets; [OpenGameArt's FAQ](https://opengameart.org/content/oga-by-30-faq)
  explains the terms. The sprite sheets total approximately 0.97 MB.

On a landscape phone, move with the left pad and aim/fire with the right pad.
Push up on the move pad to jump guards, ribbon parcels, tall crates, and the alarm bells. A relay counts only when Buddy is at the top of that jump and just touches the bell. Each successful interaction brings every defeated guard back. Tap the fire pad's center to target the nearest guard. Fire is one shot per tap. On desktop use A/D or
left/right arrows to move, W or Up to jump, S or Down to hide at a crate, and Space to fire
once per press at the nearest guard. Green supply boxes refill the earned magazine on entry;
each box also restores one heart once per attempt. Leave and return for another
ammo refill. Pause with
the pause button or Escape; switching tabs or losing focus also pauses. A
retry restores health, the mission objectives, and the earned equipment.
Physical iPhone Safari and Android testing is still needed.

Simulation advances in steps of at most 1/60 second, catching up to 250 ms
per rendered frame. Longer stalls are capped rather than applied as unsafe
large jumps; tab or focus loss pauses the mission.

This remains a prototype, not a validated three-to-five-minute mission.
Real-time state-guided automated routes on the current mission took about
138 seconds using keyboard controls and 143 seconds using simulated
simultaneous touch. Neither was a human playthrough or a physical-phone test.
Further substantive level design and human playtesting are needed to establish
the desired pacing.

Run the deterministic mission and messaging checks with
`node --test shelf-escape\game.test.js` from the repository root.

## Campaign integration

The quiz passes equipment via query parameters: `charges=2` selects 12 shots
(otherwise 24), `reload=slow` selects a 570 ms cadence (otherwise 270 ms), and
`ribbon=plain` makes guards take two hits (otherwise one). These values also
apply after resupply. Standalone defaults are 24 shots, fast reload, and
enchanted ribbon. A `weapon=locked` debug parameter disables ammunition and is
not a reachable quiz loadout.

For an iframe, provide `parentOrigin` as the exact campaign origin. HTTPS is
required except for HTTP loopback development origins (`localhost`, `127.0.0.1`,
or `[::1]`). The mission sends `{type:'trent:ready', version:1,
mission:'shelf-escape'}`. The host checks the origin and iframe source, then
replies with `{type:'trent:init', version:1, runId}` to that exact origin. On
victory, choosing Continue sends `{type:'trent:complete', version:1,
mission:'shelf-escape', runId, seconds, chargesUsed}`. `chargesUsed` counts
all shots fired, including those after resupply, and can exceed the initial
magazine. The host must validate
the origin, iframe source, and active run ID, and process completion only once.
