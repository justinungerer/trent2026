# Christmas metal soundtrack

The MP3s in `assets/audio/christmas-metal/` are the replacements for the synthesized background music in Trent Saves Christmas. The quiz and campaign screens share one track. Each of the eleven playable minigames has its own track. All twelve tracks are original instrumental arrangements generated locally with ACE-Step 1.5 Turbo.

## Track assignments

The filename stem identifies both the game and the previous background-music file. For example, `assets/audio/christmas-metal/shelf-escape.mp3` replaces `assets/audio/shelf-escape.wav`.

- `campaign.mp3` — **Bells Over the Map** · Quiz and campaign · melodic symphonic metal · 3:16
- `prologue.mp3` — **Christmas at First Light** · Landing at Normandy · cinematic power metal · 3:20
- `night-broadcast.mp3` — **Carols After Curfew** · The Night Broadcast · gothic progressive metal · 3:24
- `frosted-skies.mp3` — **Sleighbells at Altitude** · Frosted Skies · melodic speed metal · 3:12
- `white-rail.mp3` — **Iron Tinsel Express** · White Rail · industrial groove metal · 3:28
- `chapter-2.mp3` — **Special Delivery in Steel** · Special Delivery · punk-inflected thrash metal · 3:24
- `switch-tower.mp3` — **Midnight Switch** · The Switch Tower · progressive metal · 3:20
- `shelf-escape.mp3` — **Ribbonfall Rhapsody** · Operation Ribbonfall · neoclassical metal · 3:12
- `listening-wire.mp3` — **A Carol on the Wire** · The Listening Wire · atmospheric post-metal · 3:28
- `holding-camp.mp3` — **The Bells Beyond the Fence** · The Holding Camp · melodic doom metal · 3:32
- `wrapping-line.mp3` — **The Tinsel Machine** · The Wrapping Line · funk-influenced groove metal · 3:16
- `chimney-road.mp3` — **The Last Chimney** · The Chimney Road · melodic heavy metal · 3:24

## Integration

- The root `index.html` loads `assets/audio/christmas-metal/campaign.mp3` through the existing `soundtrack` element. `music.js` controls its loop, mute toggle, and pause while a minigame is open.
- Each minigame declares its ID in the `data-game` attribute of its HTML document. The shared `game-audio.js` loads `../assets/audio/christmas-metal/<data-game>.mp3` and loops it.
- Keep the `*-action.wav`, `*-elf.wav`, `*-right.wav`, and `*-wrong.wav` files in `assets/audio/`. The background tracks and the short sound effects have separate paths. The legacy Python composers generate the old synthesized audio.
- When porting these assets to another branch, copy the entire `assets/audio/christmas-metal/` directory and carry over the soundtrack path in `index.html` and the `Audio` path in `game-audio.js`.

Serve the repository over HTTP to check playback. On the quiz screen, click or press a key to start the music, then check the music toggle. Open each minigame and interact with it. Confirm that its own MP3 loads, that quiz music pauses while it is open, and that the sound effects still play.
