# Christmas metal soundtrack

The MP3s in `assets/audio/christmas-metal/` are the replacements for the synthesized background music in Trent Saves Christmas. The quiz and campaign screens share one track. Each of the eleven playable minigames has its own track. The eleven minigame tracks are heavy-metal covers of traditional Christmas songs.

## Track assignments

The filename stem identifies both the game and the previous background-music file. For example, `assets/audio/christmas-metal/shelf-escape.mp3` replaces `assets/audio/shelf-escape.wav`.

- `campaign.mp3` — **Bells Over the Map** · Quiz and campaign · melodic symphonic metal · 3:16
- `prologue.mp3` — **Hark! The Herald Angels Sing** · Landing at Normandy · symphonic battle metal · 3:12
- `night-broadcast.mp3` — **O Come, O Come, Emmanuel** · The Night Broadcast · blackened melodic metal · 3:20
- `frosted-skies.mp3` — **Joy to the World** · Frosted Skies · speed thrash · 3:13
- `white-rail.mp3` — **Go Tell It on the Mountain** · White Rail · industrial groove metal · 3:16
- `chapter-2.mp3` — **Angels We Have Heard on High** · Special Delivery · crossover thrash · 3:15
- `switch-tower.mp3` — **O Come, All Ye Faithful** · The Switch Tower · progressive thrash · 3:16
- `shelf-escape.mp3` — **Shchedryk (Ukrainian Bell Carol)** · Operation Ribbonfall · neoclassical speed metal · 3:14
- `listening-wire.mp3` — **What Child Is This? (Greensleeves)** · The Listening Wire · progressive death metal · 3:25
- `holding-camp.mp3` — **Silent Night** · The Holding Camp · doom and groove metal · 3:28
- `wrapping-line.mp3` — **Good Christian Men, Rejoice** · The Wrapping Line · groove thrash · 3:15
- `chimney-road.mp3` — **We Three Kings** · The Chimney Road · melodic death and power metal · 3:22

The minigame tracks are newly rendered instrumental covers made locally with ACE-Step 1.5 Turbo. The [Hymn Commons Christmas carol library](https://hymncommons.org/hymn-commons-home/christmas-public-domain-carols/) supplied public-domain guide recordings for ten arrangements. The Shchedryk arrangement uses a locally programmed reference of the traditional four-note melody. The opening reel includes **Music by Justin Ungerer**.

## Integration

- The root `index.html` loads `assets/audio/christmas-metal/campaign.mp3` through the existing `soundtrack` element. `music.js` controls its loop, mute toggle, and pause while a minigame is open.
- Each minigame declares its ID in the `data-game` attribute of its HTML document. The shared `game-audio.js` loads `../assets/audio/christmas-metal/<data-game>.mp3` with a versioned URL and loops it.
- Keep the `*-action.wav`, `*-elf.wav`, `*-right.wav`, and `*-wrong.wav` files in `assets/audio/`. The background tracks and the short sound effects have separate paths. The legacy Python composers generate the old synthesized audio.
- When porting these assets to another branch, copy the entire `assets/audio/christmas-metal/` directory and carry over the soundtrack path in `index.html` and the `Audio` path in `game-audio.js`.

Serve the repository over HTTP to check playback. On the quiz screen, click or press a key to start the music, then check the music toggle. Open each minigame and interact with it. Confirm that its own MP3 loads, that quiz music pauses while it is open, and that the sound effects still play.

## Chapter intro themes

Each of the 11 animated chapter openings, including the prologue, has a separate full-length Christmas metal theme. The tracks run from 3:12 to 3:24. The game plays the opening of the song while the 20-second animation runs. The quiz and campaign track pauses during the intro and resumes when the player returns to the quiz or campaign screens. Intro music follows the music toggle and pauses when the tab is hidden or the game asks the player to rotate the screen.

The files in `assets/audio/christmas-metal/intros/` use the chapter IDs from `campaign.js`.

- `prologue.mp3` — **Iron Tide Overture** · Landing at Normandy
- `night.mp3` — **Midnight Frequency** · The Night Broadcast
- `frost.mp3` — **Sleighfire** · Frosted Skies
- `rail.mp3` — **Signals in Steel** · White Rail
- `yard.mp3` — **The Penguin Diversion** · Special Delivery
- `tower.mp3` — **Throw the Switch** · The Switch Tower
- `shelf.mp3` — **Overture for Buddy** · The Shelf Operative
- `wire.mp3` — **Winter Signal** · The Listening Wire
- `camp.mp3` — **Through the Searchlights** · The Holding Camp
- `wrap.mp3` — **Workshop Downbeat** · The Wrapping Line
- `chimney.mp3` — **Rooftop Fanfare** · The Chimney Road

To port the intro themes, copy the `intros/` directory and carry over the `TrentMusic` controller in `music.js`, and its calls in `campaign.js`. The campaign test menu can replay each intro for a playback check.

The [chapter cinematics guide](chapter-cinematics.md) covers the Blender renders and scrolling scene text.
