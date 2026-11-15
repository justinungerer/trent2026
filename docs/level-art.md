# Three-level campaign artwork

The new assets were made with the built-in image generator for Trent Saves Christmas. The game reuses its existing character sheets. The stage films use new realistic 1940s portrait illustrations with existing establishing art and story captions baked into the video.

## Film plates

The shared prompt called for realistic photographic adventure stills with restrained period colors, practical lighting, and subtle film grain. Each plate is in `assets/level-film-art/` with a matching MP4 in `assets/level-video/`. The scene prompts are listed below.

- `ramp-and-rally` — Allied landing craft door dropping into the cold Normandy surf at dawn, a young American soldier passes a closed brown dispatch case to another, June 1944.
- `through-the-seawall` — Broken Normandy seawall and dusty concrete breach, scattered field-message pages on sand beside sandbag cover, American GI moving toward a dark shelter at daylight.
- `the-scout-screen` — 1940s hostile aircraft silhouette formations above a narrow winter valley, distant mountain searchlight plays through snowfall, viewpoint from the canopy of another aircraft.
- `workshop-approach` — Three early aviation freight aircraft descending over an isolated snowy workshop village with warm roof windows, dark smoke and observation beacon, Arctic night.
- `siding-signals` — A snow-buried railway signal hut in a conifer forest, two route pennants near iron rails, a period railway handcart in the foreground at winter dawn.
- `the-loading-spur` — Snowy 1944 rail loading yard and dark timber sheds, narrow empty platforms, covert amber unloading lantern beyond a switch and a handcart in distance.
- `freight-gate` — 1944 field courier gloved hand holding a folded freight manifest, inspection booths and boxcars in shadow ahead, snowy night.
- `the-stable-escape` — Rudolph a reindeer with subtle red nose and worn leather harness glimpsed through partly open stable door, hay and frost, lamp near a service gate.
- `clear-the-points` — Small 1940s railway maintenance yard in snow, glove leaving a route card beside two signal lamps and five old lever handles, no readable card lettering.
- `send-the-rescue-train` — Steam rescue train waiting behind a red spur signal in a snow-bound 1940s rail yard at dusk, amber carriage lights and visible condensation.
- `out-of-the-cell` — Tiny elf spy Buddy in muted red wool with pointed cap in a 1940s freight depot intake cell, sees a confiscated coil of ribbon on a bench through the bars, dramatic practical lights.
- `the-last-dispatch` — Tiny elf spy Buddy in muted red wool with pointed cap crossing 1940s parcel sorting annex, a closing metal shutter and a painted crate dropbox nearby, paper map tucked into coat.
- `the-listening-post` — Lonely illuminated wartime radio desk at the end of a dark stone passage, a gloved hand tucking away a folded coded message, amber and slate shadows.
- `gatehouse-code` — Two separate halves of a paper dispatch set on a steel filing cabinet under a dark field lamp, distant open gatehouse and cold window light, 1944.
- `the-cell-passage` — Santa in a worn red wool coat takes a brass key through a barred window from an American GI's glove, dramatized winter 1944 prison cell, compassionate non-graphic scene.
- `hold-the-gate` — Empty snow-covered wartime gatehouse, lights coming on while two distant guard silhouettes form, Santa in red wool coat crouched behind building edge.
- `sort-the-first-crates` — 1940s Christmas workshop supplies arriving on wooden rollers, three differently colored parcel tags and some dented brown cartons, warm machinery and task lights, no lettering.
- `load-the-sleigh` — Wrapped Christmas presents loaded into an old wooden sleigh seen through open workshop doors, snow falls while an assembler in work clothes checks a blank manifest.
- `the-eaves` — Old brass lantern falling from a sleigh down to a snowy lower roof ledge, layered rooftop architecture at blue hour, cinematic depth and small sparks from the lamp.
- `above-the-lanterns` — Two strong-colored route flags planted on separate snowy rooftops, a bell tower ridge and sloping dormer walkway, cold 1940s European village at night.
- `find-the-carrier` — A soldier unspools a wet aerial beside a field radio in a lantern-lit medic tent.
- `confirm-the-dispatch` — A soldier listens for an Allied reply in a snowy stone relay shelter.

Run the renderer from the repository root. Supply the path to the Segoe UI font on your machine.

```powershell
python -B tools/cut_story_films.py --levels --font C:/Windows/Fonts/segoeui.ttf --output assets/level-video
```

## Game art

The chapter `art/` folders contain the stage scenery and sprites. The scenery prompts asked for wide painted spaces with no people or text. They depict the radio tent and relay shelter, snowy air approaches, seawall breach, inspection and stable yards, maintenance siding, depot intake and sorting rooms, cell passage and gatehouse, and wrapping intake and loading bay.

Prop prompts called for isolated oil-painted objects on transparent backgrounds. New props include the crater, aerial spool, signal, bomber, rail hut, wind-up penguin, heart pickup, stable gate, medical kit, first-person rifle, armored pickup pod, belt housing, wrapped guard parcel, brick depot wall, dormer, and roof flag. The Rudolph sprite depicts a running reindeer with a leather harness and a glowing red nose.
